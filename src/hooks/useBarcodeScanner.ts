import { useEffect, useCallback } from 'react';

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  debounceTime?: number; // 키 입력 간격 허용 시간 (기본값: 50ms)
}

/**
 * e.code를 기반으로 물리적 키값을 추출하는 함수.
 * 한글 IME 상태에서 바코드를 스캔할 때 'A'가 'ㅁ'으로 입력되는 오작동을 방지합니다.
 */
function getPhysicalChar(e: KeyboardEvent): string | null {
  // 숫자
  if (e.code.startsWith('Digit')) return e.code.replace('Digit', '');
  // 알파벳 (기본적으로 대문자로 취급)
  if (e.code.startsWith('Key')) return e.code.replace('Key', '');
  // 특수 기호 (바코드에 자주 쓰이는 기호)
  if (e.code === 'Minus') return '-';
  if (e.code === 'Space') return ' ';
  if (e.code === 'Slash') return '/';
  
  return null;
}

/**
 * 전역에서 바코드 리더기 입력을 감지하는 훅.
 * 바코드 리더기는 일반적으로 매우 짧은 시간 내에 여러 키를 입력하고 마지막에 'Enter'를 누르는 특성을 가집니다.
 */
export function useBarcodeScanner({ onScan, debounceTime = 50 }: UseBarcodeScannerProps) {
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const listener = (e: KeyboardEvent) => {
      // 바코드 스캐너의 입력 간격 계산
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      
      // 타이핑 간격이 너무 길면 사람이 직접 치는 것으로 간주하고 버퍼 초기화
      if (timeDiff > debounceTime && buffer.length > 0) {
        buffer = '';
      }

      // Enter 처리 (스캔 완료)
      if (e.code === 'Enter' || e.key === 'Enter') {
        if (buffer.length > 0) {
          onScan(buffer);
          buffer = '';
          // 스캔 완료 시 불필요한 폼 서밋 방지
          e.preventDefault();
        }
        return;
      }

      // IME 변환 문제 해결을 위해 물리적 키 코드(e.code) 우선 사용
      const char = getPhysicalChar(e);
      
      if (char) {
        buffer += char;
        // 스캐너 입력 중일 때(버퍼가 쌓이고 있을 때)는 Input 필드 타이핑 방지 (포커스 스틸 방어)
        if (buffer.length > 1) {
          e.preventDefault();
        }
      }
      
      lastKeyTime = currentTime;

      // 버퍼 비우기 타이머 갱신 (스캔 중 끊기는 경우 대비)
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        buffer = '';
      }, debounceTime * 2);
    };

    window.addEventListener('keydown', listener, { capture: true });

    return () => {
      window.removeEventListener('keydown', listener, { capture: true });
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onScan, debounceTime]);
}
