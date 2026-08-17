import React, { useState } from 'react';
import { Button, BaseInput } from '../../../../design-system';
import { Calendar, X, Rocket, Printer } from 'lucide-react';
import { toast } from '../../../../shared/stores/useToastStore';

interface OrderBatchToolbarProps {
  selectedCount: number;
  isLocked: boolean;
  onClearSelection: () => void;
  onApplyDueDate: (date: string) => void;
  onOrderConfirm: () => void;
  onOrderCancelHandoff?: () => void;
  hasPendingItems?: boolean;
  hasReadyItems?: boolean;
  onOpenLabelPrinter: () => void;
}

export const OrderBatchToolbar: React.FC<OrderBatchToolbarProps> = ({
  selectedCount,
  isLocked,
  onClearSelection,
  onApplyDueDate,
  onOrderConfirm,
  onOrderCancelHandoff,
  hasPendingItems = true,
  hasReadyItems = false,
  onOpenLabelPrinter,
}) => {
  const [batchDate, setBatchDate] = useState('');

  return (
    <div className="flex items-center justify-between bg-brand-500/10 border border-brand-500/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">
          {selectedCount}
        </span>
        <span className="text-sm font-bold text-brand-700">개 항목 선택됨</span>
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-brand-600 hover:bg-brand-500/20 h-7 px-2">
          <X size={14} className="mr-1" /> 선택 해제
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {!isLocked && (
          <div className="flex items-center gap-2 border-r border-brand-500/20 pr-4">
            <BaseInput 
              type="date" 
              value={batchDate} 
              onChange={(e) => setBatchDate(e.target.value)}
              className="w-36"
              inputClassName="h-8 text-[13px] px-2 py-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (!batchDate) {
                  toast.error('적용할 납기일을 먼저 선택해주세요.');
                  return;
                }
                onApplyDueDate(batchDate);
              }}
              className="h-8 px-3 whitespace-nowrap"
            >
              납기 적용
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isLocked && (
            <>
              {hasPendingItems && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={onOrderConfirm}
                  className="h-8 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 font-bold px-4"
                >
                  <Rocket size={16} />
                  수주 확정
                </Button>
              )}
              {hasReadyItems && onOrderCancelHandoff && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onOrderCancelHandoff}
                  className="h-8 flex items-center gap-2 text-status-warning border-status-warning hover:bg-status-warning/10 font-bold px-4"
                >
                  <X size={16} />
                  이관 취소
                </Button>
              )}
              {(hasPendingItems || hasReadyItems) && <div className="w-px h-5 bg-border-default mx-1"></div>}
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenLabelPrinter}
            className="h-8 flex items-center gap-2"
          >
            <Printer size={16} />
            라벨 출력
          </Button>
        </div>
      </div>
    </div>
  );
};
