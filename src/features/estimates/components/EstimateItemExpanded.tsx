import React, { useState, useEffect, useMemo, startTransition } from 'react';
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
  customColumns?: string[];
  isReadOnly?: boolean;
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
  existingItems,
  customColumns = [],
  isReadOnly = false
}) => {
  const [itemForm, setItemForm] = useState<EstimateItem>({ ...editingItem });
  const { materials = [], heatTreatments = [], postProcessings = [] } = metadata;

  // 외부(품목 수정 모달 등)에서 아이템이 수정되어 넘어올 경우 로컬 폼 상태 동기화
  useEffect(() => {
    setItemForm(prev => {
      const getComparable = (item: any) => {
        const { files, tempFiles, ...rest } = item;
        return JSON.stringify(rest);
      };
      if (getComparable(prev) !== getComparable(editingItem)) {
        return { ...editingItem };
      }
      return prev;
    });
  }, [editingItem]);

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
      material_price: materials.find(m => m.id === itemForm.material_id)?.unit_price || 0,
      process_time: itemForm.process_time || 0,
      hourly_rate: itemForm.hourly_rate || companyInfo.default_hourly_rate || 0,
      difficulty: itemForm.difficulty || 'C',
      heat_treatment_price: heatTreatments.find(h => h.id === itemForm.heat_treatment_id)?.price_per_kg || 0,
      post_process_price: postProcessings.find(p => p.id === itemForm.post_processing_id)?.price_per_kg || 0,
      outsource_cost: itemForm.outsource_cost || 0,
      profit_rate: itemForm.profit_rate || 0,
      qty_input: itemForm.qty || 1,
      discount_policy: companyInfo?.discount_policy_json,
      custom_costs: itemForm.custom_costs,
      rounding_unit: companyInfo?.default_rounding_unit || 10
    });
  }, [itemForm, materials, companyInfo]);

  // Keep internal form in sync with calculated results so the user can save them
  useEffect(() => {
    setItemForm(prev => {
      if (!prev.custom_costs || typeof prev.custom_costs !== 'object') return prev;
      let hasRemoved = false;
      const nextCosts = { ...prev.custom_costs };
      
      const validKeys = customColumns.map(col => 
        typeof col === 'object' ? (col as any).name || (col as any).id || String(col) : String(col)
      );

      Object.keys(nextCosts).forEach(key => {
        if (!validKeys.includes(key) && key !== '[object Object]') {
          delete nextCosts[key];
          hasRemoved = true;
        }
      });
      return hasRemoved ? { ...prev, custom_costs: nextCosts } : prev;
    });
  }, [customColumns]);

  useEffect(() => {
    if (calcResult.results.length > 0) {
      const res = calcResult.results[0];
      setItemForm(prev => {
        // If unit_price was manually overridden, keep it. Otherwise, track the calculated price.
        const isManual = prev.unit_price > 0 && prev.calculated_price !== undefined && prev.unit_price !== prev.calculated_price;
        const nextUnitPrice = isManual ? prev.unit_price : res.unit_price;
        const nextSupplyPrice = nextUnitPrice * (prev.qty || 1);

        const material = materials.find(m => m.id === prev.material_id);
        const hasValidDensity = (material?.density || 0) > 0;
        const hasValidWeight = calcResult.weight > 0;
        
        // Only overwrite weight-based costs if we can actually calculate a valid weight 
        // (meaning we have both density and non-zero dimensions).
        // Otherwise (e.g. legacy data with 0x0x0 size), preserve the existing cost.
        const canCalculateWeightCosts = hasValidDensity && hasValidWeight;

        const nextMaterialCost = canCalculateWeightCosts ? calcResult.material_cost : prev.material_cost;
        
        // If the user explicitly cleared the ID (null), set cost to 0 regardless of weight.
        const nextHeatCost = prev.heat_treatment_id 
          ? (canCalculateWeightCosts ? calcResult.heat_treatment_cost : prev.heat_treatment_cost)
          : 0;
          
        const nextPostCost = prev.post_processing_id
          ? (canCalculateWeightCosts ? calcResult.post_process_cost : prev.post_process_cost)
          : 0;

        if (
          prev.calculated_price === res.unit_price &&
          prev.unit_price === nextUnitPrice && 
          prev.supply_price === nextSupplyPrice &&
          prev.material_cost === nextMaterialCost &&
          prev.processing_cost === calcResult.processing_cost &&
          prev.heat_treatment_cost === nextHeatCost &&
          prev.post_process_cost === nextPostCost
        ) {
          return prev;
        }
        return {
          ...prev,
          calculated_price: res.unit_price,
          unit_price: nextUnitPrice,
          supply_price: nextSupplyPrice,
          material_cost: nextMaterialCost,
          processing_cost: calcResult.processing_cost,
          heat_treatment_cost: nextHeatCost,
          post_process_cost: nextPostCost
        };
      });
    }
  }, [calcResult, materials]);

  // Auto-save changes to the parent list state (debounced to avoid rendering stutter)
  // onSave 대신 onSaveRef.current 사용 → onSave가 의존성 배열에서 빠져 불필요한 재실행 방지
  useEffect(() => {
    const timer = setTimeout(() => {
      onSaveRef.current(itemForm);
    }, 150);
    return () => clearTimeout(timer);
  }, [itemForm]); // onSave 제거 — ref로 항상 최신 함수 참조

  return (
    <div className="bg-bg-elevated/30 p-2 pl-12 flex items-start gap-2 border-l-2 border-brand-500">
      <div className="flex-1 flex flex-wrap items-center gap-2">
        <div className="w-[120px] flex-none">
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded p-1.5 outline-none focus:border-brand-500 text-[11px] font-bold disabled:opacity-50"
            value={itemForm.heat_treatment_id || ''}
            onChange={e => setItemForm({ ...itemForm, heat_treatment_id: e.target.value || null })}
            disabled={isReadOnly}
          >
            <option value="">열처리(-)</option>
            {heatTreatments.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="w-[120px] flex-none">
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded p-1.5 outline-none focus:border-brand-500 text-[11px] font-bold disabled:opacity-50"
            value={itemForm.post_processing_id || ''}
            onChange={e => setItemForm({ ...itemForm, post_processing_id: e.target.value || null })}
            disabled={isReadOnly}
          >
            <option value="">후처리(-)</option>
            {postProcessings.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="w-[80px] flex-none">
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded p-1.5 outline-none focus:border-brand-500 text-[11px] font-bold text-center disabled:opacity-50"
            value={itemForm.difficulty || 'C'}
            onChange={e => setItemForm({ ...itemForm, difficulty: e.target.value })}
            disabled={isReadOnly}
          >
            {['A','B','C','D','E','F'].map(level => (
              <option key={level} value={level}>난이도: {level}</option>
            ))}
          </select>
        </div>
        <div className="w-[75px] flex-none flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">소요일</span>
          <NumberInput 
            className={`flex-1 min-w-0 ${isReadOnly ? 'opacity-50' : ''}`}
            inputClassName="!w-full !bg-transparent !text-right !text-[11px] !font-bold !p-1 !outline-none !border-none !ring-0 !shadow-none" 
            value={itemForm.work_days || undefined} 
            onChange={val => setItemForm({ ...itemForm, work_days: val })} 
            disabled={isReadOnly}
          />
        </div>
        <div className="w-[75px] flex-none flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">수량</span>
          <NumberInput 
            className={`flex-1 min-w-0 ${isReadOnly ? 'opacity-50' : ''}`}
            inputClassName="!w-full !bg-transparent !text-right !text-[11px] !font-bold !p-1 !outline-none !border-none !ring-0 !shadow-none" 
            value={itemForm.qty || undefined} 
            onChange={val => setItemForm({ ...itemForm, qty: val })} 
            disabled={isReadOnly}
          />
        </div>
        <div className="w-[85px] flex-none flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">Hr</span>
          <NumberInput 
            step={companyInfo?.default_time_step || 0.1}
            className={`flex-1 min-w-0 ${isReadOnly ? 'opacity-50' : ''}`}
            inputClassName="!w-full !bg-transparent !text-right !text-[11px] !font-bold !p-1 !outline-none !border-none !ring-0 !shadow-none" 
            value={itemForm.process_time || undefined} 
            onChange={val => setItemForm({ ...itemForm, process_time: val })} 
            disabled={isReadOnly}
          />
        </div>
        <div className="w-[95px] flex-none flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">이윤%</span>
          <NumberInput 
            step={companyInfo?.default_profit_rate_step || 1}
            className={`flex-1 min-w-0 ${isReadOnly ? 'opacity-50' : ''}`}
            inputClassName="!w-full !bg-transparent !text-right !text-[11px] !font-bold !p-1 !outline-none !border-none !ring-0 !shadow-none" 
            value={itemForm.profit_rate || undefined} 
            onChange={val => setItemForm({ ...itemForm, profit_rate: val })} 
            disabled={isReadOnly}
          />
        </div>
        {customColumns.map((colName, idx) => {
          const displayColName = typeof colName === 'object' ? (colName as any).name || (colName as any).id || '항목' : String(colName);
          return (
          <div key={typeof colName === 'string' ? colName : idx} className="w-[130px] flex-none flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
            <span className="text-[10px] text-text-secondary whitespace-nowrap overflow-hidden text-ellipsis flex-none" style={{ maxWidth: '60px' }} title={displayColName}>{displayColName || '이름없음'}</span>
            <NumberInput 
              className={`flex-1 min-w-0 ${isReadOnly ? 'opacity-50' : ''}`}
              inputClassName="!w-full !bg-transparent !text-right !text-[11px] !font-bold !p-1 !outline-none !border-none !ring-0 !shadow-none" 
              value={itemForm.custom_costs?.[displayColName] ?? itemForm.custom_costs?.[colName as any] ?? undefined} 
              onChange={val => {
                startTransition(() => {
                  setItemForm({
                    ...itemForm,
                    custom_costs: {
                      ...(itemForm.custom_costs || {}),
                      [displayColName]: val
                    }
                  });
                });
              }} 
              disabled={isReadOnly}
            />
          </div>
        );
      })}
        <div className="flex-1 min-w-[200px] flex items-center gap-1 bg-bg-surface border border-border-default rounded px-1.5 focus-within:border-brand-500">
          <span className="text-[10px] text-text-secondary whitespace-nowrap">비고</span>
          <input 
            type="text" 
            className="w-full bg-transparent text-left text-[11px] font-bold p-1 outline-none disabled:opacity-50" 
            value={itemForm.note || ''} 
            onChange={e => setItemForm({ ...itemForm, note: e.target.value })} 
            placeholder="비고 입력"
            disabled={isReadOnly}
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
