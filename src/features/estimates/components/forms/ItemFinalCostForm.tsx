import React from 'react';
import { BaseInput } from '../../../../design-system/BaseInput';
import { NumberInput } from '../../../../design-system/NumberInput';
import type { EstimateItem } from '../../types';

interface ItemFinalCostFormProps {
  qtyInput: string;
  setQtyInput: (val: string) => void;
  itemForm: EstimateItem;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  setIsManualPrice: (val: boolean) => void;
  calcResult: any;
}

export const ItemFinalCostForm: React.FC<ItemFinalCostFormProps> = ({
  qtyInput,
  setQtyInput,
  itemForm,
  setItemForm,
  setIsManualPrice,
  calcResult
}) => {
  return (
    <div className="space-y-4 pt-4 border-t border-border-default">
      <h3 className="text-lg font-bold text-text-primary border-b border-border-default pb-2">3. 수량 및 최종 단가</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">수량 다중입력</label>
          <BaseInput 
            value={qtyInput} 
            onChange={e => setQtyInput(e.target.value)} 
            placeholder="예: 10/50/100" 
          />
          <p className="text-xs text-text-secondary mt-1">슬래시(/) 구분 시 여러 행으로 자동 쪼개집니다.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <NumberInput label="기업이윤 (%)" value={itemForm.profit_rate} onChange={v => setItemForm({ ...itemForm, profit_rate: v })} />
          </div>
          <div className="flex-1">
            <NumberInput label="소요일 (일)" value={itemForm.work_days || ''} onChange={v => setItemForm({ ...itemForm, work_days: v })} />
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-bold text-text-primary mb-2">파일 업로드</label>
        <input 
          type="file" 
          multiple 
          onChange={(e) => {
            if (e.target.files) {
              setItemForm(prev => ({ ...prev, tempFiles: [...(prev.tempFiles || []), ...Array.from(e.target.files!)] }));
            }
          }} 
          className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-brand-500/10 file:text-brand-500 hover:file:bg-brand-500/20"
        />
      </div>

      <div className="mt-6 bg-bg-elevated p-6 rounded-xl border border-brand-500/30">
        <NumberInput
          label="최종 결정 단가 (₩/ea)"
          value={itemForm.unit_price}
          onChange={v => {
            setItemForm({ ...itemForm, unit_price: v });
            setIsManualPrice(true);
          }}
          inputClassName="text-brand-500 font-extrabold text-2xl h-14 bg-bg-base"
        />
        {calcResult.results && calcResult.results[0] && (
          <p className="text-sm text-text-secondary text-right mt-2">
            (할인율 {calcResult.results[0].discount_rate}% 반영 계산 원가: ₩ {calcResult.results[0].unit_price.toLocaleString()})
          </p>
        )}
      </div>
    </div>
  );
};
