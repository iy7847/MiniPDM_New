import type { TemplateBlock } from '../../types/templateBuilder';

export const getLocalImagePath = (path: string | undefined | null) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  
  // Normalize Windows backslashes
  let normalizedPath = path.replace(/\\/g, '/');
  // Remove file:/// if present
  normalizedPath = normalizedPath.replace(/^file:\/\/\//i, '');
  
  // Use Vite's @fs prefix for local paths in dev mode
  if (import.meta.env.DEV) {
    return `/@fs/${normalizedPath}`;
  }
  
  return `file:///${normalizedPath}`;
};

export const DEFAULT_IDEAL_BLOCKS: TemplateBlock[] = [
  { id: 'header_block', type: 'header', band: 'header', x: 30, y: 40, width: 734, height: 60, title: '견 적 서', align: 'center', fontSize: 24, fontWeight: 'bold' } as any,
  { id: 'receiver_info_block', type: 'receiver_info', band: 'header', x: 30, y: 110, width: 350, height: 60, fields: ['manager_name', 'phone'] } as any,
  { id: 'document_info_block', type: 'document_info', band: 'header', x: 30, y: 175, width: 350, height: 35, fields: ['date', 'estimate_no'] } as any,
  { id: 'company_info_block', type: 'company_info', band: 'header', x: 414, y: 110, width: 350, height: 100, showSeal: true, fields: ['ceo_name', 'biz_num', 'address'] } as any,
  { id: 'table_block', type: 'item_table', band: 'body', x: 30, y: 250, width: 734, height: 250, columns: ['No.', '품명', '규격', '수량', '단가', '공급가액'], theme: 'striped' } as any,
  { id: 'summary_block', type: 'summary', band: 'body', x: 30, y: 520, width: 734, height: 100, highlightColor: '#f3f4f6', showVatNote: true, showKoreanAmount: true, showEnglishAmount: true } as any,
  { id: 'cond_payment', type: 'condition', band: 'footer', x: 30, y: 943, width: 350, height: 60, conditionType: 'payment_terms', showTitle: true } as any,
  { id: 'cond_delivery', type: 'condition', band: 'footer', x: 30, y: 1013, width: 350, height: 60, conditionType: 'delivery_period', showTitle: true } as any,
  { id: 'cond_note', type: 'condition', band: 'footer', x: 400, y: 943, width: 364, height: 130, conditionType: 'note', showTitle: true } as any
];
