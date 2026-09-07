import { useState } from 'react';
import { supabase } from '@/shared/services/supabase';

export interface ReceivingItem {
  id: string;
  type: 'OUTSOURCE' | 'MATERIAL';
  po_no: string;
  item_name: string;
  part_no?: string;
  item_spec?: string;
  supplier_name: string;
  ordered_qty: number;
  received_qty: number;
  expected_date?: string;
  status: string;
}

export function useReceiving() {
  const [loading, setLoading] = useState(false);
  const [scannedItems, setScannedItems] = useState<ReceivingItem[]>([]);

  // 1. 바코드로 품목 조회
  const fetchItemByBarcode = async (barcode: string) => {
    setLoading(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barcode);
      
      let outsourceQuery = supabase.from('outsource_orders').select(`
        id, po_no, item_name, item_spec, process_name, quantity, received_qty, expected_date, status,
        clients ( name ),
        order_items ( part_no )
      `);
      
      let materialQuery = supabase.from('material_orders').select(`
        id, po_no, quantity, received_qty, expected_date, status,
        clients ( name ),
        order_items ( material_name, spec, part_no )
      `);

      if (isUuid) {
        outsourceQuery = outsourceQuery.eq('id', barcode);
        materialQuery = materialQuery.eq('id', barcode);
      } else {
        outsourceQuery = outsourceQuery.eq('po_no', barcode);
        materialQuery = materialQuery.eq('po_no', barcode);
      }

      const [outsourceRes, materialRes] = await Promise.all([
        outsourceQuery,
        materialQuery
      ]);

      const items: ReceivingItem[] = [];

      if (outsourceRes.data) {
        outsourceRes.data.forEach((d: any) => {
          items.push({
            id: d.id,
            type: 'OUTSOURCE',
            po_no: d.po_no || '-',
            item_name: d.item_name,
            part_no: d.order_items?.part_no || '-',
            item_spec: d.item_spec,
            supplier_name: d.clients?.name || '미지정',
            ordered_qty: d.quantity,
            received_qty: d.received_qty || 0,
            expected_date: d.expected_date,
            status: d.status
          });
        });
      }

      if (materialRes.data) {
        materialRes.data.forEach((d: any) => {
          items.push({
            id: d.id,
            type: 'MATERIAL',
            po_no: d.po_no || '-',
            item_name: d.order_items?.material_name || '-',
            part_no: d.order_items?.part_no || '-',
            item_spec: d.order_items?.spec || '-',
            supplier_name: d.clients?.name || '미지정',
            ordered_qty: d.quantity,
            received_qty: d.received_qty || 0,
            expected_date: d.expected_date,
            status: d.status
          });
        });
      }

      if (items.length === 0) {
        return { success: false, error: '해당 바코드로 발주 내역을 찾을 수 없습니다.' };
      }

      setScannedItems(prev => {
        const next = [...prev];
        items.forEach(item => {
          if (!next.find(i => i.id === item.id)) {
            next.push(item);
          }
        });
        return next;
      });

      return { success: true, items };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (id: string) => {
    setScannedItems(prev => prev.filter(i => i.id !== id));
  };

  const receiveItem = async (id: string, type: 'OUTSOURCE' | 'MATERIAL', receivedQtyToAdd: number, isComplete: boolean) => {
    setLoading(true);
    try {
      const table = type === 'OUTSOURCE' ? 'outsource_orders' : 'material_orders';
      
      const item = scannedItems.find(i => i.id === id);
      if (!item) throw new Error('항목을 찾을 수 없습니다.');
      
      const newReceivedQty = item.received_qty + receivedQtyToAdd;
      
      // 만약 새로 계산된 수량이 발주수량보다 크거나 같거나, 사용자가 "입고완료" 토글을 강제한 경우
      const nextStatus = (isComplete || newReceivedQty >= item.ordered_qty) ? '입고완료' : '수신확인';

      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const updateData: any = {
        received_qty: newReceivedQty,
        status: nextStatus,
        updated_at: now
      };
      if (nextStatus === '입고완료') {
        updateData.received_date = today;
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      // 로컬 상태 업데이트
      setScannedItems(prev => prev.map(i => {
        if (i.id === id) {
          return { ...i, received_qty: newReceivedQty, status: nextStatus };
        }
        return i;
      }));

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    scannedItems,
    fetchItemByBarcode,
    removeItem,
    receiveItem
  };
}
