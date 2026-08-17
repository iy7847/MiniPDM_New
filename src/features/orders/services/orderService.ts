import { supabase } from '@/shared/services/supabase';
import { buildOrderPoNo } from '@/shared/utils/poNumberUtils';

export async function getOrders(companyId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      clients:client_id (
        id,
        name
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrderWithItems(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      clients:client_id (
        id,
        name
      ),
      estimates:estimate_id (
        id,
        base_exchange_rate,
        currency
      ),
      order_items (
        *,
        files (*),
        estimate_items:estimate_item_id (
          *,
          files (*)
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProductionStatus(
  orderItemId: string,
  productionStatus: 'PENDING' | 'IN_PROGRESS' | 'QC' | 'DONE'
) {
  const { data, error } = await supabase
    .from('order_items')
    .update({ production_status: productionStatus })
    .eq('id', orderItemId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrdersWithFilters({
  companyId,
  searchTerm,
  status,
  startDate,
  endDate,
  clientId,
  page,
  pageSize
}: {
  companyId: string;
  searchTerm: string;
  status: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  page: number;
  pageSize: number;
}) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      clients:client_id (id, name),
      estimates:estimate_id (id, project_name),
      order_items (count)
    `, { count: 'exact' })
    .eq('company_id', companyId);

  // 상태 필터링
  if (status && status !== '전체' && status !== 'ALL') {
    if (status === '수주등록' || status === 'ORDERED') query = query.in('status', ['ORDERED', 'PENDING']);
    else if (status === '생산중' || status === 'PRODUCTION') query = query.eq('status', 'PRODUCTION');
    else if (status === '출하대기' || status === 'INSPECTION') query = query.eq('status', 'INSPECTION');
    else if (status === '완료' || status === 'DELIVERED') query = query.eq('status', 'DELIVERED');
    else query = query.eq('status', status);
  }

  // 거래처 필터링
  if (clientId && clientId !== 'ALL') {
    query = query.eq('client_id', clientId);
  }

  // 기간 필터링 (order_date 또는 created_at 기준)
  if (startDate) {
    query = query.gte('order_date', startDate);
  }
  if (endDate) {
    query = query.lte('order_date', endDate);
  }

  // 검색어 필터링 (po_no, order_number)
  if (searchTerm) {
    query = query.or(`po_no.ilike.%${searchTerm}%,order_number.ilike.%${searchTerm}%`);
  }

  // 페이징
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw error;
  
  return { data, count };
}

export async function updateOrderItemSupply(
  orderItemId: string,
  supplyType: string,
  useStock: boolean
) {
  const { data, error } = await supabase
    .from('order_items')
    .update({ supply_type: supplyType, use_stock: useStock })
    .eq('id', orderItemId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDirectOrder(orderData: {
  companyId: string;
  clientId: string;
  poNo?: string;
  orderDate?: string;
  deliveryDate?: string;
  currency?: string;
  exchangeRate?: number;
  note?: string;
}) {
  let poNo = orderData.poNo?.trim();
  const todayStr = new Date().toISOString().slice(0, 10);
  
  if (!poNo) {
    const targetDate = orderData.orderDate || todayStr;
    const startOfMonth = new Date(targetDate.slice(0, 7) + '-01T00:00:00Z').toISOString();
    
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', orderData.companyId)
      .gte('created_at', startOfMonth);
      
    poNo = buildOrderPoNo((count || 0) + 1, targetDate);
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([{
      company_id: orderData.companyId,
      client_id: orderData.clientId,
      po_no: poNo,
      order_number: poNo,
      order_date: orderData.orderDate || todayStr,
      delivery_date: orderData.deliveryDate || todayStr,
      status: 'ORDERED',
      currency: orderData.currency || 'KRW',
      exchange_rate: orderData.exchangeRate || 1,
      note: orderData.note || '',
      total_amount: 0
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
