import React, { useState, useEffect } from 'react';
import { Button, BaseInput, Card } from '../../../../design-system';

interface OrderNoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  poNo: string;
  onGenerate: (format: string, overwrite: boolean) => void;
}

export const OrderNoGeneratorModal: React.FC<OrderNoGeneratorModalProps> = ({ 
  isOpen, 
  onClose, 
  poNo, 
  onGenerate 
}) => {
  const [format, setFormat] = useState('{PO}-{SEQ}');
  const [overwrite, setOverwrite] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormat(`${poNo}-{SEQ}`);
      setOverwrite(false);
    }
  }, [isOpen, poNo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
      <Card className="w-full max-w-md p-6 bg-bg-base border-border-default">
        <h3 className="text-xl font-bold mb-6 text-text-primary">수주 품목 번호 생성</h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-primary">생성 형식</label>
            <BaseInput
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="{PO}-{SEQ}"
              className="mt-1"
            />
            <p className="text-xs text-text-secondary mt-2 leading-relaxed bg-bg-surface p-2 rounded">
              <code>{'{PO}'}</code> : PO번호 ({poNo})<br />
              <code>{'{SEQ}'}</code> : 3자리 연번 (예: 001)
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="rounded border-border-default text-brand-500 focus:ring-brand-500 bg-bg-surface"
            />
            <span className="text-sm font-medium text-text-primary">기존 번호 덮어쓰기</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-8 border-t border-border-default pt-4">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              onGenerate(format, overwrite);
              onClose();
            }}
          >
            생성하기
          </Button>
        </div>
      </Card>
    </div>
  );
};
