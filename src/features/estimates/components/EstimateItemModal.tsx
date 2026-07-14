import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../shared/services/supabase';
import type { EstimateItem, EstimateMetadata } from '../types';
import { INITIAL_ITEM_FORM } from '../types';
import { calculateEstimate } from '../hooks/useEstimateCalculations';
import { SplitPaneModal } from '../../../design-system/SplitPaneModal';
import { DocumentViewer } from './DocumentViewer';
import { Button } from '../../../design-system/Button';
import { Search, FileType, CheckCircle, XCircle, UploadCloud } from 'lucide-react';

import { ItemBasicSpecForm } from './forms/ItemBasicSpecForm';
import { ItemProcessCostForm } from './forms/ItemProcessCostForm';
import { ItemSimilarHistory } from './forms/ItemSimilarHistory';
import { ItemFinalCostForm } from './forms/ItemFinalCostForm';

interface EstimateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimateId: string | null;
  metadata: EstimateMetadata;
  currency: string;
  exchangeRate: number;
  editingItem: EstimateItem | null;
  onSaveSuccess: () => void;
  onSaveFiles: (itemId: string, files: File[]) => Promise<void>;
  onDeleteExistingFile: (fileId: string) => Promise<void>;
  existingItems?: EstimateItem[];
}

// 텍스트 유사도 계산 (Levenshtein Distance)
const getSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  const editDistance = costs[s2.length];
  
  return (longerLength - editDistance) / parseFloat(longerLength.toString());
};

