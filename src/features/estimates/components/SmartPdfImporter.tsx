import React, { useState } from 'react';
import { pdfjs } from 'react-pdf';
import { Card } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { X } from 'lucide-react';
import type { EstimateItem } from '../types';
import type { OcrResult } from './SmartPdfTypes';

import { SmartPdfToolbar } from './SmartPdfToolbar';
import { SmartPdfViewer } from './SmartPdfViewer';
import { SmartPdfResults } from './SmartPdfResults';

import { usePdfViewer } from '../hooks/usePdfViewer';
import { usePdfOcr } from '../hooks/usePdfOcr';
import { usePdfExport } from '../hooks/usePdfExport';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface SmartPdfImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (files: File[]) => void;
}

export function SmartPdfImporter({ isOpen, onClose, onImportComplete }: SmartPdfImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrMode, setOcrMode] = useState<'part_no' | 'part_name' | 'material'>('part_no');
  const [isDragOver, setIsDragOver] = useState(false);

  const RENDER_WIDTH = 2400;
  const FALLBACK_INITIAL_SCALE = 0.5;
  const [scale, setScale] = useState(FALLBACK_INITIAL_SCALE);

  const {
    masks,
    setMasks,
    isMaskMode,
    setIsMaskMode,
    handleDeleteMask,
    runOCR
  } = usePdfOcr(file, pageNumber, RENDER_WIDTH, setIsProcessing, setOcrResults, ocrMode);

  const {
    selection,
    isPanning,
    wrapperHeight,
    setWrapperHeight,
    pdfWrapperRef,
    scrollContainerRef,
    changePage,
    jumpToPage,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  } = usePdfViewer(
    file, pageNumber, setPageNumber, numPages, scale, setScale,
    setOcrMode, setIsMaskMode, masks, setMasks, isMaskMode, runOCR,
    RENDER_WIDTH
  );

  const { exportPdf, exportSplitFilesToLocal } = usePdfExport();

  const processFile = (inputFile: File) => {
    if (inputFile.type !== 'application/pdf') {
      alert('PDF 파일만 지원합니다.');
      return;
    }
    setFile(inputFile);
    setOcrResults([]);
    setPageNumber(1);
    setNumPages(0);
    setScale(FALLBACK_INITIAL_SCALE);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);

    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth - 64;
      const idealScale = containerWidth / RENDER_WIDTH;
      setScale(Math.max(0.1, Math.min(idealScale, 1.0)));
    } else {
      setScale(FALLBACK_INITIAL_SCALE);
    }

    const initialResults = Array.from({ length: numPages }, (_, i) => ({
      page: i + 1,
      thumbnail: '',
      part_no: '',
      part_name: '',
      material: '',
      status: 'pending',
      skip: false
    })) as OcrResult[];
    setOcrResults(initialResults);
  };

  const toggleSkip = (index: number) => {
    const newResults = [...ocrResults];
    newResults[index].skip = !newResults[index].skip;
    setOcrResults(newResults);
  };

  const handleReset = () => {
    if (confirm('모든 작업을 초기화하고 파일을 닫으시겠습니까?')) {
      setFile(null);
      setOcrResults([]);
    }
  };

  const handleApply = () => {
    exportPdf(file, ocrResults, masks, RENDER_WIDTH, onImportComplete, onClose, setIsProcessing);
  };

  const handleExportSplitFiles = () => {
    exportSplitFilesToLocal(file, ocrResults, masks, RENDER_WIDTH, setIsProcessing);
  };

  const validCount = ocrResults.filter(r => !r.skip && r.part_no).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-overlay/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-[95vw] h-[95vh] flex flex-col bg-bg-elevated border border-border-default shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border-default flex justify-between items-center bg-bg-surface shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-text-primary">도면 일괄 분석 (Smart OCR)</h2>
            <div className="flex items-center gap-3 text-xs text-text-secondary bg-bg-base px-3 py-1.5 rounded-md border border-border-default">
              <span className="flex items-center gap-1"><span className="bg-bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-bold text-text-primary shadow-sm">◀</span><span className="bg-bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-bold text-text-primary shadow-sm">▶</span> 페이지 이동</span>
              <span className="w-px h-3 bg-border-default"></span>
              <span className="flex items-center gap-1"><span className="bg-bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-bold text-text-primary shadow-sm">1</span> ~ <span className="bg-bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-bold text-text-primary shadow-sm">4</span> (또는 <span className="bg-bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-bold text-text-primary shadow-sm">우클릭</span>) 모드 변경</span>
              <span className="w-px h-3 bg-border-default"></span>
              <span className="flex items-center gap-1"><span className="bg-bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-bold text-text-primary shadow-sm">휠 클릭</span> 이동 (Pan)</span>
              <span className="w-px h-3 bg-border-default"></span>
              <span className="flex items-center gap-1"><span className="bg-bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-bold text-text-primary shadow-sm">Ctrl + 휠</span> 확대/축소</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5 text-text-secondary" /></Button>
        </div>
        <div className="flex-1 flex flex-col min-h-0 bg-bg-base overflow-hidden">
          <div
            className={`flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0 ${isDragOver ? 'opacity-50 bg-brand-500/10' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex-1 bg-bg-base rounded border border-border-default p-4 overflow-hidden flex flex-col items-center relative">
              {isDragOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-brand-500/100 bg-opacity-20 backdrop-blur-sm rounded pointer-events-none">
                  <p className="text-2xl font-bold text-brand-400 bg-bg-elevated px-8 py-4 rounded shadow-xl">
                    📂 파일을 여기에 놓으세요
                  </p>
                </div>
              )}

              {!file ? (
                <div className="m-auto text-center">
                  <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" id="pdf-upload" />
                  <label htmlFor="pdf-upload" className="inline-block bg-brand-500 text-white px-6 py-3 rounded-lg cursor-pointer font-bold hover:bg-brand-600 transition-colors">
                    📄 다중 PDF 파일 업로드
                  </label>
                  <p className="text-text-tertiary mt-4 text-sm">또는 파일을 여기로 드래그하세요.</p>
                </div>
              ) : (
                <>
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
                    onReset={handleReset}
                  />

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
                </>
              )}
            </div>

            <SmartPdfResults
              ocrResults={ocrResults}
              setOcrResults={setOcrResults}
              pageNumber={pageNumber}
              jumpToPage={jumpToPage}
              toggleSkip={toggleSkip}
            />
          </div>
        </div>
        <div className="p-4 border-t border-border-default flex justify-end gap-3 bg-bg-surface shrink-0">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button
            variant="outline"
            onClick={handleExportSplitFiles}
            disabled={isProcessing || validCount === 0}
            className="text-status-success border-status-success hover:bg-status-success/10"
          >
            📂 분할 파일만 저장
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={isProcessing || validCount === 0}
          >
            {isProcessing ? '처리 중...' : `우측 보관함으로 전송 (${validCount})`}
          </Button>
        </div>
      </Card>
    </div>
  );
}