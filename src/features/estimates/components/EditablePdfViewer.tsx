import React, { useState } from 'react';
import { pdfjs } from 'react-pdf';
import { Button } from '../../../design-system/Button';
import { Save, Scissors, Type, MousePointer2 } from 'lucide-react';

import { SmartPdfViewer } from './SmartPdfViewer';
import { SmartPdfToolbar } from './SmartPdfToolbar';
import { usePdfViewer } from '../hooks/usePdfViewer';
import { usePdfOcr } from '../hooks/usePdfOcr';
import { usePdfExport } from '../hooks/usePdfExport';
import { toast } from '../../../shared/stores/useToastStore';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface EditablePdfViewerProps {
  file: File | null;
  onOcrResult?: (text: string, mode: 'part_no' | 'part_name' | 'material') => void;
  onSaveMaskedPdf?: (newFile: File) => void;
  isViewerOnly?: boolean;
}

export function EditablePdfViewer({ file, onOcrResult, onSaveMaskedPdf, isViewerOnly = false }: EditablePdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrMode, setOcrMode] = useState<'part_no' | 'part_name' | 'material'>('part_no');
  
  const RENDER_WIDTH = 1600; // 단일 뷰어용 해상도
  const FALLBACK_INITIAL_SCALE = 0.5;
  const [scale, setScale] = useState(FALLBACK_INITIAL_SCALE);

  const handleOcrComplete = (text: string) => {
    if (onOcrResult) {
      onOcrResult(text, ocrMode);
      toast.success(`${ocrMode === 'part_no' ? '품번' : ocrMode === 'part_name' ? '품명' : '소재'} 자동 입력 완료: ${text}`);
    }
  };

  const {
    masks,
    setMasks,
    isMaskMode,
    setIsMaskMode,
    handleDeleteMask,
    runOCR
  } = usePdfOcr(file, pageNumber, RENDER_WIDTH, setIsProcessing, undefined, ocrMode, handleOcrComplete);

  // isViewerOnly가 true이면 강제로 마스킹 모드를 기본으로 켭니다.
  React.useEffect(() => {
    if (isViewerOnly) {
      setIsMaskMode(true);
    }
  }, [isViewerOnly, setIsMaskMode]);

  const {
    selection,
    isPanning,
    wrapperHeight,
    setWrapperHeight,
    pdfWrapperRef,
    scrollContainerRef,
    changePage,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  } = usePdfViewer(
    file,
    pageNumber,
    setPageNumber,
    numPages,
    scale,
    setScale,
    setOcrMode,
    setIsMaskMode,
    masks,
    setMasks,
    isMaskMode,
    runOCR,
    RENDER_WIDTH,
    isViewerOnly
  );

  const { exportSinglePdfWithMask } = usePdfExport();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth - 32;
      const idealScale = containerWidth / RENDER_WIDTH;
      setScale(Math.max(0.1, Math.min(idealScale, 1.0)));
    } else {
      setScale(FALLBACK_INITIAL_SCALE);
    }
  };

  const handleSave = async () => {
    if (!file || masks.length === 0) {
      toast.error('적용할 마스킹 영역이 없습니다.');
      return;
    }
    
    const newFile = await exportSinglePdfWithMask(file, masks, RENDER_WIDTH, setIsProcessing);
    if (newFile && onSaveMaskedPdf) {
      onSaveMaskedPdf(newFile);
      setMasks([]); // 저장 후 마스크 초기화
      toast.success('마스킹된 PDF가 저장되었습니다.');
    }
  };

  if (!file) return null;

  return (
    <div className="flex flex-col w-full h-full bg-bg-base relative">
      {/* 공용 툴바 적용 */}
      <SmartPdfToolbar
        pageNumber={pageNumber}
        numPages={numPages}
        changePage={changePage}
        isMaskMode={isMaskMode}
        setIsMaskMode={setIsMaskMode}
        ocrMode={ocrMode}
        setOcrMode={setOcrMode}
        isProcessing={isProcessing}
        scale={scale}
        setScale={setScale}
        isViewerOnly={isViewerOnly}
        onClearMasks={() => setMasks(prev => prev.filter(m => m.page !== pageNumber))}
        rightActions={
          !isViewerOnly ? (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleSave} 
              disabled={masks.length === 0 || isProcessing}
              className="flex items-center gap-2 ml-2"
            >
              <Save size={16} />
              {isProcessing ? '처리 중...' : '마스킹 적용'}
            </Button>
          ) : undefined
        }
      />

      {/* 뷰어 영역 */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden items-center">
        {isProcessing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-overlay/50 backdrop-blur-sm">
            <div className="bg-bg-surface px-6 py-3 rounded-lg shadow-xl border border-border-default flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-text-primary font-medium">처리 중...</span>
            </div>
          </div>
        )}
        
        <SmartPdfViewer
          file={file}
          pageNumber={pageNumber}
          scale={scale}
          RENDER_WIDTH={RENDER_WIDTH}
          isPanning={isPanning}
          wrapperHeight={wrapperHeight}
          setWrapperHeight={setWrapperHeight}
          pdfWrapperRef={pdfWrapperRef}
          scrollContainerRef={scrollContainerRef}
          onDocumentLoadSuccess={onDocumentLoadSuccess}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          masks={masks}
          handleDeleteMask={handleDeleteMask}
          selection={selection}
          isMaskMode={isMaskMode}
          ocrMode={ocrMode}
        />
      </div>
    </div>
  );
}
