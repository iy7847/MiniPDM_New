import { useMemo } from 'react';
import { DIFFICULTY_FACTOR } from '../types';

export type ItemCalculatorParams = {
  shape: 'rect' | 'round';
  spec_w: number;
  spec_d: number;
  spec_h: number;
  density: number; // material density
  material_price: number; // material unit price per kg
  hourly_rate: number;
  process_time: number;
  difficulty: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  heat_treatment_price: number; // price per kg
  post_process_price: number; // price per kg
  outsource_cost?: number;
  profit_rate?: number;
  qty?: number;
};

export const useItemCalculator = (params: ItemCalculatorParams) => {
  return useMemo(() => {
    const {
      shape, spec_w, spec_d, spec_h, density, material_price,
      hourly_rate, process_time, difficulty,
      heat_treatment_price, post_process_price, outsource_cost = 0,
      profit_rate = 0, qty = 1
    } = params;

    // 1. Calculate Weight
    let weight = 0;
    if (shape === 'rect') {
      weight = (spec_w * spec_d * spec_h * density) / 1000000;
    } else if (shape === 'round') {
      const radius = spec_w / 2;
      weight = (Math.PI * Math.pow(radius, 2) * spec_d * density) / 1000000;
    }

    // 2. Material Cost
    const material_cost = weight * material_price;

    // 3. Processing Cost
    const diff_factor = DIFFICULTY_FACTOR[difficulty] || 1.0;
    const processing_cost = process_time * hourly_rate * diff_factor;

    // 4. Heat Treatment Cost
    const heat_treatment_cost = weight * heat_treatment_price;

    // 5. Post Process Cost
    const post_process_cost = weight * post_process_price;

    // 6. Unit Price
    const base_cost = material_cost + processing_cost + heat_treatment_cost + post_process_cost + outsource_cost;
    const profit = base_cost * (profit_rate / 100);
    const unit_price = base_cost + profit;

    const total_price = unit_price * qty;

    return {
      weight,
      material_cost,
      processing_cost,
      heat_treatment_cost,
      post_process_cost,
      unit_price,
      total_price
    };
  }, [
    params.shape, params.spec_w, params.spec_d, params.spec_h, params.density,
    params.material_price, params.hourly_rate, params.process_time, params.difficulty,
    params.heat_treatment_price, params.post_process_price, params.outsource_cost,
    params.profit_rate, params.qty
  ]);
};
