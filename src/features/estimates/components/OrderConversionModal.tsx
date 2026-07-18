import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, PackageSearch, Rocket } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { NumberInput } from '../../../design-system/NumberInput';
import type { Estimate, EstimateItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  estimate: Partial<Estimate>;
  items: EstimateItem[];
  onConvert: (selectedItems: (EstimateItem & { order_qty: number })[]) => void;
}

export const OrderConversionModal: React.FC<Props> = ({ isOpen, onClose, estimate, items, onConvert }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      const initialIds = new Set<string>();
      const initialQtys: Record<string, number> = {};
      items.forEach(item => {
        if (item.id) {
          initialIds.add(item.id);
          initialQtys[item.id] = item.qty || 1;
        }
      });
      setSelectedIds(initialIds);
      setOrderQuantities(initialQtys);
    }
  }, [isOpen, items]);

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

  const handleQtyChange = (id: string, val: number) => {
    setOrderQuantities(prev => ({ ...prev, [id]: val }));
  };

  const handleConvert = () => {
    const selectedItemsToOrder = items
      .filter(item => item.id && selectedIds.has(item.id))
      .map(item => ({
        ...item,
        order_qty: orderQuantities[item.id!] || item.qty || 1
      }));
    
    if (selectedItemsToOrder.length === 0) return;
    onConvert(selectedItemsToOrder);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-surface w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-border-default flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-elevated/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <Rocket size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">부분 수주 전환</h2>
              <p className="text-xs text-text-secondary">고객이 실제 발주한 품목과 수량을 확인해주세요.</p>
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
              견적 품목 리스트
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
                  <th className="p-3 border-b border-border-default font-bold text-text-secondary text-right">견적 수량</th>
                  <th className="w-32 p-3 border-b border-border-default font-bold text-purple-400 text-center bg-purple-500/5">실제 발주 수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {items.length === 0 ? (
                  <tr>
                     <td colSpan={5} className="p-8 text-center text-text-secondary">견적 품목이 없습니다.</td>
                  </tr>
                ) : items.map((item, idx) => {
                  const isSelected = item.id ? selectedIds.has(item.id) : false;
                  return (
                    <tr key={item.id || idx} className={`transition-colors ${isSelected ? 'bg-brand-500/5' : 'opacity-60'}`}>
                      <td className="p-3 text-center">
                        <button onClick={() => item.id && toggleItem(item.id)} className="text-text-secondary hover:text-brand-500 transition-colors">
                          {isSelected ? <CheckSquare size={18} className="text-brand-500" /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className="p-3 font-medium text-text-primary">{item.part_no}</td>
                      <td className="p-3 text-text-secondary">{item.part_name}</td>
                      <td className="p-3 text-right text-text-primary">{item.qty?.toLocaleString()}</td>
                      <td className="p-2 bg-purple-500/5">
                        <div className="flex justify-center">
                          <NumberInput
                            value={orderQuantities[item.id!] || 1}
                            onChange={(val) => handleQtyChange(item.id!, val)}
                            disabled={!isSelected}
                            className="!w-24 border-purple-500/30 focus-within:border-purple-500 focus-within:ring-purple-500/20"
                            inputClassName="!h-8 !text-sm !text-center !font-bold"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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
