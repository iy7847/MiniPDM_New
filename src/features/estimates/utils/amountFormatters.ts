export function numberToKoreanAmount(num: number, currency: string = 'KRW'): string {
  const suffix = currency === 'USD' ? '달러' : (currency === 'KRW' ? '원' : currency);
  
  if (!num || isNaN(num) || num === 0) return '일금 영' + suffix + '정';

  // 1. 소수점 둘째 자리에서 올림(Ceil)
  const roundedNum = Math.ceil(num * 100) / 100;
  
  // 2. 정수부와 소수부 분리
  const intPart = Math.floor(roundedNum);
  const fracPart = Math.round((roundedNum - intPart) * 100);

  const units = ['', '만 ', '억 ', '조 ', '경 '];
  const chars = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const pos = ['', '십', '백', '천'];

  // 3. 변환 헬퍼 함수
  const convert = (n: number) => {
    if (n === 0) return '영';
    let numStr = n.toString();
    let result = '';
    let unitIndex = 0;
    while (numStr.length > 0) {
      const chunk = numStr.slice(-4);
      numStr = numStr.slice(0, -4);
      let chunkResult = '';
      for (let i = 0; i < chunk.length; i++) {
        const digit = parseInt(chunk[chunk.length - 1 - i], 10);
        if (digit !== 0) {
          chunkResult = chars[digit] + pos[i] + chunkResult;
        }
      }
      if (chunkResult !== '') {
        result = chunkResult + units[unitIndex] + result;
      }
      unitIndex++;
    }
    return result;
  };

  const intResult = convert(intPart);
  let finalStr = '일금 ' + intResult + suffix;

  if (fracPart > 0 && currency === 'USD') {
     finalStr += ' ' + convert(fracPart) + '센트';
  } else if (fracPart > 0 && currency === 'EUR') {
     finalStr += ' ' + convert(fracPart) + '센트';
  } else if (fracPart > 0) {
     finalStr += ' ' + convert(fracPart) + '포인트'; // 일반적인 화폐
  }

  return finalStr + '정';
}

export function numberToEnglishAmount(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Zero';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWords = (n: number): string => {
    if (n === 0) return 'Zero';
    const numStr = n.toString();
    if (numStr.length > 15) return n.toString(); // Too large
    
    const units = ['', ' Thousand', ' Million', ' Billion', ' Trillion'];
    let str = '';
    let numStrPadded = numStr.padStart(Math.ceil(numStr.length / 3) * 3, '0');
    
    for (let i = 0; i < numStrPadded.length / 3; i++) {
      const chunk = parseInt(numStrPadded.substring(i * 3, i * 3 + 3), 10);
      if (chunk === 0) continue;
      
      let chunkStr = '';
      const h = Math.floor(chunk / 100);
      if (h > 0) chunkStr += a[h] + 'Hundred ';
      
      const t = chunk % 100;
      if (t > 0) {
        if (t < 20) chunkStr += a[t];
        else {
          chunkStr += b[Math.floor(t / 10)] + ' ';
          if (t % 10 > 0) chunkStr += a[t % 10];
        }
      }
      
      const unitIdx = (numStrPadded.length / 3) - 1 - i;
      str += chunkStr.trim() + units[unitIdx] + ' ';
    }
    
    return str.trim();
  };

  return 'Say : ' + toWords(num) + ' Only';
}
