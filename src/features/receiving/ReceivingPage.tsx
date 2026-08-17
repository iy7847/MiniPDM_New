import React, { useState } from 'react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useReceiving } from './hooks/useReceiving';
import type { ReceivingItem } from './hooks/useReceiving';
import { PageHeader, Button, Badge, BaseInput, Toggle } from '@/design-system';
import { Package, Search, X, CheckCircle } from 'lucide-react';
import { toast } from '@/shared/stores/useToastStore';

export const ReceivingPage: React.FC = () => {
  const { loading, scannedItems, fetchItemByBarcode, removeItem, receiveItem } = useReceiving();
  
  const [manualBarcode, setManualBarcode] = useState('');

  // 바코드 스캔 처리
  useBarcodeScanner(async (barcode) => {
    const res = await fetchItemByBarcode(barcode);
    if (!res.success) {
      toast.error(res.error || '항목을 찾을 수 없습니다.');
    } else {
      toast.success('발주 내역을 불러왔습니다.');
    }
  });

  const handleManualScan = async () => {
    if (!manualBarcode.trim()) return;
    const res = await fetchItemByBarcode(manualBarcode.trim());
    if (!res.success) {
      toast.error(res.error || '항목을 찾을 수 없습니다.');
    } else {
      toast.success('발주 내역을 불러왔습니다.');
      setManualBarcode('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base animate-in fade-in">
      <div className="p-6 pb-4 border-b border-border-default">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Package className="text-brand-500" />
              입고 처리
            </div>
          }
          actions={
            <div className="flex items-center gap-4">
              <div className="text-sm text-text-secondary">
                바코드 스캐너로 발주서의 바코드를 스캔하거나 PO 번호를 입력하세요.
              </div>
              <div className="flex items-center gap-2">
                <BaseInput 
                  className="w-64"
                  placeholder="PO 번호 또는 UUID 입력"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualScan();
                  }}
                />
                <Button onClick={handleManualScan} disabled={loading}>
                  <Search size={16} className="mr-1" /> 검색
                </Button>
              </div>
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-auto p-6 bg-bg-surface/30">
        <div className="max-w-5xl mx-auto space-y-4">
          {scannedItems.length === 0 ? (
            <div className="bg-bg-surface border border-border-default rounded-xl p-12 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
              <Package size={48} className="text-text-tertiary mb-4" />
              <p className="text-lg">스캔 대기 중...</p>
              <p className="text-sm mt-2">입고할 항목의 바코드를 스캔해주세요.</p>
            </div>
          ) : (
            scannedItems.map(item => (
              <ReceivingCard 
                key={item.id} 
                item={item} 
                onRemove={() => removeItem(item.id)}
                onReceive={(qty, isComplete) => receiveItem(item.id, item.type, qty, isComplete)}
                loading={loading}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ReceivingCard = ({ 
  item, 
  onRemove, 
  onReceive, 
  loading 
}: { 
  item: ReceivingItem, 
  onRemove: () => void, 
  onReceive: (qty: number, isComplete: boolean) => Promise<any>,
  loading: boolean
}) => {
  const isFullyReceived = item.status === '입고완료';
  const remainQty = Math.max(0, item.ordered_qty - item.received_qty);
  
  // 새로 입력받을 입고수량 (기본값: 잔량)
  const [inputQty, setInputQty] = useState(remainQty > 0 ? remainQty : 0);
  // 강제 입고 완료 토글
  const [forceComplete, setForceComplete] = useState(false);

  const handleReceive = async () => {
    if (inputQty <= 0 && !forceComplete) {
      alert('입고 수량을 입력하거나 강제 입고 완료를 선택하세요.');
      return;
    }
    const res = await onReceive(inputQty, forceComplete);
    if (res.success) {
      toast.success('입고 처리되었습니다.');
    } else {
      toast.error('입고 처리 실패: ' + res.error);
    }
  };

  return (
    <div className={`relative bg-bg-surface border rounded-xl p-5 shadow-sm transition-colors ${isFullyReceived ? 'border-brand-500/50 bg-brand-500/5' : 'border-border-default'}`}>
      <button 
        onClick={onRemove}
        className="absolute top-4 right-4 text-text-tertiary hover:text-danger-500 transition-colors p-1"
        title="목록에서 제거"
      >
        <X size={20} />
      </button>

      <div className="flex items-start justify-between">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
            {isFullyReceived ? (
              <CheckCircle size={24} className="text-brand-500" />
            ) : (
              <Package size={24} className="text-text-secondary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={item.type === 'OUTSOURCE' ? 'default' : 'secondary'}>
                {item.type === 'OUTSOURCE' ? '외주/구매' : '소재'}
              </Badge>
            </div>
            <div className="flex gap-2 items-center mb-1">
              <Badge variant={isFullyReceived ? 'primary' : 'warning'}>
                {item.status}
              </Badge>
              <span className="font-mono text-xs text-text-tertiary">{item.po_no}</span>
            </div>
            <div className="text-xs font-bold text-brand-500 mb-0.5">도면번호: {item.part_no || '-'}</div>
            <h3 className="text-lg font-bold text-text-primary">{item.item_name}</h3>
            <p className="text-sm text-text-secondary">{item.item_spec}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-text-secondary">발주처</div>
          <div className="font-medium text-brand-400">{item.supplier_name}</div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-border-default grid grid-cols-4 gap-6 items-end">
        <div>
          <div className="text-xs text-text-tertiary mb-1">총 발주 수량</div>
          <div className="text-lg font-medium">{item.ordered_qty}</div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary mb-1">기존 입고 수량</div>
          <div className="text-lg font-medium text-success-500">{item.received_qty}</div>
        </div>
        
        {isFullyReceived ? (
          <div className="col-span-2 flex items-center justify-end text-brand-500 font-bold">
            입고 처리가 완료되었습니다.
          </div>
        ) : (
          <>
            <div>
              <div className="text-xs text-text-tertiary mb-1">금회 입고 수량 입력</div>
              <div className="flex items-center gap-2">
                <BaseInput 
                  type="number"
                  className="w-24 text-right"
                  value={inputQty.toString()}
                  onChange={(e) => setInputQty(Number(e.target.value))}
                  min={0}
                  max={remainQty}
                />
                <span className="text-sm text-text-secondary">/ {remainQty} (잔량)</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">잔량 무시하고 강제 입고 완료</span>
                <Toggle checked={forceComplete} onChange={setForceComplete} />
              </label>
              <Button variant="primary" onClick={handleReceive} disabled={loading}>
                입고 반영
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
