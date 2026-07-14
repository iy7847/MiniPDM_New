import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { Tabs } from '@/design-system/Tabs';
import { Plus, Search } from 'lucide-react';
import { useMaterials } from './hooks/useMaterials';
import { MaterialModal } from './components/MaterialModal';
import type { ItemType } from './components/MaterialModal';

type TabType = 'MATERIALS' | 'POST_PROCESSINGS' | 'HEAT_TREATMENTS';

export const MaterialsPage: React.FC = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('MATERIALS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const { items, isLoading, fetchItems, saveItem, deleteItem } = useMaterials();
  const itemType = activeTab.slice(0, -1) as ItemType;

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
  }, [user, fetchItems]);

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
    await saveItem(companyId, itemType, data, suppliers);
  };

  const displayData = items.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.code && item.code.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">단가 관리</h1>
          <p className="text-text-secondary mt-1">자재, 후처리, 열처리의 kg당 단가 및 거래처를 관리합니다.</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              신규 등록
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <Tabs 
          tabs={[
            { id: 'MATERIALS', label: '자재 (Materials)' },
            { id: 'POST_PROCESSINGS', label: '후처리(Post Processing)' },
            { id: 'HEAT_TREATMENTS', label: '열처리(Heat Treatment)' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab as TabType);
            setSearchTerm('');
          }}
        />

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-secondary" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="이름 또는 코드 검색"
            className="w-full pl-10 pr-3 py-2 border border-border-strong rounded-xl bg-bg-elevated text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium placeholder:text-text-disabled"
          />
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>
            {activeTab === 'MATERIALS' ? '자재 목록' : 
             activeTab === 'POST_PROCESSINGS' ? '후처리 목록' : '열처리 목록'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-bg-elevated sticky top-0 border-b border-border-default z-10">
              <tr>
                <th className="p-4 font-medium text-text-secondary w-24">코드</th>
                <th className="p-4 font-medium text-text-secondary">이름</th>
                {activeTab === 'MATERIALS' && (
                  <>
                    <th className="p-4 font-medium text-text-secondary">카테고리</th>
                    <th className="p-4 font-medium text-text-secondary">비중</th>
                  </>
                )}
                <th className="p-4 font-medium text-text-secondary text-right">kg당 단가</th>
                <th className="p-4 font-medium text-text-secondary text-center">거래처 수</th>
                {canManage && <th className="p-4 font-medium text-text-secondary text-center">관리</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-secondary">로딩 중...</td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-secondary">데이터가 없습니다.</td>
                </tr>
                ) : activeTab === 'MATERIALS' ? (
                  Object.entries(
                    displayData.reduce((acc: any, current: any) => {
                      const cat = current.category || '일반';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(current);
                      return acc;
                    }, {})
                  ).map(([category, items]: [string, any]) => (
                    <React.Fragment key={category}>
                      <tr className="bg-bg-overlay/40 border-b border-border-default/50">
                        <td colSpan={7} className="p-3 px-4 text-sm font-bold text-text-primary">
                          {category} <span className="text-xs font-medium text-text-secondary ml-2">({items.length}개)</span>
                        </td>
                      </tr>
                      {items.map((item: any) => (
                        <tr
                          key={item.id}
                          className="group border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors"
                        >
                          <td className="p-4 text-text-secondary pl-6 border-l-2 border-transparent hover:border-brand-500 transition-colors">{item.code || '-'}</td>
                          <td className="p-4 font-medium text-text-primary">{item.name}</td>
                          <td className="p-4 text-text-secondary">{item.category || '-'}</td>
                          <td className="p-4 text-text-secondary">{item.density}</td>
                          <td className="p-4 text-right text-brand-500 font-semibold">
                            {(item.unit_price || item.price_per_kg)?.toLocaleString()}원
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.suppliers?.length > 0) handleView(item);
                              }}
                              className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                item.suppliers?.length > 0 
                                  ? 'bg-brand-bg text-brand-600 hover:bg-brand-100 cursor-pointer' 
                                  : 'bg-bg-overlay text-text-secondary cursor-default'
                              }`}
                            >
                              {item.suppliers?.length || 0}곳
                            </button>
                          </td>
                          {canManage && (
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="secondary" size="sm" className="h-8 px-3 text-xs" onClick={() => handleEdit(item)}>
                                  수정
                                </Button>
                                <Button variant="danger" size="sm" className="h-8 px-3 text-xs" onClick={() => {
                                  if (window.confirm('정말 삭제하시겠습니까?')) {
                                    if (companyId) deleteItem(companyId, itemType, item.id);
                                  }
                                }}>삭제</Button>
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
                    className="group border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors"
                  >
                    <td className="p-4 text-text-secondary">{item.code || '-'}</td>
                    <td className="p-4 font-medium text-text-primary">{item.name}</td>
                    <td className="p-4 text-right text-brand-500 font-semibold">
                      {(item.unit_price || item.price_per_kg)?.toLocaleString()}원
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.suppliers?.length > 0) handleView(item);
                        }}
                        className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          item.suppliers?.length > 0 
                            ? 'bg-brand-bg text-brand-600 hover:bg-brand-100 cursor-pointer' 
                            : 'bg-bg-overlay text-text-secondary cursor-default'
                        }`}
                      >
                        {item.suppliers?.length || 0}곳
                      </button>
                    </td>
                    {canManage && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" size="sm" className="h-8 px-3 text-xs" onClick={() => handleEdit(item)}>
                            수정
                          </Button>
                          <Button variant="danger" size="sm" className="h-8 px-3 text-xs" onClick={() => {
                            if (window.confirm('정말 삭제하시겠습니까?')) {
                              if (companyId) deleteItem(companyId, itemType, item.id);
                            }
                          }}>삭제</Button>
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
        type={activeTab.slice(0, -1) as ItemType}
        initialData={editingItem}
        onSave={handleSave}
        isReadOnly={!canManage || isViewMode}
      />
    </div>
  );
};
