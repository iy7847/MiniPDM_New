import { useMemo } from 'react';
import { DIFFICULTY_FACTOR } from '../types';

export type ItemCalculatorParams = {
  shape: 'rect' | 'round';
  raw_w: number;
  raw_d: number;
  raw_h: number;
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
  rounding_unit?: number; // Defaults to 1000 if not provided
};

export const useItemCalculator = (params: ItemCalculatorParams) => {
  return useMemo(() => {
    const {
      shape, raw_w, raw_d, raw_h, density, material_price,
      hourly_rate, process_time, difficulty,
      heat_treatment_price, post_process_price, outsource_cost = 0,
      profit_rate = 0, qty = 1, rounding_unit = 1000
    } = params;

    // 1. Calculate Weight
    let weight = 0;
    if (shape === 'rect') {
      weight = (raw_w * raw_d * raw_h * density) / 1000000;
    } else if (shape === 'round') {
      const radius = raw_w / 2;
      weight = (Math.PI * Math.pow(radius, 2) * raw_d * density) / 1000000;
    }

    // 2. Material Cost
    const material_cost = Math.round(weight * material_price);

    // 3. Processing Cost
    const diff_factor = DIFFICULTY_FACTOR[difficulty] || 1.0;
    const processing_cost = Math.round(process_time * hourly_rate * diff_factor);

    // 4. Heat Treatment Cost
    const heat_treatment_cost = Math.round(weight * heat_treatment_price);

    // 5. Post Process Cost
    const post_process_cost = Math.round(weight * post_process_price);

    // 6. Unit Price
    const base_cost = material_cost + processing_cost + heat_treatment_cost + post_process_cost + outsource_cost;
    const profit = base_cost * (profit_rate / 100);
    const sub_total = base_cost + profit;

    // Apply rounding
    const unit_price = Math.ceil(sub_total / rounding_unit) * rounding_unit;

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
    params.shape, params.raw_w, params.raw_d, params.raw_h, params.density,
    params.material_price, params.hourly_rate, params.process_time, params.difficulty,
    params.heat_treatment_price, params.post_process_price, params.outsource_cost,
    params.profit_rate, params.qty, params.rounding_unit
  ]);
};
