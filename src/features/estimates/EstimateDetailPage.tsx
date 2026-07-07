import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Send, Edit2 } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { BaseInput } from '../../design-system/BaseInput';
import { Card } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { ItemDrawer } from './components/ItemDrawer';
import { useEstimateDetail } from './hooks/useEstimate';
import type { EstimateItem } from './types';
import { INITIAL_ITEM_FORM } from './types';

export const EstimateDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { estimate, setEstimate, items, loading, saving, saveDetail, updateItem, addItem, removeItems } = useEstimateDetail(id);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const isNew = id === 'new';

  const handleRowClick = (item: EstimateItem) => {
    setSelectedItemId(item.id!);
    setIsDrawerOpen(true);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(items.map(item => item.id!));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedRows(prev => [...prev, itemId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleBulkDelete = () => {
    removeItems(selectedRows);
    setSelectedRows([]);
  };

  const handleSave = async () => {
    await saveDetail(estimate, items);
    if (isNew) {
      navigate('/estimates');
    }
  };

  const handleAddItem = () => {
    const newItem: EstimateItem = {
      ...INITIAL_ITEM_FORM,
      id: Date.now().toString(),
      part_no: 'NEW-PART',
      part_name: '새 품목',
      original_material_name: 'AL6061',
      qty: 1,
      unit_price: 0,
      supply_price: 0
    };
    addItem(newItem);
    setSelectedItemId(newItem.id!);
    setIsDrawerOpen(true);
  };

  const handleItemChange = (id: string, field: keyof EstimateItem, value: any) => {
    updateItem(id, {
      [field]: value,
      supply_price: field === 'qty' ? value * (items.find(i => i.id === id)?.unit_price || 0) : 
                    field === 'unit_price' ? value * (items.find(i => i.id === id)?.qty || 0) : 
                    items.find(i => i.id === id)?.supply_price
    });
  };

  const subTotal = items.reduce((sum, item) => sum + (item.supply_price || 0), 0);
  const vat = subTotal * 0.1;
  const totalAmount = subTotal + vat;

  if (loading) {
    return <div className="p-6 text-text-secondary">데이터를 불러오는 중입니다...</div>;
  }

  const activeItem = items.find(item => item.id === selectedItemId);

  return (
    <div className="flex flex-col h-full bg-bg-base animate-in fade-in">
      {/* Top Navigation / Actions */}
      <div className="p-4 border-b border-border-default flex justify-between items-center bg-bg-surface">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/estimates')}
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {isNew ? '새 견적 작성' : `견적 상세 (EST-${estimate?.id || ''})`}
            </h1>
            {!isNew && (
              <div className="mt-1">
                {estimate?.status === 'DRAFT' && <Badge variant="warning">대기중</Badge>}
                {(estimate?.status === 'SENT' || estimate?.status === 'ORDERED') && <Badge variant="default">진행중</Badge>}
                {estimate?.status === 'ARCHIVED' && <Badge variant="success">완료</Badge>}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          {!isNew && (
            <Button variant="secondary" className="flex items-center gap-2">
              <Send size={16} />
              견적서 전송
            </Button>
          )}
          <Button variant="primary" className="flex items-center gap-2" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? '저장 중...' : '일괄 저장'}
          </Button>
        </div>
      </div>

      {/* Main Content Area (2-Panel) */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel: Form & List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* 기본 정보 폼 */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">견적 기본 정보</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">프로젝트명</label>
                <BaseInput 
                  placeholder="예: 알루미늄 가공품" 
                  value={estimate?.project_name || ''} 
                  onChange={(e) => setEstimate({ ...estimate, project_name: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">거래처</label>
                <BaseInput 
                  placeholder="거래처 검색..." 
                  value={estimate?.client_id || ''} 
                  onChange={(e) => setEstimate({ ...estimate, client_id: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">작성일</label>
                <BaseInput 
                  type="date" 
                  value={estimate?.created_at || ''} 
                  onChange={(e) => setEstimate({ ...estimate, created_at: e.target.value })} 
                />
              </div>
            </div>
          </Card>

          {/* 품목 리스트 */}
          <Card className="flex-1 flex flex-col min-h-[400px] p-6 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text-primary">품목 리스트</h3>
              <div className="flex gap-2">
                {selectedRows.length > 0 && (
                  <Button size="sm" variant="danger" className="flex items-center gap-1.5" onClick={handleBulkDelete}>
                    <Trash2 size={14} />
                    선택 삭제 ({selectedRows.length})
                  </Button>
                )}
                <Button size="sm" variant="secondary" className="flex items-center gap-1.5" onClick={handleAddItem}>
                  <Plus size={14} />
                  품목 추가
                </Button>
              </div>
            </div>
            <div className="border border-border-default rounded-lg overflow-hidden bg-bg-surface flex-1">
              <table className="w-full text-left">
                <thead className="bg-bg-elevated">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium text-text-secondary w-10">
                      <input 
                        type="checkbox" 
                        checked={items.length > 0 && selectedRows.length === items.length}
                        onChange={handleSelectAll}
                        className="rounded border-border-default bg-bg-base text-brand-500 focus:ring-brand-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-text-secondary">품번</th>
                    <th className="px-4 py-3 text-sm font-medium text-text-secondary">품명</th>
                    <th className="px-4 py-3 text-sm font-medium text-text-secondary">재질</th>
                    <th className="px-4 py-3 text-sm font-medium text-text-secondary text-right">수량</th>
                    <th className="px-4 py-3 text-sm font-medium text-text-secondary text-right">단가</th>
                    <th className="px-4 py-3 text-sm font-medium text-text-secondary text-right">금액</th>
                    <th className="px-4 py-3 text-sm font-medium text-text-secondary text-center">분석</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`border-b border-border-default transition-colors ${
                        selectedItemId === item.id 
                          ? 'bg-brand-500/10 hover:bg-brand-500/20' 
                          : 'hover:bg-bg-elevated'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-text-secondary" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedRows.includes(item.id!)}
                          onChange={(e) => handleSelectRow(e, item.id!)}
                          className="rounded border-border-default bg-bg-base text-brand-500 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">
                        <BaseInput 
                          value={item.part_no || ''} 
                          onChange={(e) => handleItemChange(item.id!, 'part_no', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        <BaseInput 
                          value={item.part_name} 
                          onChange={(e) => handleItemChange(item.id!, 'part_name', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                         <BaseInput 
                          value={item.original_material_name || ''} 
                          onChange={(e) => handleItemChange(item.id!, 'original_material_name', e.target.value)}
                          className="h-8 text-sm w-24"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary text-right">
                         <BaseInput 
                          type="number"
                          value={item.qty} 
                          onChange={(e) => handleItemChange(item.id!, 'qty', parseInt(e.target.value) || 0)}
                          className="h-8 text-sm text-right w-20 ml-auto"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary text-right">
                         <BaseInput 
                          type="number"
                          value={item.unit_price} 
                          onChange={(e) => handleItemChange(item.id!, 'unit_price', parseInt(e.target.value) || 0)}
                          className="h-8 text-sm text-right w-28 ml-auto"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-brand-500 font-medium text-right">
                        {(item.supply_price || 0).toLocaleString()} 원
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          className="text-text-secondary hover:text-brand-500 p-1 rounded transition-colors"
                          onClick={() => handleRowClick(item)}
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                     <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                        품목을 추가해주세요.
                      </td>
                   </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>공급가액</span>
                  <span>{subTotal.toLocaleString()} 원</span>
                </div>
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>부가세 (10%)</span>
                  <span>{vat.toLocaleString()} 원</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border-default">
                  <span>총 견적금액</span>
                  <span className="text-brand-500">{totalAmount.toLocaleString()} 원</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Panel: Item Drawer */}
        <ItemDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          selectedItem={activeItem}
          onUpdateItem={(updates) => {
            if (activeItem) {
              updateItem(activeItem.id!, updates);
            }
          }}
        />
      </div>
    </div>
  );
};
