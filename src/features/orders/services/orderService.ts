import { supabase } from '@/shared/services/supabase';

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
      order_items (*)
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
