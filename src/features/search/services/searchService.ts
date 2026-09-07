import { supabase } from '@/shared/services/supabase';

export interface GlobalSearchResult {
  estimates: Array<{
    id: string;
    quotation_no?: string;
    project_name?: string;
    client_name?: string;
    status?: string;
    total_amount?: number;
    created_at?: string;
  }>;
  orders: Array<{
    id: string;
    po_no?: string;
    order_number?: string;
    client_name?: string;
    status?: string;
    total_amount?: number;
    order_date?: string;
  }>;
  items: Array<{
    id: string;
    order_id?: string;
    po_no?: string;
    part_no?: string;
    part_name?: string;
    spec?: string;
    order_item_no?: string;
    client_name?: string;
    production_status?: string;
  }>;
  clients: Array<{
    id: string;
    name: string;
    biz_num?: string;
    manager_name?: string;
    manager_phone?: string;
  }>;
  shipments: Array<{
    id: string;
    shipment_no: string;
    tracking_no?: string;
    recipient_name?: string;
    client_name?: string;
    status?: string;
    shipped_at?: string;
  }>;
}

export const searchService = {
  async searchAll(companyId: string, rawQuery: string): Promise<GlobalSearchResult> {
    const q = rawQuery.trim();
    if (!q) {
      return { estimates: [], orders: [], items: [], clients: [], shipments: [] };
    }

    const pattern = `%${q}%`;

    // 5대 핵심 도메인 병렬 쿼리
    const [estimatesRes, ordersRes, itemsRes, clientsRes, shipmentsRes] = await Promise.allSettled([
      // 1. 견적서 검색 (quotation_no, project_name)
      supabase
        .from('estimates')
        .select('id, quotation_no, project_name, status, total_amount, created_at, clients(name)')
        .eq('company_id', companyId)
        .or(`project_name.ilike.${pattern},quotation_no.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(5),

      // 2. 수주 검색 (po_no, order_number)
      supabase
        .from('orders')
        .select('id, po_no, order_number, status, total_amount, order_date, clients(name)')
        .eq('company_id', companyId)
        .or(`po_no.ilike.${pattern},order_number.ilike.${pattern}`)
        .order('order_date', { ascending: false })
        .limit(5),

      // 3. 도면/부품 검색 (order_items)
      supabase
        .from('order_items')
        .select('id, order_id, part_no, part_name, spec, order_item_no, production_status, orders(po_no, clients(name))')
        .or(`part_no.ilike.${pattern},part_name.ilike.${pattern},order_item_no.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(6),

      // 4. 거래처 검색 (name, manager_name)
      supabase
        .from('clients')
        .select('id, name, biz_num, manager_name, manager_phone')
        .eq('company_id', companyId)
        .or(`name.ilike.${pattern},manager_name.ilike.${pattern}`)
        .order('name', { ascending: true })
        .limit(5),

      // 5. 출하 전표 검색 (shipment_no, tracking_no, recipient_name)
      supabase
        .from('shipments')
        .select('id, shipment_no, tracking_no, recipient_name, status, shipped_at, clients(name)')
        .eq('company_id', companyId)
        .or(`shipment_no.ilike.${pattern},tracking_no.ilike.${pattern},recipient_name.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    // 결과 정제
    const estimates = estimatesRes.status === 'fulfilled' && estimatesRes.value.data
      ? estimatesRes.value.data.map((e: any) => ({
          id: e.id,
          quotation_no: e.quotation_no,
          project_name: e.project_name || '제목 없음',
          client_name: e.clients?.name,
          status: e.status,
          total_amount: e.total_amount,
          created_at: e.created_at,
        }))
      : [];

    const orders = ordersRes.status === 'fulfilled' && ordersRes.value.data
      ? ordersRes.value.data.map((o: any) => ({
          id: o.id,
          po_no: o.po_no,
          order_number: o.order_number,
          client_name: o.clients?.name,
          status: o.status,
          total_amount: o.total_amount,
          order_date: o.order_date,
        }))
      : [];

    const items = itemsRes.status === 'fulfilled' && itemsRes.value.data
      ? itemsRes.value.data.map((item: any) => ({
          id: item.id,
          order_id: item.order_id,
          po_no: item.orders?.po_no,
          part_no: item.part_no,
          part_name: item.part_name || '품명 미지정',
          spec: item.spec,
          order_item_no: item.order_item_no,
          client_name: item.orders?.clients?.name,
          production_status: item.production_status,
        }))
      : [];

    const clients = clientsRes.status === 'fulfilled' && clientsRes.value.data
      ? clientsRes.value.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          biz_num: c.biz_num,
          manager_name: c.manager_name,
          manager_phone: c.manager_phone,
        }))
      : [];

    const shipments = shipmentsRes.status === 'fulfilled' && shipmentsRes.value.data
      ? shipmentsRes.value.data.map((s: any) => ({
          id: s.id,
          shipment_no: s.shipment_no,
          tracking_no: s.tracking_no,
          recipient_name: s.recipient_name,
          client_name: s.clients?.name,
          status: s.status,
          shipped_at: s.shipped_at,
        }))
      : [];

    return { estimates, orders, items, clients, shipments };
  },
};
