import { useState, useEffect } from 'react';
import { fetchDashboardStats } from '../services/dashboardService';
import { appStorage } from '@/shared/services/persistentStorage';

export interface DashboardStats {
  monthlyRevenue: number;
  revenueGrowth: number;
  activeOrders: number;
  ordersGrowth: number;
  pendingQuotes: number;
  quotesGrowth: number;
  quoteConversionRate: number;
  conversionGrowth: number;
  revenueChart: { name: string; 매출: number }[];
  urgentOrders: { id: string; client: string; item: string; dDay: number; status: string }[];
}

const CACHED_STATS_KEY = 'minipdm_cached_dashboard_stats';

const getInitialCachedStats = (): DashboardStats | null => {
  try {
    const raw = appStorage.getItem(CACHED_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.monthlyRevenue === 'number') {
        return parsed;
      }
    }
  } catch {}
  return null;
};

export const useDashboardStats = () => {
  const initialCached = getInitialCachedStats();
  // 🚀 이전에 저장된 통계가 있으면 0ms만에 즉각 대시보드 렌더링 (스켈레톤 대기 원천 제거)
  const [stats, setStats] = useState<DashboardStats | null>(initialCached);
  const [loading, setLoading] = useState(!initialCached);
  const [error, setError] = useState<Error | null>(null);

  const loadData = async () => {
    try {
      if (!stats) setLoading(true);
      setError(null);
      
      // @ts-ignore
      window.perfLogger?.log?.('fetchDashboardStats API 호출 시작');
      const data = await fetchDashboardStats();
      // @ts-ignore
      window.perfLogger?.log?.('fetchDashboardStats API 수신 완료');
      
      if (data) {
        const formatted: DashboardStats = {
          monthlyRevenue: data.this_month_revenue || 0,
          revenueGrowth: data.revenue_growth || 0,
          activeOrders: data.active_orders || 0,
          ordersGrowth: 0,
          pendingQuotes: data.pending_estimates || 0,
          quotesGrowth: 0,
          quoteConversionRate: data.estimate_conversion_rate || 0,
          conversionGrowth: 0,
          revenueChart: data.monthly_revenue || [],
          urgentOrders: data.urgent_orders || []
        };
        setStats(formatted);
        appStorage.setItem(CACHED_STATS_KEY, JSON.stringify(formatted));
      }
    } catch (err) {
      console.error('대시보드 통계 조회 실패:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return { stats, loading, error, refetch: loadData };
};
