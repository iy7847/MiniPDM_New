import React, { useState, useEffect } from 'react';
import { Card, Button, BaseInput } from '../../../design-system';
import { DeleteConfirmModal } from '@/shared/components/DeleteConfirmModal';
import { X, Loader2, Undo2 } from 'lucide-react';
import { toast } from '@/shared/stores/useToastStore';
import { useReceivingScan } from '../hooks/useReceivingScan';

interface ReceivingScanModalProps {
  barcode: string;
  onClose: () => void;
  onSwitchToProduction?: () => void;
}

export const ReceivingScanModal: React.FC<ReceivingScanModalProps> = ({ barcode, onClose, onSwitchToProduction }) => {
  const { loading, error, data, submitPBarcodeReceiving, submitMBarcodeReceiving, undoReceiving } = useReceivingScan(barcode);
  
  const [receiveQty, setReceiveQty] = useState<number>(0);
  const [defectQty, setDefectQty] = useState<number>(0);
  const [defectReason, setDefectReason] = useState<string>('');
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);

  useEffect(() => {
    if (data) {
      if (data.type === 'P' && data.itemData?.qty != null) {
        setReceiveQty(data.itemData.qty);
      } else if (data.type === 'M' && data.materialData?.quantity != null) {
        setReceiveQty(data.materialData.quantity);
      }
    }
  }, [data]);

  const handleUndo = async () => {
    const success = await undoReceiving();
    if (success) {
      toast.success('입고가 취소되었습니다.');
      setShowUndoConfirm(false);
      onClose(); // 입고 취소 후에는 모달을 닫음
    }
  };

  const handleSubmit = async () => {
    let success = false;
    if (data?.type === 'P') {
      success = await submitPBarcodeReceiving({ receiveQty, defectQty, defectReason });
    } else if (data?.type === 'M') {
      success = await submitMBarcodeReceiving({ receiveQty, defectQty, defectReason });
    }

    if (success) {
      toast.success('입고 처리가 완료되었습니다.');
      onClose();
    }
  };

  const isPurchase = data?.type === 'P' && data?.itemData?.supply_type === 'PURCHASE';

  const isAlreadyReceived = data ? (
    data.type === 'M' ? data.materialData?.status === '입고완료' :
    data.type === 'P' ? (isPurchase ? data.itemData?.production_status === 'COMPLETED' : data.outsourceData?.[0]?.status === '입고완료') : false
  ) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-bg-elevated border-border-strong shadow-2xl relative">
        <div className="flex justify-between items-center p-6 border-b border-border-default">
          <h2 className="text-2xl font-bold text-text-primary">조달 입고 처리</h2>
          <div className="flex items-center gap-2">
            {onSwitchToProduction && data?.type === 'P' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToProduction}
                className="text-xs border-border-default hover:border-brand-500 hover:text-brand-400"
              >
                🛠️ 공정 관리 / 설계로 전환
              </Button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-bg-overlay rounded-full transition-colors text-text-secondary hover:text-text-primary">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <p className="text-success font-mono text-xl">스캔된 바코드: {barcode}</p>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary mb-4" size={32} />
              <p className="text-text-secondary">데이터를 불러오는 중입니다...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg mb-6">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6">
              {/* 품목 정보 */}
              <div className="bg-bg-overlay p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-text-primary mb-2">품목 정보</h3>
                {data.type === 'P' && data.itemData && (
                  <>
                    <p><span className="text-text-secondary w-24 inline-block">품명:</span> {data.itemData.part_name}</p>
                    <p><span className="text-text-secondary w-24 inline-block">규격:</span> {data.itemData.spec}</p>
                    <p><span className="text-text-secondary w-24 inline-block">요청 수량:</span> {data.itemData.qty} 개</p>
                  </>
                )}
                {data.type === 'M' && data.materialData && (
                  <>
                    <p><span className="text-text-secondary w-24 inline-block">소재명:</span> {data.materialData.material_name}</p>
                    <p><span className="text-text-secondary w-24 inline-block">규격:</span> {data.materialData.spec}</p>
                    <p><span className="text-text-secondary w-24 inline-block">발주 수량:</span> {data.materialData.quantity}</p>
                  </>
                )}
              </div>

              {/* 입고 폼 or 완료 메시지 */}
              {isAlreadyReceived ? (
                <div className="bg-success/10 border border-success/30 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mb-4">
                    <Undo2 className="text-success" size={24} />
                  </div>
                  <h4 className="text-xl font-bold text-success mb-2">이미 입고가 완료된 품목입니다</h4>
                  <p className="text-text-secondary text-sm">
                    입고를 취소하고 다시 발주/진행 상태로 되돌릴 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">양품 입고 수량</label>
                    <BaseInput 
                      type="number" 
                      value={receiveQty}
                      onChange={(e) => setReceiveQty(Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">불량 수량</label>
                    <BaseInput 
                      type="number" 
                      value={defectQty}
                      onChange={(e) => setDefectQty(Number(e.target.value))}
                      min={0}
                    />
                  </div>

                  {defectQty > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">불량 사유</label>
                      <BaseInput 
                        value={defectReason}
                        onChange={(e) => setDefectReason(e.target.value)}
                        placeholder="불량 사유를 입력하세요"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border-default flex justify-end gap-3">
          <Button variant="outline" size="lg" onClick={onClose}>닫기</Button>
          {isAlreadyReceived ? (
            <Button 
              variant="danger" 
              size="lg" 
              onClick={() => setShowUndoConfirm(true)} 
              disabled={loading || !!error || !data}
            >
              <Undo2 className="mr-2" size={20} /> 입고 취소
            </Button>
          ) : (
            <Button 
              variant="success" 
              size="lg" 
              onClick={handleSubmit} 
              disabled={loading || !!error || !data || (receiveQty === 0 && defectQty === 0)}
            >
              입고 확정
            </Button>
          )}
        </div>
      </Card>

      <DeleteConfirmModal
        isOpen={showUndoConfirm}
        onClose={() => setShowUndoConfirm(false)}
        title="입고 취소 확인"
        description="해당 품목의 입고를 취소하시겠습니까? 관련 공정 상태가 이전 상태로 롤백됩니다."
        confirmText="입고 취소"
        isDanger={true}
        onConfirm={handleUndo}
      />
    </div>
  );
};
