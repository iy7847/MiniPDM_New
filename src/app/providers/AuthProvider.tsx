import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/services/supabase';
import type { User as UserProfile, UserGroup } from '@/shared/types/auth';
import { appStorage } from '@/shared/services/persistentStorage';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  group: UserGroup | null;
  loading: boolean;
  isProfileLoaded: boolean;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  group: null,
  loading: true,
  isProfileLoaded: false,
  refetchProfile: async () => {},
});

const CACHED_PROFILE_KEY = 'minipdm_cached_profile';
const CACHED_GROUP_KEY = 'minipdm_cached_group';

// 💾 디스크 파일 스토리지로부터 저장된 세션을 동기식으로 즉각 추출 (0ms 복원)
const getInitialStoredSession = (): Session | null => {
  try {
    const raw = appStorage.getItem('minipdm_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.user || parsed.access_token)) {
        return parsed;
      }
    }
  } catch {}
  return null;
};

const initialSession = getInitialStoredSession();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<SupabaseUser | null>(initialSession?.user ?? null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = appStorage.getItem(CACHED_PROFILE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [group, setGroup] = useState<UserGroup | null>(() => {
    try {
      const cached = appStorage.getItem(CACHED_GROUP_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  // 초기 저장소에 이미 세션이 있으면 즉시 loading: false (0ms 대시보드 직행),
  // 세션이 아직 로드되지 않았으면 Supabase의 비동기 getSession() 결과 확인 시까지 loading: true 유지
  const [loading, setLoading] = useState<boolean>(() => {
    return !initialSession?.user;
  });

  const [isProfileLoaded, setIsProfileLoaded] = useState<boolean>(() => {
    try {
      return Boolean(appStorage.getItem(CACHED_PROFILE_KEY));
    } catch {
      return false;
    }
  });

  const fetchProfileAndGroup = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profileData) {
        setProfile(null);
        setGroup(null);
        appStorage.removeItem(CACHED_PROFILE_KEY);
        appStorage.removeItem(CACHED_GROUP_KEY);
        return;
      }

      const userProfile = profileData as UserProfile;
      setProfile(userProfile);
      appStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(userProfile));

      // 회사 도면 루트 경로 동기화 (로컬 파일 뷰어/3D 도면 호환성)
      if (userProfile.company_id) {
        supabase
          .from('companies')
          .select('root_path')
          .eq('id', userProfile.company_id)
          .maybeSingle()
          .then(({ data: companyData }) => {
            if (companyData?.root_path) {
              localStorage.setItem('company_root_path', companyData.root_path);
            }
          })
          .catch(() => {});
      }

      if (profileData.group_id) {
        const { data: groupData } = await supabase
          .from('user_groups')
          .select('*')
          .eq('id', profileData.group_id)
          .maybeSingle();
        const userGroup = (groupData as UserGroup) || null;
        setGroup(userGroup);
        if (userGroup) {
          appStorage.setItem(CACHED_GROUP_KEY, JSON.stringify(userGroup));
        } else {
          appStorage.removeItem(CACHED_GROUP_KEY);
        }
      } else {
        setGroup(null);
        appStorage.removeItem(CACHED_GROUP_KEY);
      }
    } catch (err) {
      console.error('Failed to fetch user profile/group:', err);
      // 네트워크 일시 오류 시 기존 캐시 유지 (즉시 null 처리하지 않음)
    } finally {
      setIsProfileLoaded(true);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfileAndGroup(user.id);
    }
  }, [user?.id, fetchProfileAndGroup]);

  useEffect(() => {
    let isMounted = true;

    // 0. 네트워크 지연/세션 락 방지용 하드 가드 (최대 2초 내 무조건 스피너 해제)
    const hardTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2000);

    // 1. 초기 세션 조회 (안전한 타임아웃 가드 적용)
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 2000)
    );

    Promise.race([sessionPromise, timeoutPromise]).then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        setSession(session);
        setUser(session.user);
        if (isMounted) setLoading(false);
        // 🚀 백그라운드에서 최신 프로필 갱신 (화면 렌더링 즉시 개방, 블로킹 해제)
        fetchProfileAndGroup(session.user.id).catch(() => {});
      } else {
        // 실제 저장소에 세션 키 자체가 없는 순수 미로그인 상태일 때만 null 처리
        const rawSession = appStorage.getItem('minipdm_auth_session');
        if (!rawSession) {
          setSession(null);
          setUser(null);
          appStorage.removeItem(CACHED_PROFILE_KEY);
          appStorage.removeItem(CACHED_GROUP_KEY);
        }
        if (isMounted) setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // 2. Auth 상태 변화 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        setLoading(false);
        await fetchProfileAndGroup(currentSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        // 명시적 로그아웃 시에만 캐시 영구 삭제
        appStorage.removeItem(CACHED_PROFILE_KEY);
        appStorage.removeItem(CACHED_GROUP_KEY);
        setProfile(null);
        setGroup(null);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfileAndGroup]);

  return (
    <AuthContext.Provider value={{ user, session, profile, group, loading, isProfileLoaded, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
