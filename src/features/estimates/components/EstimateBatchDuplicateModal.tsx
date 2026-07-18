import React, { useState } from 'react';
import { X, Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/design-system/Button';
import { NumberInput } from '@/design-system/NumberInput';

interface EstimateBatchDuplicateModalProps {
  onConfirm: (quantities: number[]) => void;
  onCancel: () => void;
}

export const EstimateBatchDuplicateModal: React.FC<EstimateBatchDuplicateModalProps> = ({
  onConfirm,
  onCancel,
}) => {
  const [quantities, setQuantities] = useState<number[]>([10]);

  const handleAddRow = () => {
    setQuantities([...quantities, 10]);
  };

  const handleRemoveRow = (index: number) => {
    setQuantities(quantities.filter((_, i) => i !== index));
  };

  const handleChangeQty = (index: number, val: number) => {
    const newQties = [...quantities];
    newQties[index] = val || 0;
    setQuantities(newQties);
  };

  const handleConfirm = () => {
    const validQties = quantities.filter(q => q > 0);
    if (validQties.length === 0) {
      alert('유효한 수량을 1개 이상 입력해주세요.');
      return;
    }
    onConfirm(validQties);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-surface w-full max-w-xs rounded-lg shadow-xl border border-border-default flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-elevated">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Copy size={18} className="text-brand-500" />
            수량 분할
          </h3>
          <button onClick={onCancel} className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-surface">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {quantities.map((qty, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <NumberInput
                  value={qty}
                  onChange={(val) => handleChangeQty(index, val)}
                  allowDecimal={false}
                  placeholder="수량"
                />
              </div>
              <button
                onClick={() => handleRemoveRow(index)}
                className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded transition-colors"
                title="삭제"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="w-full mt-2 border-dashed border-border-default hover:border-brand-500 text-text-secondary hover:text-brand-500 bg-transparent hover:bg-brand-500/5"
            icon={<Plus size={16} />}
          >
            추가
          </Button>
        </div>

        <div className="p-4 border-t border-border-default bg-bg-elevated flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            분할
          </Button>
        </div>
      </div>
    </div>
  );
};
