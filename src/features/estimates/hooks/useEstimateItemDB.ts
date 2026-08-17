import { useState, useEffect } from 'react';
import { supabase } from '../../../shared/services/supabase';
import type { EstimateItem } from '../types';

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

export function useEstimateItemDB(itemForm: EstimateItem, companyInfo: any, materials: any[], editingItem: EstimateItem | null) {
  const [materialSuggestions, setMaterialSuggestions] = useState<string[]>([]);
  const [recommendedMaterials, setRecommendedMaterials] = useState<any[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [similarItems, setSimilarItems] = useState<EstimateItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Material Recommendations
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

  // Prepare Item Payload (Does not save to DB directly)
  const prepareEstimateItemPayload = async (estimateId: string, itemForm: any, qty: number, finalUnitPrice: number, tempFiles: File[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    const thisSupplyPrice = finalUnitPrice * qty;

    const payload = {
      estimate_id: estimateId,
      ...itemForm,
      qty,
      material_id: itemForm.material_id || null,
      supply_price: thisSupplyPrice,
      unit_price: finalUnitPrice,
      updated_by: user?.id,
      tempFiles: tempFiles || []
    };

    if (!payload.id || payload.id === 'NEW-PART' || payload.id.startsWith('temp-')) {
      payload.id = crypto.randomUUID();
    }
    
    return payload;
  };

  return {
    materialSuggestions,
    recommendedMaterials,
    isRecommending,
    similarItems,
    isSearching,
    fetchMaterialRecommendations,
    prepareEstimateItemPayload,
    resetStates: () => {
      setSimilarItems([]);
      setRecommendedMaterials([]);
    }
  };
}
