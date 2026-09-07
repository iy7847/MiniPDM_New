import { useMemo } from 'react';
import { DIFFICULTY_FACTOR } from '../types';

export type DiscountPolicy = {
  quantities: number[];
  rates: Record<string, number[]>; // key: difficulty or 'default'
};

export type EstimateCalculationsParams = {
  // 1. 형상 및 치수
  shape: 'rect' | 'round';
  spec_w: number; // 도면 치수 (가로/외경)
  spec_d: number; // 도면 치수 (세로/길이)
  spec_h: number; // 도면 치수 (두께/내경 등)
  
  // 회사별 여유 기장 (Margin)
  margin_w?: number;
  margin_d?: number;
  margin_h?: number;

  // 수동 입력 원소재 치수 (Overrides)
  raw_w_override?: number;
  raw_d_override?: number;
  raw_h_override?: number;

  // 2. 소재 정보
  density: number; // 비중
  material_price: number; // kg당 단가

  // 3. 가공 정보
  process_time: number; // 가공 시간 (시간)
  hourly_rate: number; // 임률 (원/시간)
  difficulty: string; // 난이도 ('A', 'B', 'C', 'D', 'E', 'F')

  // 4. 후처리 및 열처리 (중량 기반)
  heat_treatment_price?: number; // kg당 단가
  post_process_price?: number; // kg당 단가
  
  // 기타 비용 및 마진
  outsource_cost?: number; // 외주비
  custom_costs?: Record<string, number>; // 동적 항목 비용
  profit_rate?: number; // 이윤율 (%)
  
  // 5. 수량 및 할인/할증
  qty_input?: string | number; // '10' 또는 '10/50/100' 다중 입력 가능
  discount_policy?: DiscountPolicy;

  // 6. 반올림 규칙
  rounding_unit?: number; // 기본 1000원 단위
};

export type CalculatedQuantityResult = {
  qty: number;
  discount_rate: number;
  unit_price: number;
  total_price: number;
};

export type EstimateCalculationsResult = {
  // 1. 산출된 가공 치수 (기본 치수 + 여유 기장)
  raw_w: number;
  raw_d: number;
  raw_h: number;
  
  // 2. 중량 및 기본 비용 산출
  weight: number; // 산출된 중량 (kg)
  material_cost: number;
  processing_cost: number;
  heat_treatment_cost: number;
  post_process_cost: number;
  
  // 3. 기본 원가 (이윤, 할인 미적용 총 비용)
  base_cost: number; 

  // 4. 수량별 최종 계산 결과
  results: CalculatedQuantityResult[];
  
  // 5. 대표 결과 (첫 번째 수량 기준)
  qty: number;
  unit_price: number;
  total_price: number;
};

/**
 * 수량별 할인율 선형 보간 계산 함수
 */
const calculateDiscountRate = (policy: any, difficulty: string, qty: number): number => {
  if (!policy) return 100;

  const isDynamic = 'quantities' in policy;
  const quantities: number[] = isDynamic && policy.quantities ? policy.quantities : [1, 10, 50, 100, 500, 1000];
  const ratesObj = isDynamic ? policy.rates : policy;

  if (!ratesObj) return 100;

  const rates = ratesObj[difficulty] || ratesObj['default'] || ratesObj['A'];

  if (!rates || rates.length === 0) return 100;

  if (qty <= quantities[0]) return rates[0];
  if (qty >= quantities[quantities.length - 1]) return rates[rates.length - 1];

  let i = 0;
  while (i < quantities.length - 1 && quantities[i + 1] < qty) {
    i++;
  }

  const x1 = quantities[i];
  const x2 = quantities[i + 1];
  const y1 = rates[i];
  const y2 = rates[i + 1];

  // 선형 보간 (Linear Interpolation)
  const rate = y1 + ((qty - x1) * (y2 - y1)) / (x2 - x1);
  return Math.round(rate * 10) / 10;
};

