import { useState, useEffect } from 'react';
import { supabase } from '@/shared/services/supabase';

export function useProductionList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('order_items')
        .select(`
          *,
          files (*),
          estimate_items (
            files (*)
          ),
          orders!inner (
            id, po_no, order_date, status, client_id, delivery_date,
            clients ( name )
          )
        `)
        .in('orders.status', ['PRODUCTION', 'ORDERED', 'INSPECTION'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      if (data) {
        const formatted = data.map(item => {
          return {
            ...item,
            order: item.orders,
            spec: item.spec_w && item.spec_d ? `${item.spec_w} x ${item.spec_d} x ${item.spec_h}` : '-',
            client_name: item.orders?.clients 
              ? (Array.isArray(item.orders.clients) ? item.orders.clients[0]?.name : (item.orders.clients as any)?.name)
              : '알 수 없음',
            po_no: item.orders?.po_no || '-',
            delivery_date: item.due_date || item.orders?.delivery_date,
            production_status: (item.production_status || 'PENDING').toUpperCase()
          };
        });
        setItems(formatted);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const updateItemSupplyConfig = async (
    itemId: string, 
    updates: { supply_type?: string, use_stock?: boolean, production_status?: string, material_supply_type?: string, production_qty?: number }
  ) => {
    try {
      const currentItem = items.find(i => i.id === itemId);
      if (!currentItem) throw new Error("Item not found");

      let finalUpdates = { ...updates };
      
      const newSupplyType = finalUpdates.supply_type ?? currentItem.supply_type;
      let newUseStock = finalUpdates.use_stock ?? currentItem.use_stock;
      let newMaterialSupply = finalUpdates.material_supply_type ?? currentItem.material_supply_type;
      
      // NEW RULE: When explicitly switching supply_type
      if (updates.supply_type) {
        if (updates.supply_type === 'OUTSOURCE' && (newMaterialSupply === 'NONE' || !newMaterialSupply)) {
          finalUpdates.material_supply_type = 'PROVIDED';
          newMaterialSupply = 'PROVIDED';
        } else if (updates.supply_type === 'INHOUSE' && (newMaterialSupply === 'PROVIDED' || newMaterialSupply === 'NONE' || !newMaterialSupply)) {
          finalUpdates.material_supply_type = 'ORDER';
          newMaterialSupply = 'ORDER';
        }
      }
      
      // Auto-fill Rules for other state changes (like use_stock toggle)
      if (newUseStock === true) {
        finalUpdates.material_supply_type = 'NONE';
      } else if (newSupplyType === 'PURCHASE') {
        finalUpdates.material_supply_type = 'NONE';
      } else {
        if (newSupplyType === 'INHOUSE' && newMaterialSupply === 'PROVIDED') {
          finalUpdates.material_supply_type = 'ORDER';
        } else if (newMaterialSupply === 'NONE' || !newMaterialSupply) {
          finalUpdates.material_supply_type = 'ORDER';
        }
      }

      const { error: updateError } = await supabase
        .from('order_items')
        .update(finalUpdates)
        .eq('id', itemId);
        
      if (updateError) throw updateError;
      
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...finalUpdates } : item
      ));
      
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const transferToOutsourceOrPurchase = async (itemIds: string[]) => {
    try {
      // Only allow transferring PENDING items
      const itemsToUpdate = items.filter(i => itemIds.includes(i.id) && (i.production_status === 'PENDING' || !i.production_status));
      if (itemsToUpdate.length === 0) {
        return { success: false, error: '진행할 수 있는 대기(PENDING) 항목이 없습니다.' };
      }

      const ids = itemsToUpdate.map(i => i.id);

      // Call the RPC to handle status updates and inserts into outsource_orders/material_orders
      const { error } = await supabase.rpc('release_production_orders', { p_item_ids: ids });
      if (error) throw error;

      // 갱신 (로컬 상태 업데이트 - 화면에서 사라지지 않고 상태만 변경되도록 함)
      setItems(prev => prev.map(item => {
        if (!ids.includes(item.id)) return item;
        
        let newStatus = item.production_status;
        if (item.supply_type === 'OUTSOURCE') newStatus = 'OUTSOURCE_READY';
        else if (item.supply_type === 'PURCHASE') newStatus = 'PURCHASE_READY';
        else newStatus = 'PRODUCTION_READY';
        
        return { ...item, production_status: newStatus };
      }));
      
      return { success: true, count: itemsToUpdate.length };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const cancelProgress = async (itemIds: string[]) => {
    try {
      // Only allow cancelling *_READY items
      const itemsToUpdate = items.filter(i => itemIds.includes(i.id) && ['PRODUCTION_READY', 'OUTSOURCE_READY', 'PURCHASE_READY'].includes(i.production_status));
      if (itemsToUpdate.length === 0) {
        return { success: false, error: '취소할 수 있는 항목이 없습니다. (이미 진행 중이거나 완료된 항목은 취소 불가)' };
      }

      const ids = itemsToUpdate.map(i => i.id);

      const { error } = await supabase
        .from('order_items')
        .update({ production_status: 'PENDING' })
        .in('id', ids);
        
      if (error) throw error;

      setItems(prev => prev.map(item => {
        if (ids.includes(item.id)) return { ...item, production_status: 'PENDING' };
        return item;
      }));
      
      return { success: true, count: itemsToUpdate.length };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  return { items, loading, error, updateItemSupplyConfig, transferToOutsourceOrPurchase, cancelProgress, reload: fetchItems };
}
