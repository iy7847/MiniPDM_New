import React, { useState, useEffect } from 'react';
import { Drawer } from '../../../design-system/Drawer';
import { BaseInput } from '../../../design-system/BaseInput';
import { NumberInput } from '../../../design-system/NumberInput';
import { Button } from '../../../design-system/Button';
import { Search, History, Loader2 } from 'lucide-react';
import type { EstimateItem } from '../types';
import { searchPastItems } from '../services/estimateService';

interface HistorySearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyItem: (item: Partial<EstimateItem>) => void;
  companyId?: string | null;
}

export const HistorySearchDrawer: React.FC<HistorySearchDrawerProps> = ({
  isOpen,
  onClose,
  onApplyItem,
  companyId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [w, setW] = useState<number | undefined>();
  const [d, setD] = useState<number | undefined>();
  const [h, setH] = useState<number | undefined>();
  
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!companyId) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await searchPastItems({
        companyId,
        keyword: searchTerm,
        sizeW: w,
        sizeD: d,
        sizeH: h,
        tolerance: 5 // 5% 오차
      });
      setResults(data || []);
    } catch (err) {
      console.error('Failed to search past items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // When drawer opens, reset states if necessary
  useEffect(() => {
    if (isOpen) {
      // You can choose to reset or keep previous search
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="과거 단가 이력 검색" width="w-[450px]">
      <div className="flex flex-col h-full space-y-4">
        {/* Search Form */}
        <div className="space-y-3 bg-bg-elevated p-4 rounded-lg border border-border-default">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <BaseInput 
              placeholder="품번 또는 품명으로 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">가로 (W)</label>
              <NumberInput value={w || 0} onChange={(val) => setW(val === 0 ? undefined : val)} onKeyDown={handleKeyDown} placeholder="W" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">세로 (D)</label>
              <NumberInput value={d || 0} onChange={(val) => setD(val === 0 ? undefined : val)} onKeyDown={handleKeyDown} placeholder="D" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">두께 (H)</label>
              <NumberInput value={h || 0} onChange={(val) => setH(val === 0 ? undefined : val)} onKeyDown={handleKeyDown} placeholder="H" />
            </div>
          </div>
          
          <div className="text-xs text-text-secondary flex items-center justify-between">
            <span>* 입력한 치수 기준 ±5% 오차 허용</span>
            <Button variant="primary" onClick={handleSearch} disabled={isLoading || !companyId} className="h-8">
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : '검색'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {!hasSearched ? (
            <div className="text-center py-12 text-text-secondary text-sm">
              검색 조건을 입력하고 검색 버튼을 눌러주세요.
            </div>
          ) : isLoading ? (
             <div className="text-center py-12 text-text-secondary text-sm flex flex-col items-center gap-2">
               <Loader2 className="animate-spin" size={24} />
               데이터를 불러오는 중...
             </div>
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <div 
                key={idx} 
                className="p-4 border border-border-default rounded-lg bg-bg-base hover:border-brand-500 hover:bg-bg-elevated transition-colors group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-bold text-text-primary">{item.part_no || '-'}</div>
                    <div className="text-sm text-text-secondary">{item.part_name}</div>
                    <div className="text-xs text-text-secondary mt-1">
                      규격: {item.spec_w} x {item.spec_d} x {item.spec_h}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-brand-500">{item.unit_price?.toLocaleString()} 원</div>
                    <div className="text-xs text-text-secondary">{item.original_material_name}</div>
                    <div className="text-xs text-text-secondary mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                  onClick={() => {
                    onApplyItem(item);
                    onClose();
                  }}
                >
                  <History size={14} />
                  이 단가 적용하기
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-text-secondary text-sm">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
