import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type SearchParamsInit = Record<string, string> | URLSearchParams | string;

interface StickyState {
  cleared: boolean;
  params: string;
}

/**
 * URL 파라미터를 기반으로 상태를 관리하며, 
 * sessionStorage를 통해 페이지를 벗어났다가 돌아와도 
 * 이전 검색 상태가 복원(Sticky)되도록 하는 커스텀 훅.
 * 
 * [개선 사항]
 * 1. 사용자가 의도적으로 모든 필터를 비운 상태(Clear)를 명시적으로 저장.
 * 2. 초기 렌더링 시 깜빡임(Double Fetch)을 방지하기 위한 isReady 플래그 제공.
 */
export function useStickySearchParams(
  storageKey: string,
  defaultInit?: SearchParamsInit
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const rawStored = sessionStorage.getItem(storageKey);
    const hasCurrentParams = Array.from(searchParams.keys()).length > 0;

    if (!hasCurrentParams) {
      if (rawStored) {
        try {
          const stickyState: StickyState = JSON.parse(rawStored);
          if (stickyState.cleared) {
            // 사용자가 의도적으로 비운 상태
            setIsReady(true);
            return;
          }
          if (stickyState.params) {
            // 저장된 파라미터가 있으면 URL 복원
            setSearchParams(new URLSearchParams(stickyState.params), { replace: true });
            // setSearchParams가 완료되면 다음 렌더에서 파라미터가 있으므로 else 블록으로 감
            return;
          }
        } catch (e) {
          // 하위 호환성 (구 버전 스토리지 데이터)
          setSearchParams(new URLSearchParams(rawStored), { replace: true });
          return;
        }
      } else if (defaultInit) {
        // 저장된 것도 없고 쿼리도 없으면 기본값 세팅
        setSearchParams(defaultInit, { replace: true });
        return;
      }
    }

    // URL 쿼리가 존재하는 상태 (복원 완료 또는 직접 진입)
    // 현재 상태를 스토리지에 백업
    const currentString = searchParams.toString();
    const newState: StickyState = {
      cleared: currentString === '',
      params: currentString
    };
    sessionStorage.setItem(storageKey, JSON.stringify(newState));
    setIsReady(true);

  }, [searchParams, setSearchParams, storageKey, defaultInit]);

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
