export function applySeparatorToName(
  baseName: string,
  separatorMode: string,
  customSeparator?: string
): { part_no: string; part_name: string } {
  let part_no = '';
  let part_name = baseName;

  if (separatorMode === 'smart') {
    const match = baseName.match(/^([a-zA-Z0-9-]+)(?:[\s_]+)(.+)$/);
    if (match) {
      part_no = match[1];
      part_name = match[2];
    }
  } else if (separatorMode === 'bracket') {
    const match = baseName.match(/^(.*?)[([{](.*?)[)\]}](.*)$/);
    if (match) {
      part_no = (match[1] + match[3]).trim();
      part_name = match[2].trim();
    }
  } else if (separatorMode === 'custom') {
    if (customSeparator) {
      const parts = baseName.split(customSeparator);
      if (parts.length > 1) {
        part_no = parts[0];
        part_name = parts.slice(1).join(customSeparator);
      }
    }
  } else {
    const sep = separatorMode === 'space' ? ' ' : separatorMode === 'underbar' ? '_' : '-';
    const parts = baseName.split(sep);
    if (parts.length > 1) {
      part_no = parts[0];
      part_name = parts.slice(1).join(sep);
    }
  }

  return { part_no: part_no.trim(), part_name: part_name.trim() };
}
