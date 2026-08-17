export const CURRENCY_SYMBOLS: Record<string, string> = {
  KRW: '₩',
  USD: '$',
  EUR: '€',
  CNY: '¥',
  JPY: '¥',
  GBP: '£',
  CAD: '$',
  AUD: '$',
  VND: '₫',
};

/**
 * 통화 코드(예: 'USD')를 통화 기호(예: '$')로 변환합니다.
 * 매핑되지 않은 경우 원래 코드를 반환합니다.
 */
export const getCurrencySymbol = (currencyCode?: string): string => {
  if (!currencyCode) return '₩';
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};
