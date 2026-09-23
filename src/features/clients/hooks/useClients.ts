import { useState, useCallback } from 'react';
import { supabase } from '@/shared/services/supabase';
import type { Client, ClientFormData, ClientType } from '@/shared/types/client';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = useCallback(async (companyId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data as Client[]);
    }
    setLoading(false);
  }, []);

  const checkDuplicate = async (companyId: string, name: string, bizNum: string, editId?: string, isForeign?: boolean) => {
    // Check name duplicate
    const nameQuery = supabase
      .from('clients')
      .select('id')
      .eq('company_id', companyId)
      .ilike('name', name);
    
    if (editId) nameQuery.neq('id', editId);
    
    const { data: nameDup } = await nameQuery.maybeSingle();
    if (nameDup) return '이미 등록된 거래처명입니다.';

    // Check biz_num duplicate (only for domestic)
    if (!isForeign && bizNum) {
      const bizQuery = supabase
        .from('clients')
        .select('id')
        .eq('company_id', companyId)
        .eq('biz_num', bizNum);
        
      if (editId) bizQuery.neq('id', editId);
      
      const { data: bizDup } = await bizQuery.maybeSingle();
      if (bizDup) return '이미 등록된 사업자번호입니다.';
    }

    return null;
  };

  const sanitizeClientData = (data: ClientFormData) => {
    return {
      ...data,
      name: data.name?.trim() || '',
      biz_num: data.biz_num?.trim() || null,
      manager_name: data.manager_name?.trim() || null,
      manager_phone: data.manager_phone?.trim() || null,
      manager_email: data.manager_email?.trim() || null,
    };
  };

  const saveClient = async (companyId: string, rawFormData: ClientFormData, editId?: string) => {
    const formData = sanitizeClientData(rawFormData);
    const errorMsg = await checkDuplicate(companyId, formData.name, formData.biz_num || '', editId, formData.is_foreign);
    if (errorMsg) throw new Error(errorMsg);

    const payload = {
      ...formData,
      ...(editId ? { updated_at: new Date().toISOString() } : { company_id: companyId })
    };

    if (editId) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('clients').insert([payload]);
      if (error) throw error;
    }

    await fetchClients(companyId);
  };

  const deleteClient = async (companyId: string, id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    await fetchClients(companyId);
  };

  return {
    clients,
    loading,
    fetchClients,
    saveClient,
    deleteClient
  };
}
