import React, { useState } from 'react';
import { Trash2, Check, X, Copy } from 'lucide-react';
import { Button, NumberInput } from '@/design-system';

interface EstimateBatchToolbarProps {
  selectedCount: number;
  onApplyDeliveryDays: (days: number) => void;
  onClickDuplicate?: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function EstimateBatchToolbar({
  selectedCount,
  onApplyDeliveryDays,
  onClickDuplicate,
  onDelete,
  onClearSelection,
}: EstimateBatchToolbarProps) {
  const [deliveryDays, setDeliveryDays] = useState<number>(7);

  const handleApply = () => {
    if (deliveryDays !== undefined) {
      onApplyDeliveryDays(deliveryDays);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-6 h-9 px-4 bg-brand-500/10 border border-brand-500/30 rounded-lg animate-in fade-in zoom-in-95 duration-200 shadow-sm w-fit ml-auto">
      <div className="flex items-center gap-4">
        <div className="flex items-center pr-4 border-r border-brand-500/20">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-bold shadow-sm">
            {selectedCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-secondary whitespace-nowrap">소요일 변경</span>
          <div className="w-14">
            <NumberInput 
              value={deliveryDays} 
              onChange={setDeliveryDays} 
              allowDecimal={false}
              inputClassName="h-7 py-0 px-2 text-center min-h-0 text-sm"
              className="w-full"
            />
          </div>
          <span className="text-sm font-medium text-text-secondary whitespace-nowrap mr-1">일</span>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleApply}
            className="h-7 px-2 text-xs"
          >
            적용
          </Button>
        </div>

        {onClickDuplicate && (
          <div className="flex items-center pl-4 border-l border-brand-500/20">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={onClickDuplicate}
              className="h-7 px-3 text-xs"
              icon={<Copy className="w-3.5 h-3.5" />}
            >
              분할
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1 pl-4 border-l border-brand-500/20">
        <Button 
          variant="danger" 
          size="sm" 
          onClick={onDelete}
          icon={<Trash2 className="w-3.5 h-3.5" />}
          className="h-7 px-2 text-xs shadow-sm"
        >
          선택 삭제
        </Button>
        <button 
          onClick={onClearSelection}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary px-2 py-1 ml-1 transition-colors rounded hover:bg-bg-elevated"
        >
          <X className="w-3.5 h-3.5" />
          취소
        </button>
      </div>
    </div>
  );
}

