import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { toast } from '../../../shared/stores/useToastStore';
import type { EstimateItem } from '../types';

interface EstimateItemHeaderDropZoneProps {
  isReadOnly: boolean;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
}

export const EstimateItemHeaderDropZone: React.FC<EstimateItemHeaderDropZoneProps> = ({ isReadOnly, setItemForm }) => {
  const [headerDragOver, setHeaderDragOver] = useState(false);

  if (isReadOnly) return null;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setHeaderDragOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setHeaderDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setHeaderDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setHeaderDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          toast.success(`${e.dataTransfer.files.length}개의 파일이 첨부되었습니다.`);
          setItemForm(prev => ({ ...prev, tempFiles: [...(prev.tempFiles || []), ...Array.from(e.dataTransfer.files)] }));
        }
      }}
      className={`flex-1 flex items-center justify-center gap-3 px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer shadow-sm
        ${headerDragOver
          ? 'border-brand-400 bg-brand-500/20 text-brand-300 scale-[1.02] shadow-brand-500/20'
          : 'border-brand-500/40 bg-brand-500/5 text-text-primary hover:border-brand-400 hover:bg-brand-500/10 hover:shadow-brand-500/10'}`}
    >
      <UploadCloud size={18} className={headerDragOver ? 'text-brand-400 animate-bounce' : 'text-brand-500'} />
      <span className="font-semibold text-sm tracking-wide">
        {headerDragOver ? '여기에 놓아서 첨부' : '도면/문서 파일을 여기에 드래그 앤 드롭하세요'}
      </span>
    </div>
  );
};
