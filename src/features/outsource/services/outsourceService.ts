import { supabase } from '@/shared/services/supabase';

export const fetchOutsourceOrders = async (status?: string) => {
  let query = supabase.from('outsource_orders').select('*').order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getOutsourceOrderById = async (id: string) => {
  const { data, error } = await supabase.from('outsource_orders').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createOutsourceOrder = async (orderData: any) => {
  const { data, error } = await supabase.from('outsource_orders').insert(orderData).select().single();
  if (error) throw error;
  return data;
};

export const updateOutsourceOrder = async (id: string, orderData: any) => {
  const { data, error } = await supabase.from('outsource_orders').update(orderData).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteOutsourceOrder = async (id: string) => {
  const { error } = await supabase.from('outsource_orders').delete().eq('id', id);
  if (error) throw error;
};
