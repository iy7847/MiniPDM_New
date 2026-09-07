import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { calculateLicenseDetails } from '../types/license';
import type { CompanyLicense, CompanyLicenseRaw } from '../types/license';

export function useLicense() {
  const { user, profile } = useAuth();
  const [license, setLicense] = useState<CompanyLicense>(() => calculateLicenseDetails(null));
  const [currentUsersCount, setCurrentUsersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // KEP 마스터 관리자 식별: iy7847@naver.com, iy7847@gmail.com, 또는 @kendp.com 이메일, 또는 is_master_vendor
  const isMasterAdmin = Boolean(
    user?.email === 'iy7847@naver.com' ||
    user?.email === 'iy7847@gmail.com' ||
    (user?.email && user.email.endsWith('@kendp.com')) ||
    license.isMasterVendor
  );

  const fetchLicense = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      // 1. 회사 라이선스 정보 조회
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, biz_num, ceo_name, license_status, license_plan, trial_days, license_expires_at, max_users, is_master_vendor, billing_memo, created_at')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (companyError) {
        console.error('라이선스 정보 조회 실패:', companyError);
      } else if (companyData) {
        setLicense(calculateLicenseDetails(companyData as CompanyLicenseRaw));
      }

      // 2. 현재 등록된 사용자 수 및 초대 대기 수 조회 (개별 에러 안전 처리)
      let activeCount = 0;
      let pendingCount = 0;

      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', profile.company_id);
        activeCount = count || 0;
      } catch (e) {
        console.warn('profiles count error:', e);
      }

      try {
        const { count } = await supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .eq('status', 'pending');
        pendingCount = count || 0;
      } catch (e) {
        // invitations 테이블 조회 실패 시 무시
      }

      setCurrentUsersCount(activeCount + pendingCount);

    } catch (err) {
      console.error('useLicense fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  const isUserLimitReached = !license.isMasterVendor && currentUsersCount >= license.maxUsers;

  return {
    license,
    isMasterAdmin,
    currentUsersCount,
    isUserLimitReached,
    loading,
    refetchLicense: fetchLicense,
  };
}
