import { useState, useCallback } from 'react';
import { supabase } from '@/shared/services/supabase';
import type { ItemSupplier } from '@/shared/types/material';

export type ItemType = 'MATERIAL' | 'POST_PROCESSING' | 'HEAT_TREATMENT';

const getTableConfig = (type: ItemType) => {
  switch (type) {
    case 'MATERIAL': return { table: 'materials', dbType: 'material' };
    case 'POST_PROCESSING': return { table: 'post_processings', dbType: 'post_processing' };
    case 'HEAT_TREATMENT': return { table: 'heat_treatments', dbType: 'heat_treatment' };
  }
};

export const useMaterials = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async (companyId: string, type: ItemType) => {
    setIsLoading(true);
    setError(null);
    try {
      const config = getTableConfig(type);
      const [itemsRes, suppliersRes] = await Promise.all([
        supabase.from(config.table).select('*').eq('company_id', companyId).order('name'),
        supabase.from('item_suppliers').select('*').eq('company_id', companyId).eq('item_type', config.dbType)
      ]);
        
      if (itemsRes.error) throw itemsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      
      const formattedData = itemsRes.data.map((item: any) => ({
        ...item,
        suppliers: suppliersRes.data.filter(s => s.item_id === item.id)
      }));
      
      setItems(formattedData);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveItem = useCallback(async (companyId: string, type: ItemType, itemData: any, suppliersData?: Partial<ItemSupplier>[]) => {
    setIsLoading(true);
    setError(null);
    try {
      let savedItem;
      const isNew = !itemData.id;
      const config = getTableConfig(type);
      
      // Drop 'suppliers' and normalize price columns based on table schema
      const { suppliers: _dropped, unit_price, price_per_kg, ...restData } = itemData;
      
      const cleanItemData: any = { ...restData };
      if (type === 'MATERIAL') {
        cleanItemData.unit_price = unit_price || price_per_kg || 0;
      } else {
        cleanItemData.price_per_kg = price_per_kg || unit_price || 0;
      }

      if (isNew) {
        const { data, error: err } = await supabase
          .from(config.table)
          .insert([{ ...cleanItemData, company_id: companyId }])
          .select()
          .single();
        if (err) throw err;
        savedItem = data;
      } else {
        const { data, error: err } = await supabase
          .from(config.table)
          .update(cleanItemData)
          .eq('id', cleanItemData.id)
          .eq('company_id', companyId)
          .select()
          .single();
        if (err) throw err;
        savedItem = data;
      }

      if (suppliersData && savedItem) {
        if (!isNew) {
          const { error: delErr } = await supabase
            .from('item_suppliers')
            .delete()
            .eq('item_id', savedItem.id)
            .eq('company_id', companyId);
          if (delErr) throw delErr;
        }

        if (suppliersData.length > 0) {
          const suppliersToInsert = suppliersData.map(sup => ({
            ...sup,
            item_id: savedItem.id,
            item_type: config.dbType,
            company_id: companyId
          }));
          const { error: insErr } = await supabase
            .from('item_suppliers')
            .insert(suppliersToInsert);
          if (insErr) throw insErr;
        }
      }

      await fetchItems(companyId, type);
      return savedItem;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchItems]);

  const deleteItem = useCallback(async (companyId: string, type: ItemType, id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const config = getTableConfig(type);
      
      const { error: delSupErr } = await supabase
        .from('item_suppliers')
        .delete()
        .eq('item_id', id)
        .eq('company_id', companyId);
      if (delSupErr) throw delSupErr;

      const { error: err } = await supabase
        .from(config.table)
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
        
      if (err) throw err;
      await fetchItems(companyId, type);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    fetchItems,
    saveItem,
    deleteItem,
  };
};
