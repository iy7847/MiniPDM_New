import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

interface EditablePriceCellProps {
  orderPrice: number;
  actualPrice?: number | null;
  status: string;
  onSave: (newActualPrice: number) => Promise<boolean>;
}

export const EditablePriceCell: React.FC<EditablePriceCellProps> = ({
  orderPrice,
  actualPrice,
  status,
  onSave,
}) => {
  const isReceived = status === '입고완료';
  
  // 현재 유효한 입고 단가 (actualPrice가 있으면 사용, 없으면 입고완료인 경우 발주단가를 기본으로 표시)
  const effectiveActualPrice = actualPrice !== null && actualPrice !== undefined 
    ? actualPrice 
    : (isReceived && orderPrice > 0 ? orderPrice : null);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setInputValue(effectiveActualPrice !== null ? effectiveActualPrice.toString() : (orderPrice > 0 ? orderPrice.toString() : ''));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
  };

  const handleSubmit = async () => {
    const num = parseFloat(inputValue.replace(/,/g, ''));
    if (isNaN(num) || num < 0) {
      handleCancel();
      return;
    }

    // 기존 값과 동일하면 불필요한 저장 방지
    if (effectiveActualPrice === num) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onSave(num);
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // 단가 차액 계산 (발주단가 vs 입고단가)
  const priceDiff = (effectiveActualPrice !== null && orderPrice > 0 && effectiveActualPrice !== orderPrice)
    ? effectiveActualPrice - orderPrice
    : 0;

  return (
    <div className="flex flex-col gap-1 py-0.5 w-full min-w-[110px] max-w-[135px]" onClick={(e) => e.stopPropagation()}>
      {/* 1. 발주 단가 (상단 고정 히스토리) */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] text-text-muted select-none">발주:</span>
        <span className="font-mono text-xs text-text-secondary text-right">
          {orderPrice > 0 ? `${orderPrice.toLocaleString()}원` : '-'}
        </span>
      </div>

      {/* 2. 입고 단가 (하단 인라인 즉시 편집) */}
      <div className="flex items-center justify-between text-xs min-h-[20px]">
        <span className="text-[11px] text-brand-400 font-medium select-none">입고:</span>
        
        {isEditing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSubmit}
              disabled={isSaving}
              className="w-20 px-1 py-0.5 text-xs text-right font-mono font-bold bg-bg-surface border border-brand-500 rounded focus:outline-none focus:ring-1 focus:ring-brand-400 text-text-primary shadow-sm"
              placeholder="0"
            />
            {isSaving && <Loader2 size={11} className="animate-spin text-brand-400" />}
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            title="클릭하여 실제 입고 단가 수정"
            className="group/price flex flex-col items-end cursor-pointer rounded hover:bg-bg-elevated/80 transition-colors"
          >
            <div className="flex items-center justify-end gap-1">
              <Pencil size={11} className="text-brand-400 opacity-0 group-hover/price:opacity-100 transition-opacity" />
              <span className={`font-mono text-xs text-right ${effectiveActualPrice !== null ? 'font-medium text-text-primary' : 'text-text-tertiary'}`}>
                {effectiveActualPrice !== null ? `${effectiveActualPrice.toLocaleString()}원` : '-'}
              </span>
            </div>
            
            {/* 발주단가 대비 차액 뱃지 표기 */}
            {priceDiff !== 0 && (
              <span className={`text-[10px] font-mono tracking-tighter ${priceDiff > 0 ? 'text-danger font-medium' : 'text-success font-medium'}`}>
                {priceDiff > 0 ? `(+${priceDiff.toLocaleString()}▲)` : `(${priceDiff.toLocaleString()}▼)`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
