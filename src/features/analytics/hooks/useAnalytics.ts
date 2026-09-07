import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { analyticsService, type AnalyticsResult } from '../services/analyticsService';

export function useAnalytics() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. company_id 조회
  useEffect(() => {
    if (!user?.id) return;
    const fetchCompany = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      if (profile?.company_id) {
        setCompanyId(profile.company_id);
      }
    };
    fetchCompany();
  }, [user]);

  // 2. 통계 데이터 로드
  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const res = await analyticsService.fetchAnalyticsData(companyId, selectedYear);
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    selectedYear,
    setSelectedYear,
    data,
    isLoading,
    reload: loadData,
  };
}
