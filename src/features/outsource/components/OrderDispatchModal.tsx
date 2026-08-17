import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/shared/services/supabase';
import { toast } from '@/shared/stores/useToastStore';
import { Button, BaseInput, BaseSelect } from '@/design-system';
import type { ProcurementOrder } from '../hooks/useProcurementList';
import { EmailComposeModal } from './EmailComposeModal';
import { MaterialCalculatorModal } from './MaterialCalculatorModal';
import { Calculator } from 'lucide-react';

interface OrderDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: ProcurementOrder[];
  suppliers: { id: string; name: string; manager_email?: string; manager_name?: string }[];
  processBatchOrder: (
    updates: { id: string; type: any; unit_price: number; note: string }[],
    supplierId: string,
    supplierName: string,
    expectedDate: string,
    token?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const OrderDispatchModal: React.FC<OrderDispatchModalProps> = ({
  isOpen,
  onClose,
  selectedOrders,
  suppliers,
  processBatchOrder,
}) => {
  const [supplierId, setSupplierId] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  
  // 개별 아이템의 단가와 비고를 관리
  const [itemUpdates, setItemUpdates] = useState<Record<string, { unit_price: number; note: string }>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Calculator state
  const [activeCalculatorOrderId, setActiveCalculatorOrderId] = useState<string | null>(null);

  useEffect(() => {
    // 초기값 세팅 (기존 단가가 있으면 불러오기)
    const initial: Record<string, { unit_price: number; note: string }> = {};
    selectedOrders.forEach(o => {
      initial[o.id] = { unit_price: o.unit_price || 0, note: '' };
    });
    setItemUpdates(initial);
  }, [selectedOrders]);

  if (!isOpen) return null;

  const handlePriceChange = (id: string, price: number) => {
    setItemUpdates(prev => ({ ...prev, [id]: { ...prev[id], unit_price: price } }));
  };

  const handleNoteChange = (id: string, note: string) => {
    setItemUpdates(prev => ({ ...prev, [id]: { ...prev[id], note } }));
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || '';

  const handleGeneralOrder = async () => {
    if (!supplierId) return toast.error('발주처(공급사)를 선택해주세요.');
    if (!expectedDate) return toast.error('납기 예정일을 선택해주세요.');

    setIsSubmitting(true);
    const updates = selectedOrders.map(o => ({
      id: o.id,
      type: o.type,
      unit_price: itemUpdates[o.id]?.unit_price || 0,
      note: itemUpdates[o.id]?.note || ''
    }));

    const res = await processBatchOrder(updates, supplierId, getSupplierName(supplierId), expectedDate);
    setIsSubmitting(false);

    if (res.success) {
      toast.success('발주 처리가 완료되었습니다.');
      onClose();
    } else {
      toast.error('발주 처리 중 오류가 발생했습니다: ' + res.error);
    }
  };

  const handleMailOrder = () => {
    if (!supplierId) return toast.error('발주처(공급사)를 선택해주세요.');
    if (!expectedDate) return toast.error('납기 예정일을 선택해주세요.');
    
    const supplierEmail = suppliers.find(s => s.id === supplierId)?.manager_email;
    if (!supplierEmail) {
      return toast.error('선택한 발주처에 등록된 담당자 이메일이 없습니다. 거래처 관리에서 이메일을 먼저 등록해주세요.');
    }
    
    // 이메일 모달로 전환
    setShowEmailModal(true);
  };

  const handleCalculatorSave = (orderId: string, newFormData: any) => {
    const price = newFormData.estimated_price || 0;
    // 사용자가 소재계산 결과 문자열을 비고에 덮어쓰지 말고 삭제(유지)해달라고 요청
    setItemUpdates(prev => ({ 
      ...prev, 
      [orderId]: { ...prev[orderId], unit_price: price, note: prev[orderId]?.note || '' } 
    }));
    setActiveCalculatorOrderId(null);
  };

  const hasMaterial = selectedOrders.some(o => o.type === 'MATERIAL');

  if (showEmailModal) {
    const updates = selectedOrders.map(o => ({
      id: o.id,
      type: o.type,
      unit_price: itemUpdates[o.id]?.unit_price || 0,
      note: itemUpdates[o.id]?.note || ''
    }));

    return (
      <EmailComposeModal 
        isOpen={true} 
        onClose={() => setShowEmailModal(false)}
        onComplete={onClose}
        selectedOrders={selectedOrders}
        updates={updates}
        supplierId={supplierId}
        supplierName={getSupplierName(supplierId)}
        supplierEmail={suppliers.find(s => s.id === supplierId)?.manager_email}
        supplierManagerName={suppliers.find(s => s.id === supplierId)?.manager_name}
        expectedDate={expectedDate}
        processBatchOrder={processBatchOrder}
      />
    );
  }

  const parseMaterialSpec = (spec: string) => {
    const result = {
      shapeCategory: '판재/각재류',
      shape: '일반 판재',
      dims: { d: 0, w: 0, h: 0, l: 0, t: 0, wt: 0, od: 0, id: 0 }
    };
    if (!spec) return result;

    const s = spec.toUpperCase();
    if (s.includes('Ø') || s.includes('∅') || s.includes('⌀') || s.match(/[0-9]D/) || s.startsWith('D')) {
      result.shapeCategory = '봉재류';
      result.shape = '환봉';
      
      const parts = s.split(/X/i);
      if (parts.length > 0) {
        const dMatch = parts[0].match(/[\d.]+/);
        if (dMatch) result.dims.w = parseFloat(dMatch[0]); // Mapped to w as per MaterialShapeInputs
      }
      if (parts.length > 1) {
        const lMatch = parts[1].match(/[\d.]+/);
        if (lMatch) result.dims.l = parseFloat(lMatch[0]);
      }
    } else {
      const tMatch = s.match(/([\d.]+)\s*T/);
      if (tMatch) result.dims.t = parseFloat(tMatch[1]);
      
      const parts = s.replace(/[\d.]+\s*T/g, '').split('X').map(p => parseFloat(p.replace(/[^0-9.]/g, '').trim())).filter(n => !isNaN(n));
      if (parts.length >= 1) result.dims.w = parts[0];
      if (parts.length >= 2) result.dims.d = parts[1];
    }
    return result;
  };

  // Build temporary group object for the calculator
  const activeCalculatorOrder = selectedOrders.find(o => o.id === activeCalculatorOrderId);
  let calculatorGroup: any = null;
  if (activeCalculatorOrder) {
    const parsed = parseMaterialSpec(activeCalculatorOrder.item_spec);
    calculatorGroup = {
      id: activeCalculatorOrder.id,
      items: [{ files: activeCalculatorOrder.files }], // Fix PDF viewer mapping
      formData: {
        material_name: activeCalculatorOrder.item_name,
        spec: activeCalculatorOrder.item_spec,
        quantity: activeCalculatorOrder.quantity,
        weight: 0,
        unit_price: 0,
        estimated_price: itemUpdates[activeCalculatorOrder.id]?.unit_price || 0,
        shape: parsed.shape,
        shapeCategory: parsed.shapeCategory,
        dims: parsed.dims
      }
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-bg-elevated border border-border-default rounded-xl w-full max-w-5xl shadow-2xl flex flex-col h-[700px]">
        <div className="p-6 border-b border-border-default">
          <h2 className="text-xl font-bold text-text-primary">선택 발주 ({selectedOrders.length} 항목)</h2>
        </div>

        <div className="p-6 flex-1 overflow-auto custom-scrollbar flex flex-col gap-6">
          {/* 공통 설정 구역 */}
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-secondary mb-1">발주처 (공급사) <span className="text-brand-500">*</span></label>
              <BaseSelect 
                className="w-full"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={[
                  { value: '', label: '-- 업체 선택 --' },
                  ...suppliers.map(s => ({ value: s.id, label: s.name }))
                ]}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-secondary mb-1">납기 예정일 <span className="text-brand-500">*</span></label>
              <BaseInput 
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          {/* 리스트 구역 */}
          <div className="border border-border-default rounded-lg flex flex-col flex-1 overflow-hidden min-h-[300px]">
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-bg-surface sticky top-0 z-10">
                  <tr className="border-b border-border-default">
                  <th className="px-4 py-2 font-medium text-text-secondary">생산코드</th>
                  <th className="px-4 py-2 font-medium text-text-secondary">도면번호 / 품명</th>
                  <th className="px-4 py-2 font-medium text-text-secondary">요구 치수(규격)</th>
                  <th className="px-4 py-2 font-medium text-text-secondary w-20 text-right">수량</th>
                  <th className="px-4 py-2 font-medium text-text-secondary w-28 text-right">단가</th>
                  <th className="px-4 py-2 font-medium text-text-secondary w-28 text-right">금액</th>
                  <th className="px-4 py-2 font-medium text-text-secondary w-48">비고 (요청사항)</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrders.map(order => {
                  const qty = order.quantity;
                  const price = itemUpdates[order.id]?.unit_price ?? 0;
                  const total = qty * price;
                  
                  return (
                    <tr key={order.id} className="border-b border-border-default last:border-0 hover:bg-bg-surface/50">
                      <td className="px-4 py-2 font-mono text-text-tertiary align-middle">{order.po_no}</td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex flex-col justify-center">
                          <div className="text-text-primary leading-tight font-medium text-[13px] mb-0.5">{order.part_no}</div>
                          <div className="text-xs text-text-secondary leading-tight">{order.item_name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-text-secondary align-middle">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{order.item_spec}</span>
                          {order.type === 'MATERIAL' && (
                             <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setActiveCalculatorOrderId(order.id)}>
                               <Calculator size={12} className="mr-1" /> 계산기
                             </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right align-middle text-text-primary">
                        {qty}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <BaseInput 
                          type="number"
                          className="w-full m-0"
                          inputClassName="h-8 !py-1 text-right text-sm"
                          value={price}
                          onChange={(e) => handlePriceChange(order.id, e.target.value ? Number(e.target.value) : 0)}
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-brand-400 font-medium align-middle">
                        {total.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <BaseInput 
                          className="w-full m-0"
                          inputClassName="h-8 !py-1 text-sm"
                          placeholder="비고 입력..."
                          value={itemUpdates[order.id]?.note || ''}
                          onChange={(e) => handleNoteChange(order.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            
            {/* 리스트 하단 총 금액 표시 (테이블 밖 컨테이너 하단 고정) */}
            <div className="bg-bg-surface border-t border-border-default p-4 flex justify-end items-center gap-6 shrink-0">
              <span className="font-bold text-text-secondary">총 발주 금액</span>
              <span className="font-bold text-brand-500 text-xl">
                {selectedOrders.reduce((acc, order) => acc + (order.quantity * (itemUpdates[order.id]?.unit_price ?? 0)), 0).toLocaleString()} 원
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border-default flex justify-end gap-3 bg-bg-surface rounded-b-xl">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button variant="secondary" onClick={handleGeneralOrder} disabled={isSubmitting}>
            발주
          </Button>
          <Button variant="primary" onClick={handleMailOrder} disabled={isSubmitting}>
            메일 발주
          </Button>
        </div>
      </div>
      
      {activeCalculatorOrderId && calculatorGroup && (
        <MaterialCalculatorModal
          isOpen={true}
          group={calculatorGroup}
          onSave={handleCalculatorSave}
          onClose={() => setActiveCalculatorOrderId(null)}
        />
      )}
    </div>
  );
};
