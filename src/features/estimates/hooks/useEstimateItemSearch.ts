import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { searchPastItems } from '../services/estimateService';
import { useAuth } from '../../../app/providers/AuthProvider';
import { toast } from '../../../shared/stores/useToastStore';

export function useEstimateItemSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Restore or save URL params using sessionStorage
  useEffect(() => {
    if (searchParams.toString() === '' && !initialized) {
      const saved = sessionStorage.getItem('estimate_item_search_query');
      if (saved) {
        setSearchParams(new URLSearchParams(saved), { replace: true });
        return;
      }
    }

    if (!initialized) {
      setInitialized(true);
      return;
    }

    if (location.pathname === '/estimates') {
      sessionStorage.setItem('estimate_item_search_query', searchParams.toString());
    }
  }, [searchParams, initialized, setSearchParams, location.pathname]);

  const page = parseInt(searchParams.get('item_page') || '1', 10);
  const keyword = searchParams.get('item_search') || '';
  const noteKeyword = searchParams.get('item_note') || '';
  const statusFilter = searchParams.get('item_status') || 'ALL';
  const sizeW = searchParams.get('item_w') ? parseFloat(searchParams.get('item_w')!) : undefined;
  const sizeD = searchParams.get('item_d') ? parseFloat(searchParams.get('item_d')!) : undefined;
  const sizeH = searchParams.get('item_h') ? parseFloat(searchParams.get('item_h')!) : undefined;
  const tolerance = searchParams.get('item_tol') ? parseFloat(searchParams.get('item_tol')!) : 0;
  
  const pageSize = 20;

  const [localSearch, setLocalSearch] = useState(keyword);
  const [localNoteSearch, setLocalNoteSearch] = useState(noteKeyword);

  useEffect(() => {
    setLocalSearch(keyword);
    setLocalNoteSearch(noteKeyword);
  }, [keyword, noteKeyword]);

  const updateParams = (newParams: Record<string, string | undefined>) => {
    const current = Object.fromEntries(searchParams.entries());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        delete current[key];
      } else {
        current[key] = value;
      }
    });
    
    // If any search parameter changed, reset page to 1
    if (newParams.item_search !== undefined || newParams.item_note !== undefined || 
        newParams.item_status !== undefined || newParams.item_w !== undefined ||
        newParams.item_d !== undefined || newParams.item_h !== undefined || newParams.item_tol !== undefined) {
      if (newParams.item_page === undefined) current.item_page = '1';
    }
    setSearchParams(current);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== keyword || localNoteSearch !== noteKeyword) {
        updateParams({ 
          item_search: localSearch, 
          item_note: localNoteSearch,
          item_page: '1' 
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, localNoteSearch, keyword, noteKeyword]);

  const fetchItems = useCallback(async () => {
    // Remove early exit to allow default fetching of recent items and status-only filters.
    // if ((!keyword || keyword.trim().length < 2) && (!localNoteSearch || localNoteSearch.trim().length < 2) && !sizeW && !sizeD && !sizeH) {
    //   setItems([]);
    //   setTotalCount(0);
    //   setIsLoading(false);
    //   return;
    // }

    setIsLoading(true);
    try {
      const { data, count } = await searchPastItems({
        keyword: keyword.trim(),
        noteKeyword: noteKeyword.trim(),
        statusFilter,
        sizeW,
        sizeD,
        sizeH,
        tolerance,
        page,
        pageSize,
      });
      setItems(data);
      setTotalCount(count);
    } catch (error) {
      console.error('Failed to fetch estimate items:', error);
      toast.error('품목 검색에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [keyword, noteKeyword, statusFilter, sizeW, sizeD, sizeH, tolerance, page, pageSize]);

  useEffect(() => {
    if (initialized) {
      fetchItems();
    }
  }, [fetchItems, initialized]);

  return {
    items,
    totalCount,
    isLoading,
    keyword,
    noteKeyword,
    statusFilter,
    sizeW,
    sizeD,
    sizeH,
    tolerance,
    page,
    pageSize,
    localSearch,
    setLocalSearch,
    localNoteSearch,
    setLocalNoteSearch,
    updateParams: (p: { 
      keyword?: string; 
      noteKeyword?: string;
      statusFilter?: string;
      sizeW?: number | '';
      sizeD?: number | '';
      sizeH?: number | '';
      tolerance?: number;
      page?: number;
    }) => {
      updateParams({
        ...(p.keyword !== undefined && { item_search: p.keyword }),
        ...(p.noteKeyword !== undefined && { item_note: p.noteKeyword }),
        ...(p.statusFilter !== undefined && { item_status: p.statusFilter }),
        ...(p.sizeW !== undefined && { item_w: p.sizeW === '' ? '' : p.sizeW.toString() }),
        ...(p.sizeD !== undefined && { item_d: p.sizeD === '' ? '' : p.sizeD.toString() }),
        ...(p.sizeH !== undefined && { item_H: p.sizeH === '' ? '' : p.sizeH.toString() }),
        ...(p.tolerance !== undefined && { item_tol: p.tolerance.toString() }),
        ...(p.page !== undefined && { item_page: p.page.toString() }),
      });
    },
    reload: fetchItems
  };
}
