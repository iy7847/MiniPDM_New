import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { Button, BaseInput, Badge } from '@/design-system';
import { toast } from '@/shared/stores/useToastStore';
import { 
  X, 
  User as UserIcon, 
  Lock, 
  Mail, 
  Phone, 
  Briefcase, 
  Calendar, 
  Shield, 
  AlertCircle 
} from 'lucide-react';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, group, refetchProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // 프로필 폼 상태
  const [profileForm, setProfileForm] = useState({
    name: '',
    job_title: '',
    phone: '',
    birth_date: '',
  });

  // 비밀번호 폼 상태
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 프로필 데이터 동기화
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        job_title: profile.job_title || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
      });
    }
  }, [profile, isOpen]);

  if (!isOpen || !user) return null;

  // 1. 프로필 정보 저장
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('성명(이름)을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileForm.name.trim(),
          job_title: profileForm.job_title.trim() || null,
          phone: profileForm.phone.trim() || null,
          birth_date: profileForm.birth_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refetchProfile();
      toast.success('내 정보가 성공적으로 수정되었습니다.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || '프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. 비밀번호 변경
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success('비밀번호가 안전하게 변경되었습니다.');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      onClose();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('same as') || msg.includes('different from')) {
        setPasswordError('이전과 동일한 비밀번호로는 변경할 수 없습니다.');
      } else {
        setPasswordError(msg || '비밀번호 변경 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const roleText = profile?.role === 'super_admin' 
    ? '최고 관리자' 
    : profile?.role === 'admin' 
    ? '관리자' 
    : '일반 사용자';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D] bg-[#161B22]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20 shadow-sm">
              <UserIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E6EDF3]">내 정보 관리</h3>
              <p className="text-xs text-[#8B949E]">개인 프로필 정보 및 계정 보안 설정을 변경합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Summary Card */}
        <div className="p-5 bg-[#0D1117]/60 border-b border-[#30363D] flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center font-bold text-lg shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.15)]">
            {profileForm.name ? profileForm.name.slice(0, 1) : user.email?.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#E6EDF3] truncate">
                {profileForm.name || '성명 미설정'}
              </span>
              <Badge variant={profile?.role === 'admin' || profile?.role === 'super_admin' ? 'warning' : 'default'} className="text-[11px] shrink-0">
                {roleText}
              </Badge>
              {group?.name && (
                <span className="text-[11px] font-medium text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full shrink-0">
                  {group.name}
                </span>
              )}
            </div>
            <div className="text-xs text-[#8B949E] mt-0.5 truncate flex items-center gap-1.5">
              <Mail size={12} className="shrink-0" />
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-[#30363D] px-6 bg-[#161B22] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <UserIcon size={14} />
            기본 프로필 정보
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'password'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Lock size={14} />
            비밀번호 변경
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8B949E] flex items-center gap-1">
                    <UserIcon size={13} className="text-brand-400" />
                    성명(이름) <span className="text-danger">*</span>
                  </label>
                  <BaseInput
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="이름 입력"
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8B949E] flex items-center gap-1">
                    <Briefcase size={13} className="text-brand-400" />
                    직함 / 직급
                  </label>
                  <BaseInput
                    value={profileForm.job_title}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="예: 대리, 과장, 팀장"
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8B949E] flex items-center gap-1">
                    <Phone size={13} className="text-brand-400" />
                    연락처
                  </label>
                  <BaseInput
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#8B949E] flex items-center gap-1">
                    <Calendar size={13} className="text-brand-400" />
                    생년월일
                  </label>
                  <BaseInput
                    type="date"
                    value={profileForm.birth_date}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-[#8B949E] flex items-center gap-1">
                  <Mail size={13} className="text-[#8B949E]" />
                  계정 이메일 (변경 불가)
                </label>
                <div className="h-10 px-3.5 flex items-center bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#8B949E] font-mono select-none">
                  {user.email}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#30363D]">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                  취소
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving} className="px-5">
                  {isSaving ? '저장 중...' : '내 정보 저장'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="bg-bg-base/60 border border-border-default rounded-xl p-4 text-xs text-[#8B949E] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                  <Shield size={14} className="text-brand-400" />
                  비밀번호 변경 안내
                </div>
                <p>• 비밀번호는 최소 6자리 이상으로 안전하게 설정해주세요.</p>
                <p>• 변경 완료 후 다음 로그인 시부터 새 비밀번호가 적용됩니다.</p>
              </div>

              {passwordError && (
                <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{passwordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#8B949E] flex items-center gap-1">
                  <Lock size={13} className="text-brand-400" />
                  새 비밀번호 (6자 이상)
                </label>
                <BaseInput
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="••••••••"
                  required
                  autoFocus
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#8B949E] flex items-center gap-1">
                  <Lock size={13} className="text-brand-400" />
                  새 비밀번호 확인
                </label>
                <BaseInput
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#30363D]">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                  취소
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving} className="px-5">
                  {isSaving ? '변경 중...' : '비밀번호 변경 완료'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
