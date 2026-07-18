export type BlockType = 'header' | 'receiver_info' | 'company_info' | 'document_info' | 'summary' | 'item_table' | 'terms_notes' | 'condition' | 'free_text' | 'label' | 'line' | 'image' | 'page_number';
export type TemplateBand = 'header' | 'body' | 'footer';

export interface BaseBlock {
  id: string;
  type: BlockType;
  band: TemplateBand;
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}

export interface HeaderBlock extends BaseBlock {
  type: 'header';
  title: string;
  align: 'left' | 'center' | 'right';
  fontSize: number;
  fontWeight: string;
}

export interface ReceiverInfoBlock extends BaseBlock {
  type: 'receiver_info';
  fields: string[]; // e.g. ['manager_name', 'phone', 'email', 'fax']
}

export interface SummaryBlock extends BaseBlock {
  type: 'summary';
  highlightColor: string;
  validityText: string;
  showVatNote: boolean;
  showKoreanAmount: boolean;
}

export interface ItemTableBlock extends BaseBlock {
  type: 'item_table';
  columns: string[]; // mapped from Excel presets or predefined
  theme: 'simple' | 'bordered' | 'striped';
}

export interface TermsNotesBlock extends BaseBlock {
  type: 'terms_notes'; // Deprecated in builder UI but kept for type compatibility
  showPaymentTerms: boolean;
  showIncoterms: boolean;
  showDeliveryPeriod: boolean;
  showDestination: boolean;
  showNote: boolean;
  customText?: string;
}

export interface ConditionBlock extends BaseBlock {
  type: 'condition';
  conditionType: 'payment_terms' | 'incoterms' | 'delivery_period' | 'destination' | 'note';
  showTitle: boolean;
}

export interface FreeTextBlock extends BaseBlock {
  type: 'free_text';
  content: string;
  fontSize: number;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  imageType: 'logo' | 'seal';
}

export interface CompanyInfoBlock extends BaseBlock {
  type: 'company_info';
  showSeal: boolean;
  fields: string[]; // e.g. ['ceo_name', 'biz_num', 'address', 'phone', 'email']
}

export interface DocumentInfoBlock extends BaseBlock {
  type: 'document_info';
  fields: string[]; // e.g. ['date', 'estimate_no']
}

export interface LabelBlock extends BaseBlock {
  type: 'label';
  text: string;
  fontSize: number;
  align: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold' | 'black';
  color: string;
}

export interface LineBlock extends BaseBlock {
  type: 'line';
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  marginTop: number;
  marginBottom: number;
}

export interface PageNumberBlock extends BaseBlock {
  type: 'page_number';
  format: 'Page {current} / {total}' | '{current} / {total}' | '- {current} -';
  align: 'left' | 'center' | 'right';
  fontSize: number;
  color: string;
}

export type TemplateBlock = 
  | HeaderBlock 
  | SummaryBlock 
  | ItemTableBlock 
  | TermsNotesBlock 
  | ConditionBlock
  | FreeTextBlock
  | LabelBlock
  | LineBlock
  | CompanyInfoBlock
  | ReceiverInfoBlock
  | ImageBlock
  | DocumentInfoBlock
  | PageNumberBlock;

export interface TemplateMetadata {
  headerHeight: number;
  footerHeight: number;
  blocks: TemplateBlock[];
}
