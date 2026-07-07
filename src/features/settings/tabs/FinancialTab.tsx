import React from 'react';
import { Card } from '@/design-system/Card';
import { NumberInput } from '@/design-system/NumberInput';
import type { CompanySettings } from '../services/settingsService';
import { CircleDollarSign, Ruler } from 'lucide-react';

interface FinancialTabProps {
  form: Partial<CompanySettings>;
  updateForm: (key: keyof CompanySettings, value: any) => void;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({ form, updateForm }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-default">
          <div className="p-2 bg-brand-bg rounded-xl">
            <CircleDollarSign className="w-5 h-5 text-brand-500" />
          </div>
          <h3 className="font-black text-text-primary uppercase tracking-tight">환율 및 임율</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">기본 적용 환율 (USD/KRW)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-secondary">$ 1 =</span>
              <div className="flex-1">
                <NumberInput
                  value={form.default_exchange_rate}
                  onChange={(val) => updateForm('default_exchange_rate', val)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">작업 임율 (Hourly Rate, ₩/hr)</label>
            <NumberInput
              value={form.default_hourly_rate}
              onChange={(val) => updateForm('default_hourly_rate', val)}
            />
          </div>
        </div>
      </Card>

      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-default">
          <div className="p-2 bg-success-bg rounded-xl">
            <Ruler className="w-5 h-5 text-success" />
          </div>
          <h3 className="font-black text-text-primary uppercase tracking-tight">단위 및 소재 여유 사이즈 설정</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">단가 절사 단위</label>
            <select
              className="w-full border border-border-default p-3 rounded-xl text-sm font-bold bg-bg-elevated text-text-primary outline-none focus:border-brand-500"
              value={form.default_rounding_unit || 1000}
              onChange={(e) => updateForm('default_rounding_unit', parseInt(e.target.value))}
            >
              <option value="1">1원</option>
              <option value="10">10원</option>
              <option value="100">100원</option>
              <option value="1000">1000원</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">시간 증감 단위</label>
            <select
              className="w-full border border-border-default p-3 rounded-xl text-sm font-bold bg-bg-elevated text-text-primary outline-none focus:border-brand-500"
              value={form.default_time_step || 0.1}
              onChange={(e) => updateForm('default_time_step', parseFloat(e.target.value))}
            >
              <option value="1">1.0h</option>
              <option value="0.1">0.1h</option>
              <option value="0.01">0.01h</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">이윤(%) 증감 단위</label>
            <select
              className="w-full border border-border-default p-3 rounded-xl text-sm font-bold bg-bg-elevated text-text-primary outline-none focus:border-brand-500"
              value={form.default_profit_rate_step || 1}
              onChange={(e) => updateForm('default_profit_rate_step', parseFloat(e.target.value))}
            >
              <option value="0.01">0.01%</option>
              <option value="0.1">0.1%</option>
              <option value="1">1%</option>
              <option value="5">5%</option>
              <option value="10">10%</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border-default">
          <div className="space-y-4">
            <label className="inline-flex items-center gap-2 text-[10px] font-black text-info uppercase tracking-widest bg-info-bg px-2 py-1 rounded-lg border border-info/30">
              <div className="w-2 h-2 bg-info rounded-sm" /> Plate Default Margins (mm)
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-muted uppercase ml-1">T+</label>
                <NumberInput value={form.default_margin_h} onChange={(val) => updateForm('default_margin_h', val)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-muted uppercase ml-1">W+</label>
                <NumberInput value={form.default_margin_w} onChange={(val) => updateForm('default_margin_w', val)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-muted uppercase ml-1">D+</label>
                <NumberInput value={form.default_margin_d} onChange={(val) => updateForm('default_margin_d', val)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="inline-flex items-center gap-2 text-[10px] font-black text-success uppercase tracking-widest bg-success-bg px-2 py-1 rounded-lg border border-success/30">
              <div className="w-2 h-2 rounded-full bg-success" /> Round Bar Default Margins (mm)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-muted uppercase ml-1">OD+</label>
                <NumberInput value={form.default_margin_round_w} onChange={(val) => updateForm('default_margin_round_w', val)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-muted uppercase ml-1">L+</label>
                <NumberInput value={form.default_margin_round_d} onChange={(val) => updateForm('default_margin_round_d', val)} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
