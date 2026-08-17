const BASE33_ALPHABET = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';

function generateBase33String(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * BASE33_ALPHABET.length);
    result += BASE33_ALPHABET[randomIndex];
  }
  return result;
}

export function generateMaterialPONumber(): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  
  // Generating a random 3-character Base33 string
  const randomSuffix = generateBase33String(3);
  
  return `M${yy}${mm}-${randomSuffix}`;
}
