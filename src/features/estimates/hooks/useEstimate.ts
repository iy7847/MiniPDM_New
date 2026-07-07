import { useState, useEffect, useCallback } from 'react';
import * as estimateService from '../services/estimateService';
import type { Estimate, EstimateItem } from '../types';
import { INITIAL_ITEM_FORM } from '../types';

export function useEstimateList() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEstimates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await estimateService.fetchEstimates();
      setEstimates(data as any || []);
    } catch (err: any) {
      setError(err.message);
      // Fallback for UI if DB is empty/failing during development
      setEstimates([
        { id: '1', project_name: '알루미늄 브라켓 가공', client_id: 'C1', company_id: 'COM1', currency: 'KRW', base_exchange_rate: 1, total_amount: 1500000, status: 'DRAFT', created_at: '2026-07-01', updated_at: '2026-07-01', clients: { name: 'A테크' } },
        { id: '2', project_name: 'SUS 하우징 제작', client_id: 'C2', company_id: 'COM1', currency: 'KRW', base_exchange_rate: 1, total_amount: 3200000, status: 'ORDERED', created_at: '2026-07-02', updated_at: '2026-07-02', clients: { name: 'B정공' } },
        { id: '3', project_name: '특수 지그 세트', client_id: 'C3', company_id: 'COM1', currency: 'KRW', base_exchange_rate: 1, total_amount: 850000, status: 'ARCHIVED', created_at: '2026-07-03', updated_at: '2026-07-03', clients: { name: 'C산업' } },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  return { estimates, loading, error, reload: loadEstimates };
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

  useEffect(() => {
    if (!id || id === 'new') return;
    
    const loadDetail = async () => {
      try {
        setLoading(true);
        const data = await estimateService.getEstimateById(id);
        setEstimate(data as any || {
            id, project_name: '알루미늄 브라켓 가공', client_id: 'A테크', created_at: '2026-07-01', status: 'DRAFT', total_amount: 1500000
        });
        // mock items for now
        setItems([
          { ...INITIAL_ITEM_FORM, id: '1', part_no: 'PART-001', part_name: '브라켓 TYPE-1', original_material_name: 'AL6061', qty: 10, unit_price: 33000, supply_price: 330000, shape: 'rect', spec_w: 100, spec_d: 150, spec_h: 20 },
          { ...INITIAL_ITEM_FORM, id: '2', part_no: 'PART-002', part_name: '브라켓 TYPE-2', original_material_name: 'AL6061', qty: 20, unit_price: 33000, supply_price: 660000 },
          { ...INITIAL_ITEM_FORM, id: '3', part_no: 'PART-003', part_name: '브라켓 TYPE-3', original_material_name: 'AL6061', qty: 30, unit_price: 33000, supply_price: 990000 },
        ]);
      } catch (err: any) {
        setError(err.message);
        // Fallback for UI if DB is failing during development
        setEstimate({
            id, project_name: '알루미늄 브라켓 가공', client_id: 'A테크', created_at: '2026-07-01', status: 'DRAFT', total_amount: 1500000
        });
        setItems([
          { ...INITIAL_ITEM_FORM, id: '1', part_no: 'PART-001', part_name: '브라켓 TYPE-1', original_material_name: 'AL6061', qty: 10, unit_price: 33000, supply_price: 330000, shape: 'rect', spec_w: 100, spec_d: 150, spec_h: 20 },
          { ...INITIAL_ITEM_FORM, id: '2', part_no: 'PART-002', part_name: '브라켓 TYPE-2', original_material_name: 'AL6061', qty: 20, unit_price: 33000, supply_price: 660000 },
          { ...INITIAL_ITEM_FORM, id: '3', part_no: 'PART-003', part_name: '브라켓 TYPE-3', original_material_name: 'AL6061', qty: 30, unit_price: 33000, supply_price: 990000 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id]);

  const saveDetail = async (updatedEstimate: Partial<Estimate>, updatedItems: EstimateItem[]) => {
    try {
      setSaving(true);
      if (id === 'new') {
        // const newData = await estimateService.createEstimate(updatedEstimate);
        // console.log("Created", newData);
      } else {
        // await estimateService.updateEstimate(id!, updatedEstimate);
        // console.log("Updated", id);
      }
      setEstimate({ ...estimate, ...updatedEstimate });
      setItems(updatedItems);
    } catch (err: any) {
      setError(err.message);
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

  return { estimate, setEstimate, items, setItems, loading, error, saving, saveDetail, updateItem, addItem, removeItems };
}
