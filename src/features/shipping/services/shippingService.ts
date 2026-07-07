import { supabase } from '@/shared/services/supabase';

export async function getShipments(companyId: string) {
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      *,
      orders:order_id (
        po_no,
        client_id,
        clients:client_id (
          name
        )
      ),
      shipment_items (*)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
