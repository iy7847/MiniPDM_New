import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NumberInput } from '../../../../design-system/NumberInput';
import type { EstimateItem } from '../../types';

interface ItemProcessCostFormProps {
  itemForm: EstimateItem;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  uniqueCategories: string[];
  filteredMaterials: any[];
  calcResult: any;
  heatTreatments: any[];
  postProcessings: any[];
  disabled?: boolean;
}

export const ItemProcessCostForm: React.FC<ItemProcessCostFormProps> = ({
  itemForm,
  setItemForm,
  selectedCategory,
  setSelectedCategory,
  uniqueCategories,
  filteredMaterials,
  calcResult,
  heatTreatments,
  postProcessings,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-4 pt-4 border-t border-border-default">
      <div 
        className="flex justify-between items-center cursor-pointer border-b border-border-default pb-2 select-none hover:bg-bg-elevated -mx-2 px-2 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-text-primary">2. 공정 비용 계산</h3>
        {isOpen ? <ChevronDown size={20} className="text-text-secondary" /> : <ChevronRight size={20} className="text-text-secondary" />}
      </div>
      
      {isOpen && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">소재 분류</label>
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500 disabled:opacity-50"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            disabled={disabled}
          >
            <option value="">전체보기</option>
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">세부 소재 (적용)</label>
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500 font-bold disabled:opacity-50"
            value={itemForm.material_id || ''}
            onChange={e => setItemForm({ ...itemForm, material_id: e.target.value })}
            disabled={disabled}
          >
            <option value="">선택하세요</option>
            {filteredMaterials.map(m => <option key={m.id} value={m.id}>{m.code} ({m.name})</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {itemForm.shape === 'rect' ? (
          <>
            <div><NumberInput label="원소재 T (두께)" value={itemForm.raw_h || 0} onChange={v => setItemForm({ ...itemForm, raw_h: v || 0 })} disabled={disabled} /></div>
            <div><NumberInput label="원소재 W (가로)" value={itemForm.raw_w || 0} onChange={v => setItemForm({ ...itemForm, raw_w: v || 0 })} disabled={disabled} /></div>
            <div><NumberInput label="원소재 D (세로)" value={itemForm.raw_d || 0} onChange={v => setItemForm({ ...itemForm, raw_d: v || 0 })} disabled={disabled} /></div>
          </>
        ) : (
          <>
            <div><NumberInput label="원소재 OD" value={itemForm.raw_w || 0} onChange={v => setItemForm({ ...itemForm, raw_w: v || 0 })} disabled={disabled} /></div>
            <div><NumberInput label="원소재 L" value={itemForm.raw_d || 0} onChange={v => setItemForm({ ...itemForm, raw_d: v || 0 })} disabled={disabled} /></div>
            <div className="opacity-50"><NumberInput label="-" value={0} onChange={() => {}} disabled={true} /></div>
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 text-sm mt-2">
        <label className="text-text-secondary">소재비:</label>
        <div className="w-32">
          <NumberInput 
            value={itemForm.material_cost ?? calcResult?.material_cost ?? 0}
            onChange={v => setItemForm({ ...itemForm, material_cost: v || 0 })} 
            disabled={disabled}
          />
        </div>
        <span className="text-text-secondary text-xs">({calcResult?.weight || 0} kg)</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div><NumberInput label="가공 시간 (Hr)" value={itemForm.process_time || 0} onChange={v => setItemForm({ ...itemForm, process_time: v || 0 })} disabled={disabled} /></div>
        <div><NumberInput label="임율 (₩/Hr)" value={itemForm.hourly_rate || 0} onChange={v => setItemForm({ ...itemForm, hourly_rate: v || 0 })} disabled={disabled} /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">난이도</label>
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500 disabled:opacity-50"
            value={itemForm.difficulty}
            onChange={e => setItemForm({ ...itemForm, difficulty: e.target.value })}
            disabled={disabled}
          >
            <option value="A">A (하)</option><option value="B">B (중)</option><option value="C">C (상)</option>
            <option value="D">D (최상)</option><option value="E">E (극상)</option><option value="F">F (연구)</option>
          </select>
        </div>
        <div className="col-span-2 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm text-text-secondary mb-1">열처리</label>
            <select
              className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500 disabled:opacity-50"
              value={itemForm.heat_treatment_id || ''}
              onChange={e => setItemForm({ ...itemForm, heat_treatment_id: e.target.value || null })}
              disabled={disabled}
            >
              <option value="">없음</option>
              {heatTreatments.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            {itemForm.heat_treatment_id && (
              <div className="mt-2">
                <NumberInput 
                  label="열처리 비용"
                  value={itemForm.heat_treatment_cost ?? calcResult?.heat_treatment_cost ?? 0}
                  onChange={v => setItemForm({ ...itemForm, heat_treatment_cost: v || 0 })}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm text-text-secondary mb-1">후처리</label>
            <select
              className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500 disabled:opacity-50"
              value={itemForm.post_processing_id || ''}
              onChange={e => setItemForm({ ...itemForm, post_processing_id: e.target.value || null })}
              disabled={disabled}
            >
              <option value="">없음</option>
              {postProcessings.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {itemForm.post_processing_id && (
              <div className="mt-2">
                <NumberInput 
                  label="후처리 비용"
                  value={itemForm.post_process_cost ?? calcResult?.post_process_cost ?? 0}
                  onChange={v => setItemForm({ ...itemForm, post_process_cost: v || 0 })}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </div>
        </div>
        </div>
      )}
    </div>
  );
};
