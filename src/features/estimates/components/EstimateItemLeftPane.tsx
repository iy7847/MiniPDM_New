import React from 'react';
import type { EstimateItem } from '../types';
import { Button } from '../../../design-system/Button';
import { ItemBasicSpecForm } from './forms/ItemBasicSpecForm';
import { ItemProcessCostForm } from './forms/ItemProcessCostForm';
import { ItemFinalCostForm } from './forms/ItemFinalCostForm';

interface EstimateItemLeftPaneProps {
  itemForm: EstimateItem;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  isReadOnly: boolean;
  onClose: () => void;
  handleSave: () => void;
  editingItem: EstimateItem | null;
  // Props for ItemBasicSpecForm
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  materialSuggestions: string[];
  fetchMaterialRecommendations: (term: string) => void;
  isRecommending: boolean;
  recommendedMaterials: any[];
  handleSpecChange: (field: 'spec_w' | 'spec_d' | 'spec_h', value: number) => void;
  // Props for ItemProcessCostForm
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  uniqueCategories: string[];
  filteredMaterials: any[];
  calcResult: any;
  heatTreatments: any[];
  postProcessings: any[];
  // Props for ItemFinalCostForm
  qtyInput: string;
  setQtyInput: (qty: string) => void;
  setIsManualPrice: (val: boolean) => void;
}

export const EstimateItemLeftPane: React.FC<EstimateItemLeftPaneProps> = ({
  itemForm, setItemForm, isReadOnly, onClose, handleSave, editingItem,
  showSuggestions, setShowSuggestions, materialSuggestions, fetchMaterialRecommendations,
  isRecommending, recommendedMaterials, handleSpecChange,
  selectedCategory, setSelectedCategory, uniqueCategories, filteredMaterials,
  calcResult, heatTreatments, postProcessings,
  qtyInput, setQtyInput, setIsManualPrice
}) => {
  return (
    <>
      <div className="shrink-0 p-4 bg-bg-surface border-b border-border-default z-10 shadow-sm relative flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">현재 계산된 단가</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-brand-500">
              ₩ {itemForm.unit_price.toLocaleString()}
            </span>
            <span className="text-sm text-text-tertiary">/ ea</span>
          </div>
        </div>
        {itemForm.calculated_price !== undefined && itemForm.calculated_price > 0 && (
          <div className="text-xs text-text-tertiary">
            원가: ₩ {itemForm.calculated_price.toLocaleString()}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {isReadOnly && (
          <div className="bg-warning/10 text-warning px-4 py-3 rounded-lg text-sm font-bold text-center">
            읽기 전용 모드입니다. 내용을 수정할 수 없습니다.
          </div>
        )}
        <ItemBasicSpecForm
          itemForm={itemForm}
          setItemForm={setItemForm}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          materialSuggestions={materialSuggestions}
          fetchMaterialRecommendations={fetchMaterialRecommendations}
          isRecommending={isRecommending}
          recommendedMaterials={recommendedMaterials}
          handleSpecChange={handleSpecChange}
          disabled={isReadOnly}
        />
        <ItemProcessCostForm
          itemForm={itemForm}
          setItemForm={setItemForm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          uniqueCategories={uniqueCategories}
          filteredMaterials={filteredMaterials}
          calcResult={calcResult}
          heatTreatments={heatTreatments}
          postProcessings={postProcessings}
        />
        <ItemFinalCostForm
          qtyInput={qtyInput}
          setQtyInput={setQtyInput}
          itemForm={itemForm}
          setItemForm={setItemForm}
          setIsManualPrice={setIsManualPrice}
          calcResult={calcResult}
        />
      </div>
      
      <div className="shrink-0 p-4 bg-bg-surface border-t border-border-default flex gap-4 z-10">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          {isReadOnly ? '닫기' : '취소'}
        </Button>
        {!isReadOnly && (
          <Button variant="primary" className="flex-1" onClick={handleSave}>
            {editingItem ? '수정 저장' : '추가하기'}
          </Button>
        )}
      </div>
    </>
  );
};
