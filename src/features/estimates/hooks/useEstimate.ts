import { useState, useEffect, useCallback } from 'react';
import * as estimateService from '../services/estimateService';
import type { Estimate, EstimateItem } from '../types';
import { supabase } from '@/shared/services/supabase';

export interface EstimateMetadata {
  materials: any[];
  postProcessings: any[];
  heatTreatments: any[];
  companyInfo: any;
}

export function useEstimateMetadata(companyId: string | null) {
  const [metadata, setMetadata] = useState<EstimateMetadata>({
    materials: [],
    postProcessings: [],
    heatTreatments: [],
    companyInfo: null,
  });

  useEffect(() => {
    if (!companyId) return;

    const fetchMetadata = async () => {
      try {
        const [matsRes, ppsRes, htsRes, compRes] = await Promise.all([
          supabase.from('materials').select('*').eq('company_id', companyId),
          supabase.from('post_processings').select('*').eq('company_id', companyId),
          supabase.from('heat_treatments').select('*').eq('company_id', companyId),
          supabase.from('companies').select('*').eq('id', companyId).single(),
        ]);

        setMetadata({
          materials: matsRes.data || [],
          postProcessings: ppsRes.data || [],
          heatTreatments: htsRes.data || [],
          companyInfo: compRes.data || null,
        });
      } catch (err) {
        console.error('Failed to fetch estimate metadata:', err);
      }
    };

    fetchMetadata();
  }, [companyId]);

  return metadata;
}

import { useSearchParams, useLocation } from 'react-router-dom';

export function useEstimateList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Restore or save URL params using sessionStorage
  useEffect(() => {
    // 1. Initial load from a clean URL (e.g., clicking the sidebar link)
    if (searchParams.toString() === '' && !initialized) {
      const saved = sessionStorage.getItem('estimates_query');
      if (saved) {
        setSearchParams(new URLSearchParams(saved), { replace: true });
        // Return early to wait for the URL to actually change before marking as initialized
        return;
      }
    }

    // 2. Mark as initialized once we have our parameters (either restored or fresh)
    if (!initialized) {
      setInitialized(true);
      return;
    }

    // 3. Save the current parameters to session storage whenever they change
    // Only save if we are currently on the estimates page (prevents overwriting during unmount transitions)
    if (location.pathname === '/estimates') {
      sessionStorage.setItem('estimates_query', searchParams.toString());
    }
  }, [searchParams, initialized, setSearchParams, location.pathname]);

  // Read URL params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'ALL';
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';
  const pageSize = 20;

  // Local state for debounced search
  const [localSearch, setLocalSearch] = useState(search);

  // Sync localSearch when URL search param changes externally (e.g. from sessionStorage restore or back button)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Update URL function
  const updateParams = (newParams: Record<string, string | undefined>) => {
    const current = Object.fromEntries(searchParams.entries());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        delete current[key];
      } else {
        current[key] = value;
      }
    });
    // If anything other than page changed, reset to page 1
    if (newParams.search !== undefined || newParams.status !== undefined || newParams.start !== undefined || newParams.end !== undefined) {
      if (newParams.page === undefined) current.page = '1';
    }
    setSearchParams(current);
  };

  // Debounce effect for text search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        updateParams({ search: localSearch, page: '1' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, search]);

  const loadEstimates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, count } = await estimateService.fetchEstimates({
        page, pageSize, search, status, startDate, endDate
      });
      setEstimates(data as any || []);
      setTotalCount(count);
    } catch (err: any) {
      setError(err.message);
      setEstimates([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, startDate, endDate]);

  useEffect(() => {
    if (initialized) {
      loadEstimates();
    }
  }, [loadEstimates, initialized]);

  return { 
    estimates, totalCount, loading, error, reload: loadEstimates,
    page, pageSize, search, localSearch, setLocalSearch, status, startDate, endDate, updateParams
  };
}

export function useEstimateDetail(id: string | undefined) {
  const [estimate, setEstimate] = useState<Partial<Estimate>>({
    project_name: '',
    client_id: '',
    created_at: new Date().toISOString().split('T')[0],
    status: 'DRAFT',
    total_amount: 0,
  });
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id || id === 'new') return;
    try {
      setLoading(true);
      const { estimate: estData, items: itemsData } = await estimateService.getEstimateWithItems(id);
      setEstimate(estData || {
          id, project_name: '', client_id: '', created_at: new Date().toISOString().split('T')[0], status: 'DRAFT', total_amount: 0
      });
      setItems(prevItems => {
        const newItems = itemsData || [];
        return newItems.map(newItem => {
          const prevItem = prevItems.find(p => p.id === newItem.id);
          if (prevItem && prevItem.tempFiles && prevItem.tempFiles.length > 0) {
            return { ...newItem, tempFiles: prevItem.tempFiles };
          }
          return newItem;
        });
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const saveDetail = async (updatedEstimate: Partial<Estimate>, updatedItems: EstimateItem[]) => {
    try {
      setSaving(true);
      if (id === 'new') {
        const data = await estimateService.saveEstimateWithItems(updatedEstimate, updatedItems);
        setEstimate({ ...estimate, ...updatedEstimate, id: data?.id });
        // id가 new일 때는 navigate 되므로 굳이 loadDetail 할 필요 없지만, 일관성을 위해 둠
        setItems(updatedItems); 
        return data;
      } else {
        const data = await estimateService.saveEstimateWithItems({ ...updatedEstimate, id }, updatedItems);
        await loadDetail();
        return data;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (itemId: string, updates: Partial<EstimateItem>) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
  };
  
  const addItem = (item: EstimateItem) => {
    setItems(prev => [...prev, item]);
  };
  
  const removeItems = (itemIds: string[]) => {
    setItems(prev => prev.filter(item => !itemIds.includes(item.id!)));
  };

  return { estimate, setEstimate, items, setItems, loading, error, saving, saveDetail, updateItem, addItem, removeItems, reload: loadDetail };
}
