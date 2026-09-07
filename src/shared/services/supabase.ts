import { createClient } from '@supabase/supabase-js';
import { appStorage } from './persistentStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // 데스크톱 HashRouter 환경에서 해시 파싱 충돌 및 세션 유실 방지
    storageKey: 'minipdm_auth_session', // 고정된 명시적 영속 키 사용
    storage: appStorage, // 💾 데스크톱 파일 기반 영속 스토리지 장착 (재부팅/앱종료 후에도 영구 보존)
  },
});