export const calculateEstimate = (params: EstimateCalculationsParams): EstimateCalculationsResult => {
  const {
    shape,
    spec_w, spec_d, spec_h,
    margin_w = 0, margin_d = 0, margin_h = 0,
    raw_w_override, raw_d_override, raw_h_override,
    density, material_price,
    process_time, hourly_rate, difficulty,
    heat_treatment_price = 0, post_process_price = 0,
    outsource_cost = 0, profit_rate = 0,
    qty_input = 1, discount_policy,
    rounding_unit = 1000,
    custom_costs = {}
  } = params;

    // 1. 가공 치수 산출 (여유 기장 반영 혹은 사용자 수동 입력치 우선)
    const raw_w = raw_w_override && raw_w_override > 0 ? raw_w_override : spec_w + margin_w;
    const raw_d = raw_d_override && raw_d_override > 0 ? raw_d_override : spec_d + margin_d;
    const raw_h = raw_h_override && raw_h_override > 0 ? raw_h_override : spec_h + margin_h;

    // 2. 중량 산출 (사각 / 원형)
    let weight = 0;
    if (shape === 'rect') {
      // (가로 * 세로 * 두께 * 비중) / 1,000,000
      weight = (raw_w * raw_d * raw_h * density) / 1000000;
    } else if (shape === 'round') {
      // (π * 반지름^2 * 길이 * 비중) / 1,000,000
      const radius = raw_w / 2;
      weight = (Math.PI * Math.pow(radius, 2) * raw_d * density) / 1000000;
    }

    // 3. 비용 산출
    const material_cost = Math.round(weight * material_price);
    
    const diff_factor = DIFFICULTY_FACTOR[difficulty] || 1.0;
    const processing_cost = Math.round(process_time * hourly_rate * diff_factor);
    
    const heat_treatment_cost = Math.round(weight * heat_treatment_price);
    const post_process_cost = Math.round(weight * post_process_price);

    // 동적 항목 비용 합계
    const custom_costs_total = Object.values(custom_costs || {}).reduce((sum, cost) => sum + (Number(cost) || 0), 0);

    // 원가 합계 (할인 및 이윤 적용 전)
    const base_cost = material_cost + processing_cost + heat_treatment_cost + post_process_cost + outsource_cost + custom_costs_total;

    // 이윤 적용된 기준가
    const sub_total = base_cost * (1 + profit_rate / 100);

    // 4. 수량 파싱
    let quantities: number[] = [];
    if (typeof qty_input === 'string') {
      quantities = qty_input.split(/[/,]/).map(q => parseFloat(q.trim())).filter(q => !isNaN(q) && q > 0);
      if (quantities.length === 0) quantities = [1];
    } else {
      quantities = [qty_input > 0 ? qty_input : 1];
    }

    // 5. 수량별 결과 산출
    const results: CalculatedQuantityResult[] = quantities.map(qty => {
      // 할인/할증률 계산
      const discount_rate = calculateDiscountRate(discount_policy, difficulty, qty);
      
      // 수량별 단가 (할인율 적용)
      const discounted_unit_price = sub_total * (discount_rate / 100);
      
      // 반올림 적용 (기본 1000 단위)
      const final_unit_price = rounding_unit > 0 
        ? Math.ceil(discounted_unit_price / rounding_unit) * rounding_unit
        : Math.round(discounted_unit_price);

      return {
        qty,
        discount_rate,
        unit_price: final_unit_price,
        total_price: final_unit_price * qty
      };
    });

    const primaryResult = results[0];

    return {
      raw_w,
      raw_d,
      raw_h,
      weight,
      material_cost,
      processing_cost,
      heat_treatment_cost,
      post_process_cost,
      base_cost,
      results,
      qty: primaryResult.qty,
      unit_price: primaryResult.unit_price,
      total_price: primaryResult.total_price
    };
};

export const useEstimateCalculations = (params: EstimateCalculationsParams): EstimateCalculationsResult => {
  return useMemo(() => calculateEstimate(params), [
    params.shape, params.spec_w, params.spec_d, params.spec_h,
    params.margin_w, params.margin_d, params.margin_h,
    params.raw_w_override, params.raw_d_override, params.raw_h_override,
    params.density, params.material_price,
    params.process_time, params.hourly_rate, params.difficulty,
    params.heat_treatment_price, params.post_process_price,
    params.outsource_cost, params.profit_rate,
    params.qty_input, params.discount_policy, params.rounding_unit
  ]);
};
