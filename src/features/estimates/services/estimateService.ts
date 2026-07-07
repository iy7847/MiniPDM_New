import { supabase } from '@/shared/services/supabase';

export const fetchEstimates = async () => {
  const { data, error } = await supabase.from('estimates').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getEstimateById = async (id: string) => {
  const { data, error } = await supabase.from('estimates').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createEstimate = async (estimateData: any) => {
  const { data, error } = await supabase.from('estimates').insert(estimateData).select().single();
  if (error) throw error;
  return data;
};

export const updateEstimate = async (id: string, estimateData: any) => {
  const { data, error } = await supabase.from('estimates').update(estimateData).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteEstimate = async (id: string) => {
  const { error } = await supabase.from('estimates').delete().eq('id', id);
  if (error) throw error;
};

export const saveEstimateWithItems = async (estimate: any, items: any[]) => {
  const { data, error } = await supabase.rpc('upsert_estimate_with_items', {
    p_estimate: estimate,
    p_items: items,
  });
  if (error) throw error;
  return data;
};

export const getEstimateWithItems = async (id: string) => {
  const { data: estimate, error: estError } = await supabase
    .from('estimates')
    .select('*, clients(name)')
    .eq('id', id)
    .single();
    
  if (estError) throw estError;

  const { data: items, error: itemsError } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('estimate_id', id);
    
  if (itemsError) throw itemsError;

  return { estimate, items };
};
