export type Client = { id: string; name: string; currency: string; };
export type Material = { id: string; name: string; code: string; density: number; unit_price: number; category?: string; };
export type PostProcessing = { id: string; name: string; price_per_kg: number; };
export type HeatTreatment = { id: string; name: string; price_per_kg: number; };

export type EstimateStatus = 'DRAFT' | 'SENT' | 'ORDERED' | 'ARCHIVED';

export type Estimate = {
  id: string;
  company_id: string;
  client_id: string;
  project_name: string;
  currency: string;
  base_exchange_rate: number;
  total_amount: number;
  status: EstimateStatus;
  created_at: string;
  updated_at: string;
  clients?: { name: string };
  item_count?: number;
};

export type EstimateItem = {
  id?: string;
  estimate_id?: string;
  part_name: string;
  part_no?: string;
  original_material_name?: string;
  shape: 'rect' | 'round';

  spec_w: number;
  spec_d: number;
  spec_h: number;

  raw_w: number;
  raw_d: number;
  raw_h: number;

  material_id: string | null;
  post_processing_id?: string | null;
  heat_treatment_id?: string | null;

  process_time: number;
  hourly_rate: number;
  difficulty: string;
  profit_rate: number;

  post_process_cost: number;
  heat_treatment_cost?: number;
  material_cost?: number;
  processing_cost?: number;
  outsource_cost?: number; // [NEW]

  calculated_price?: number; // [NEW] - Calculated unit price (theoretical cost)

  qty: number;
  unit_price: number;
  supply_price: number;

  work_days: number;
  note?: string;

  tempFiles?: File[];
  files?: any[];
};

export const DIFFICULTY_FACTOR: Record<string, number> = {
  'A': 1.0,
  'B': 1.2,
  'C': 1.5,
  'D': 2.0,
  'E': 2.5,
  'F': 3.0
};

export const INITIAL_ITEM_FORM: EstimateItem = {
  part_name: '',
  part_no: '',
  original_material_name: '',
  shape: 'rect',
  spec_w: 0,
  spec_d: 0,
  spec_h: 0,
  raw_w: 0,
  raw_d: 0,
  raw_h: 0,
  material_id: '',
  process_time: 0,
  hourly_rate: 50000,
  difficulty: 'B',
  profit_rate: 0,
  post_process_cost: 0,
  heat_treatment_cost: 0,
  material_cost: 0,
  processing_cost: 0,
  outsource_cost: 0,
  qty: 1,
  unit_price: 0,
  supply_price: 0,
  work_days: 3,
  note: '',
  tempFiles: [],
  files: []
};

export const createInitialItemForm = (
  settings?: any,
  overrides?: Partial<EstimateItem>
): EstimateItem => {
  const baseForm = { ...INITIAL_ITEM_FORM };

  if (settings) {
    baseForm.hourly_rate = Number(settings.default_hourly_rate ?? 50000);
    baseForm.profit_rate = Number(settings.default_profit_rate_step ?? 0);
  }

  const merged = { ...baseForm, ...overrides };

  // 마진 로직 계산 (원소재 사이즈가 아직 설정되지 않았을 때만 자동 세팅)
  const shape = merged.shape || 'rect';
  if (settings && (!merged.raw_w && !merged.raw_d && !merged.raw_h) && (merged.spec_w || merged.spec_d || merged.spec_h)) {
    if (shape === 'rect') {
      const marginW = Number(settings.default_margin_w ?? 5);
      const marginD = Number(settings.default_margin_d ?? 5);
      const marginH = Number(settings.default_margin_h ?? 0);
      merged.raw_w = merged.spec_w ? merged.spec_w + marginW : 0;
      merged.raw_d = merged.spec_d ? merged.spec_d + marginD : 0;
      merged.raw_h = merged.spec_h ? merged.spec_h + marginH : 0;
    } else {
      const marginW = Number(settings.default_margin_round_w ?? 5);
      const marginD = Number(settings.default_margin_round_d ?? 5);
      merged.raw_w = merged.spec_w ? merged.spec_w + marginW : 0;
      merged.raw_d = merged.spec_d ? merged.spec_d + marginD : 0;
      merged.raw_h = 0;
    }
  }

  return merged;
};
