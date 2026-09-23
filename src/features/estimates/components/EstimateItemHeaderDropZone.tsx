
import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { toast } from '../../../shared/stores/useToastStore';
import type { EstimateItem } from '../types';
import { extractStepBoundingBox } from '../../../shared/components/cad-viewer';

interface EstimateItemHeaderDropZoneProps {
  isReadOnly: boolean;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  companyInfo?: any;
}

export const EstimateItemHeaderDropZone: React.FC<EstimateItemHeaderDropZoneProps> = ({ isReadOnly, setItemForm, companyInfo }) => {
  const [headerDragOver, setHeaderDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isReadOnly) return null;

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    toast.success(`${files.length}개의 파일이 첨부되었습니다.`);
    setItemForm(prev => ({
      ...prev,
      tempFiles: [...(prev.tempFiles || []), ...files]
    }));

    // STEP/STP 3D CAD 파일이 포함되어 있다면 치수 자동 추출 실행
    const stepFile = files.find(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'stp' || ext === 'step';
    });

    if (stepFile) {
      try {
        toast.info(`3D CAD 파일(${stepFile.name}) 치수 자동 분석 중...`);
        const result = await extractStepBoundingBox(stepFile);
        if (result && result.aabb) {
          const isRound = result.shapeClassification?.shapeType === 'round';
          const rec = result.shapeClassification?.recommendation;

          let spec_w = 0;
          let spec_d = 0;
          let spec_h = 0;
          let shape: 'rect' | 'round' = 'rect';

          if (isRound && rec) {
            const dia = Math.round((rec.diameter || result.aabb.size[0]) * 10) / 10;
            const len = Math.round((rec.length || result.aabb.size[2]) * 10) / 10;
            shape = 'round';
            spec_w = dia;
            spec_d = len;
            spec_h = 0;
          } else {
            shape = 'rect';
            spec_w = Math.round(result.aabb.size[0] * 10) / 10;
            spec_d = Math.round(result.aabb.size[1] * 10) / 10;
            spec_h = Math.round(result.aabb.size[2] * 10) / 10;
          }

          // 사용자가 설정한 원소재 가공 여유치(마진) 가산
          const getMargin = (val: any, fallback: number) => {
            if (val === undefined || val === null || val === '') return fallback;
            const num = Number(val);
            return isNaN(num) ? fallback : num;
          };

          const safeSpecW = Number(spec_w) || 0;
          const safeSpecD = Number(spec_d) || 0;
          const safeSpecH = Number(spec_h) || 0;

          let raw_w = 0;
          let raw_d = 0;
          let raw_h = 0;

          if (isRound) {
            const marginW = getMargin(companyInfo?.default_margin_round_w, 5);
            const marginD = getMargin(companyInfo?.default_margin_round_d, 5);
            raw_w = safeSpecW + (safeSpecW > 0 ? marginW : 0);
            raw_d = safeSpecD + (safeSpecD > 0 ? marginD : 0);
            raw_h = 0;
          } else {
            const marginW = getMargin(companyInfo?.default_margin_w, 5);
            const marginD = getMargin(companyInfo?.default_margin_d, 5);
            const marginH = getMargin(companyInfo?.default_margin_h, 0);
            raw_w = safeSpecW + (safeSpecW > 0 ? marginW : 0);
            raw_d = safeSpecD + (safeSpecD > 0 ? marginD : 0);
            raw_h = safeSpecH + (safeSpecH > 0 ? marginH : 0);
          }

          setItemForm(prev => ({
            ...prev,
            shape,
            part_name: prev.part_name || stepFile.name.replace(/\.[^/.]+$/, ''),
            spec_w: safeSpecW,
            spec_d: safeSpecD,
            spec_h: safeSpecH,
            raw_w,
            raw_d,
            raw_h,
          }));

          toast.success(`✨ 3D CAD 치수 자동 적용 완료 (${shape === 'round' ? '원형(환봉)' : '사각(각재)'}: ${safeSpecW} × ${safeSpecD} × ${safeSpecH} mm / 원소재: ${raw_w} × ${raw_d} × ${raw_h})`);
        }
      } catch (err: any) {
        console.warn('3D 바운딩 박스 백그라운드 추출 실패:', err);
      }
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setHeaderDragOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setHeaderDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setHeaderDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setHeaderDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(e.dataTransfer.files);
        }
      }}
      className={`flex-1 flex items-center justify-center gap-3 px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer shadow-sm
        ${headerDragOver
          ? 'border-brand-400 bg-brand-500/20 text-brand-300 scale-[1.02] shadow-brand-500/20'
          : 'border-brand-500/40 bg-brand-500/5 text-text-primary hover:border-brand-400 hover:bg-brand-500/10 hover:shadow-brand-500/10'}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <UploadCloud size={18} className={headerDragOver ? 'text-brand-400 animate-bounce' : 'text-brand-500'} />
      <span className="font-semibold text-sm tracking-wide">
        {headerDragOver ? '여기에 놓아서 첨부' : '도면/문서 파일을 클릭하거나 여기에 드래그 앤 드롭하세요'}
      </span>
    </div>
  );
};
