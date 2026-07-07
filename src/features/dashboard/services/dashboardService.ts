import { supabase } from '@/shared/services/supabase';

export interface UrgentOrder {
  id: string;
  client: string;
  item: string;
  dDay: number;
  status: string;
}

export interface MonthlyRevenue {
  name: string;
  매출: number;
}

export interface DashboardStats {
  monthly_revenue: MonthlyRevenue[];
  this_month_revenue: number;
  revenue_growth: number;
  active_orders: number;
  pending_estimates: number;
  estimate_conversion_rate: number;
  urgent_orders: UrgentOrder[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats');

  if (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }

  // Handle case when data might be null (e.g. no company_id)
  return data as DashboardStats;
}
