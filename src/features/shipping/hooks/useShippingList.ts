import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/services/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from '@/shared/stores/useToastStore';
import type { Shipment, ShipmentItem } from '../types';

export interface PendingShippingItem {
  id: string;
  order_id: string;
  order_item_no?: string;
  part_name: string;
  part_no: string;
  spec: string;
  qty: number;
  production_qty: number;
  client_id: string;
  client_name: string;
  po_no?: string;
  order_no: string;
  client_po_no?: string;
  delivery_date?: string;
  shippable_qty: number;
}

export const useShippingList = () => {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState<PendingShippingItem[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getCompanyId = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    if (error || !data?.company_id) return null;
    return data.company_id;
  }, [user]);

  const fetchPendingItems = useCallback(async () => {
    try {
      const companyId = await getCompanyId();
      if (!companyId) return;

      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          orders!inner(id, po_no, client_id, delivery_date, company_id, clients(name)),
          shipment_items(quantity)
        `)
        .eq('orders.company_id', companyId)
        .in('production_status', ['SHIPPING_READY', 'DONE']);

      if (error) throw error;

      const items: PendingShippingItem[] = (data || []).map((item: any) => {
        const shippedQty = (item.shipment_items || []).reduce((sum: number, si: any) => sum + Number(si.quantity), 0);
        const targetQty = item.production_qty ?? item.qty;
        const shippableQty = targetQty - shippedQty;

        return {
          id: item.id,
          order_id: item.order_id,
          order_item_no: item.order_item_no || '-',
          part_name: item.part_name,
          part_no: item.part_no,
          spec: item.spec,
          qty: item.qty,
          production_qty: item.production_qty,
          client_id: item.orders.client_id,
          client_name: item.orders.clients?.name || '알 수 없음',
          po_no: item.client_po_no || item.orders.po_no,
          order_no: item.orders.po_no,
          client_po_no: item.client_po_no || '-',
          delivery_date: item.orders.delivery_date,
          shippable_qty: shippableQty,
        };
      }).filter((item: PendingShippingItem) => item.shippable_qty > 0);

      setPendingItems(items);
    } catch (err: any) {
      console.error('Failed to fetch pending shipping items:', err);
      toast.error('출하 대기 목록 로드 실패: ' + (err.message || '알 수 없는 오류'));
    }
  }, [getCompanyId]);

  const fetchShipments = useCallback(async () => {
    try {
      const companyId = await getCompanyId();
      if (!companyId) return;

      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          clients(name),
          shipment_items(
            *,
            order_items(id, part_name, part_no, spec, order_item_no, qty, production_qty)
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('fetchShipments Supabase Error:', error);
        toast.error('출하 내역 로드 실패: ' + error.message);
        throw error;
      }
      setShipments(data || []);
    } catch (err: any) {
      console.error('Failed to fetch shipments:', err);
    }
  }, [getCompanyId]);

  const reload = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPendingItems(), fetchShipments()]);
    setLoading(false);
  }, [fetchPendingItems, fetchShipments]);

  // 출하 취소 및 롤백
  const cancelShipment = async (shipmentId: string) => {
    try {
      // 1. shipment_items 조회하여 연결된 order_item_id 목록 추출
      const { data: sItems, error: sErr } = await supabase
        .from('shipment_items')
        .select('order_item_id')
        .eq('shipment_id', shipmentId);
      if (sErr) throw sErr;

      const itemIds = (sItems || []).map(si => si.order_item_id);

      // 2. shipment_items 및 shipment 삭제
      const { error: delItemsErr } = await supabase
        .from('shipment_items')
        .delete()
        .eq('shipment_id', shipmentId);
      if (delItemsErr) throw delItemsErr;

      const { error: delShipErr } = await supabase
        .from('shipments')
        .delete()
        .eq('id', shipmentId);
      if (delShipErr) throw delShipErr;

      // 3. order_items의 production_status를 'SHIPPING_READY'로 롤백
      if (itemIds.length > 0) {
        await supabase
          .from('order_items')
          .update({ production_status: 'SHIPPING_READY', updated_at: new Date().toISOString() })
          .in('id', itemIds);
      }

      toast.success('출하가 성공적으로 취소되었습니다.');
      await reload();
      return true;
    } catch (err: any) {
      console.error('Failed to cancel shipment:', err);
      toast.error('출하 취소 실패: ' + (err.message || '오류가 발생했습니다.'));
      return false;
    }
  };

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    pendingItems,
    shipments,
    loading,
    reload,
    cancelShipment
  };
};
