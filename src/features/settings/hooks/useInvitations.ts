import { useState, useCallback } from 'react';
import { supabase } from '@/shared/services/supabase';

export interface Invitation {
  id: string;
  company_id: string;
  email: string;
  token: string;
  invite_code?: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  group_id?: string | null;
  expires_at: string;
  created_at: string;
}

export function useInvitations(companyId?: string) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setInvitations((data || []) as unknown as Invitation[]);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const createInvitation = async (
    companyId: string, 
    email: string, 
    role: string, 
    groupId?: string | null
  ) => {
    try {
      const payload: any = { 
        company_id: companyId, 
        email, 
        role 
      };
      if (groupId) {
        payload.group_id = groupId;
      }

      let data: any = null;
      try {
        const res = await supabase
          .from('invitations')
          .insert([payload])
          .select('*')
          .single();
        if (res.error) throw res.error;
        data = res.data;
      } catch (insertErr: any) {
        // 만약 DB에 group_id 컬럼이 아직 마이그레이션되지 않았을 경우 fallback 처리
        if (payload.group_id) {
          delete payload.group_id;
          const fallbackRes = await supabase
            .from('invitations')
            .insert([payload])
            .select('*')
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
        } else {
          throw insertErr;
        }
      }
      
      setInvitations(prev => [data as unknown as Invitation, ...prev]);
      return data as unknown as Invitation;
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      throw err;
    }
  };

  const cancelInvitation = async (id: string) => {
    try {
      const { error: cancelError } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (cancelError) throw cancelError;
      
      setInvitations(prev => prev.filter(inv => inv.id !== id));
    } catch (err: any) {
      console.error('Error cancelling invitation:', err);
      throw err;
    }
  };

  return {
    invitations,
    isLoading,
    error,
    fetchInvitations,
    createInvitation,
    cancelInvitation
  };
}
