import React, { useEffect, useState } from 'react';
import { useGroupManagement } from '../hooks/useGroupManagement';
import { Card, CardHeader, CardTitle, CardContent, Button, Toggle, BaseInput } from '@/design-system';
import type { UserPermissions } from '@/shared/types/auth';
import { Users, Plus, Shield, Trash2 } from 'lucide-react';

export function GroupManagementTab({ companyId }: { companyId: string }) {
  const { groups, isLoading, error, fetchGroups, createGroup, updateGroup, deleteGroup } = useGroupManagement();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  useEffect(() => {
    if (companyId) {
      fetchGroups(companyId);
    }
  }, [companyId, fetchGroups]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !companyId) return;
    await createGroup(companyId, {
      name: newGroupName,
      description: newGroupDesc,
      permissions: {},
    });
    setNewGroupName('');
    setNewGroupDesc('');
    setIsCreating(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm('정말로 이 그룹을 삭제하시겠습니까?')) {
      await deleteGroup(id);
      if (selectedGroupId === id) {
        setSelectedGroupId(null);
      }
    }
  };

  const handlePermissionToggle = async (groupId: string, key: keyof UserPermissions, currentValue: boolean) => {
    if (!selectedGroup) return;
    const updatedPermissions = {
      ...selectedGroup.permissions,
      [key]: !currentValue
    };
    await updateGroup(groupId, { permissions: updatedPermissions });
  };

  if (isLoading && groups.length === 0) {
    return <div className="text-text-secondary p-4 animate-pulse">그룹 목록을 불러오는 중...</div>;
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
      {/* Left: Group List */}
      <Card className="md:col-span-1 h-[calc(100vh-12rem)] flex flex-col">
        <CardHeader className="pb-4 border-b border-border-default flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            그룹 목록
          </CardTitle>
          <Button size="sm" variant="primary" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-1" />
            추가
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          {isCreating && (
            <div className="p-4 border-b border-border-default bg-bg-surface space-y-3">
              <BaseInput 
                placeholder="그룹명 (예: 영업팀)" 
                value={newGroupName} 
                onChange={(e) => setNewGroupName(e.target.value)} 
                className="h-8 text-sm"
                autoFocus
              />
              <BaseInput 
                placeholder="설명 (선택)" 
                value={newGroupDesc} 
                onChange={(e) => setNewGroupDesc(e.target.value)} 
                className="h-8 text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>취소</Button>
                <Button size="sm" variant="primary" onClick={handleCreateGroup}>저장</Button>
              </div>
            </div>
          )}
          <ul className="divide-y divide-border-default">
            {groups.length === 0 && !isCreating && (
              <li className="p-4 text-center text-sm text-text-secondary">
                등록된 그룹이 없습니다.
              </li>
            )}
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full text-left p-4 flex flex-col gap-2 transition-colors duration-200 hover:bg-bg-elevated ${
                    selectedGroupId === group.id ? 'bg-bg-elevated border-l-2 border-brand-500' : 'border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-text-primary">{group.name}</div>
                      {group.description && <div className="text-xs text-text-secondary mt-1">{group.description}</div>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Right: Group Permissions */}
      <div className="md:col-span-2 h-[calc(100vh-12rem)] overflow-y-auto">
        {selectedGroup ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-500" />
                  기본 권한 설정 ({selectedGroup.name})
                </CardTitle>
                <Button size="sm" variant="outline" className="text-danger hover:text-danger hover:bg-danger/10 border-danger/50" onClick={() => handleDeleteGroup(selectedGroup.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              </CardHeader>
              <CardContent>
                <div className="pt-2">
                  <p className="text-sm text-text-secondary mb-6">
                    이 그룹에 속한 사용자는 아래에서 활성화된 권한을 기본적으로 가지게 됩니다.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    {permissionGroups.map((group) => (
                      <div key={group.title} className="space-y-3 bg-bg-surface p-4 rounded-lg border border-border-default">
                        <div className="text-sm font-semibold text-text-primary mb-2 border-b border-border-default pb-2">
                          {group.title}
                        </div>
                        {group.items.map((item) => {
                          const isChecked = !!selectedGroup.permissions?.[item.key as keyof UserPermissions];
                          
                          return (
                            <div key={item.key} className="flex items-center justify-between">
                              <label className="text-sm text-text-primary cursor-pointer">
                                {item.label}
                              </label>
                              <Toggle
                                checked={isChecked}
                                onChange={() => handlePermissionToggle(selectedGroup.id, item.key as keyof UserPermissions, isChecked)}
                                size="sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>좌측에서 권한을 설정할 그룹을 선택해주세요.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
