import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { Tabs } from '@/design-system/Tabs';
import { PageHeader } from '@/design-system/PageHeader';
import { Plus, Search, Building2, Edit2, Trash2, Eye, Layers } from 'lucide-react';
import { toast } from '@/shared/stores/useToastStore';
import { useMaterials } from './hooks/useMaterials';
import { MaterialModal } from './components/MaterialModal';
import type { ItemType } from './components/MaterialModal';

type TabType = 'MATERIALS' | 'POST_PROCESSINGS' | 'HEAT_TREATMENTS';

const SESSION_KEY = 'minipdm_materials_filters';

export const MaterialsPage: React.FC = () => {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  // Sticky Filters (URL Query Parameters + sessionStorage)
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const paramTab = searchParams.get('tab') as TabType;
    if (paramTab && ['MATERIALS', 'POST_PROCESSINGS', 'HEAT_TREATMENTS'].includes(paramTab)) {
      return paramTab;
    }
    const savedTab = sessionStorage.getItem(SESSION_KEY + '_tab') as TabType;
    if (savedTab && ['MATERIALS', 'POST_PROCESSINGS', 'HEAT_TREATMENTS'].includes(savedTab)) {
      return savedTab;
    }
    return 'MATERIALS';
  });

  const [searchTerm, setSearchTerm] = useState(() => {
    return searchParams.get('search') || sessionStorage.getItem(SESSION_KEY + '_search') || '';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const { items, isLoading, fetchItems, saveItem, deleteItem } = useMaterials();
  const itemType = activeTab.slice(0, -1) as ItemType;

  // URL 및 SessionStorage 동기화 (Sticky Filters)
  useEffect(() => {
    if (location.pathname !== '/materials') return;
    const params: Record<string, string> = {};
    if (activeTab && activeTab !== 'MATERIALS') params.tab = activeTab;
    if (searchTerm) params.search = searchTerm;
    setSearchParams(params, { replace: true });
    sessionStorage.setItem(SESSION_KEY + '_tab', activeTab);
    sessionStorage.setItem(SESSION_KEY + '_search', searchTerm);
  }, [activeTab, searchTerm, location.pathname, setSearchParams]);

  // URL 파라미터가 외부(뒤로가기 등)에 의해 변경되었을 때 로컬 상태 동기화 (Debounce 충돌 방지)
  useEffect(() => {
    const urlTab = searchParams.get('tab') as TabType;
    if (urlTab && ['MATERIALS', 'POST_PROCESSINGS', 'HEAT_TREATMENTS'].includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  // 사용자 권한 및 데이터 조회
  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('company_id, role, permissions')
          .eq('id', user.id)
          .single();
        if (data?.company_id) {
          setCompanyId(data.company_id);
          const hasPermission = data.role === 'admin' || data.role === 'super_admin' || data.permissions?.can_manage_materials === true;
          setCanManage(hasPermission);
          fetchItems(data.company_id, itemType);
        }
      }
    }
    fetchUserData();
  }, [user, fetchItems, itemType]);

  useEffect(() => {
    if (companyId) {
      fetchItems(companyId, itemType);
    }
  }, [activeTab, companyId, fetchItems, itemType]);

  const handleAddNew = () => {
    setEditingItem(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (item: any) => {
    setEditingItem(item);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any, suppliers: any[]) => {
    if (!companyId) return;
    try {
      await saveItem(companyId, itemType, data, suppliers);
      toast.success(editingItem?.id ? '항목이 성공적으로 수정되었습니다.' : '신규 항목이 성공적으로 등록되었습니다.');
    } catch (err: any) {
      toast.error('저장 실패: ' + (err.message || '오류가 발생했습니다.'));
    }
  };

  const handleDelete = async (item: any) => {
    const isConfirmed = await confirm({
      title: '항목 삭제',
      description: `[${item.name}] 항목을 정말 삭제하시겠습니까? 등록된 거래처별 단가 정보도 함께 삭제됩니다.`,
      isDanger: true,
    });

    if (isConfirmed && companyId) {
      try {
        await deleteItem(companyId, itemType, item.id);
        toast.success('항목이 정상적으로 삭제되었습니다.');
      } catch (err: any) {
        toast.error('삭제 실패: ' + (err.message || '오류가 발생했습니다.'));
      }
    }
  };

  const displayData = items.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      (item.code && item.code.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in h-full">
      {/* 상단 헤더 */}
      <PageHeader
        icon={Layers}
        title="단가 관리"
        description="자재, 후처리, 열처리의 기준 단가 및 공급 거래처별 단가를 통합 관리합니다."
        actions={
          canManage && (
            <Button variant="primary" onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              신규 등록
            </Button>
          )
        }
      />

      {/* 탭 및 검색 바 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs 
          tabs={[
            { id: 'MATERIALS', label: '자재 (Materials)' },
            { id: 'POST_PROCESSINGS', label: '후처리 (Post Processing)' },
            { id: 'HEAT_TREATMENTS', label: '열처리 (Heat Treatment)' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab as TabType);
          }}
        />

        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-secondary" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="이름, 코드 또는 카테고리 검색..."
            className="w-full pl-10 pr-3 py-2 border border-border-default rounded-xl bg-bg-surface text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium placeholder:text-text-muted shadow-sm"
          />
        </div>
      </div>

      {/* 데이터 카드 및 테이블 */}
      <Card className="flex-1 overflow-hidden flex flex-col border border-border-default/60 shadow-lg">
        <CardHeader className="py-4 border-b border-border-default/60 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-text-primary flex items-center gap-2">
            {activeTab === 'MATERIALS' ? '자재 기준 목록' : 
             activeTab === 'POST_PROCESSINGS' ? '후처리 단가 목록' : '열처리 단가 목록'}
            <span className="text-xs font-normal text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
              총 {displayData.length}개
            </span>
          </CardTitle>
          <span className="text-xs text-text-muted hidden sm:inline-block">
            * 행을 클릭하면 상세 조회 및 수정을 진행할 수 있습니다.
          </span>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-bg-surface sticky top-0 border-b border-border-default z-10 shadow-sm">
              <tr>
                <th className="p-4 font-medium text-text-secondary w-28 pl-6">코드</th>
                <th className="p-4 font-medium text-text-secondary">이름</th>
                {activeTab === 'MATERIALS' && (
                  <>
                    <th className="p-4 font-medium text-text-secondary w-36">카테고리</th>
                    <th className="p-4 font-medium text-text-secondary w-28 text-right">비중</th>
                  </>
                )}
                <th className="p-4 font-medium text-text-secondary text-right w-36">kg당 단가</th>
                <th className="p-4 font-medium text-text-secondary text-center w-28">거래처 수</th>
                {canManage && <th className="p-4 font-medium text-text-secondary text-center w-28">관리</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">단가 정보를 불러오는 중입니다...</span>
                    </div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-text-muted/40" />
                      <p className="text-sm">
                        {searchTerm ? `"${searchTerm}"에 대한 검색 결과가 없습니다.` : '등록된 단가 정보가 없습니다.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : activeTab === 'MATERIALS' ? (
                Object.entries(
                  displayData.reduce((acc: any, current: any) => {
                    const cat = current.category || '기타';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(current);
                    return acc;
                  }, {})
                ).map(([category, items]: [string, any]) => (
                  <React.Fragment key={category}>
                    <tr className="bg-bg-surface/80 border-y border-border-default/60">
                      <td colSpan={7} className="p-2.5 px-6 text-xs font-semibold text-text-secondary tracking-wider uppercase flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                        {category} 
                        <span className="text-xs font-normal text-text-muted">({items.length}개)</span>
                      </td>
                    </tr>
                    {items.map((item: any) => (
                      <tr
                        key={item.id}
                        onClick={() => (canManage ? handleEdit(item) : handleView(item))}
                        className="group hover:bg-bg-surface/50 transition-colors cursor-pointer"
                      >
                        <td className="p-4 font-mono text-sm text-text-secondary pl-6 border-l-2 border-transparent group-hover:border-brand-500 transition-colors">
                          {item.code || '-'}
                        </td>
                        <td className="p-4 font-medium text-text-primary">{item.name}</td>
                        <td className="p-4 text-text-secondary text-sm">
                          <span className="px-2 py-0.5 rounded bg-bg-surface text-xs border border-border-default">
                            {item.category || '기타'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-sm text-text-secondary">
                          {item.density ? Number(item.density).toFixed(2) : '-'}
                        </td>
                        <td className="p-4 text-right font-mono font-semibold text-brand-400">
                          {(item.unit_price || item.price_per_kg || 0).toLocaleString()}원
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.suppliers?.length > 0) handleView(item);
                            }}
                            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                              item.suppliers?.length > 0 
                                ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25 cursor-pointer shadow-sm' 
                                : 'bg-bg-surface text-text-muted border border-border-default cursor-default'
                            }`}
                          >
                            <Building2 className="w-3 h-3 mr-1" />
                            {item.suppliers?.length || 0}곳
                          </button>
                        </td>
                        {canManage && (
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 px-2 text-xs" 
                                onClick={() => handleEdit(item)}
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                수정
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="h-7 px-2 text-xs" 
                                onClick={() => handleDelete(item)}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                삭제
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                displayData.map((item: any) => (
                  <tr
                    key={item.id}
                    onClick={() => (canManage ? handleEdit(item) : handleView(item))}
                    className="group hover:bg-bg-surface/50 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-mono text-sm text-text-secondary pl-6 border-l-2 border-transparent group-hover:border-brand-500 transition-colors">
                      {item.code || '-'}
                    </td>
                    <td className="p-4 font-medium text-text-primary">{item.name}</td>
                    <td className="p-4 text-right font-mono font-semibold text-brand-400">
                      {(item.unit_price || item.price_per_kg || 0).toLocaleString()}원
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.suppliers?.length > 0) handleView(item);
                        }}
                        className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          item.suppliers?.length > 0 
                            ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25 cursor-pointer shadow-sm' 
                            : 'bg-bg-surface text-text-muted border border-border-default cursor-default'
                        }`}
                      >
                        <Building2 className="w-3 h-3 mr-1" />
                        {item.suppliers?.length || 0}곳
                      </button>
                    </td>
                    {canManage && (
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-7 px-2 text-xs" 
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            수정
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="h-7 px-2 text-xs" 
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <MaterialModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={itemType}
        initialData={editingItem}
        onSave={handleSave}
        isReadOnly={!canManage || isViewMode}
      />
    </div>
  );
};
