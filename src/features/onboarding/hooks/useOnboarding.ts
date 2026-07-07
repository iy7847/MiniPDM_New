import { useState } from 'react';
import { supabase } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';

export function useOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitInviteCode = async (code: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('accept_invitation_by_code', {
        p_code: code.toUpperCase(),
        p_user_id: user.id
      });
      
      if (rpcError) throw rpcError;
      
      window.location.href = '/'; // trigger full reload to re-fetch profile in AuthGuard
    } catch (err: any) {
      console.error(err);
      setError(err.message || '유효하지 않거나 만료된 초대 코드입니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createNewCompany = async (name: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ name }])
        .select('id')
        .single();
        
      if (companyError) throw companyError;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: companyData.id, role: 'admin' })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

      window.location.href = '/'; // trigger full reload to re-fetch profile in AuthGuard
    } catch (err: any) {
      console.error(err);
      setError(err.message || '회사 생성에 실패했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitInviteCode,
    createNewCompany,
    loading,
    error
  };
}
