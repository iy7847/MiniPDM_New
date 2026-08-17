/**
 * 수주 및 품목 채번용 하이브리드(숫자+알파벳) 시퀀스 생성 유틸리티
 * 규칙: I, O, Z를 제외한 23개의 알파벳을 사용하여 시안성 확보
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXY"; // 23 characters

/**
 * 부모 (수주) 순번 생성 (3자리 고정)
 * - 1 ~ 999: 001 ~ 999
 * - 1000 ~ 1099: A00 ~ A99
 * - 1100 ~ 1199: B00 ~ B99
 * @param seqInt 1부터 시작하는 순서
 * @returns 3자리 문자열 (예: '001', 'A00')
 */
export function generateOrderSequence(seqInt: number): string {
  if (seqInt <= 999) {
    return String(seqInt).padStart(3, '0');
  }
  
  const overflow = seqInt - 1000; // 0-based from 1000
  const alphaIndex = Math.floor(overflow / 100);
  const numericPart = overflow % 100;
  
  if (alphaIndex >= ALPHABET.length) {
    // 3,299건을 초과하면 에러 대신 그냥 4자리 문자열 반환 (시스템 중단 방지)
    return String(seqInt);
  }
  
  return ALPHABET[alphaIndex] + String(numericPart).padStart(2, '0');
}

/**
 * 자식 (품목) 순번 생성 (2자리 고정)
 * - 1 ~ 99: 01 ~ 99
 * - 100 ~ 109: A0 ~ A9
 * - 110 ~ 119: B0 ~ B9
 * @param seqInt 1부터 시작하는 순서
 * @returns 2자리 문자열 (예: '01', 'A0')
 */
export function generateOrderItemSequence(seqInt: number): string {
  if (seqInt <= 99) {
    return String(seqInt).padStart(2, '0');
  }
  
  const overflow = seqInt - 100;
  const alphaIndex = Math.floor(overflow / 10);
  const numericPart = overflow % 10;
  
  if (alphaIndex >= ALPHABET.length) {
    // 329건 초과 시 에러 대신 그냥 원본 숫자 반환
    return String(seqInt);
  }
  
  return ALPHABET[alphaIndex] + String(numericPart);
}

/**
 * 부모 수주 번호 전체 문자열 생성
 * 예: P2607-001
 * @param date 날짜 객체 또는 문자열 (디폴트: 현재시간)
 * @param count 1부터 시작하는 이 달의 순서
 */
export function buildOrderPoNo(count: number, date: Date | string = new Date()): string {
  const d = new Date(date);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  
  const seq = generateOrderSequence(count);
  
  return `P${yy}${mm}-${seq}`;
}
