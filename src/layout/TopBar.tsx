import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, ChevronDown, Settings as SettingsIcon, LogOut, UserCheck, Shield, RefreshCw } from 'lucide-react';
import { useAppStore } from '../shared/stores/useAppStore';
import { useAuth } from '../app/providers/AuthProvider';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { authService } from '../features/auth/services/authService';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useNotificationStore } from '@/shared/stores/useNotificationStore';
import { supabase } from '@/shared/services/supabase';
import { MyProfileModal } from '../features/auth/components/MyProfileModal';
import { Badge } from '../design-system';
import { useAutoUpdater } from '@/shared/hooks/useAutoUpdater';

export const TopBar: React.FC = () => {
  const { confirm } = useConfirm();
  const { toggleSearch, toggleNotification } = useAppStore();
  const { user, profile, group } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { updateInfo, restartAndInstall } = useAutoUpdater();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  React.useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.company_id) {
          fetchNotifications(data.company_id);
        }
      });
  }, [user, fetchNotifications]);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    if (await confirm({ title: '로그아웃', description: '로그아웃 하시겠습니까?' })) {
      await authService.logout();
      navigate('/login');
    }
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || '사용자';
  const roleBadgeText = profile?.role === 'super_admin' 
    ? '최고 관리자' 
    : profile?.role === 'admin' 
    ? '관리자' 
    : '일반 사용자';

  return (
    <>
      <header className="h-16 bg-bg-surface border-b border-border-default flex items-center justify-between px-6 shrink-0 transition-colors">
        <button 
          type="button"
          onClick={toggleSearch}
          className="flex-1 max-w-md relative flex items-center h-10 px-3.5 bg-bg-base hover:bg-bg-elevated border border-border-default hover:border-brand-500/40 rounded-xl transition-all text-left group shadow-sm"
        >
          <Search className="text-text-secondary group-hover:text-brand-400 mr-2.5 transition-colors shrink-0" size={16} />
          <span className="text-sm text-text-secondary group-hover:text-text-primary flex-1 transition-colors truncate">
            도면, 품명, 수주, 거래처 통합 검색...
          </span>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-text-muted bg-bg-elevated border border-border-default rounded group-hover:border-brand-500/30 group-hover:text-brand-400 transition-colors shrink-0">
            Ctrl + K
          </kbd>
        </button>

        <div className="flex items-center gap-3">
          {/* 🚀 백그라운드 자동 업데이트 알림 & 원클릭 재시작 적용 버튼 */}
          {updateInfo.status === 'downloaded' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <span className="hidden lg:inline text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                앱 종료 시 자동 적용됨
              </span>
              <button
                type="button"
                onClick={restartAndInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/40 transition-all shrink-0 hover:scale-105 active:scale-95"
                title="클릭 시 새 버전으로 즉시 재시작하여 적용합니다. (창을 닫아도 자동 적용됩니다.)"
              >
                <RefreshCw size={13} className="animate-spin" />
                <span>새 버전(v{updateInfo.version}) 지금 적용</span>
              </button>
            </div>
          )}
          {updateInfo.status === 'downloading' && typeof updateInfo.percent === 'number' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 border border-brand-500/30 rounded-xl text-brand-400 text-xs font-semibold shrink-0 shadow-sm animate-pulse">
              <RefreshCw size={13} className="animate-spin text-brand-400" />
              <span>새 버전 다운로드 중 {updateInfo.percent}%</span>
            </div>
          )}

          <button 
            onClick={toggleNotification}
            className="relative p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-bg-elevated transition-colors group"
            title={unreadCount > 0 ? `미확인 알림 ${unreadCount}건` : '알림 센터'}
          >
            <Bell size={20} className="group-hover:text-brand-400 transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full border-2 border-bg-surface animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* User Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(prev => !prev)}
              className="flex items-center gap-2.5 p-1.5 pl-2 pr-2.5 rounded-xl hover:bg-bg-elevated transition-all border border-transparent hover:border-border-default group select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                {profile?.name ? profile.name.slice(0, 1) : <User size={16} />}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-semibold text-text-primary leading-none flex items-center gap-1.5">
                  <span className="max-w-[110px] truncate">{displayName}</span>
                  {profile?.job_title && (
                    <span className="text-[11px] text-text-muted font-normal">({profile.job_title})</span>
                  )}
                </div>
                <div className="text-[11px] text-text-secondary mt-1 leading-none max-w-[130px] truncate">
                  {user?.email}
                </div>
              </div>
              <ChevronDown 
                size={14} 
                className={`text-text-muted transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-brand-400' : 'group-hover:text-text-primary'}`} 
              />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Header Summary */}
                <div className="p-4 bg-[#0D1117]/80 border-b border-[#30363D]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                      {profile?.name ? profile.name.slice(0, 1) : user?.email?.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-[#E6EDF3] truncate flex items-center gap-1.5">
                        <span className="truncate">{displayName}</span>
                        {profile?.job_title && (
                          <span className="text-xs text-text-muted font-normal shrink-0">({profile.job_title})</span>
                        )}
                      </div>
                      <div className="text-xs text-[#8B949E] truncate mt-0.5">{user?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#30363D]/60 text-xs">
                    <Badge variant={profile?.role === 'admin' || profile?.role === 'super_admin' ? 'warning' : 'default'} className="text-[10px] px-1.5 py-0.5">
                      {roleBadgeText}
                    </Badge>
                    {group?.name && (
                      <span className="text-[10px] font-medium text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded-full truncate">
                        {group.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#E6EDF3] hover:text-brand-400 hover:bg-[#21262D] rounded-xl transition-colors text-left group"
                  >
                    <UserCheck size={16} className="text-[#8B949E] group-hover:text-brand-400 transition-colors" />
                    <span className="flex-1">내 정보 수정</span>
                    <span className="text-[10px] text-[#8B949E] bg-bg-base px-1.5 py-0.5 rounded border border-border-default">프로필/암호</span>
                  </button>

                  {(isAdmin || hasPermission('can_manage_settings')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#E6EDF3] hover:text-brand-400 hover:bg-[#21262D] rounded-xl transition-colors text-left group"
                    >
                      <SettingsIcon size={16} className="text-[#8B949E] group-hover:text-brand-400 transition-colors" />
                      <span>환경 설정 바로가기</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-[#30363D]" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-danger hover:bg-danger/10 rounded-xl transition-colors text-left group"
                  >
                    <LogOut size={16} className="text-danger" />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* My Profile Modal */}
      <MyProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </>
  );
};
