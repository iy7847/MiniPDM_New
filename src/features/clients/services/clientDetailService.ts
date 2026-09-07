import { supabase } from '@/shared/services/supabase';
import type { Client } from '@/shared/types/client';

export interface ClientOrderItemPrice {
  id: string;
  orderId: string;
  poNo: string;
  orderDate: string;
  partNo: string;
  partName: string;
  material: string;
  spec: string;
  unitPrice: number;
  qty: number;
}

export const clientDetailService = {
  async getClientById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch client detail:', error);
      return null;
    }
    return data;
  },

  async getClientOrders(clientId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, po_no, order_number, order_date, delivery_date, total_amount, status, created_at')
      .eq('client_id', clientId)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch client orders:', error);
      return [];
    }
    return data || [];
  },

  async getClientEstimates(clientId: string) {
    const { data, error } = await supabase
      .from('estimates')
      .select('id, quotation_no, project_name, total_amount, status, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch client estimates:', error);
      return [];
    }
    return data || [];
  },

  async getClientPartPrices(clientId: string): Promise<ClientOrderItemPrice[]> {
    // 1. 해당 거래처의 수주 목록 가져오기
    const { data: orders } = await supabase
      .from('orders')
      .select('id, po_no, order_date')
      .eq('client_id', clientId);

    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    // 2. 해당 수주들에 포함된 order_items 조회
    const { data: items, error } = await supabase
      .from('order_items')
      .select('id, order_id, part_no, part_name, material, material_spec, unit_price, qty, production_qty')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false });

    if (error || !items) {
      console.error('Failed to fetch client order items:', error);
      return [];
    }

    return items.map((item) => {
      const order = orderMap.get(item.order_id);
      return {
        id: item.id,
        orderId: item.order_id,
        poNo: order?.po_no || '수주',
        orderDate: order?.order_date || '',
        partNo: item.part_no || '-',
        partName: item.part_name || '-',
        material: item.material || '-',
        spec: item.material_spec || '-',
        unitPrice: Number(item.unit_price) || 0,
        qty: Number(item.qty || item.production_qty) || 1,
      };
    });
  },
};
