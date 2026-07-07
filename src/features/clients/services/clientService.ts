import { supabase } from '@/shared/services/supabase';

export const fetchClients = async (type?: 'customer' | 'supplier') => {
  let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
  
  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getClientById = async (id: string) => {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createClient = async (clientData: any) => {
  const { data, error } = await supabase.from('clients').insert(clientData).select().single();
  if (error) throw error;
  return data;
};

export const updateClient = async (id: string, clientData: any) => {
  const { data, error } = await supabase.from('clients').update(clientData).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteClient = async (id: string) => {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
};
