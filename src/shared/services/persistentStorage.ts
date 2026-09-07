/**
 * 💾 데스크톱 초고속 영속 스토리지 어댑터 (V1 호환 순정 방식)
 * Chromium의 영구 localStorage 및 인메모리 캐시를 결합하여
 * 0ms 지연으로 세션, 이메일 기억, 설정을 영구 보존합니다.
 */

const memoryCache: Record<string, string> = {};

// 브라우저 localStorage로부터 즉시 메모리 캐시 초기화 (0ms 동기식)
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const val = window.localStorage.getItem(key);
        if (val !== null) memoryCache[key] = val;
      }
    }
  } catch {}
}

// 하위 호환용 no-op 초기화 함수 (지연 0ms)
export const initPersistentStorage = async () => {
  return Promise.resolve();
};

export const appStorage = {
  getItem: (key: string): string | null => {
    // 1. 메모리 캐시 우선 (0ms)
    if (key in memoryCache) {
      return memoryCache[key];
    }
    // 2. localStorage 조회
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          memoryCache[key] = val;
          return val;
        }
      }
    } catch {}
    return null;
  },

  setItem: (key: string, value: string): void => {
    const strVal = String(value);
    memoryCache[key] = strVal;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, strVal);
      }
    } catch {}
  },

  removeItem: (key: string): void => {
    delete memoryCache[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
};
