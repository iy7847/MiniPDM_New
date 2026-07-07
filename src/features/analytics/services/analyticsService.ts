

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  cost: number;
}

export interface OrderStatusStats {
  status: string;
  count: number;
}

export interface ClientPerformance {
  clientId: string;
  clientName: string;
  totalOrders: number;
  totalRevenue: number;
}

class AnalyticsService {
  /**
   * 월별 매출 통계 가져오기 (Mock)
   */
  async getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
    // 실제 연결 시에는 supabase.rpc('get_monthly_revenue') 등을 사용
    return [
      { month: '1월', revenue: 45000000, cost: 30000000 },
      { month: '2월', revenue: 52000000, cost: 34000000 },
      { month: '3월', revenue: 48000000, cost: 31000000 },
      { month: '4월', revenue: 61000000, cost: 39000000 },
      { month: '5월', revenue: 59000000, cost: 38000000 },
      { month: '6월', revenue: 67000000, cost: 42000000 },
    ];
  }

  /**
   * 주문 상태별 통계 가져오기 (Mock)
   */
  async getOrderStatusStats(): Promise<OrderStatusStats[]> {
    return [
      { status: '견적', count: 12 },
      { status: '수주', count: 8 },
      { status: '진행', count: 15 },
      { status: '완료', count: 42 },
    ];
  }

  /**
   * 우수 거래처 실적 통계 가져오기 (Mock)
   */
  async getTopClients(): Promise<ClientPerformance[]> {
    return [
      { clientId: 'c1', clientName: '삼성전자', totalOrders: 15, totalRevenue: 120000000 },
      { clientId: 'c2', clientName: 'LG디스플레이', totalOrders: 12, totalRevenue: 85000000 },
      { clientId: 'c3', clientName: '현대자동차', totalOrders: 8, totalRevenue: 64000000 },
      { clientId: 'c4', clientName: 'SK하이닉스', totalOrders: 6, totalRevenue: 45000000 },
      { clientId: 'c5', clientName: '포스코', totalOrders: 5, totalRevenue: 32000000 },
    ];
  }
}

export const analyticsService = new AnalyticsService();
