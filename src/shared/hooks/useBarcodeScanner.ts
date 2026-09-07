import { useEffect, useCallback, useRef } from 'react';

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  debounceTime?: number;
}

// 한글 입력기 상태에서 스캔 시 영문으로 역변환하기 위한 매핑 테이블
const koreanToEnglishMap: Record<string, string> = {
  'ㅂ': 'q', 'ㅈ': 'w', 'ㄷ': 'e', 'ㄱ': 'r', 'ㅅ': 't',
  'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅔ': 'p',
  'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g',
  'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
  'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b',
  'ㅜ': 'n', 'ㅡ': 'm',
  'ㅃ': 'Q', 'ㅉ': 'W', 'ㄸ': 'E', 'ㄲ': 'R', 'ㅆ': 'T',
  'ㅒ': 'O', 'ㅖ': 'P'
};

const convertKoreanToEnglish = (text: string) => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += koreanToEnglishMap[char] || char;
  }
  return result;
};

export const useBarcodeScanner = ({ onScan, debounceTime = 30 }: UseBarcodeScannerProps) => {
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 사용자가 Input이나 Textarea에 입력 중일 때는 스캐너 이벤트를 탈취하지 않음.
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    // 단, 스캐너의 입력 속도는 매우 빠르기 때문에 일반적인 타이핑과 구별할 수 있음.
    
    // Ctrl, Alt, Meta 등 특수키 조합은 무시
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime.current;

    if (e.key === 'Enter') {
      if (barcodeBuffer.current.length > 3) { // 바코드 최소 길이
        // 한글로 스캔된 경우 영문으로 자동 변환
        const converted = convertKoreanToEnglish(barcodeBuffer.current);
        const finalBarcode = converted.toUpperCase();
        onScan(finalBarcode);
      }
      barcodeBuffer.current = '';
    } else if (e.key.length === 1) { // 문자 입력
      // 입력 간격이 임계값(debounceTime)보다 길면 사람의 타자로 간주하고 버퍼 초기화
      if (timeDiff > debounceTime && barcodeBuffer.current.length > 0) {
        barcodeBuffer.current = '';
      }
      barcodeBuffer.current += e.key;
    }

    lastKeyTime.current = currentTime;
  }, [onScan, debounceTime]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
