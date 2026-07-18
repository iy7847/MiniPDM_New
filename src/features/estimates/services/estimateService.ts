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

  if (!formattedData || formattedData.length === 0) {
    return { data: formattedData as Estimate[], count: count || 0 };
  }

  // 품목 수 계산
  const estimateIds = formattedData.map((est: any) => est.id);
  const { data: itemsData } = await supabase
    .from('estimate_items')
    .select('estimate_id')
    .in('estimate_id', estimateIds);

  const itemCounts = itemsData?.reduce((acc: any, item: any) => {
    acc[item.estimate_id] = (acc[item.estimate_id] || 0) + 1;
    return acc;
  }, {});

  const finalData = formattedData.map((est: any) => ({
    ...est,
    item_count: itemCounts?.[est.id] || 0
  }));

  return { data: finalData as Estimate[], count: count || 0 };
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
  // 1. Delete items first (due to potential lack of ON DELETE CASCADE)
  const { error: itemsError } = await supabase
    .from('estimate_items')
    .delete()
    .eq('estimate_id', id);
    
  if (itemsError) throw itemsError;

  // 2. Delete the estimate
  const { error } = await supabase.from('estimates').delete().eq('id', id);
  if (error) throw error;
};

export const saveEstimateWithItems = async (estimate: any, items: any[]) => {
  const cleanEstimate = { ...estimate };
  if (cleanEstimate.client_id === '') cleanEstimate.client_id = null;

  const cleanItems = items.map(item => {
    const cleaned = { ...item };
    // Maintain the original temp id temporarily so we can map files back
    // The RPC will handle upserting
    if (cleaned.id && !cleaned.id.includes('-')) {
      // It's already a valid UUID
    } else {
      cleaned.id = crypto.randomUUID(); // Assign new UUID for temp items
    }
    
    if (cleaned.material_id === '') cleaned.material_id = null;
    if (cleaned.post_processing_id === '') cleaned.post_processing_id = null;
    if (cleaned.heat_treatment_id === '') cleaned.heat_treatment_id = null;
    
    // UI 전용 필드 제거
    delete cleaned.tempFiles;
    delete cleaned.files;
    delete cleaned.selected;
    return cleaned;
  });

  const { data, error } = await supabase.rpc('upsert_estimate_with_items', {
    p_estimate: cleanEstimate,
    p_items: cleanItems,
  });
  if (error) throw error;

  // Insert files for the items
  for (let i = 0; i < items.length; i++) {
    const originalItem = items[i];
    const newId = cleanItems[i].id;
    if (originalItem.files && originalItem.files.length > 0) {
      // Check if files are already linked to this new ID in the DB (for updates)
      // For simplicity, delete existing files for this item and re-insert them, or just insert them if they are imported files.
      // Wait, if we are updating an existing estimate, it might already have files. 
      // If originalItem is from an imported cart item, it has a temp ID and will get a new UUID.
      // So newId is the newly generated UUID, and it won't have files yet.
      if (originalItem.id && originalItem.id.startsWith('temp-')) {
        const newFiles = originalItem.files.map((file: any) => {
          const { id: fileId, estimate_item_id, created_at: fileCreatedAt, ...fileRest } = file;
          return {
            ...fileRest,
            estimate_item_id: newId
          };
        });

        const { error: fileError } = await supabase
          .from('files')
          .insert(newFiles);

        if (fileError) {
          console.error('Failed to copy files for new estimate item', newId, fileError);
        }
      }
    }

    // Insert newly dragged tempFiles
    if (originalItem.tempFiles && originalItem.tempFiles.length > 0) {
      const newFilesToInsert = originalItem.tempFiles.map((file: File) => {
        const filePath = (window as any).webUtils ? (window as any).webUtils.getPathForFile(file) : (file as any).path;
        return {
          estimate_item_id: newId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.name.split('.').pop() || 'unknown',
          file_size: file.size,
          version: 1,
          is_current: true
        };
      });

      const { error: tempFileError } = await supabase
        .from('files')
        .insert(newFilesToInsert);

      if (tempFileError) {
        console.error('Failed to insert temp files', tempFileError);
      }
    }
  }

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
    .select('*, files(*)')
    .eq('estimate_id', id);
    
  if (itemsError) throw itemsError;

  return { estimate, items };
};

export interface SearchPastItemsParams {
  keyword?: string;
  noteKeyword?: string;
  statusFilter?: string;
  sizeW?: number;
  sizeD?: number;
  sizeH?: number;
  tolerance?: number;
  page?: number;
  pageSize?: number;
}

export const searchPastItems = async (params: SearchPastItemsParams) => {
  const { keyword, noteKeyword, statusFilter, sizeW, sizeD, sizeH, tolerance = 0, page = 1, pageSize = 50 } = params;

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
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

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

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { data, count: count || 0 };
};

export const copyItemsToEstimate = async (estimateId: string, items: any[]) => {
  if (!items || items.length === 0) return;

  for (const item of items) {
    const { 
      id, estimate_id, created_at, estimate, material, files, 
      ...rest 
    } = item;

    const { data: insertedItem, error: itemError } = await supabase
      .from('estimate_items')
      .insert({
        ...rest,
        estimate_id: estimateId,
      })
      .select()
      .single();

    if (itemError) throw itemError;

    if (files && files.length > 0) {
      const newFiles = files.map((file: any) => {
        const { id: oldFileId, estimate_item_id, created_at: fileCreatedAt, ...fileRest } = file;
        return {
          ...fileRest,
          estimate_item_id: insertedItem.id
        };
      });

      const { error: fileError } = await supabase
        .from('files')
        .insert(newFiles);

      if (fileError) {
        console.error('Failed to copy files for item', insertedItem.id, fileError);
      }
    }
  }
};

export const deleteEstimateItem = async (itemId: string) => {
  const { error } = await supabase
    .from('estimate_items')
    .delete()
    .eq('id', itemId);
  
  if (error) throw error;
};
