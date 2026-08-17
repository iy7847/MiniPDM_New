import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/shared/services/supabase';
import { getOrdersWithFilters } from '../services/orderService';
import { useAuth } from '@/app/providers/AuthProvider';

export function useOrderList() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL에서 초기값 읽기 또는 세션 스토리지에서 복원
  const initialSearch = searchParams.get('search') ?? sessionStorage.getItem('orders_search') ?? '';
  const initialStatus = searchParams.get('status') ?? sessionStorage.getItem('orders_status') ?? '전체';
  const initialStartDate = searchParams.get('startDate') ?? sessionStorage.getItem('orders_startDate') ?? '';
  const initialEndDate = searchParams.get('endDate') ?? sessionStorage.getItem('orders_endDate') ?? '';
  const initialClientId = searchParams.get('clientId') ?? sessionStorage.getItem('orders_clientId') ?? 'ALL';
  const initialPage = parseInt(searchParams.get('page') ?? sessionStorage.getItem('orders_page') ?? '1', 10);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState(initialStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [clientId, setClientId] = useState(initialClientId);
  const [page, setPage] = useState(initialPage);
  
  const [companyId, setCompanyId] = useState<string>('');
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // URL Parameter Update & Session Storage Sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (activeTab !== '전체') params.set('status', activeTab);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (clientId !== 'ALL') params.set('clientId', clientId);
    if (page > 1) params.set('page', page.toString());
    
    setSearchParams(params, { replace: true });

    // Race Condition 방지: 현재 경로일 때만 세션 스토리지 저장
    if (location.pathname.includes('/orders')) {
      sessionStorage.setItem('orders_search', searchTerm);
      sessionStorage.setItem('orders_status', activeTab);
      sessionStorage.setItem('orders_startDate', startDate);
      sessionStorage.setItem('orders_endDate', endDate);
      sessionStorage.setItem('orders_clientId', clientId);
      sessionStorage.setItem('orders_page', page.toString());
    }
  }, [searchTerm, activeTab, startDate, endDate, clientId, page, setSearchParams, location.pathname]);

  // 외부(URL) 변경 시 로컬 상태 동기화 (Debounce 충돌 방지)
  useEffect(() => {
    const urlSearch = searchParams.get('search') ?? '';
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  // 거래처 목록 및 데이터 Fetch 로직
  const fetchOrders = useCallback(async () => {
    if (authLoading || !user) return;
    
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      if (!profile?.company_id) {
        throw new Error('회사 정보를 찾을 수 없습니다.');
      }
      setCompanyId(profile.company_id);

      // 거래처 목록 조회 (필터용)
      const { data: clientList } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name');
      setClients(clientList || []);

      // 수주 데이터 조회
      const { data, count } = await getOrdersWithFilters({
        companyId: profile.company_id,
        searchTerm,
        status: activeTab,
        startDate,
        endDate,
        clientId,
        page,
        pageSize: 15
      });
      
      setOrders(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      setErrorMsg(error.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading, searchTerm, activeTab, startDate, endDate, clientId, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const resetFilters = () => {
    setSearchTerm('');
    setActiveTab('전체');
    setStartDate('');
    setEndDate('');
    setClientId('ALL');
    setPage(1);
  };

  return {
    orders,
    clients,
    totalCount,
    isLoading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    clientId,
    setClientId,
    page,
    setPage,
    resetFilters,
    companyId,
    errorMsg,
    reload: fetchOrders,
    refetch: fetchOrders
  };
}
