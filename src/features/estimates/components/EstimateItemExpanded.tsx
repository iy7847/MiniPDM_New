import React, { useState, useEffect, useMemo } from 'react';
import type { EstimateItem, EstimateMetadata } from '../types';
import { BaseInput } from '../../../design-system/BaseInput';
import { NumberInput } from '../../../design-system/NumberInput';
import { Button } from '../../../design-system/Button';
import { Maximize2, Check, X } from 'lucide-react';
import { calculateEstimate } from '../hooks/useEstimateCalculations';

interface EstimateItemExpandedProps {
  onClose: () => void;
  editingItem: EstimateItem;
  onSave: (item: EstimateItem) => void;
  metadata: EstimateMetadata;
  companyInfo: any;
  onOpenModal?: () => void;
  onSaveFiles?: (itemId: string, files: File[]) => Promise<void>;
  onDeleteExistingFile?: (fileId: string) => Promise<void>;
  existingItems?: EstimateItem[];
}

export const EstimateItemExpanded: React.FC<EstimateItemExpandedProps> = ({
  onClose,
  editingItem,
  onSave,
  metadata,
  companyInfo,
  onOpenModal,
  onSaveFiles,
  onDeleteExistingFile,
  existingItems
}) => {
  const [itemForm, setItemForm] = useState<EstimateItem>({ ...editingItem });
  const { materials = [], heatTreatments = [], postProcessings = [] } = metadata;

  // onSave를 ref로 유지 — 매 렌더링마다 새 함수 참조가 생겨도 useEffect가 재실행되지 않도록 방지
  const onSaveRef = React.useRef(onSave);
  React.useEffect(() => { onSaveRef.current = onSave; });

  // Recalculate costs whenever factors change
  const calcResult = useMemo(() => {
    return calculateEstimate({
      shape: itemForm.shape || 'rect',
      spec_w: itemForm.spec_w || 0,
      spec_d: itemForm.spec_d || 0,
      spec_h: itemForm.spec_h || 0,
      margin_w: 0, // We already applied margins into raw_w
      margin_d: 0,
      margin_h: 0,
      raw_w_override: itemForm.raw_w,
      raw_d_override: itemForm.raw_d,
      raw_h_override: itemForm.raw_h,
      density: materials.find(m => m.id === itemForm.material_id)?.density || 0,
      material_price: materials.find(m => m.id === itemForm.material_id)?.price_per_kg || 0,
      process_time: itemForm.process_time || 0,
      hourly_rate: itemForm.hourly_rate || companyInfo.default_hourly_rate || 0,
      difficulty: itemForm.difficulty || 'C',
      heat_treatment_price: 0, // Quick edit doesn't touch these, keep as whatever it was
      post_process_price: 0,
      outsource_cost: itemForm.outsource_cost || 0,
      profit_rate: itemForm.profit_rate || 0,
      qty_input: itemForm.qty || 1,
      discount_policy: companyInfo?.discount_policy_json,
      rounding_unit: companyInfo?.default_rounding_unit || 10
    });
  }, [itemForm, materials, companyInfo]);

  // Keep internal form in sync with calculated results so the user can save them
  useEffect(() => {
    if (calcResult.results.length > 0) {
      const res = calcResult.results[0];
      setItemForm(prev => {
        // If unit_price was manually overridden, keep it. Otherwise, track the calculated price.
        const isManual = prev.unit_price > 0 && prev.calculated_price !== undefined && prev.unit_price !== prev.calculated_price;
        const nextUnitPrice = isManual ? prev.unit_price : res.unit_price;
        const nextSupplyPrice = nextUnitPrice * (prev.qty || 1);

        if (
          prev.calculated_price === res.unit_price &&
          prev.unit_price === nextUnitPrice && 
          prev.supply_price === nextSupplyPrice &&
          prev.material_cost === calcResult.material_cost &&
          prev.processing_cost === calcResult.processing_cost
        ) {
          return prev;
        }
        return {
          ...prev,
          calculated_price: res.unit_price,
          unit_price: nextUnitPrice,
          supply_price: nextSupplyPrice,
          material_cost: calcResult.material_cost,
          processing_cost: calcResult.processing_cost,
          heat_treatment_cost: calcResult.heat_treatment_cost,
          post_process_cost: calcResult.post_process_cost
        };
      });
    }
  }, [calcResult]);

  // Auto-save changes to the parent list state (debounced to avoid rendering stutter)
  // onSave 대신 onSaveRef.current 사용 → onSave가 의존성 배열에서 빠져 불필요한 재실행 방지
  useEffect(() => {
    const timer = setTimeout(() => {
      onSaveRef.current(itemForm);
    }, 150);
    return () => clearTimeout(timer);
  }, [itemForm]); // onSave 제거 — ref로 항상 최신 함수 참조

  return (
    <div className="bg-bg-elevated/30 p-2 pl-12 flex items-center gap-2 border-l-2 border-brand-500">
      <div className="flex-1 flex items-center gap-2">
        <div className="w-[120px]">
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded p-1.5 outline-none focus:border-brand-500 text-[11px] font-bold"
            value={itemForm.heat_treatment_id || ''}
            onChange={e => setItemForm({ ...itemForm, heat_treatment_id: e.target.value || null })}
          >
            <option value="">열처리(-)</option>
            {heatTreatments.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="w-[120px]">
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded p-1.5 outline-none focus:border-brand-500 text-[11px] font-bold"
            value={itemForm.post_processing_id || ''}
            onChange={e => setItemForm({ ...itemForm, post_processing_id: e.target.value || null })}
          >
            <option value="">후처리(-)</option>
            {postProcessings.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="w-[80px]">
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded p-1.5 outline-none focus:border-brand-500 text-[11px] font-bold text-center"
            value={itemForm.difficulty || 'C'}
            onChange={e => setItemForm({ ...itemForm, difficulty: e.target.value })}
          >
            {['A','B','C','D','E','F'].map(level => (
              <option key={level} value={level}>난이도: {level}</option>
            ))}
          </select>
        </div>
        <div className="w-[80px] flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">소요일</span>
          <input 
            type="number" 
            className="w-full bg-transparent text-right text-[11px] font-bold p-1 outline-none" 
            value={itemForm.work_days || ''} 
            onChange={e => setItemForm({ ...itemForm, work_days: Number(e.target.value) })} 
          />
        </div>
        <div className="w-[80px] flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">수량</span>
          <input 
            type="number" 
            className="w-full bg-transparent text-right text-[11px] font-bold p-1 outline-none" 
            value={itemForm.qty || ''} 
            onChange={e => setItemForm({ ...itemForm, qty: Number(e.target.value) })} 
          />
        </div>
        <div className="w-[90px] flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">Hr</span>
          <input 
            type="number" 
            step={companyInfo?.default_time_step || 0.1}
            className="w-full bg-transparent text-right text-[11px] font-bold p-1 outline-none" 
            value={itemForm.process_time || ''} 
            onChange={e => setItemForm({ ...itemForm, process_time: Number(e.target.value) })} 
          />
        </div>
        <div className="w-[120px] flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">이윤%</span>
          <input 
            type="number" 
            step={companyInfo?.default_profit_rate_step || 1}
            className="w-full bg-transparent text-right text-[11px] font-bold p-1 outline-none" 
            value={itemForm.profit_rate || ''} 
            onChange={e => setItemForm({ ...itemForm, profit_rate: Number(e.target.value) })} 
          />
        </div>
        <div className="flex-1 flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">비고</span>
          <input 
            type="text" 
            className="w-full bg-transparent text-left text-[11px] font-bold p-1 outline-none" 
            value={itemForm.note || ''} 
            onChange={e => setItemForm({ ...itemForm, note: e.target.value })} 
            placeholder="비고 입력"
          />
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-[11px] py-1 px-2 h-auto flex items-center gap-1 text-text-secondary hover:bg-bg-surface border border-transparent hover:border-border-default" title="닫기">
          <X size={14} /> 닫기
        </Button>
      </div>
    </div>
  );
};
