export interface ItemSupplier {
  id: string;
  company_id: string;
  item_id: string;
  item_type: 'material' | 'post_processing' | 'heat_treatment';
  client_id: string;
  unit_price: number | null;
  moq: number | null;
  memo: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Material {
  id: string;
  company_id: string;
  code: string | null;
  name: string;
  category: string | null;
  density: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  suppliers?: ItemSupplier[];
}

export interface PostProcessing {
  id: string;
  company_id: string;
  code: string | null;
  name: string;
  unit_price: number;
  created_at: string;
  updated_at: string;
  suppliers?: ItemSupplier[];
}

export interface HeatTreatment {
  id: string;
  company_id: string;
  code: string | null;
  name: string;
  unit_price: number;
  created_at: string;
  updated_at: string;
  suppliers?: ItemSupplier[];
}
