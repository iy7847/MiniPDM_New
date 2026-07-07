export type BlockType = 'header' | 'receiver_info' | 'summary' | 'item_table' | 'terms_notes' | 'condition' | 'free_text' | 'label' | 'line' | 'image' | 'company_info';
export type TemplateBand = 'header' | 'body' | 'footer';

export interface BaseBlock {
  id: string;
  type: BlockType;
  band: TemplateBand;
  x: number;
  y: number;
  width: number | string;
  height: number | string;
}

export interface HeaderBlock extends BaseBlock {
  type: 'header';
  title: string;
  showLogo: boolean;
  align: 'left' | 'center' | 'right';
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

export type TemplateBlock = 
  | HeaderBlock 
  | SenderReceiverBlock 
  | SummaryBlock 
  | ItemTableBlock 
  | TermsNotesBlock 
  | ConditionBlock
  | FreeTextBlock
  | LabelBlock
  | LineBlock;

export interface TemplateMetadata {
  headerHeight: number;
  footerHeight: number;
  blocks: TemplateBlock[];
}
