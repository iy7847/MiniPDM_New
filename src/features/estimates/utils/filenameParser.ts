function isPartName(text: string) {
  if (/[가-힣]/.test(text)) return true;
  if (/^[a-zA-Z\s]+$/.test(text)) return true;
  return false;
}

function isPartNo(text: string) {
  if (/[0-9]/.test(text) && !/[가-힣]/.test(text)) return true;
  return false;
}

function assignChunks(chunk1: string, chunk2: string) {
  let part_no = chunk1;
  let part_name = chunk2;

  const c1IsName = isPartName(chunk1);
  const c2IsName = isPartName(chunk2);
  const c1IsNo = isPartNo(chunk1);
  const c2IsNo = isPartNo(chunk2);

  if (c1IsName && !c2IsName) {
    part_name = chunk1;
    part_no = chunk2;
  } else if (!c1IsName && c2IsName) {
    part_name = chunk2;
    part_no = chunk1;
  } else if (!c1IsNo && c2IsNo) {
    part_no = chunk2;
    part_name = chunk1;
  }

  return { part_no: part_no.trim(), part_name: part_name.trim() };
}

function assignSingleChunk(chunk: string) {
  if (isPartName(chunk)) {
    return { part_no: '', part_name: chunk.trim() };
  } else if (isPartNo(chunk)) {
    return { part_no: chunk.trim(), part_name: '' };
  }
  return { part_no: '', part_name: chunk.trim() };
}

export function applySeparatorToName(
  baseName: string,
  separatorMode: string,
  customSeparator?: string
): { part_no: string; part_name: string } {
  let chunkA = '';
  let chunkB = '';
  let isSplit = false;

  if (separatorMode === 'smart') {
    const match = baseName.match(/^([a-zA-Z0-9-]+)(?:[\s_]+)(.+)$/);
    if (match) {
      chunkA = match[1];
      chunkB = match[2];
      isSplit = true;
    } else {
      // 스마트 매칭 실패 시, 첫 번째 공백이나 언더바 기준으로 강제 분리 시도
      const splitMatch = baseName.match(/^(.*?)(?:[\s_]+)(.+)$/);
      if (splitMatch) {
        chunkA = splitMatch[1];
        chunkB = splitMatch[2];
        isSplit = true;
      }
    }
  } else if (separatorMode === 'bracket') {
    const match = baseName.match(/^(.*?)[([{](.*?)[)\]}](.*)$/);
    if (match) {
      chunkA = (match[1] + match[3]).trim();
      chunkB = match[2].trim();
      isSplit = true;
    }
  } else if (separatorMode === 'custom' && customSeparator) {
    const parts = baseName.split(customSeparator);
    if (parts.length > 1) {
      chunkA = parts[0];
      chunkB = parts.slice(1).join(customSeparator);
      isSplit = true;
    }
  } else if (['space', 'underbar', 'hyphen'].includes(separatorMode)) {
    const sep = separatorMode === 'space' ? ' ' : separatorMode === 'underbar' ? '_' : '-';
    const parts = baseName.split(sep);
    if (parts.length > 1) {
      chunkA = parts[0];
      chunkB = parts.slice(1).join(sep);
      isSplit = true;
    }
  }

  if (isSplit) {
    return assignChunks(chunkA, chunkB);
  } else {
    return assignSingleChunk(baseName);
  }
}

