import React from 'react';
import { FileText, FileSpreadsheet, X, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
}

export const EstimateSubmitModal: React.FC<Props> = ({ isOpen, onClose, onExportPdf, onExportExcel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border-default transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full hover:bg-bg-elevated z-10"
        >
          <X size={20} />
        </button>
        
        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-success/5">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          
          <h2 className="text-2xl font-bold text-text-primary mb-2">견적서 확정 완료</h2>
          <p className="text-text-secondary mb-8 text-sm">
            견적서가 성공적으로 저장되었으며 이제 <b>읽기 전용</b> 모드로 전환됩니다.
            <br />고객에게 전달할 방식을 선택해주세요.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={onExportPdf}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border-default hover:border-brand-500 hover:bg-brand-500/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-brand-500" />
              </div>
              <span className="font-bold text-text-primary text-sm">PDF 출력</span>
            </button>

            <button
              onClick={onExportExcel}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border-default hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="font-bold text-text-primary text-sm">엑셀 다운로드</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
