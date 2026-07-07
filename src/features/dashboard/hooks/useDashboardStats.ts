import { useState, useEffect } from 'react';
import { fetchDashboardStats } from '../services/dashboardService';

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

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardStats();
      
      if (data) {
        setStats({
          monthlyRevenue: data.this_month_revenue || 0,
          revenueGrowth: data.revenue_growth || 0,
          activeOrders: data.active_orders || 0,
          ordersGrowth: 0, // calculate if needed in RPC
          pendingQuotes: data.pending_estimates || 0,
          quotesGrowth: 0, // calculate if needed in RPC
          quoteConversionRate: data.estimate_conversion_rate || 0,
          conversionGrowth: 0, // calculate if needed in RPC
          revenueChart: data.monthly_revenue || [],
          urgentOrders: data.urgent_orders || []
        });
      }
    } catch (err) {
      console.error(err);
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
