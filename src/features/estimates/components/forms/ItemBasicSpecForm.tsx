import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BaseInput } from '../../../../design-system/BaseInput';
import { NumberInput } from '../../../../design-system/NumberInput';
import { Button } from '../../../../design-system/Button';
import type { EstimateItem } from '../../types';

interface ItemBasicSpecFormProps {
  itemForm: EstimateItem;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  materialSuggestions: string[];
  fetchMaterialRecommendations: (term: string) => void;
  isRecommending: boolean;
  recommendedMaterials: any[];
  handleSpecChange: (field: 'spec_w' | 'spec_d' | 'spec_h', value: number) => void;
  disabled?: boolean;
}

export const ItemBasicSpecForm: React.FC<ItemBasicSpecFormProps> = ({
  itemForm,
  setItemForm,
  showSuggestions,
  setShowSuggestions,
  materialSuggestions,
  fetchMaterialRecommendations,
  isRecommending,
  recommendedMaterials,
  handleSpecChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-4">
      <div 
        className="flex justify-between items-center cursor-pointer border-b border-border-default pb-2 select-none hover:bg-bg-elevated -mx-2 px-2 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-text-primary">1. 기본 규격 및 형상</h3>
        {isOpen ? <ChevronDown size={20} className="text-text-secondary" /> : <ChevronRight size={20} className="text-text-secondary" />}
      </div>
      
      {isOpen && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      
      <div className="flex bg-bg-surface border border-border-default rounded-lg p-1">
        <button
          onClick={() => !disabled && setItemForm({ ...itemForm, shape: 'rect' })}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${itemForm.shape === 'rect' ? 'bg-brand-500 text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
          disabled={disabled}
        >
          ⬛ 사각 (Plate)
        </button>
        <button
          onClick={() => !disabled && setItemForm({ ...itemForm, shape: 'round' })}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${itemForm.shape === 'round' ? 'bg-brand-500 text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
          disabled={disabled}
        >
          ⚫ 원형 (Round)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">품명</label>
          <BaseInput value={itemForm.part_name || ''} onChange={e => setItemForm({ ...itemForm, part_name: e.target.value })} placeholder="품명" disabled={disabled} />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">도번</label>
          <BaseInput value={itemForm.part_no || ''} onChange={e => setItemForm({ ...itemForm, part_no: e.target.value })} placeholder="도번" disabled={disabled} />
        </div>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">도면 소재명 (원본)</label>
        <div className="flex gap-2 relative">
          <BaseInput
            value={itemForm.original_material_name || ''}
            onChange={e => {
              setItemForm({ ...itemForm, original_material_name: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => { if (materialSuggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="예: A6061-T6"
            disabled={disabled}
          />
          
          {showSuggestions && materialSuggestions.length > 0 && !disabled && (
            <ul className="absolute z-50 left-0 top-full mt-1 w-full bg-bg-elevated border border-border-default rounded-md shadow-xl max-h-40 overflow-y-auto custom-scrollbar">
              {materialSuggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  className="px-4 py-2 text-sm hover:bg-brand-500/10 cursor-pointer text-text-primary"
                  onClick={() => {
                    setItemForm(prev => ({ ...prev, original_material_name: suggestion }));
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="secondary"
            className="whitespace-nowrap shrink-0"
            onClick={() => fetchMaterialRecommendations(itemForm.original_material_name || '')}
            disabled={!itemForm.original_material_name || isRecommending || disabled}
          >
            {isRecommending ? '...' : 'DB 매핑'}
          </Button>
        </div>
        
        {recommendedMaterials.length > 0 && !disabled && (
          <div className="mt-2 flex flex-wrap gap-2 p-3 bg-bg-surface border border-border-default rounded-md text-sm">
            <span className="text-xs text-text-secondary w-full">추천 매핑:</span>
            {recommendedMaterials.map(mat => (
              <button
                key={mat.id}
                onClick={() => setItemForm(prev => ({ ...prev, material_id: mat.id }))}
                className="text-xs px-2 py-1 bg-brand-500/10 text-brand-400 rounded hover:bg-brand-500/20 border border-brand-500/20 transition-colors"
              >
                {mat.code} ({mat.name})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {itemForm.shape === 'rect' ? (
          <>
            <div><NumberInput label="T (두께)" value={itemForm.spec_h || 0} onChange={v => handleSpecChange('spec_h', v || 0)} disabled={disabled} /></div>
            <div><NumberInput label="W (가로)" value={itemForm.spec_w || 0} onChange={v => handleSpecChange('spec_w', v || 0)} disabled={disabled} /></div>
            <div><NumberInput label="D (세로)" value={itemForm.spec_d || 0} onChange={v => handleSpecChange('spec_d', v || 0)} disabled={disabled} /></div>
          </>
        ) : (
          <>
            <div><NumberInput label="Ø (외경)" value={itemForm.spec_w || 0} onChange={v => handleSpecChange('spec_w', v || 0)} disabled={disabled} /></div>
            <div><NumberInput label="L (길이)" value={itemForm.spec_d || 0} onChange={v => handleSpecChange('spec_d', v || 0)} disabled={disabled} /></div>
            <div className="opacity-50"><NumberInput label="-" value={0} onChange={() => {}} disabled /></div>
          </>
        )}
      </div>
        </div>
      )}
    </div>
  );
};
