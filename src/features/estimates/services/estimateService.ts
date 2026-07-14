import { supabase } from '@/shared/services/supabase';

export interface FetchEstimatesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const fetchEstimates = async (params?: FetchEstimatesParams) => {
  const { page = 1, pageSize = 20, search, status, startDate, endDate } = params || {};
  
  let query;

  if (search && search.trim() !== '') {
    // Use the RPC for searching across project_name, id(UUID), and clients.name
    query = supabase.rpc('search_estimates_v2', { search_term: search.trim() }, { count: 'exact' });
  } else {
    // Standard fetch
    query = supabase.from('estimates').select('*, clients(name)', { count: 'exact' });
  }

  if (status && status !== 'ALL') {
    query = query.eq('status', status);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    // Add 1 day to include the whole end date if it's just YYYY-MM-DD
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    query = query.lt('created_at', end.toISOString().split('T')[0]);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  
  if (error) throw error;
  
  // Map RPC output to match the embedded clients(name) structure
  const formattedData = data?.map((item: any) => {
    if (search && search.trim() !== '') {
      return {
        ...item,
        clients: { name: item.client_name }
      };
    }
    return item;
  });

  return { data: formattedData, count: count || 0 };
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

export interface SearchPastItemsParams {
  companyId: string;
  keyword?: string;
  noteKeyword?: string;
  statusFilter?: string;
  sizeW?: number;
  sizeD?: number;
  sizeH?: number;
  tolerance?: number;
}

export const searchPastItems = async (params: SearchPastItemsParams) => {
  const { companyId, keyword, noteKeyword, statusFilter, sizeW, sizeD, sizeH, tolerance = 0 } = params;

  let query = supabase
    .from('estimate_items')
    .select(`
      *,
      estimate:estimates!inner (
        id,
        project_name,
        created_at,
        status,
        company_id,
        currency,
        base_exchange_rate
      ),
      material:materials (
        name,
        code
      ),
      files (*)
    `)
    .eq('estimate.company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('estimate.status', statusFilter);
  }

  if (keyword && keyword.trim() !== '') {
    query = query.or(`part_name.ilike.%${keyword.trim()}%,part_no.ilike.%${keyword.trim()}%`);
  }

  if (noteKeyword && noteKeyword.trim() !== '') {
    query = query.ilike('note', `%${noteKeyword.trim()}%`);
  }

  const ratio = tolerance / 100;

  if (sizeW) {
    const min = sizeW * (1 - ratio);
    const max = sizeW * (1 + ratio);
    query = query.gte('spec_w', min).lte('spec_w', max);
  }
  
  if (sizeD) {
    const min = sizeD * (1 - ratio);
    const max = sizeD * (1 + ratio);
    query = query.gte('spec_d', min).lte('spec_d', max);
  }

  if (sizeH) {
    const min = sizeH * (1 - ratio);
    const max = sizeH * (1 + ratio);
    query = query.gte('spec_h', min).lte('spec_h', max);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
};
