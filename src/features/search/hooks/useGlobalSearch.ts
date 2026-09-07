import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { searchService, type GlobalSearchResult } from '../services/searchService';

export function useGlobalSearch() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult>({
    estimates: [],
    orders: [],
    items: [],
    clients: [],
    shipments: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  // 1. 사용자 company_id 조회
  useEffect(() => {
    if (!user?.id) return;
    const fetchCompany = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    fetchCompany();
  }, [user]);

  // 2. 검색어 300ms 디바운스
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // 3. 디바운스된 검색어로 병렬 쿼리 실행
  useEffect(() => {
    if (!companyId || !debouncedQuery.trim()) {
      setResults({
        estimates: [],
        orders: [],
        items: [],
        clients: [],
        shipments: [],
      });
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    searchService.searchAll(companyId, debouncedQuery).then((res) => {
      if (!isCancelled) {
        setResults(res);
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('Global search error:', err);
      if (!isCancelled) {
        setIsLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [companyId, debouncedQuery]);

  const totalResultsCount =
    results.estimates.length +
    results.orders.length +
    results.items.length +
    results.clients.length +
    results.shipments.length;

  return {
    query,
    setQuery,
    results,
    isLoading,
    totalResultsCount,
  };
}
