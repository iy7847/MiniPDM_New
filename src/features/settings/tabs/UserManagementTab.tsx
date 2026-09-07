import React, { useEffect, useState, useRef } from 'react';
import { useUserManagement } from '../hooks/useUserManagement';
import { useGroupManagement } from '../hooks/useGroupManagement';
import { useInvitations } from '../hooks/useInvitations';
import { Card, CardHeader, CardTitle, CardContent, Badge, Toggle, Button, BaseInput, PhoneInput } from '@/design-system';
import type { User, UserPermissions } from '@/shared/types/auth';
import { Shield, User as UserIcon, Check, Key, Plus, Briefcase, Info, Mail, Copy, Trash2, Clock, Send, UserMinus, AlertTriangle } from 'lucide-react';
import { InviteUserModal } from '../components/InviteUserModal';
import { toast } from '@/shared/stores/useToastStore';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/app/providers/AuthProvider';

export function UserManagementTab({ companyId }: { companyId: string }) {
  const { user: authUser } = useAuth();
  const { users, isLoading, error, fetchUsers, updateUserPermissions, updateUserRole, updateUserProfile, removeUserFromCompany } = useUserManagement();
  const { groups, fetchGroups } = useGroupManagement();
  const { invitations, isLoading: isInvLoading, fetchInvitations, cancelInvitation } = useInvitations(companyId);
  const { confirm } = useConfirm();

  const [subTab, setSubTab] = useState<'users' | 'invitations'>('users');
  const [detailTab, setDetailTab] = useState<'permissions' | 'hr'>('permissions');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // HR Form State
  const [hrForm, setHrForm] = useState({
    name: '',
    job_title: '',
    phone: '',
    join_date: '',
    birth_date: '',
    group_id: ''
  });
  const [isSavingHr, setIsSavingHr] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchUsers(companyId);
      fetchGroups(companyId);
      fetchInvitations();
    }
  }, [companyId, fetchUsers, fetchGroups, fetchInvitations]);

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  const selectedGroup = groups.find(g => g.id === (selectedUser?.group_id ?? hrForm.group_id)) || null;

  useEffect(() => {
    if (selectedUser) {
      if (prevUserIdRef.current !== selectedUserId) {
        prevUserIdRef.current = selectedUserId;
        setHrForm({
          name: selectedUser.name || '',
          job_title: selectedUser.job_title || '',
          phone: selectedUser.phone || '',
          join_date: selectedUser.join_date || '',
          birth_date: selectedUser.birth_date || '',
          group_id: selectedUser.group_id || ''
        });
      }
    } else {
      prevUserIdRef.current = null;
    }
  }, [selectedUser, selectedUserId]);

  const handleRoleChange = async (userId: string, role: string) => {
    await updateUserRole(userId, role);
    toast.success('사용자 역할이 변경되었습니다.');
  };

  const handleGroupChange = async (userId: string, newGroupId: string) => {
    try {
      setHrForm(prev => ({ ...prev, group_id: newGroupId }));
      await updateUserProfile(userId, { group_id: newGroupId || null });
      toast.success(newGroupId ? '소속 그룹이 변경되었습니다.' : '소속 그룹이 해제되었습니다 (그룹 없음).');
    } catch (err: any) {
      toast.error('소속 그룹 변경에 실패했습니다.');
    }
  };

  const handlePermissionToggle = async (userId: string, key: keyof UserPermissions, currentValue: boolean) => {
    await updateUserPermissions(userId, { [key]: !currentValue });
  };

  const handleSaveHrInfo = async () => {
    if (!selectedUserId) return;
    setIsSavingHr(true);
    try {
      await updateUserProfile(selectedUserId, {
        name: hrForm.name.trim(),
        job_title: hrForm.job_title,
        phone: hrForm.phone,
        join_date: hrForm.join_date,
        birth_date: hrForm.birth_date,
        group_id: hrForm.group_id || null
      });
      toast.success('인적사항이 성공적으로 저장되었습니다.');
    } catch (err: any) {
      toast.error(err.message || '저장에 실패했습니다.');
    } finally {
      setIsSavingHr(false);
    }
  };

  const handleCopyInviteLink = (token: string, code?: string) => {
    const link = `${window.location.origin}/#/signup?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success(`초대 링크가 복사되었습니다! ${code ? `(코드: ${code})` : ''}`);
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    if (await confirm({
      title: '초대 취소',
      description: `${email} 님에게 발송된 초대를 취소하시겠습니까?`,
      isDanger: true,
    })) {
      try {
        await cancelInvitation(inviteId);
        toast.success('초대가 취소되었습니다.');
      } catch (err: any) {
        toast.error('초대 취소 중 오류가 발생했습니다.');
      }
    }
  };

  const handleRemoveUser = async (targetUser: User) => {
    if (targetUser.id === authUser?.id) {
      toast.error('본인 계정은 회사에서 제외할 수 없습니다.');
      return;
    }
    if (targetUser.role === 'super_admin') {
      toast.error('최고 관리자 계정은 회사에서 제외할 수 없습니다.');
      return;
    }

    if (await confirm({
      title: '멤버 소속 해제',
      description: `정말로 [${targetUser.name || targetUser.email}] 님을 회사에서 제외하시겠습니까?\n\n제외 즉시 회사의 모든 데이터 접근 권한이 차단되며 멤버 목록에서 삭제됩니다.`,
      isDanger: true,
    })) {
      try {
        await removeUserFromCompany(targetUser.id);
        if (selectedUserId === targetUser.id) {
          setSelectedUserId(null);
        }
        toast.success(`${targetUser.name || targetUser.email} 님이 회사에서 제외되었습니다.`);
      } catch (err: any) {
        toast.error(err.message || '멤버 제외 처리에 실패했습니다.');
      }
    }
  };

  if (isLoading && users.length === 0) {
    return <div className="text-text-secondary p-4 animate-pulse">사용자 목록을 불러오는 중...</div>;
  }

  if (error) {
    return <div className="text-danger p-4 bg-danger/10 rounded-lg border border-danger/20">{error}</div>;
  }

  const permissionGroups = [
    {
      title: '견적 관리',
      items: [
        { key: 'can_view_estimates', label: '견적 조회' },
        { key: 'can_write_estimates', label: '견적 작성/수정' },
        { key: 'can_delete_estimates', label: '견적 삭제' },
        { key: 'can_view_margins', label: '원가 및 마진율 조회' },
      ],
    },
    {
      title: '수주 및 생산',
      items: [
        { key: 'can_view_orders', label: '수주/출하 조회' },
        { key: 'can_manage_production', label: '생산 공정 관리' },
      ],
    },
    {
      title: '기준 정보',
      items: [
        { key: 'can_manage_clients', label: '거래처 관리' },
        { key: 'can_manage_materials', label: '자재/단가 관리' },
      ],
    },
    {
      title: '시스템 관리',
      items: [
        { key: 'can_view_analytics', label: '통계 대시보드 조회' },
        { key: 'can_manage_settings', label: '환경 설정 관리 (회사정보/단가/양식)' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 items-start">
      {/* Left: User & Invitation List (Sticky) */}
      <Card className="lg:col-span-1 lg:sticky lg:top-4 flex flex-col max-h-[calc(100vh-8rem)] shadow-sm">
        <CardHeader className="pb-3 border-b border-border-default flex flex-row items-center justify-between shrink-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="w-5 h-5 text-brand-500" />
            멤버 관리
          </CardTitle>
          <Button size="sm" variant="primary" onClick={() => setIsInviteModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            직원 초대
          </Button>
        </CardHeader>

        {/* Sub Tabs: Active Users vs Pending Invitations */}
        <div className="p-3 border-b border-border-default bg-bg-surface/50 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-bg-base rounded-lg border border-border-default">
            <button
              onClick={() => setSubTab('users')}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                subTab === 'users' 
                  ? 'bg-brand-500 text-white font-bold shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              직원 목록 ({users.length})
            </button>
            <button
              onClick={() => setSubTab('invitations')}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                subTab === 'invitations' 
                  ? 'bg-brand-500 text-white font-bold shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              초대 대기 ({invitations.length})
            </button>
          </div>
        </div>

        <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-border-default min-h-[350px]">
          {subTab === 'users' ? (
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full text-left p-3.5 flex flex-col gap-1.5 transition-colors duration-200 hover:bg-bg-elevated ${
                      selectedUserId === user.id ? 'bg-bg-elevated border-l-2 border-brand-500' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-text-primary text-sm flex items-center gap-1.5 truncate">
                          <span className="truncate">{user.name || <span className="text-text-disabled font-normal italic">(이름 미설정)</span>}</span>
                          {user.job_title && (
                            <span className="text-xs text-text-secondary font-normal shrink-0">({user.job_title})</span>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5 truncate">{user.email}</div>
                      </div>
                      <Badge 
                        variant={user.role === 'admin' || user.role === 'super_admin' ? 'warning' : 'default'}
                        className="shrink-0 text-[11px]"
                      >
                        {user.role === 'super_admin' ? '최고 관리자' : user.role === 'admin' ? '관리자' : '일반 사용자'}
                      </Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            // Pending Invitations List
            <div>
              {invitations.length === 0 ? (
                <div className="p-8 text-center text-text-secondary text-sm">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-40 text-brand-500" />
                  <p>초대 대기 중인 멤버가 없습니다.</p>
                  <p className="text-xs text-text-disabled mt-1">[직원 초대] 버튼을 눌러 새 멤버를 초대해보세요.</p>
                </div>
              ) : (
                <div className="p-3 space-y-2.5">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated/70 transition-all duration-200 shadow-sm"
                    >
                      {/* 이메일 및 역할 뱃지 */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
                            <Mail size={14} />
                          </div>
                          <span className="font-semibold text-text-primary text-sm truncate" title={inv.email}>
                            {inv.email}
                          </span>
                        </div>
                        <Badge 
                          variant={inv.role === 'admin' ? 'warning' : 'default'}
                          className="shrink-0 text-[11px]"
                        >
                          {inv.role === 'admin' ? '관리자' : '일반'}
                        </Badge>
                      </div>

                      {/* 메타 정보 (그룹, 코드, 발송일) */}
                      <div className="space-y-1.5 pl-9 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5 text-text-secondary">
                          {inv.group_id && groups.find(g => g.id === inv.group_id)?.name && (
                            <span className="text-brand-400 font-medium text-[11px] bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                              {groups.find(g => g.id === inv.group_id)?.name}
                            </span>
                          )}
                          {inv.invite_code && (
                            <span className="font-mono text-text-primary font-bold tracking-wider bg-bg-base border border-border-default px-2 py-0.5 rounded text-[11px]">
                              코드: {inv.invite_code}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted flex items-center gap-1">
                          <Clock size={12} className="text-text-muted shrink-0" />
                          <span>{new Date(inv.created_at).toLocaleDateString('ko-KR')} 발송 (7일간 유효)</span>
                        </div>
                      </div>

                      {/* 하단 큼직하고 명확한 액션 버튼 2개 */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-default/60">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyInviteLink(inv.token, inv.invite_code)}
                          className="flex-1 h-9 text-xs font-semibold text-brand-400 hover:text-brand-300 border-brand-500/30 hover:border-brand-500/60 bg-brand-500/5 hover:bg-brand-500/15 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Copy size={14} />
                          초대 링크 복사
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelInvite(inv.id, inv.email)}
                          className="flex-1 h-9 text-xs font-semibold text-text-secondary hover:text-danger border-border-default hover:border-danger/40 bg-bg-base/50 hover:bg-danger/10 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                          <Trash2 size={14} />
                          초대 취소
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: User Details & Permissions OR Invitation Guide (Unified Single Scroll) */}
      <div className="lg:col-span-2 space-y-6">
        {subTab === 'invitations' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-brand-500" />
                실무형 멤버 초대 시스템 안내
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-text-secondary">
              <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-5">
                <h4 className="font-semibold text-text-primary text-base mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">1</span>
                  초대 생성 및 부서(그룹) 사전 배정
                </h4>
                <p className="leading-relaxed">
                  좌측 상단의 <strong className="text-text-primary">[직원 초대]</strong> 버튼을 눌러 이메일 주소와 함께 
                  소속될 권한 그룹(예: 생산관리팀, 영업관리팀 등)을 사전 배정하세요. 직원이 가입하는 즉시 해당 그룹의 권한이 자동으로 부여됩니다.
                </p>
              </div>

              <div className="bg-bg-surface border border-border-default rounded-xl p-5">
                <h4 className="font-semibold text-text-primary text-base mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold">2</span>
                  초대 링크 및 6자리 코드 전달 (카카오톡/사내 메신저)
                </h4>
                <p className="leading-relaxed mb-3">
                  외부 메일 발송 서버 설정 없이, 발급된 <strong>6자리 코드</strong>나 <strong>초대 링크</strong>를 복사하여 직원의 사내 메신저나 문자로 직접 전달할 수 있습니다.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-text-secondary pl-2">
                  <li><strong>신규 가입 직원</strong>: 전달받은 링크를 클릭하면 이메일이 자동 입력되며 비밀번호만 입력하면 즉시 회사에 합류합니다.</li>
                  <li><strong>기존 가입 계정</strong>: 로그인 후 온보딩 화면에서 6자리 코드를 입력하면 즉시 회사 팀원으로 등록됩니다.</li>
                </ul>
              </div>

              <div className="bg-bg-surface border border-border-default rounded-xl p-5">
                <h4 className="font-semibold text-text-primary text-base mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold">3</span>
                  초대 현황 관리 및 보안
                </h4>
                <p className="leading-relaxed">
                  초대는 발급 후 7일간 유효하며, 1회 가입 시 자동으로 '수락(Accepted)' 완료 처리되어 재사용이 방지됩니다.
                  잘못 발송된 초대는 목록 우측의 <Trash2 className="w-3.5 h-3.5 inline text-danger" /> 아이콘을 눌러 즉시 파기할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : selectedUser ? (
          <div className="space-y-6">
            {/* Top: Member Profile Header Hero Card */}
            <Card className="border-border-default overflow-hidden shadow-sm">
              <div className="bg-bg-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default">
                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold text-xl shrink-0">
                    {selectedUser.name ? selectedUser.name.slice(0, 1) : selectedUser.email.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-text-primary">
                        {selectedUser.name || <span className="text-text-disabled font-normal italic">(이름 미설정)</span>}
                      </h3>
                      {selectedUser.job_title && (
                        <Badge variant="outline" className="text-xs text-text-secondary border-border-default">
                          {selectedUser.job_title}
                        </Badge>
                      )}
                      <Badge variant={selectedUser.role === 'admin' || selectedUser.role === 'super_admin' ? 'warning' : 'default'}>
                        {selectedUser.role === 'super_admin' ? '최고 관리자' : selectedUser.role === 'admin' ? '관리자' : '일반 사용자'}
                      </Badge>
                      {selectedGroup && (
                        <Badge variant="outline" className="text-xs bg-brand-500/10 text-brand-400 border-brand-500/20">
                          {selectedGroup.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{selectedUser.email}</span>
                      {selectedUser.phone && <span>• {selectedUser.phone}</span>}
                      {selectedUser.join_date && <span>• 입사일: {selectedUser.join_date}</span>}
                    </div>
                  </div>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-bg-base rounded-lg border border-border-default self-start sm:self-center shrink-0">
                  <button
                    onClick={() => setDetailTab('permissions')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      detailTab === 'permissions'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    권한 및 그룹 설정
                  </button>
                  <button
                    onClick={() => setDetailTab('hr')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      detailTab === 'hr'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    인적사항 (HR)
                  </button>
                </div>
              </div>

              {/* Sub Tab Content */}
              <CardContent className="p-6">
                {detailTab === 'permissions' ? (
                  <div className="space-y-6">
                    {/* Role & Group Top Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-bg-elevated/40 border border-border-default">
                      {/* System Role */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-primary">시스템 역할</label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={selectedUser.role === 'user' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleRoleChange(selectedUser.id, 'user')}
                            disabled={selectedUser.role === 'super_admin'}
                            className="flex-1"
                          >
                            {selectedUser.role === 'user' && <Check className="w-4 h-4 mr-1" />}
                            일반 사용자
                          </Button>
                          <Button
                            variant={selectedUser.role === 'admin' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleRoleChange(selectedUser.id, 'admin')}
                            disabled={selectedUser.role === 'super_admin'}
                            className="flex-1"
                          >
                            {selectedUser.role === 'admin' && <Check className="w-4 h-4 mr-1" />}
                            관리자
                          </Button>
                        </div>
                        {selectedUser.role === 'super_admin' && (
                          <span className="text-xs text-warning">* 최고 관리자 역할은 변경할 수 없습니다.</span>
                        )}
                      </div>
                      
                      {/* Group Assignment */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-primary">소속 그룹 (권한 템플릿)</label>
                        <select
                          className="w-full px-3 py-2 bg-bg-surface border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                          value={selectedUser.group_id || ''}
                          onChange={(e) => handleGroupChange(selectedUser.id, e.target.value)}
                        >
                          <option value="">그룹 없음 (개별 권한 직접 설정)</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <span className="text-xs text-text-secondary">
                          * 그룹을 선택하면 해당 부서의 권한 세트가 즉시 상속 적용됩니다.
                        </span>
                      </div>
                    </div>

                    {/* Detailed Permissions Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                          <Key className="w-4 h-4 text-brand-500" />
                          세부 기능별 접근 권한
                        </h4>
                        {(selectedUser.role === 'admin' || selectedUser.role === 'super_admin') && (
                          <span className="text-xs text-warning">
                            * 관리자 역할은 모든 세부 권한을 기본 보유합니다.
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {permissionGroups.map((group) => (
                          <div key={group.title} className="space-y-3 bg-bg-surface p-4 rounded-xl border border-border-default">
                            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border-default pb-2">
                              {group.title}
                            </div>
                            {group.items.map((item) => {
                              const isRoleAdmin = selectedUser.role === 'admin' || selectedUser.role === 'super_admin';
                              const groupHasPermission = !!selectedGroup?.permissions?.[item.key as keyof UserPermissions];
                              const isChecked = isRoleAdmin || groupHasPermission || !!selectedUser.permissions?.[item.key as keyof UserPermissions];
                              const isDisabled = isRoleAdmin || groupHasPermission;
                              
                              return (
                                <div key={item.key} className="flex items-center justify-between py-0.5">
                                  <div className="flex flex-col">
                                    <label className={`text-sm ${isDisabled ? 'text-text-secondary' : 'text-text-primary cursor-pointer'}`}>
                                      {item.label}
                                    </label>
                                    {groupHasPermission && !isRoleAdmin && (
                                      <span className="text-[10px] text-brand-400 font-medium">그룹 권한 상속</span>
                                    )}
                                  </div>
                                  <Toggle
                                    checked={isChecked}
                                    onChange={() => handlePermissionToggle(selectedUser.id, item.key as keyof UserPermissions, !!selectedUser.permissions?.[item.key as keyof UserPermissions])}
                                    disabled={isDisabled}
                                    size="sm"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* HR Info Tab */
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-base font-bold text-text-primary">인적사항 (HR Info)</h4>
                          <p className="text-xs text-text-secondary mt-0.5">직원의 성명 및 사내 기본 인적 정보를 등록하고 관리합니다.</p>
                        </div>
                        <Button size="sm" variant="primary" onClick={handleSaveHrInfo} disabled={isSavingHr}>
                          {isSavingHr ? '저장 중...' : '인적사항 저장'}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-bg-surface rounded-xl border border-border-default">
                        <BaseInput 
                          label="성명 (이름)" 
                          value={hrForm.name} 
                          onChange={e => setHrForm(prev => ({ ...prev, name: e.target.value }))} 
                          placeholder="홍길동" 
                        />
                        <BaseInput 
                          label="직함/직급" 
                          value={hrForm.job_title} 
                          onChange={e => setHrForm(prev => ({ ...prev, job_title: e.target.value }))} 
                          placeholder="예: 대리, 과장, 팀장" 
                        />
                        <PhoneInput 
                          label="연락처"
                          value={hrForm.phone} 
                          onChange={value => setHrForm(prev => ({ ...prev, phone: value }))} 
                          placeholder="010-0000-0000"
                        />
                        <BaseInput 
                          label="입사일" 
                          type="date"
                          value={hrForm.join_date} 
                          onChange={e => setHrForm(prev => ({ ...prev, join_date: e.target.value }))} 
                        />
                        <BaseInput 
                          label="생년월일" 
                          type="date"
                          value={hrForm.birth_date} 
                          onChange={e => setHrForm(prev => ({ ...prev, birth_date: e.target.value }))} 
                        />
                      </div>
                    </div>

                    {/* Danger Zone: Remove User from Company */}
                    {selectedUser.id !== authUser?.id && selectedUser.role !== 'super_admin' && (
                      <div className="border border-danger/20 bg-danger/5 rounded-xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-danger flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" />
                              위험 구역: 멤버 소속 해제 (퇴사 처리)
                            </h4>
                            <p className="text-xs text-text-secondary mt-1">
                              [회사에서 제외하기]를 실행하면 해당 계정의 사내 데이터(견적, 수주, 생산 등) 열람 및 접근 권한이 즉시 영구 차단됩니다.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-danger hover:bg-danger/90 text-white shrink-0"
                            onClick={() => handleRemoveUser(selectedUser)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            회사에서 제외하기
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="p-16 flex items-center justify-center text-center border-dashed">
            <div className="text-text-secondary">
              <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-40 text-brand-500" />
              <h4 className="text-base font-medium text-text-primary mb-1">선택된 사용자가 없습니다</h4>
              <p className="text-xs">좌측 직원 목록에서 상세 정보와 권한을 설정할 멤버를 선택해주세요.</p>
            </div>
          </Card>
        )}
      </div>

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          fetchUsers(companyId);
          fetchInvitations();
        }}
        companyId={companyId}
      />
    </div>
  );
}
