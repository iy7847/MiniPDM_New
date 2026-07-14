import React from 'react';
import type { EstimateItem } from '../../types';

interface ItemSimilarHistoryProps {
  similarItems: EstimateItem[];
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  setIsManualPrice: (val: boolean) => void;
}

export const ItemSimilarHistory: React.FC<ItemSimilarHistoryProps> = ({
  similarItems,
  setItemForm,
  setIsManualPrice
}) => {
  if (similarItems.length === 0) return null;

  return (
    <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/30">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-bold text-orange-500">🔍 과거 유사 견적 이력 ({similarItems.length}건)</h4>
      </div>
      <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar pr-2">
        {similarItems.map((item) => (
          <div key={item.id} className="bg-bg-surface p-3 rounded border border-border-default text-sm shadow-sm hover:border-brand-500 transition-colors cursor-pointer" onClick={() => {
            setItemForm(prev => ({
              ...prev,
              material_id: item.material_id,
              hourly_rate: item.hourly_rate,
              process_time: item.process_time,
              difficulty: item.difficulty,
              unit_price: item.unit_price,
            }));
            setIsManualPrice(true);
          }}>
            <div className="flex justify-between font-bold text-text-primary mb-1">
              <span>{item.part_name} ({item.part_no})</span>
              <span className="text-brand-500">₩ {item.unit_price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-text-secondary text-xs">
              <span>{item.spec_w} x {item.spec_d} x {item.spec_h}</span>
              <span>수량: {item.qty}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
