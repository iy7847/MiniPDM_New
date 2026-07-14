import React from 'react';
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
  postProcessings
}) => {
  return (
    <div className="space-y-4 pt-4 border-t border-border-default">
      <h3 className="text-lg font-bold text-text-primary border-b border-border-default pb-2">2. 공정 비용 계산</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">소재 분류</label>
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">전체보기</option>
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">세부 소재 (적용)</label>
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500 font-bold"
            value={itemForm.material_id || ''}
            onChange={e => setItemForm({ ...itemForm, material_id: e.target.value })}
          >
            <option value="">선택하세요</option>
            {filteredMaterials.map(m => <option key={m.id} value={m.id}>{m.code} ({m.name})</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {itemForm.shape === 'rect' ? (
          <>
            <div><NumberInput label="원소재 W" value={itemForm.raw_w} onChange={v => setItemForm({ ...itemForm, raw_w: v })} /></div>
            <div><NumberInput label="원소재 D" value={itemForm.raw_d} onChange={v => setItemForm({ ...itemForm, raw_d: v })} /></div>
            <div><NumberInput label="원소재 T" value={itemForm.raw_h} onChange={v => setItemForm({ ...itemForm, raw_h: v })} /></div>
          </>
        ) : (
          <>
            <div><NumberInput label="원소재 OD" value={itemForm.raw_w} onChange={v => setItemForm({ ...itemForm, raw_w: v })} /></div>
            <div><NumberInput label="원소재 L" value={itemForm.raw_d} onChange={v => setItemForm({ ...itemForm, raw_d: v })} /></div>
            <div className="opacity-50"><NumberInput label="-" value={0} onChange={() => {}} disabled /></div>
          </>
        )}
      </div>
      <div className="text-right text-sm text-text-secondary">
        예상 소재비: <strong className="text-brand-500">₩ {calcResult?.material_cost?.toLocaleString() || 0}</strong> ({calcResult?.weight || 0} kg)
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div><NumberInput label="가공 시간 (Hr)" value={itemForm.process_time} onChange={v => setItemForm({ ...itemForm, process_time: v })} /></div>
        <div><NumberInput label="임율 (₩/Hr)" value={itemForm.hourly_rate} onChange={v => setItemForm({ ...itemForm, hourly_rate: v })} /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">난이도</label>
          <select
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500"
            value={itemForm.difficulty}
            onChange={e => setItemForm({ ...itemForm, difficulty: e.target.value })}
          >
            <option value="A">A (하)</option><option value="B">B (중)</option><option value="C">C (상)</option>
            <option value="D">D (최상)</option><option value="E">E (극상)</option><option value="F">F (연구)</option>
          </select>
        </div>
        <div className="col-span-2 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm text-text-secondary mb-1">열처리</label>
            <select
              className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500"
              value={itemForm.heat_treatment_id || ''}
              onChange={e => setItemForm({ ...itemForm, heat_treatment_id: e.target.value || null })}
            >
              <option value="">없음</option>
              {heatTreatments.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-text-secondary mb-1">후처리</label>
            <select
              className="w-full bg-bg-surface border border-border-default text-text-primary rounded-md p-2 outline-none focus:border-brand-500"
              value={itemForm.post_processing_id || ''}
              onChange={e => setItemForm({ ...itemForm, post_processing_id: e.target.value || null })}
            >
              <option value="">없음</option>
              {postProcessings.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
