import React, { useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import { FloatingToolbar, Button, NumberInput } from '@/design-system';

interface EstimateBatchToolbarProps {
  selectedCount: number;
  onApplyDeliveryDays: (days: number) => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function EstimateBatchToolbar({
  selectedCount,
  onApplyDeliveryDays,
  onDelete,
  onClearSelection,
}: EstimateBatchToolbarProps) {
  const [deliveryDays, setDeliveryDays] = useState<number>(7);

  const handleApply = () => {
    if (deliveryDays !== undefined) {
      onApplyDeliveryDays(deliveryDays);
    }
  };

  return (
    <FloatingToolbar
      isVisible={selectedCount > 0}
      selectedCount={selectedCount}
      onClearSelection={onClearSelection}
    >
      <div className="flex items-center gap-2 pl-2">
        <span className="text-sm text-text-secondary whitespace-nowrap">납기일 변경</span>
        <div className="w-16">
          <NumberInput 
            value={deliveryDays} 
            onChange={setDeliveryDays} 
            allowDecimal={false}
          />
        </div>
        <span className="text-sm text-text-secondary whitespace-nowrap">일</span>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleApply}
          icon={<Check className="w-4 h-4" />}
        >
          적용
        </Button>
      </div>
      
      <div className="pl-4 border-l border-border-default ml-2">
        <Button 
          variant="danger" 
          size="sm" 
          onClick={onDelete}
          icon={<Trash2 className="w-4 h-4" />}
        >
          선택 삭제
        </Button>
      </div>
    </FloatingToolbar>
  );
}