export const EstimateItemModal: React.FC<EstimateItemModalProps> = ({
  isOpen, onClose, estimateId, metadata, currency, exchangeRate,
  editingItem, onSaveSuccess, onSaveFiles, onDeleteExistingFile, existingItems = []
}) => {
  const [itemForm, setItemForm] = useState<EstimateItem>(INITIAL_ITEM_FORM);
  const [qtyInput, setQtyInput] = useState<string>('1');
  const [isManualPrice, setIsManualPrice] = useState(false);

  // Auto-complete & Recommendation states
  const [materialSuggestions, setMaterialSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recommendedMaterials, setRecommendedMaterials] = useState<any[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  // 헤더 드랍존 hover 상태
  const [headerDragOver, setHeaderDragOver] = useState(false);
  
  // Similarity Search
  const [similarItems, setSimilarItems] = useState<EstimateItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Extract metadata arrays
  const { materials = [], postProcessings = [], heatTreatments = [], companyInfo = null } = metadata;
  
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
        setItemForm({ ...editingItem, tempFiles: [] });
        setQtyInput(String(editingItem.qty || 1));
        
        if (editingItem.material_id) {
          const matchedMat = materials.find(m => m.id === editingItem.material_id);
          setSelectedCategory(matchedMat?.category || '일반');
        } else {
          setSelectedCategory('');
        }
      } else {
        setItemForm({
          ...INITIAL_ITEM_FORM,
          hourly_rate: companyInfo?.default_hourly_rate || 50000
        });
        setQtyInput('1');
        setSelectedCategory('');
      }
      if (editingItem && editingItem.calculated_price !== undefined && editingItem.unit_price > 0 && editingItem.unit_price !== editingItem.calculated_price) {
        setIsManualPrice(true);
      } else {
        setIsManualPrice(false);
      }
      setSimilarItems([]);
      setRecommendedMaterials([]);
    }
  }, [isOpen, editingItem, companyInfo, materials]);

  // Derived Qty
  useEffect(() => {
    const firstQty = parseInt(qtyInput.split('/')[0]?.trim().replace(/,/g, ''), 10);
    const validQty = isNaN(firstQty) || firstQty <= 0 ? 1 : firstQty;
    if (validQty !== itemForm.qty) {
      setItemForm(prev => ({ ...prev, qty: validQty }));
    }
  }, [qtyInput]);

  // Auto-complete RPC
  useEffect(() => {
    const timer = setTimeout(async () => {
      const term = itemForm.original_material_name;
      if (term && term.length >= 1) {
        const { data } = await supabase.rpc('get_material_suggestions', { search_term: term });
        if (data) {
          setMaterialSuggestions(data.map((d: any) => d.material_name));
        }
      } else {
        setMaterialSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [itemForm.original_material_name]);

  const fetchMaterialRecommendations = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return;
    setIsRecommending(true);
    try {
      const { data, error } = await supabase.rpc('get_material_recommendations', { search_term: searchTerm });
      if (error) throw error;
      if (data && data.length > 0) {
        const recIds = data.map((r: any) => r.material_id);
        const recMats = materials.filter(m => recIds.includes(m.id));
        setRecommendedMaterials(recMats);
      } else {
        setRecommendedMaterials([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecommending(false);
    }
  };

  // Similarity Search
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (!companyInfo?.id) return;

      const hasDimensions = itemForm.shape === 'rect' 
        ? (itemForm.spec_w > 0 && itemForm.spec_d > 0 && itemForm.spec_h > 0)
        : (itemForm.spec_w > 0 && itemForm.spec_d > 0);
      
      const hasPartNo = itemForm.part_no && itemForm.part_no.length >= 3;

      if (!hasDimensions && !hasPartNo) {
        setSimilarItems([]);
        return;
      }

      setIsSearching(true);
      try {
        let matchedItems: EstimateItem[] = [];

        if (hasDimensions) {
          const wMin = itemForm.spec_w * 0.95, wMax = itemForm.spec_w * 1.05;
          const dMin = itemForm.spec_d * 0.95, dMax = itemForm.spec_d * 1.05;
          
          let query = supabase.from('estimate_items')
            .select('*, estimates!inner(company_id), files(id, file_name, file_type, file_path)')
            .eq('estimates.company_id', companyInfo.id)
            .eq('shape', itemForm.shape)
            .gte('spec_w', wMin).lte('spec_w', wMax)
            .gte('spec_d', dMin).lte('spec_d', dMax);
            
          if (itemForm.shape === 'rect') {
            query = query.gte('spec_h', itemForm.spec_h * 0.95).lte('spec_h', itemForm.spec_h * 1.05);
          }
          
          const { data } = await query.limit(10);
          if (data) matchedItems = [...matchedItems, ...data];
        }

        if (hasPartNo && itemForm.part_no) {
          const prefix = itemForm.part_no.substring(0, 3);
          const { data } = await supabase.from('estimate_items')
            .select('*, estimates!inner(company_id), files(id, file_name, file_type, file_path)')
            .eq('estimates.company_id', companyInfo.id)
            .ilike('part_no', `${prefix}%`)
            .limit(20);

          if (data) {
            const similarPartItems = data.filter(item => getSimilarity(item.part_no, itemForm.part_no!) >= 0.8);
            matchedItems = [...matchedItems, ...similarPartItems];
          }
        }

        const uniqueItems = Array.from(new Map(matchedItems.map(item => [item.id, item])).values()) as EstimateItem[];
        setSimilarItems(uniqueItems.filter(item => item.id !== editingItem?.id));
      } catch (error) {
        console.error("Similarity search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 800);
    return () => clearTimeout(searchTimer);
  }, [itemForm.spec_w, itemForm.spec_d, itemForm.spec_h, itemForm.part_no, itemForm.shape, companyInfo]);

  // Main Calculation Hook
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
      profit_rate: itemForm.profit_rate || 0,
      
      qty_input: itemForm.qty || 1,
      discount_policy: companyInfo?.discount_policy_json,

      raw_w_override: itemForm.raw_w,
      raw_d_override: itemForm.raw_d,
      raw_h_override: itemForm.raw_h,
    });
  }, [itemForm, materials, postProcessings, heatTreatments, companyInfo]);

  // Sync calc results
  useEffect(() => {
    if (!isManualPrice && calcResult.results.length > 0) {
      const res = calcResult.results[0];
      const newUnitPrice = res.unit_price;
      const newSupplyPrice = res.total_price;

      if (
        itemForm.calculated_price !== res.unit_price ||
        itemForm.unit_price !== newUnitPrice || 
        itemForm.supply_price !== newSupplyPrice ||
        itemForm.material_cost !== calcResult.material_cost ||
        itemForm.post_process_cost !== calcResult.post_process_cost ||
        itemForm.heat_treatment_cost !== calcResult.heat_treatment_cost ||
        itemForm.processing_cost !== calcResult.processing_cost
      ) {
        setItemForm(prev => ({
          ...prev,
          calculated_price: res.unit_price,
          unit_price: newUnitPrice,
          supply_price: newSupplyPrice,
          material_cost: calcResult.material_cost,
          post_process_cost: calcResult.post_process_cost,
          heat_treatment_cost: calcResult.heat_treatment_cost,
          processing_cost: calcResult.processing_cost,
        }));
      }
    }
  }, [calcResult, isManualPrice]);

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
    if (!estimateId) return alert('견적서 ID가 없습니다.');
    if (!itemForm.part_name) return alert('품명은 필수입니다.');

    const quantities = qtyInput.split('/')
      .map(q => parseInt(q.trim().replace(/,/g, ''), 10))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);

    if (quantities.length === 0) {
      return alert('유효한 수량을 입력해주세요.');
    }

    const finalUnitPrice = itemForm.unit_price;
    const { tempFiles, files, id, selected, ...cleanItemForm } = itemForm as any;

    if (!editingItem && existingItems.some(i => i.part_no === cleanItemForm.part_no)) {
      if (!confirm(`이미 존재하는 도번입니다: ${cleanItemForm.part_no}\n그래도 등록하시겠습니까?`)) {
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (let i = 0; i < quantities.length; i++) {
        const qty = quantities[i];
        const thisSupplyPrice = finalUnitPrice * qty;

        const payload = {
          estimate_id: estimateId,
          ...cleanItemForm,
          qty,
          material_id: cleanItemForm.material_id || null,
          supply_price: thisSupplyPrice,
          unit_price: finalUnitPrice,
          updated_by: user?.id,
        };

        let savedItemId: string | null = null;

        if (editingItem && i === 0) {
          const { error } = await supabase.from('estimate_items').update(payload).eq('id', editingItem.id);
          if (error) throw error;
          savedItemId = editingItem.id || null;
        } else {
          const { data, error } = await supabase.from('estimate_items').insert([payload]).select().single();
          if (error) throw error;
          savedItemId = data.id;
        }

        if (savedItemId && tempFiles && tempFiles.length > 0) {
          await onSaveFiles(savedItemId, tempFiles);
        }

        if (i > 0 && savedItemId && files && files.length > 0) {
          const filesToCopy = files.map((f: any) => ({
            estimate_item_id: savedItemId,
            file_path: f.file_path,
            file_name: f.file_name,
            file_type: f.file_type || 'ETC',
            version: 1,
            is_current: true
          }));
          await supabase.from('files').insert(filesToCopy);
        }
      }

      onSaveSuccess();
      onClose();
    } catch (e: any) {
      alert(`저장 중 오류가 발생했습니다: ${e.message}`);
    }
  };

  const formContent = (
    <>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
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
        <ItemSimilarHistory
          similarItems={similarItems}
          setItemForm={setItemForm}
          setIsManualPrice={setIsManualPrice}
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
      
      {/* Fixed Footer for Actions */}
      <div className="shrink-0 p-4 bg-bg-surface border-t border-border-default flex gap-4">
        <Button variant="secondary" className="flex-1" onClick={onClose}>취소</Button>
        <Button variant="primary" className="flex-1" onClick={handleSave}>
          {editingItem ? '수정 저장' : '추가하기'}
        </Button>
      </div>
    </>
  );

  const rightPaneContent = (
    <DocumentViewer
      files={itemForm.files || []}
      tempFiles={itemForm.tempFiles || []}
      onRemoveTempFile={(index) =>
        setItemForm(prev => ({
          ...prev,
          tempFiles: (prev.tempFiles || []).filter((_, i) => i !== index)
        }))
      }
      onRemoveDbFile={(fileId) =>
        setItemForm(prev => ({
          ...prev,
          files: (prev.files || []).filter((f: any) => f.id !== fileId)
        }))
      }
    />
  );

  // 헤더 드랍존 — PDF iframe 위 드래그 문제를 우회하는 가장 확실한 방법
  const headerDropZone = (
    <div
      onDragOver={(e) => { e.preventDefault(); setHeaderDragOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); setHeaderDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setHeaderDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setHeaderDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          setItemForm(prev => ({ ...prev, tempFiles: [...(prev.tempFiles || []), ...Array.from(e.dataTransfer.files)] }));
        }
      }}
      className={`flex-1 flex items-center justify-center gap-3 px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer shadow-sm
        ${headerDragOver
          ? 'border-brand-400 bg-brand-500/20 text-brand-300 scale-[1.02] shadow-brand-500/20'
          : 'border-brand-500/40 bg-brand-500/5 text-text-primary hover:border-brand-400 hover:bg-brand-500/10 hover:shadow-brand-500/10'}`}
    >
      <UploadCloud size={18} className={headerDragOver ? 'text-brand-400 animate-bounce' : 'text-brand-500'} />
      <span className="font-semibold text-sm tracking-wide">
        {headerDragOver ? '여기에 놓아서 첨부' : '도면/문서 파일을 여기에 드래그 앤 드롭하세요'}
      </span>
    </div>
  );

  return (
    <SplitPaneModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? "품목 수정" : "새 품목 견적 산출"}
      initialLeftWidthPercent={30}
      leftPane={formContent}
      rightPane={rightPaneContent}
      headerExtra={headerDropZone}
    />
  );
};
