import { supabase } from '@/shared/services/supabase';

// --- Processes ---

export interface ProcessMaster {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_outsource: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchProcesses = async (companyId: string): Promise<ProcessMaster[]> => {
  const { data, error } = await supabase
    .from('processes')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

export const createProcess = async (process: Omit<ProcessMaster, 'id' | 'created_at' | 'updated_at'>): Promise<ProcessMaster> => {
  const { data, error } = await supabase
    .from('processes')
    .insert(process)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateProcess = async (id: string, updates: Partial<ProcessMaster>): Promise<ProcessMaster> => {
  const { data, error } = await supabase
    .from('processes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteProcess = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('processes')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// --- Routing Templates ---

export interface RoutingTemplateItem {
  id: string;
  template_id: string;
  sequence_no: number;
  process_id: string;
  processes?: ProcessMaster;
}

export interface RoutingTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  items?: RoutingTemplateItem[];
}

export const fetchRoutingTemplates = async (companyId: string): Promise<RoutingTemplate[]> => {
  const { data, error } = await supabase
    .from('routing_templates')
    .select(`
      *,
      items:routing_template_items(
        *,
        processes(*)
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  
  // Sort items by sequence_no
  return (data || []).map(template => ({
    ...template,
    items: template.items?.sort((a: any, b: any) => a.sequence_no - b.sequence_no) || []
  }));
};

export const createRoutingTemplate = async (
  template: { company_id: string; name: string; description?: string },
  items: { process_id: string; sequence_no: number }[]
): Promise<RoutingTemplate> => {
  // 1. Create template
  const { data: tplData, error: tplError } = await supabase
    .from('routing_templates')
    .insert(template)
    .select()
    .single();
    
  if (tplError) throw tplError;
  
  // 2. Create items
  if (items.length > 0) {
    const itemsToInsert = items.map(item => ({
      process_id: item.process_id,
      sequence_no: item.sequence_no,
      template_id: tplData.id
    }));
    
    const { error: itemsError } = await supabase
      .from('routing_template_items')
      .insert(itemsToInsert);
      
    if (itemsError) {
      throw itemsError;
    }
  }
  
  return tplData;
};

export const updateRoutingTemplate = async (
  templateId: string,
  updates: { name?: string; description?: string },
  items: { id?: string; process_id: string; sequence_no: number }[]
): Promise<void> => {
  if (Object.keys(updates).length > 0) {
    const { error: tplError } = await supabase
      .from('routing_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', templateId);
      
    if (tplError) throw tplError;
  }
  
  const { error: deleteError } = await supabase
    .from('routing_template_items')
    .delete()
    .eq('template_id', templateId);
    
  if (deleteError) throw deleteError;
  
  if (items.length > 0) {
    const itemsToInsert = items.map(item => ({
      template_id: templateId,
      sequence_no: item.sequence_no,
      process_id: item.process_id
    }));
    
    const { error: itemsError } = await supabase
      .from('routing_template_items')
      .insert(itemsToInsert);
      
    if (itemsError) throw itemsError;
  }
};

export const deleteRoutingTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('routing_templates')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};
