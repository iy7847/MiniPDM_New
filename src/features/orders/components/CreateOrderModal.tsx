import React, { useState } from 'react';
import { X, Building2, Hash, Loader2 } from 'lucide-react';
import { Button, BaseInput } from '../../../design-system';
import { createDirectOrder } from '../services/orderService';
import { toast } from '../../../shared/stores/useToastStore';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: any[];
  companyId: string;
  onSuccess: (orderId: string) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  clients,
  companyId,
  onSuccess
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [clientId, setClientId] = useState('');
  const [poNo, setPoNo] = useState('');
  const [orderDate, setOrderDate] = useState(todayStr);
  const [deliveryDate, setDeliveryDate] = useState(todayStr);
  const [currency, setCurrency] = useState('KRW');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('거래처를 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newOrder = await createDirectOrder({
        companyId,
        clientId,
        poNo,
        orderDate,
        deliveryDate,
        currency,
        exchangeRate,
        note
      });

      toast.success('신규 수주가 성공적으로 등록되었습니다.');
      onSuccess(newOrder.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to create order:', err);
      toast.error(err.message || '수주 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-default bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">신규 수주 직접 등록</h3>
              <p className="text-xs text-text-secondary">견적서 없이 고객사 발주(PO)를 직접 받아 수주를 등록합니다.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-bg-elevated"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              고객사(거래처) <span className="text-status-danger">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-bg-base border border-border-default text-text-primary rounded-lg h-10 text-sm px-3 outline-none focus:border-brand-500 transition-colors"
              required
            >
              <option value="">-- 거래처를 선택하세요 --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* PO Number */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              PO 번호 (발주서 번호)
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <BaseInput
                className="pl-9 w-full text-sm"
                placeholder="미입력 시 시스템 자동 채번 (P2607-001)"
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                수주일 (접수일)
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full bg-bg-base border border-border-default text-text-primary rounded-lg h-10 text-sm px-3 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                납기일
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-bg-base border border-border-default text-text-primary rounded-lg h-10 text-sm px-3 outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Currency & Exchange Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                통화 (Currency)
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  if (e.target.value === 'KRW') setExchangeRate(1);
                }}
                className="w-full bg-bg-base border border-border-default text-text-primary rounded-lg h-10 text-sm px-3 outline-none focus:border-brand-500"
              >
                <option value="KRW">KRW (원화)</option>
                <option value="USD">USD (달러)</option>
                <option value="EUR">EUR (유로)</option>
                <option value="JPY">JPY (엔화)</option>
                <option value="CNY">CNY (위안화)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                환율
              </label>
              <input
                type="number"
                step="any"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                disabled={currency === 'KRW'}
                className="w-full bg-bg-base border border-border-default text-text-primary rounded-lg h-10 text-sm px-3 outline-none focus:border-brand-500 disabled:opacity-50 disabled:bg-bg-elevated cursor-not-allowed"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              수주 특이사항 / 비고
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="수주 관련 특이사항을 입력하세요..."
              className="w-full bg-bg-base border border-border-default rounded-lg text-sm p-3 text-text-primary outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> 등록 중...
                </>
              ) : (
                '수주 등록 완료'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
