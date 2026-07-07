import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { Card } from '../../../design-system/Card';
import { BaseInput } from '../../../design-system/BaseInput';
import { CurrencyInput } from '../../../design-system/CurrencyInput';
import { useItemCalculator } from '../hooks/useItemCalculator';
import type { EstimateItem } from '../types';

interface ItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem?: EstimateItem;
  onUpdateItem: (updates: Partial<EstimateItem>) => void;
}

export const ItemDrawer: React.FC<ItemDrawerProps> = ({ isOpen, onClose, selectedItem, onUpdateItem }) => {
  const [localItem, setLocalItem] = useState<Partial<EstimateItem>>({});

  useEffect(() => {
    if (selectedItem) {
      setLocalItem(selectedItem);
    }
  }, [selectedItem]);

  // Hook directly recalculates based on localItem values
  const calculated = useItemCalculator({
    shape: localItem.shape || 'rect',
    spec_w: localItem.spec_w || 0,
    spec_d: localItem.spec_d || 0,
    spec_h: localItem.spec_h || 0,
    density: 2.7, // Should come from material setting ideally
    material_price: 5000, // Should come from material setting ideally
    hourly_rate: localItem.hourly_rate || 50000,
    process_time: localItem.process_time || 0,
    difficulty: localItem.difficulty || 'B',
    heat_treatment_price: 1500, // mock
    post_process_price: 1000, // mock
    outsource_cost: localItem.outsource_cost || 0,
    profit_rate: localItem.profit_rate || 10,
    qty: localItem.qty || 1
  });

  // Whenever calculation changes, we can sync it back, but to avoid infinite loops,
  // we just display calculated values. When "Apply" is clicked, we save them.

  if (!isOpen || !selectedItem) return null;

  const handleChange = (field: keyof EstimateItem, value: any) => {
    setLocalItem(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onUpdateItem({
      ...localItem,
      material_cost: calculated.material_cost,
      processing_cost: calculated.processing_cost,
      heat_treatment_cost: calculated.heat_treatment_cost,
      post_process_cost: calculated.post_process_cost,
      unit_price: calculated.unit_price,
      supply_price: calculated.total_price // supply_price = unit_price * qty
    });
    onClose();
  };

  const isRound = localItem.shape === 'round';

  return (
    <div className="w-96 bg-bg-surface border-l border-border-default h-full flex flex-col animate-in slide-in-from-right-4 z-50 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-border-default flex justify-between items-center bg-bg-elevated">
        <h3 className="text-lg font-bold text-text-primary">원가 분석</h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <Card className="bg-bg-base border-none shadow-none p-0">
          <h4 className="text-sm font-bold text-text-primary mb-3">기본 정보</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">품번</label>
              <BaseInput value={localItem.part_no || ''} readOnly className="bg-bg-elevated" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">품명</label>
              <BaseInput value={localItem.part_name || ''} readOnly className="bg-bg-elevated" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">수량</label>
                <BaseInput type="number" value={localItem.qty || 1} onChange={(e) => handleChange('qty', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">재질</label>
                <BaseInput value={localItem.original_material_name || 'AL6061'} onChange={(e) => handleChange('original_material_name', e.target.value)} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-bg-base border-none shadow-none p-0">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-text-primary">규격 및 중량 계산</h4>
            <select 
              className="text-xs bg-bg-elevated text-text-primary border border-border-default rounded px-2 py-1"
              value={localItem.shape || 'rect'}
              onChange={(e) => handleChange('shape', e.target.value as any)}
            >
              <option value="rect">사각 (Rect)</option>
              <option value="round">원형 (Round)</option>
            </select>
          </div>
          <div className="space-y-3">
            {!isRound ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">가로(X)</label>
                  <BaseInput type="number" value={localItem.spec_w || ''} onChange={(e) => handleChange('spec_w', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">세로(Y)</label>
                  <BaseInput type="number" value={localItem.spec_d || ''} onChange={(e) => handleChange('spec_d', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">두께(Z)</label>
                  <BaseInput type="number" value={localItem.spec_h || ''} onChange={(e) => handleChange('spec_h', Number(e.target.value))} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">지름(D)</label>
                  <BaseInput type="number" value={localItem.spec_w || ''} onChange={(e) => handleChange('spec_w', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">길이(L)</label>
                  <BaseInput type="number" value={localItem.spec_d || ''} onChange={(e) => handleChange('spec_d', Number(e.target.value))} />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">예상 중량(kg)</label>
                <BaseInput value={calculated.weight.toFixed(2)} readOnly className="bg-bg-elevated text-brand-500 font-medium" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-bg-base border-none shadow-none p-0">
          <h4 className="text-sm font-bold text-text-primary mb-3">가공 설정</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">가공시간 (Hr)</label>
              <BaseInput type="number" value={localItem.process_time || ''} onChange={(e) => handleChange('process_time', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">난이도</label>
              <select 
                className="w-full text-sm bg-bg-base border border-border-default rounded-md px-3 py-2 text-text-primary focus:ring-1 focus:ring-brand-500"
                value={localItem.difficulty || 'B'}
                onChange={(e) => handleChange('difficulty', e.target.value)}
              >
                <option value="A">A (쉬움)</option>
                <option value="B">B (보통)</option>
                <option value="C">C (다소 어려움)</option>
                <option value="D">D (어려움)</option>
                <option value="E">E (매우 어려움)</option>
                <option value="F">F (최상)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">시간당 임률</label>
            <CurrencyInput value={localItem.hourly_rate || 50000} onChange={(val) => handleChange('hourly_rate', val)} />
          </div>
        </Card>

        <Card className="bg-bg-base border-none shadow-none p-0">
          <h4 className="text-sm font-bold text-text-primary mb-3">비용 산출 (원)</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">소재비</label>
              <CurrencyInput value={calculated.material_cost} readOnly className="bg-bg-elevated text-text-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">가공비</label>
              <CurrencyInput value={calculated.processing_cost} readOnly className="bg-bg-elevated text-text-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">후처리/열처리</label>
              <CurrencyInput value={calculated.heat_treatment_cost + calculated.post_process_cost} readOnly className="bg-bg-elevated text-text-primary" />
            </div>
            <div className="pt-3 border-t border-border-default mt-3">
              <label className="block text-xs text-text-secondary mb-1">합계 단가</label>
              <CurrencyInput value={Math.round(calculated.unit_price)} readOnly className="text-brand-500 font-bold bg-brand-500/10 border-brand-500/20" />
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border-default bg-bg-elevated">
        <Button variant="primary" className="w-full flex items-center justify-center gap-2" onClick={handleApply}>
          <Save size={18} />
          적용하기
        </Button>
      </div>
    </div>
  );
};
