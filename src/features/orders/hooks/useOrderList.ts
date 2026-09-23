import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/shared/services/supabase';
import { getOrdersWithFilters } from '../services/orderService';
import { useAuth } from '@/app/providers/AuthProvider';
import { appStorage } from '@/shared/services/persistentStorage';

export function useOrderList() {
  const { user, profile, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [initialized, setInitialized] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 언마운트 가드
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Initial load & SessionStorage sync
  useEffect(() => {
    if (searchParams.toString() === '' && !initialized) {
      const savedSearch = sessionStorage.getItem('orders_search') || '';
      const savedStatus = sessionStorage.getItem('orders_status') || '';
      const savedStart = sessionStorage.getItem('orders_startDate') || '';
      const savedEnd = sessionStorage.getItem('orders_endDate') || '';
      const savedClient = sessionStorage.getItem('orders_clientId') || '';
      const savedPage = sessionStorage.getItem('orders_page') || '';

      const params = new URLSearchParams();
      if (savedSearch) params.set('search', savedSearch);
      if (savedStatus && savedStatus !== '전체') params.set('status', savedStatus);
      if (savedStart) params.set('startDate', savedStart);
      if (savedEnd) params.set('endDate', savedEnd);
      if (savedClient && savedClient !== 'ALL') params.set('clientId', savedClient);
      if (savedPage && savedPage !== '1') params.set('page', savedPage);

      if (params.toString() !== '') {
        setSearchParams(params, { replace: true });
        return;
      }
    }

    if (!initialized) {
      setInitialized(true);
      return;
    }

    if (location.pathname.includes('/orders')) {
      const s = searchParams.get('search') || '';
      const st = searchParams.get('status') || '전체';
      const sd = searchParams.get('startDate') || '';
      const ed = searchParams.get('endDate') || '';
      const c = searchParams.get('clientId') || 'ALL';
      const p = searchParams.get('page') || '1';

      sessionStorage.setItem('orders_search', s);
      sessionStorage.setItem('orders_status', st);
      sessionStorage.setItem('orders_startDate', sd);
      sessionStorage.setItem('orders_endDate', ed);
      sessionStorage.setItem('orders_clientId', c);
      sessionStorage.setItem('orders_page', p);
    }
  }, [searchParams, initialized, setSearchParams, location.pathname]);

  // Read URL params
  const searchTerm = searchParams.get('search') || '';
  const activeTab = searchParams.get('status') || '전체';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const clientId = searchParams.get('clientId') || 'ALL';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local state for debounced search
  const [localSearch, setLocalSearch] = useState(searchTerm);
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Update URL helper
  const updateParams = useCallback((newParams: Record<string, string | undefined>) => {
    const current = Object.fromEntries(searchParams.entries());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === '전체' || value === 'ALL') {
        delete current[key];
      } else {
        current[key] = value;
      }
    });
    if (newParams.search !== undefined || newParams.status !== undefined || newParams.clientId !== undefined || newParams.startDate !== undefined || newParams.endDate !== undefined) {
      if (newParams.page === undefined) delete current.page;
    }
    setSearchParams(current, { replace: true });
  }, [searchParams, setSearchParams]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        updateParams({ search: localSearch });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, searchTerm, updateParams]);

  // 회사 ID 해결 헬퍼 (캐시 우선 -> profiles 비동기 조회 -> 타임아웃 방어)
  const resolveCompanyId = useCallback(async (): Promise<string | null> => {
    if (profile?.company_id) return profile.company_id;

    // 1. 로컬 스토리지 캐시 동기 조회 (0ms)
    try {
      const cached = appStorage.getItem('minipdm_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.company_id) return parsed.company_id;
      }
    } catch {}

    if (!user?.id) return null;

    // 2. Supabase DB 조회 (안전 타임아웃 2.5초 적용)
    try {
      const dbPromise = supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 2500)
      );

      const result = await Promise.race([dbPromise, timeoutPromise]);
      if (result.data?.company_id) {
        return result.data.company_id;
      }
    } catch (err) {
      console.warn('[useOrderList] Failed to resolve company_id from DB:', err);
    }

    return null;
  }, [profile?.company_id, user?.id]);

  const companyId = profile?.company_id || '';

  // Data fetch
  const fetchOrders = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      if (isMountedRef.current) setIsLoading(false);
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setErrorMsg(null);
    }

    // 🛡️ [하드 타임아웃 가드] 어떤 네트워크 지연/세션 스톨 상황에서도 5초 후 무조건 스피너 해제
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
      timeoutId = setTimeout(() => resolve({ timeout: true }), 5000);
    });

    const executionPromise = (async () => {
      console.log('[fetchOrders] 1. resolveCompanyId 시작');
      const resolvedCompanyId = await resolveCompanyId();
      console.log('[fetchOrders] 2. resolveCompanyId 완료:', resolvedCompanyId);
      if (!resolvedCompanyId) {
        throw new Error('회사 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      }

      console.log('[fetchOrders] 3. clientRes / orderRes 쿼리 시작...');
      const [clientRes, orderRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name')
          .eq('company_id', resolvedCompanyId)
          .order('name'),
        getOrdersWithFilters({
          companyId: resolvedCompanyId,
          searchTerm,
          status: activeTab,
          startDate,
          endDate,
          clientId,
          page,
          pageSize: 15
        })
      ]);
      console.log('[fetchOrders] 4. 쿼리 완료! orders 수:', orderRes.data?.length);

      if (clientRes.error) {
        console.warn('[useOrderList] Client fetch warning:', clientRes.error);
      }

      return {
        clients: clientRes.data || [],
        orders: orderRes.data || [],
        totalCount: orderRes.count || 0
      };
    })();

    try {
      const result: any = await Promise.race([executionPromise, timeoutPromise]);
      clearTimeout(timeoutId!);

      if (!isMountedRef.current) return;

      if (result?.timeout) {
        console.warn('[useOrderList] Fetch orders timed out (5s guard triggered)');
        setErrorMsg('서버 응답 지연으로 데이터를 불러오지 못했습니다. 새로고침을 눌러주세요.');
      } else if (result) {
        setClients(result.clients);
        setOrders(result.orders);
        setTotalCount(result.totalCount);
      }
    } catch (error: any) {
      clearTimeout(timeoutId!);
      if (!isMountedRef.current) return;
      console.error('Failed to fetch orders:', error);
      setErrorMsg(error.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, authLoading, resolveCompanyId, searchTerm, activeTab, startDate, endDate, clientId, page]);

  // 🚀 authLoading이 false로 전환되거나 initialized 되었을 때 확실하게 트리거
  useEffect(() => {
    if (initialized && !authLoading) {
      fetchOrders();
    }
  }, [fetchOrders, initialized, authLoading]);

  const resetFilters = () => {
    setLocalSearch('');
    updateParams({
      search: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined,
      clientId: undefined,
      page: undefined
    });
  };

  const setSearchTermDirect = (val: string) => {
    setLocalSearch(val);
  };

  const setActiveTabDirect = (val: string) => {
    updateParams({ status: val });
  };

  const setStartDateDirect = (val: string) => {
    updateParams({ startDate: val });
  };

  const setEndDateDirect = (val: string) => {
    updateParams({ endDate: val });
  };

  const setClientIdDirect = (val: string) => {
    updateParams({ clientId: val });
  };

  const setPageDirect = (val: number) => {
    updateParams({ page: val > 1 ? val.toString() : undefined });
  };

  return {
    orders,
    clients,
    totalCount,
    isLoading,
    searchTerm: localSearch,
    setSearchTerm: setSearchTermDirect,
    activeTab,
    setActiveTab: setActiveTabDirect,
    startDate,
    setStartDate: setStartDateDirect,
    endDate,
    setEndDate: setEndDateDirect,
    clientId,
    setClientId: setClientIdDirect,
    page,
    setPage: setPageDirect,
    resetFilters,
    companyId,
    errorMsg,
    reload: fetchOrders,
    refetch: fetchOrders
  };
}
