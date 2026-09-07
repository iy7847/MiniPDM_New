import React, { useState, useEffect, useMemo } from 'react';
import { useConfirm } from '../../../app/providers/ConfirmProvider';
import type { EstimateItem, EstimateMetadata } from '../types';
import { createInitialItemForm } from '../types';
import { calculateEstimate } from '../hooks/useEstimateCalculations';
import { useEstimateItemDB } from '../hooks/useEstimateItemDB';
import { SplitPaneModal } from '../../../design-system/SplitPaneModal';
import { Toggle } from '../../../design-system/Toggle';
import { toast } from '../../../shared/stores/useToastStore';
import { EstimateItemHeaderDropZone } from './EstimateItemHeaderDropZone';
import { EstimateItemRightPane } from './EstimateItemRightPane';
import { EstimateItemLeftPane } from './EstimateItemLeftPane';

interface EstimateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimateId: string | null;
  metadata: EstimateMetadata;
  currency: string;
  exchangeRate: number;
  editingItem: EstimateItem | null;
  onSaveSuccess: (item: any) => void;
  onDeleteExistingFile: (fileId: string) => Promise<void>;
  existingItems?: EstimateItem[];
  isReadOnly?: boolean;
  estimate?: any;
}



export const EstimateItemModal: React.FC<EstimateItemModalProps> = ({
  isOpen, onClose, estimateId, metadata, currency, exchangeRate,
  editingItem, onSaveSuccess, onDeleteExistingFile, existingItems = [], isReadOnly = false, estimate
}) => {
  const { confirm } = useConfirm();
  const [itemForm, setItemForm] = useState<EstimateItem>(createInitialItemForm());
  const [qtyInput, setQtyInput] = useState<string>('1');
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { materials = [], postProcessings = [], heatTreatments = [], companyInfo = null } = metadata;
  
  const {
    materialSuggestions,
    recommendedMaterials,
    isRecommending,
    similarItems,
    isSearching,
    fetchMaterialRecommendations,
    prepareEstimateItemPayload,
    resetStates,
  } = useEstimateItemDB(itemForm, companyInfo, materials, editingItem);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(materials.map(m => m.category || '일반'));
    return Array.from(cats).sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    if (!selectedCategory) return materials;
    return materials.filter(m => (m.category || '일반') === selectedCategory);
  }, [materials, selectedCategory]);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setItemForm({ ...editingItem });
        setQtyInput(String(editingItem.qty || 1));
        if (editingItem.material_id) {
          const matchedMat = materials.find(m => m.id === editingItem.material_id);
          setSelectedCategory(matchedMat?.category || '일반');
        } else {
          setSelectedCategory('');
        }
      } else {
        setItemForm(createInitialItemForm(companyInfo));
        setQtyInput('1');
        setSelectedCategory('');
      }
      if (editingItem && editingItem.calculated_price !== undefined && editingItem.unit_price > 0 && editingItem.unit_price !== editingItem.calculated_price) {
        setIsManualPrice(true);
      } else {
        setIsManualPrice(false);
      }
      resetStates();
    }
  }, [isOpen, editingItem, companyInfo, materials]);

  useEffect(() => {
    const firstQty = parseInt(qtyInput.replace(/,/g, ''), 10);
    const validQty = isNaN(firstQty) || firstQty <= 0 ? 1 : firstQty;
    if (validQty !== itemForm.qty) {
      setItemForm(prev => ({ ...prev, qty: validQty }));
    }
  }, [qtyInput]);

  const calcResult = useMemo(() => {
    return calculateEstimate({
      shape: itemForm.shape || 'rect',
      spec_w: itemForm.spec_w || 0,
      spec_d: itemForm.spec_d || 0,
      spec_h: itemForm.spec_h || 0,
      density: materials.find(m => m.id === itemForm.material_id)?.density || 0,
      material_price: materials.find(m => m.id === itemForm.material_id)?.unit_price || 0,
      hourly_rate: itemForm.hourly_rate || companyInfo?.default_hourly_rate || 50000,
      process_time: itemForm.process_time || 0,
      difficulty: itemForm.difficulty || 'B',
      heat_treatment_price: heatTreatments.find(h => h.id === itemForm.heat_treatment_id)?.price_per_kg || 0,
      post_process_price: postProcessings.find(p => p.id === itemForm.post_processing_id)?.price_per_kg || 0,
      outsource_cost: itemForm.outsource_cost || 0,
      custom_costs: itemForm.custom_costs || {},
      profit_rate: itemForm.profit_rate || 0,
      qty_input: itemForm.qty || 1,
      discount_policy: companyInfo?.discount_policy_json,
      raw_w_override: itemForm.raw_w,
      raw_d_override: itemForm.raw_d,
      raw_h_override: itemForm.raw_h,
    });
  }, [itemForm, materials, postProcessings, heatTreatments, companyInfo]);

  useEffect(() => {
    if (calcResult.results.length > 0) {
      const res = calcResult.results[0];
      
      setItemForm(prev => {
        const isManual = prev.unit_price > 0 && prev.calculated_price !== undefined && prev.unit_price !== prev.calculated_price;
        const nextUnitPrice = isManual ? prev.unit_price : res.unit_price;
        const nextSupplyPrice = nextUnitPrice * (prev.qty || 1);

        const material = materials.find(m => m.id === prev.material_id);
        const hasValidDensity = (material?.density || 0) > 0;
        const hasValidWeight = calcResult.weight > 0;
        const canCalculateWeightCosts = hasValidDensity && hasValidWeight;

        const nextMaterialCost = canCalculateWeightCosts ? calcResult.material_cost : prev.material_cost;
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
          prev.post_process_cost === nextPostCost &&
          prev.heat_treatment_cost === nextHeatCost &&
          prev.processing_cost === calcResult.processing_cost
        ) {
          return prev;
        }

        return {
          ...prev,
          calculated_price: res.unit_price,
          unit_price: nextUnitPrice,
          supply_price: nextSupplyPrice,
          material_cost: nextMaterialCost,
          post_process_cost: nextPostCost,
          heat_treatment_cost: nextHeatCost,
          processing_cost: calcResult.processing_cost,
        };
      });
    }
  }, [calcResult, materials]);

  const handleSpecChange = (field: 'spec_w' | 'spec_d' | 'spec_h', value: number) => {
    let marginW = 5, marginD = 5, marginH = 0;
    if (itemForm.shape === 'round') {
      marginW = Number(companyInfo?.default_margin_round_w ?? 5);
      marginD = Number(companyInfo?.default_margin_round_d ?? 5);
      marginH = 0;
    } else {
      marginW = Number(companyInfo?.default_margin_w ?? 5);
      marginD = Number(companyInfo?.default_margin_d ?? 5);
      marginH = Number(companyInfo?.default_margin_h ?? 0);
    }

    setItemForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'spec_w') next.raw_w = value + (value > 0 ? marginW : 0);
      if (field === 'spec_d') next.raw_d = value + (value > 0 ? marginD : 0);
      if (field === 'spec_h') next.raw_h = value + (value > 0 ? marginH : 0);
      return next;
    });
    setIsManualPrice(false);
  };

  const handleSave = async () => {
    if (!estimateId) { toast.error('견적서 ID가 없습니다.'); return; }
    if (!itemForm.part_name) { toast.error('품명은 필수입니다.'); return; }

    const qty = parseInt(qtyInput.replace(/,/g, ''), 10);
    if (isNaN(qty) || qty <= 0) { toast.error('유효한 수량을 입력해주세요.'); return; }

    const finalUnitPrice = itemForm.unit_price;
    const { tempFiles, selected, ...cleanItemForm } = itemForm as any;

    if (!editingItem && existingItems.some(i => i.part_no === cleanItemForm.part_no)) {
      if (!(await confirm({ title: '중복 도번 알림', description: `이미 존재하는 도번입니다: ${cleanItemForm.part_no}\n그래도 등록하시겠습니까?`, isDanger: true }))) {
        return;
      }
    }

    try {
      const payload = await prepareEstimateItemPayload(estimateId || '', cleanItemForm, qty, finalUnitPrice, tempFiles || []);
      onSaveSuccess(payload);
      onClose();
    } catch (e: any) {
      toast.error(`저장 중 오류가 발생했습니다: ${e.message}`);
    }
  };

  return (
    <SplitPaneModal
      isOpen={isOpen}
      onClose={onClose}
      title={isReadOnly ? "상세 보기" : editingItem ? "품목 수정" : "새 품목 견적 산출"}
      initialLeftWidthPercent={30}
      leftPane={
        <EstimateItemLeftPane 
          itemForm={itemForm} setItemForm={setItemForm}
          isReadOnly={isReadOnly} onClose={onClose}
          handleSave={handleSave} editingItem={editingItem}
          showSuggestions={showSuggestions} setShowSuggestions={setShowSuggestions}
          materialSuggestions={materialSuggestions} fetchMaterialRecommendations={fetchMaterialRecommendations}
          isRecommending={isRecommending} recommendedMaterials={recommendedMaterials}
          handleSpecChange={handleSpecChange} selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory} uniqueCategories={uniqueCategories}
          filteredMaterials={filteredMaterials} calcResult={calcResult}
          heatTreatments={heatTreatments} postProcessings={postProcessings}
          qtyInput={qtyInput} setQtyInput={setQtyInput} setIsManualPrice={setIsManualPrice}
          estimate={estimate}
        />
      }
      rightPane={<EstimateItemRightPane itemForm={itemForm} setItemForm={setItemForm} isReadOnly={isReadOnly} />}
      headerExtra={<EstimateItemHeaderDropZone isReadOnly={isReadOnly} setItemForm={setItemForm} />}
    />
  );
};
