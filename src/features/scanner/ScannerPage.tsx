import React, { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { BaseInput } from '../../design-system';
import { useScannerStore } from '../../shared/store/scannerStore';

export const ScannerPage: React.FC = () => {
  const [manualInput, setManualInput] = useState('');
  const setManualBarcode = useScannerStore(state => state.setManualBarcode);

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualInput.trim()) {
      const barcode = manualInput.trim().toUpperCase();
      setManualInput('');
      setManualBarcode(barcode);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center -mt-10 animate-in fade-in duration-500">
      <div className="w-32 h-32 rounded-full bg-brand-500/10 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(14,165,233,0.2)]">
        <ScanLine size={64} className="text-brand-500" />
      </div>
      
      <h1 className="text-4xl font-bold mb-4 text-text-primary">통합 바코드 스캐너 대기중</h1>
      <p className="text-xl text-text-secondary mb-12">
        도면이나 발주서에 부착된 바코드를 스캔하세요.
      </p>

      <div className="w-full max-w-md p-6 bg-bg-surface border border-border-default rounded-xl shadow-lg">
        <label className="block text-sm font-medium text-text-secondary mb-3">
          스캐너가 없으신가요? 수동으로 바코드 번호를 입력하세요
        </label>
        <BaseInput 
          className="h-14 text-xl"
          placeholder="바코드 번호 입력 후 Enter..."
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={handleManualKeyDown}
          leftIcon={<ScanLine className="text-text-muted" />}
        />
      </div>
    </div>
  );
};
