import { supabase } from '@/shared/services/supabase';

export const fetchProcessLogs = async () => {
  const { data, error } = await supabase.from('process_logs').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getProcessLogById = async (id: string) => {
  const { data, error } = await supabase.from('process_logs').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createProcessLog = async (logData: any) => {
  const { data, error } = await supabase.from('process_logs').insert(logData).select().single();
  if (error) throw error;
  return data;
};

export const updateProcessLog = async (id: string, logData: any) => {
  const { data, error } = await supabase.from('process_logs').update(logData).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteProcessLog = async (id: string) => {
  const { error } = await supabase.from('process_logs').delete().eq('id', id);
  if (error) throw error;
};
