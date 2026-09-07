import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';

export type SearchParamsInit = Record<string, string> | URLSearchParams | string;

interface StickyState {
  cleared: boolean;
  params: string;
}

/**
 * URL 파라미터를 기반으로 상태를 관리하며, 
 * sessionStorage를 통해 페이지를 벗어났다가 돌아와도 
 * 이전 검색 상태가 복원(Sticky)되도록 하는 커스텀 훅.
 */
export function useStickySearchParams(
  storageKey: string,
  defaultInit?: SearchParamsInit
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const defaultInitRef = useRef(defaultInit);
  const isInitializedRef = useRef(false);

  // 초기 마운트 시 파라미터 복원 또는 기본값 적용 (1회만 안전하게 실행)
  useEffect(() => {
    if (isInitializedRef.current) return;

    const rawStored = sessionStorage.getItem(storageKey);
    const hasCurrentParams = Array.from(searchParams.keys()).length > 0;

    if (!hasCurrentParams) {
      if (rawStored) {
        try {
          const stickyState: StickyState = JSON.parse(rawStored);
          if (stickyState.cleared) {
            setIsReady(true);
            isInitializedRef.current = true;
            return;
          }
          if (stickyState.params) {
            setSearchParams(new URLSearchParams(stickyState.params), { replace: true });
            setIsReady(true);
            isInitializedRef.current = true;
            return;
          }
        } catch (e) {
          setSearchParams(new URLSearchParams(rawStored), { replace: true });
          setIsReady(true);
          isInitializedRef.current = true;
          return;
        }
      } else if (defaultInitRef.current) {
        setSearchParams(defaultInitRef.current, { replace: true });
        setIsReady(true);
        isInitializedRef.current = true;
        return;
      }
    }

    const currentString = searchParams.toString();
    const newState: StickyState = {
      cleared: currentString === '',
      params: currentString
    };
    sessionStorage.setItem(storageKey, JSON.stringify(newState));
    setIsReady(true);
    isInitializedRef.current = true;
  }, [searchParams, setSearchParams, storageKey]);

  // searchParams 변경 시 세션스토리지 동기화 (초기화 완료 후)
  useEffect(() => {
    if (!isInitializedRef.current) return;
    const currentString = searchParams.toString();
    const newState: StickyState = {
      cleared: currentString === '',
      params: currentString
    };
    sessionStorage.setItem(storageKey, JSON.stringify(newState));
  }, [searchParams, storageKey]);

  // 파라미터 변경 함수 래퍼 (변경 시 sessionStorage에도 동시 저장)
  const setStickySearchParams = (
    nextInit: SearchParamsInit | ((prev: URLSearchParams) => SearchParamsInit),
    navigateOptions?: { replace?: boolean; state?: any }
  ) => {
    setSearchParams((prev) => {
      const nextParamsObj = typeof nextInit === 'function' ? nextInit(prev) : nextInit;
      const newParams = new URLSearchParams(nextParamsObj as any);
      
      const currentString = newParams.toString();
      const newState: StickyState = {
        cleared: currentString === '',
        params: currentString
      };
      sessionStorage.setItem(storageKey, JSON.stringify(newState));
      
      return newParams;
    }, navigateOptions);
  };

  return [searchParams, setStickySearchParams, isReady] as const;
}
