import React, { useState, startTransition } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { NumberInput } from '../../../../design-system/NumberInput';
import type { EstimateItem } from '../../types';

interface ItemCustomCostFormProps {
  itemForm: EstimateItem;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  estimate?: any;
  disabled?: boolean;
}

export const ItemCustomCostForm: React.FC<ItemCustomCostFormProps> = ({ itemForm, setItemForm, estimate, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const customColumns = estimate?.custom_columns || [];
  
  if (customColumns.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-border-default">
      <div 
        className="flex justify-between items-center cursor-pointer border-b border-border-default pb-2 select-none hover:bg-bg-elevated -mx-2 px-2 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-text-primary">3. 동적 추가 비용 항목</h3>
        {isOpen ? <ChevronDown size={20} className="text-text-secondary" /> : <ChevronRight size={20} className="text-text-secondary" />}
      </div>
      
      {isOpen && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
            {customColumns.map((colName: string) => (
              <div key={colName}>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  {colName} (₩)
                </label>
                <NumberInput
                  value={itemForm.custom_costs?.[colName] || 0}
                  onChange={(val) => {
                    startTransition(() => {
                      setItemForm(prev => ({
                        ...prev,
                        custom_costs: {
                          ...(prev.custom_costs || {}),
                          [colName]: val
                        }
                      }));
                    });
                  }}
                  className="w-full text-right"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
