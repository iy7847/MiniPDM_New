import { supabase } from '@/shared/services/supabase';

export interface AppNotification {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  linkPath: string;
  createdAt: string;
}

export const notificationService = {
  async fetchNotifications(companyId: string): Promise<AppNotification[]> {
    const notifications: AppNotification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 미완료 수주 조회 (납기일 추적)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, po_no, order_number, delivery_date, status, clients(name)')
      .eq('company_id', companyId)
      .neq('status', 'COMPLETED')
      .neq('status', 'CANCELLED')
      .order('delivery_date', { ascending: true })
      .limit(10);

    if (orders && orders.length > 0) {
      for (const ord of orders) {
        if (!ord.delivery_date) continue;
        const targetDate = new Date(ord.delivery_date);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const clientName = (ord.clients as any)?.name ? ` (${(ord.clients as any).name})` : '';
        const orderCode = ord.po_no || ord.order_number || '수주';

        if (diffDays < 0) {
          notifications.push({
            id: `order-overdue-${ord.id}`,
            type: 'danger',
            title: `납기 지연 (${Math.abs(diffDays)}일 경과)`,
            message: `${orderCode}${clientName} 납기일(${ord.delivery_date})이 지났습니다. 신속한 생산/출하가 필요합니다.`,
            time: `${Math.abs(diffDays)}일 전 납기`,
            linkPath: `/orders?search=${encodeURIComponent(orderCode)}`,
            createdAt: ord.delivery_date,
          });
        } else if (diffDays === 0) {
          notifications.push({
            id: `order-dday-${ord.id}`,
            type: 'danger',
            title: `금일 납기 (D-Day)`,
            message: `${orderCode}${clientName} 오늘 납품 예정입니다. 출하 준비를 확인하세요.`,
            time: '오늘 마감',
            linkPath: `/orders?search=${encodeURIComponent(orderCode)}`,
            createdAt: ord.delivery_date,
          });
        } else if (diffDays <= 3) {
          notifications.push({
            id: `order-d-${diffDays}-${ord.id}`,
            type: 'warning',
            title: `납기 임박 (D-${diffDays})`,
            message: `${orderCode}${clientName} 납기일(${ord.delivery_date})이 ${diffDays}일 남았습니다.`,
            time: `${diffDays}일 후 납기`,
            linkPath: `/orders?search=${encodeURIComponent(orderCode)}`,
            createdAt: ord.delivery_date,
          });
        } else if (diffDays <= 7) {
          notifications.push({
            id: `order-week-${ord.id}`,
            type: 'info',
            title: `이번 주 납기 (D-${diffDays})`,
            message: `${orderCode}${clientName} 마감일이 이번 주에 도래합니다.`,
            time: `${diffDays}일 후 납기`,
            linkPath: `/orders?search=${encodeURIComponent(orderCode)}`,
            createdAt: ord.delivery_date,
          });
        } else {
          // 7일 초과 진행 중인 수주 모니터링 피드
          notifications.push({
            id: `order-active-${ord.id}`,
            type: 'info',
            title: `진행 수주 일정 (D-${diffDays})`,
            message: `${orderCode}${clientName} 납기일은 ${ord.delivery_date}입니다. 현재 생산 진행 중입니다.`,
            time: `D-${diffDays}`,
            linkPath: `/orders?search=${encodeURIComponent(orderCode)}`,
            createdAt: ord.delivery_date,
          });
        }
      }
    }

    // 2. 미입고 외주 발주 건 조회 (outsource_orders)
    const { data: outOrders } = await supabase
      .from('outsource_orders')
      .select('id, supplier_name, process_name, expected_date, status')
      .eq('company_id', companyId)
      .neq('status', '입고완료')
      .neq('status', '발주취소')
      .order('expected_date', { ascending: true })
      .limit(5);

    if (outOrders && outOrders.length > 0) {
      for (const out of outOrders) {
        const supplier = out.supplier_name ? `[${out.supplier_name}] ` : '';
        const process = out.process_name || '외주 공정';
        
        let isDelayed = false;
        if (out.expected_date) {
          const expDate = new Date(out.expected_date);
          expDate.setHours(0, 0, 0, 0);
          isDelayed = expDate.getTime() < today.getTime();
        }

        notifications.push({
          id: `outsource-${out.id}`,
          type: isDelayed ? 'danger' : 'info',
          title: isDelayed ? '외주 입고 지연' : '외주 미입고 발주',
          message: `${supplier}${process} 외주 가공 건이 아직 입고 대기 중입니다.`,
          time: out.expected_date ? `예정: ${out.expected_date}` : '진행 중',
          linkPath: '/outsource?tab=outsource',
          createdAt: out.expected_date || new Date().toISOString(),
        });
      }
    }

    // 3. 현장 가공 완료 / 출하 대기 품목 집계 (order_items)
    const { count: shippingReadyCount } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('production_status', 'SHIPPING_READY');

    if (shippingReadyCount && shippingReadyCount > 0) {
      notifications.push({
        id: `shipping-ready-${shippingReadyCount}-${today.toISOString().split('T')[0]}`,
        type: 'success',
        title: '출하 대기 품목 도착',
        message: `현장 가공이 완료된 ${shippingReadyCount}건의 품목이 출하 등록을 기다리고 있습니다.`,
        time: '오늘',
        linkPath: '/shipping?tab=ready',
        createdAt: today.toISOString(),
      });
    }

    // 최신 및 긴급도 순으로 정렬 (danger -> warning -> info -> success)
    const priorityMap: Record<string, number> = {
      danger: 1,
      warning: 2,
      info: 3,
      success: 4,
    };

    return notifications.sort((a, b) => {
      const pDiff = (priorityMap[a.type] || 99) - (priorityMap[b.type] || 99);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },
};
