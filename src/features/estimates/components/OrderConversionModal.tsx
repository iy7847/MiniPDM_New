import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckSquare, Square, PackageSearch, Rocket } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { NumberInput } from '../../../design-system/NumberInput';
import type { Estimate, EstimateItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  estimate: Partial<Estimate>;
  items: EstimateItem[];
  onConvert: (selectedItems: (EstimateItem & { order_qty: number })[], customTotalAmount: number) => void;
}

export const OrderConversionModal: React.FC<Props> = ({ isOpen, onClose, estimate, items, onConvert }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isForeign = estimate.currency && estimate.currency !== 'KRW' && (estimate.base_exchange_rate || 0) > 0;
  const rate = isForeign ? (estimate.base_exchange_rate || 1) : 1;
  const currencyLabel = estimate.currency || 'KRW';

  useEffect(() => {
    if (isOpen) {
      const initialIds = new Set<string>();
      items.forEach(item => {
        if (item.id) {
          initialIds.add(item.id);
        }
      });
      setSelectedIds(initialIds);
    }
  }, [isOpen, items]);

  const currentTotalOrderAmount = useMemo(() => {
    let total = 0;
    items.forEach(item => {
      if (item.id && selectedIds.has(item.id)) {
        const rawAmount = (item.supply_price || ((item.qty || 1) * (item.unit_price || 0))) / rate;
        total += rawAmount;
      }
    });
    return total;
  }, [items, selectedIds, rate]);

  if (!isOpen) return null;

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id!)));
    }
  };

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };



  const handleConvert = () => {
    let exactKrwTotal = 0;
    const selectedItemsToOrder = items
      .filter(item => item.id && selectedIds.has(item.id))
      .map(item => {
        const currentQty = item.qty || 1;
        const currentAmountKrw = item.supply_price || (currentQty * (item.unit_price || 0));
        exactKrwTotal += currentAmountKrw;
        return {
          ...item,
          order_qty: currentQty,
          custom_order_amount: currentAmountKrw // DB에는 항상 KRW로 저장
        };
      });
    
    if (selectedItemsToOrder.length === 0) return;
    onConvert(selectedItemsToOrder, exactKrwTotal);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-surface w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-border-default flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-elevated/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <Rocket size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">수주 확정</h2>
              <p className="text-xs text-text-secondary">고객이 발주한 품목을 확인해 주세요.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-full transition-colors text-text-secondary">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-bg-base">


          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <PackageSearch size={16} className="text-brand-500" />
              수주 품목 리스트
            </h3>
            <span className="text-sm font-medium text-brand-500 bg-brand-500/10 px-3 py-1 rounded-full">
              총 {items.length}개 중 <span className="font-bold">{selectedIds.size}</span>개 선택됨
            </span>
          </div>

          <div className="border border-border-default rounded-xl overflow-hidden bg-bg-surface">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-bg-elevated">
                <tr>
                  <th className="w-12 p-3 text-center border-b border-border-default">
                    <button onClick={toggleAll} className="text-text-secondary hover:text-brand-500 transition-colors">
                      {selectedIds.size === items.length && items.length > 0 ? <CheckSquare size={18} className="text-brand-500" /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="p-3 border-b border-border-default font-bold text-text-secondary">품번 (도번)</th>
                  <th className="p-3 border-b border-border-default font-bold text-text-secondary">품명</th>
                  <th className="p-3 border-b border-border-default font-bold text-text-secondary text-right">단가</th>
                  <th className="p-3 border-b border-border-default font-bold text-text-secondary text-right">수량</th>
                  <th className="p-3 border-b border-border-default font-bold text-text-secondary text-right">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                 {items.length === 0 ? (
                  <tr>
                     <td colSpan={6} className="p-8 text-center text-text-secondary">견적 품목이 없습니다.</td>
                  </tr>
                ) : items.map((item, idx) => {
                  const isSelected = item.id ? selectedIds.has(item.id) : false;
                  const currentQty = item.qty || 1;
                  const estimateAmount = (item.supply_price || ((item.qty || 0) * (item.unit_price || 0))) / rate;
                  const displayUnitPrice = (item.unit_price || 0) / rate;

                  return (
                    <tr key={item.id || idx} className={`transition-colors ${isSelected ? 'bg-brand-500/5' : 'opacity-60'}`}>
                      <td className="p-3 text-center">
                        <button onClick={() => item.id && toggleItem(item.id)} className="text-text-secondary hover:text-brand-500 transition-colors">
                          {isSelected ? <CheckSquare size={18} className="text-brand-500" /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className="p-3 font-medium text-text-primary">{item.part_no}</td>
                      <td className="p-3 text-text-secondary truncate max-w-[150px]" title={item.part_name}>{item.part_name}</td>
                      <td className="p-3 text-right text-text-secondary">{displayUnitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-text-secondary">{item.qty?.toLocaleString()}</td>
                      <td className="p-3 text-right text-text-primary font-bold">{estimateAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-bg-elevated border-t-2 border-border-default">
                <tr>
                  <td colSpan={5} className="p-4 text-right font-bold text-text-secondary">
                    총 합계 금액
                  </td>
                  <td className="p-4 text-right font-bold text-purple-400 text-lg">
                    {currentTotalOrderAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border-default bg-bg-surface flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button 
            variant="primary" 
            onClick={handleConvert}
            disabled={selectedIds.size === 0}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 border-none shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all text-white px-6"
          >
            🚀 {selectedIds.size}개 품목 수주 등록
          </Button>
        </div>
      </div>
    </div>
  );
};
