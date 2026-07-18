import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, FileText, Box } from 'lucide-react';
import { BaseInput } from '../../../../design-system/BaseInput';
import { NumberInput } from '../../../../design-system/NumberInput';
import { Badge } from '../../../../design-system/Badge';
import { EXT_2D, EXT_3D } from '../../utils/fileMatching';
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
  const [isOpen, setIsOpen] = useState(true);

  const allFiles = [...(itemForm.files || []), ...(itemForm.tempFiles || [])];
  let count3D = 0;
  let count2D = 0;
  
  allFiles.forEach(f => {
    const fileName = f.name || (f as any).file_name || '';
    const extName = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
    if (EXT_3D.includes(extName)) {
      count3D++;
    } else if (EXT_2D.includes(extName)) {
      count2D++;
    } else {
      // If it doesn't match predefined 3D/2D, we can just treat it as 2D Document or ignore.
      // Let's count it as 2D for simplicity if they just uploaded arbitrary documents
      count2D++; 
    }
  });

  return (
    <div className="space-y-4 pt-4 border-t border-border-default">
      <div 
        className="flex justify-between items-center cursor-pointer border-b border-border-default pb-2 select-none hover:bg-bg-elevated -mx-2 px-2 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-text-primary">3. 수량 및 최종 단가</h3>
        {isOpen ? <ChevronDown size={20} className="text-text-secondary" /> : <ChevronRight size={20} className="text-text-secondary" />}
      </div>
      
      {isOpen && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <NumberInput 
            label="수량"
            value={Number(qtyInput) || 1} 
            onChange={v => setQtyInput(String(v || 1))} 
            allowDecimal={false}
          />
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
        
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center justify-center bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 border border-brand-500/20 px-3 py-1.5 rounded-md text-xs font-bold transition-colors shrink-0">
            <span>파일 선택</span>
            <input 
              type="file" 
              multiple 
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  setItemForm(prev => ({ ...prev, tempFiles: [...(prev.tempFiles || []), ...Array.from(e.target.files!)] }));
                }
                e.target.value = '';
              }} 
            />
          </label>
          
          <div className="flex items-center gap-2 text-sm">
            {allFiles.length > 0 ? (
              <>
                {count2D > 0 && (
                  <Badge variant="info" className="py-1 px-2 font-bold text-xs flex items-center">
                    <FileText size={14} className="mr-1" /> 2D <span className="ml-1 opacity-70">({count2D})</span>
                  </Badge>
                )}
                {count3D > 0 && (
                  <Badge variant="warning" className="py-1 px-2 font-bold text-xs flex items-center">
                    <Box size={14} className="mr-1" /> 3D <span className="ml-1 opacity-70">({count3D})</span>
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-text-secondary text-xs">선택된 파일 없음</span>
            )}
          </div>
        </div>
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
      )}
    </div>
  );
};
