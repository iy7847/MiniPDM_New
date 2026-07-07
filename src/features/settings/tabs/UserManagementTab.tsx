import React, { useEffect, useState } from 'react';
import { useUserManagement } from '../hooks/useUserManagement';
import { useGroupManagement } from '../hooks/useGroupManagement';
import { Card, CardHeader, CardTitle, CardContent, Badge, Toggle, Button, BaseInput, PhoneInput } from '@/design-system';
import type { User, UserPermissions } from '@/shared/types/auth';
import { Shield, User as UserIcon, Check, Key, Plus, Briefcase, Info } from 'lucide-react';
import { InviteUserModal } from '../components/InviteUserModal';

export function UserManagementTab({ companyId }: { companyId: string }) {
  const { users, isLoading, error, fetchUsers, updateUserPermissions, updateUserRole, updateUserProfile } = useUserManagement();
  const { groups, fetchGroups } = useGroupManagement();
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // HR Form State
  const [hrForm, setHrForm] = useState({
    job_title: '',
    phone: '',
    join_date: '',
    birth_date: '',
    group_id: ''
  });
  const [isSavingHr, setIsSavingHr] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchUsers(companyId);
      fetchGroups(companyId);
    }
  }, [companyId, fetchUsers, fetchGroups]);

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  const selectedGroup = groups.find(g => g.id === hrForm.group_id) || null;

  useEffect(() => {
    if (selectedUser) {
      setHrForm({
        job_title: selectedUser.job_title || '',
        phone: selectedUser.phone || '',
        join_date: selectedUser.join_date || '',
        birth_date: selectedUser.birth_date || '',
        group_id: selectedUser.group_id || ''
      });
    }
  }, [selectedUser]);

  const handleRoleChange = async (userId: string, role: string) => {
    await updateUserRole(userId, role);
  };

  const handlePermissionToggle = async (userId: string, key: keyof UserPermissions, currentValue: boolean) => {
    await updateUserPermissions(userId, { [key]: !currentValue });
  };

  const handleSaveHrInfo = async () => {
    if (!selectedUserId) return;
    setIsSavingHr(true);
    await updateUserProfile(selectedUserId, {
      job_title: hrForm.job_title,
      phone: hrForm.phone,
      join_date: hrForm.join_date,
      birth_date: hrForm.birth_date,
      group_id: hrForm.group_id || null // Handle empty string as null
    });
    setIsSavingHr(false);
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
      title: '통계 분석',
      items: [
        { key: 'can_view_analytics', label: '통계 대시보드 조회' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left: User List */}
      <Card className="md:col-span-1 h-[calc(100vh-12rem)] flex flex-col">
        <CardHeader className="pb-4 border-b border-border-default flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-brand-500" />
            사용자 목록
          </CardTitle>
          <Button size="sm" variant="primary" onClick={() => setIsInviteModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            직원 초대
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          <ul className="divide-y divide-border-default">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full text-left p-4 flex flex-col gap-2 transition-colors duration-200 hover:bg-bg-elevated ${
                    selectedUserId === user.id ? 'bg-bg-elevated border-l-2 border-brand-500' : 'border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-text-primary">{user.name}</div>
                      <div className="text-xs text-text-secondary mt-1">{user.email}</div>
                    </div>
                    <Badge variant={user.role === 'admin' || user.role === 'super_admin' ? 'warning' : 'default'}>
                      {user.role === 'super_admin' ? '최고 관리자' : user.role === 'admin' ? '관리자' : '일반 사용자'}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Right: User Details & Permissions */}
      <div className="md:col-span-2 h-[calc(100vh-12rem)] overflow-y-auto">
        {selectedUser ? (
          <div className="space-y-6">
            
            {/* HR Info Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-brand-500" />
                  인적사항 (HR Info)
                </CardTitle>
                <Button size="sm" variant="primary" onClick={handleSaveHrInfo} disabled={isSavingHr}>
                  {isSavingHr ? '저장 중...' : '저장'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <BaseInput 
                    label="직함/직급" 
                    value={hrForm.job_title} 
                    onChange={e => setHrForm(prev => ({ ...prev, job_title: e.target.value }))} 
                    placeholder="예: 대리, 팀장" 
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
              </CardContent>
            </Card>

            {/* Role & Group Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-500" />
                  역할 및 권한 설정 ({selectedUser.name})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* System Role */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-primary">시스템 역할</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant={selectedUser.role === 'user' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handleRoleChange(selectedUser.id, 'user')}
                          disabled={selectedUser.role === 'super_admin'}
                        >
                          {selectedUser.role === 'user' && <Check className="w-4 h-4 mr-1" />}
                          일반 사용자
                        </Button>
                        <Button
                          variant={selectedUser.role === 'admin' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handleRoleChange(selectedUser.id, 'admin')}
                          disabled={selectedUser.role === 'super_admin'}
                        >
                          {selectedUser.role === 'admin' && <Check className="w-4 h-4 mr-1" />}
                          관리자
                        </Button>
                      </div>
                      {selectedUser.role === 'super_admin' && (
                        <span className="text-xs text-warning">* 최고 관리자 역할은 변경할 수 없습니다.</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Group Assignment */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-primary">소속 그룹 (권한 템플릿)</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full px-3 py-2 bg-bg-elevated border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                        value={hrForm.group_id}
                        onChange={(e) => {
                          setHrForm(prev => ({ ...prev, group_id: e.target.value }));
                        }}
                      >
                        <option value="">그룹 없음</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline" onClick={handleSaveHrInfo} disabled={isSavingHr || hrForm.group_id === (selectedUser.group_id || '')}>
                        적용
                      </Button>
                    </div>
                    {hrForm.group_id !== (selectedUser.group_id || '') && (
                      <span className="text-xs text-brand-500 flex items-center gap-1">
                        <Info className="w-3 h-3" /> 변경사항을 적용하려면 '적용'을 누르세요.
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-border-default pt-6">
                  <h4 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-2">
                    <Key className="w-4 h-4" /> 세부 권한 설정
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    {permissionGroups.map((group) => (
                      <div key={group.title} className="space-y-3 bg-bg-surface p-4 rounded-lg border border-border-default">
                        <div className="text-sm font-semibold text-text-primary mb-2 border-b border-border-default pb-2">
                          {group.title}
                        </div>
                        {group.items.map((item) => {
                          // Check if admin or super_admin
                          const isRoleAdmin = selectedUser.role === 'admin' || selectedUser.role === 'super_admin';
                          // Check if group has this permission
                          const groupHasPermission = !!selectedGroup?.permissions?.[item.key as keyof UserPermissions];
                          
                          // Actual value is true if Admin, Group has it, or User explicitly has it
                          const isChecked = isRoleAdmin || groupHasPermission || !!selectedUser.permissions?.[item.key as keyof UserPermissions];
                          
                          // Toggle is disabled if Admin or Group inherently grants the permission
                          const isDisabled = isRoleAdmin || groupHasPermission;
                          
                          return (
                            <div key={item.key} className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <label className={`text-sm ${isDisabled ? 'text-text-secondary' : 'text-text-primary cursor-pointer'}`}>
                                  {item.label}
                                </label>
                                {groupHasPermission && !isRoleAdmin && (
                                  <span className="text-[10px] text-brand-500">그룹 권한</span>
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
                  {(selectedUser.role === 'admin' || selectedUser.role === 'super_admin') && (
                    <p className="text-xs text-text-secondary mt-4 text-center">
                      * 관리자 역할은 모든 세부 권한을 기본적으로 가집니다.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>좌측에서 권한을 설정할 사용자를 선택해주세요.</p>
            </div>
          </Card>
        )}
      </div>

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          fetchUsers(companyId); // Refresh users when modal closes, just in case
        }}
        companyId={companyId}
      />
    </div>
  );
}
