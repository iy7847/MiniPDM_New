import { supabase } from '@/shared/services/supabase';

export interface MonthlyData {
  name: string;
  revenue: number;
  orders: number;
}

export const MONTH_NAMES = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
];

export interface ClientShareData {
  name: string;
  amount: number;
  percent: number;
  chartValue?: number;
}

export interface ProcessShareData {
  name: string;
  count: number;
}

export interface AnalyticsStats {
  totalOrderAmount: number;
  orderCount: number;
  totalOutsourceAmount: number;
  activeClientCount: number;
}

export interface AnalyticsResult {
  stats: AnalyticsStats;
  monthlyRevenue: MonthlyData[];
  clientShare: ClientShareData[];
  processShare: ProcessShareData[];
}

export const analyticsService = {
  async fetchAnalyticsData(companyId: string, year: number): Promise<AnalyticsResult> {
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate = `${year}-12-31T23:59:59.999Z`;

    // 1. 수주 데이터 조회 (orders + clients + estimates + order_items)
    const { data: rawOrders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, 
        po_no, 
        order_date, 
        created_at, 
        total_amount, 
        client_id, 
        clients(name),
        estimates(total_amount),
        order_items(unit_price, supply_price, qty, production_qty)
      `)
      .eq('company_id', companyId);

    if (orderError) throw orderError;

    // 연도 필터링 (order_date 우선, 없으면 created_at)
    const orders = (rawOrders || []).filter(ord => {
      const dateStr = ord.order_date || ord.created_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d.getFullYear() === year;
    });

    // 2. 외주 발주 데이터 조회 (outsource_orders)
    let outOrders: any[] = [];
    try {
      const { data, error } = await supabase
        .from('outsource_orders')
        .select('id, total_price, unit_price, quantity, actual_unit_price, actual_total_price, received_qty, created_at')
        .eq('company_id', companyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      if (!error && data) {
        outOrders = data;
      } else {
        // 컬럼 미존재 시 Fallback: 기본 컬럼만 조회
        const { data: fbData } = await supabase
          .from('outsource_orders')
          .select('id, total_price, unit_price, quantity, received_qty, created_at')
          .eq('company_id', companyId)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        outOrders = fbData || [];
      }
    } catch {
      outOrders = [];
    }

    // 2-1. 원자재 발주 데이터 조회 (material_orders)
    let matOrders: any[] = [];
    try {
      const { data, error } = await supabase
        .from('material_orders')
        .select('id, total_price, unit_price, quantity, actual_unit_price, actual_total_price, received_qty, created_at')
        .eq('company_id', companyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      if (!error && data) {
        matOrders = data;
      } else {
        const { data: fbData } = await supabase
          .from('material_orders')
          .select('id, total_price, unit_price, quantity, received_qty, created_at')
          .eq('company_id', companyId)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        matOrders = fbData || [];
      }
    } catch {
      matOrders = [];
    }

    // 3. 공정 실적 데이터 조회 (process_logs)
    const { data: logs } = await supabase
      .from('process_logs')
      .select('id, process_name, good_qty, status, created_at')
      .eq('company_id', companyId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // --- 통계 집계 계산 ---

    // A. 4대 KPI
    let totalOrderAmount = 0;
    const orderCount = orders?.length || 0;
    const clientSet = new Set<string>();
    const clientAmountMap: Record<string, number> = {};

    // 월별 집계 초기화 (1월~12월)
    const monthlyMap: Record<number, { revenue: number; orders: number }> = {};
    for (let m = 0; m < 12; m++) {
      monthlyMap[m] = { revenue: 0, orders: 0 };
    }

    if (orders) {
      for (const ord of orders) {
        let amt = Number(ord.total_amount) || 0;

        // 1. orders.total_amount가 0이면 order_items 품목 단가 합산으로 복원
        if (amt === 0 && ord.order_items && ord.order_items.length > 0) {
          amt = ord.order_items.reduce((sum: number, it: any) => {
            const itemPrice = Number(it.supply_price) || 
              (Number(it.unit_price || 0) * Number(it.qty || it.production_qty || 1));
            return sum + itemPrice;
          }, 0);
        }

        // 2. 여전히 0이면 연결된 견적서(estimates) 총액으로 복원
        if (amt === 0 && (ord.estimates as any)?.total_amount) {
          amt = Number((ord.estimates as any).total_amount) || 0;
        }

        // 3. DB에 total_amount가 0 또는 null로 남아있었다면 셀프 힐링(Self-Healing) 업데이트
        if ((!ord.total_amount || Number(ord.total_amount) === 0) && amt > 0) {
          supabase.from('orders').update({ total_amount: amt }).eq('id', ord.id).then();
        }

        totalOrderAmount += amt;

        // 고객사 집계
        const cName = (ord.clients as any)?.name || '기타 거래처';
        clientSet.add(cName);
        clientAmountMap[cName] = (clientAmountMap[cName] || 0) + amt;

        // 월별 수주액 집계 (order_date 우선, 없으면 created_at)
        const dateStr = ord.order_date || ord.created_at;
        if (dateStr) {
          const d = new Date(dateStr);
          const monthIndex = d.getMonth();
          if (monthlyMap[monthIndex]) {
            monthlyMap[monthIndex].revenue += amt;
            monthlyMap[monthIndex].orders += 1;
          }
        }
      }
    }

    // 외주 및 자재 실매입액 합계
    let totalOutsourceAmount = 0;
    for (const out of outOrders) {
      const actualAmt = out.actual_total_price
        ? Number(out.actual_total_price)
        : out.actual_unit_price && out.received_qty 
        ? Number(out.actual_unit_price) * Number(out.received_qty)
        : Number(out.total_price) || (Number(out.unit_price || 0) * Number(out.quantity || 0));
      totalOutsourceAmount += actualAmt;
    }
    for (const mat of matOrders) {
      const actualAmt = mat.actual_total_price
        ? Number(mat.actual_total_price)
        : mat.actual_unit_price && mat.received_qty 
        ? Number(mat.actual_unit_price) * Number(mat.received_qty)
        : Number(mat.total_price) || (Number(mat.unit_price || 0) * Number(mat.quantity || 0));
      totalOutsourceAmount += actualAmt;
    }

    // B. 월별 차트 데이터 변환
    const monthlyRevenue: MonthlyData[] = MONTH_NAMES.map((name, index) => ({
      name,
      revenue: monthlyMap[index]?.revenue || 0,
      orders: monthlyMap[index]?.orders || 0,
    }));

    // C. 고객사별 점유율 계산 (금액 기준)
    const hasAnyAmount = totalOrderAmount > 0;
    const clientShare: ClientShareData[] = Object.entries(clientAmountMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: hasAnyAmount ? Math.round((amount / totalOrderAmount) * 100) : 100,
        chartValue: hasAnyAmount ? amount : 1, // 금액이 0원일 때도 Recharts 도넛이 정상 렌더링되도록 방어
      }))
      .sort((a, b) => b.amount - a.amount);

    // D. 공정별 생산 실적 집계
    const processMap: Record<string, number> = {};
    if (logs) {
      for (const log of logs) {
        const pName = log.process_name || '기타';
        const qty = Number(log.good_qty) || 1;
        processMap[pName] = (processMap[pName] || 0) + qty;
      }
    }

    let processShare: ProcessShareData[] = Object.entries(processMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 공정 실적이 아직 없을 경우 기본 표준 공정 안내 표시
    if (processShare.length === 0) {
      processShare = [
        { name: 'MCT', count: 0 },
        { name: '선반', count: 0 },
        { name: '밀링', count: 0 },
        { name: '연마', count: 0 },
      ];
    }

    return {
      stats: {
        totalOrderAmount,
        orderCount,
        totalOutsourceAmount,
        activeClientCount: clientSet.size,
      },
      monthlyRevenue,
      clientShare,
      processShare,
    };
  },
};
