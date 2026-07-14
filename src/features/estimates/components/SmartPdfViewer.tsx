import React from 'react';
import { Document, Page } from 'react-pdf';
import type { Mask } from './SmartPdfTypes';

interface SmartPdfViewerProps {
  file: File;
  pageNumber: number;
  scale: number;
  RENDER_WIDTH: number;
  isPanning: boolean;
  wrapperHeight: number;
  setWrapperHeight: (h: number) => void;
  pdfWrapperRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  onDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  masks: Mask[];
  handleDeleteMask: (index: number) => void;
  selection: { x: number; y: number; w: number; h: number };
  isMaskMode: boolean;
  ocrMode: 'part_no' | 'part_name' | 'material';
}

export function SmartPdfViewer({
  file,
  pageNumber,
  scale,
  RENDER_WIDTH,
  isPanning,
  wrapperHeight,
  setWrapperHeight,
  pdfWrapperRef,
  scrollContainerRef,
  onDocumentLoadSuccess,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  masks,
  handleDeleteMask,
  selection,
  isMaskMode,
  ocrMode
}: SmartPdfViewerProps) {
  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-auto bg-bg-overlay/50 flex justify-center items-start p-8 w-full"
    >
      <div style={{
        width: RENDER_WIDTH * scale,
        height: wrapperHeight ? wrapperHeight * scale : 'auto',
        transition: 'width 0.1s, height 0.1s'
      }}>
        <div
          ref={pdfWrapperRef}
          className={`relative shadow-2xl transition-transform duration-100 ease-out origin-top-left select-none bg-white ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'
            }`}
          style={{ transform: `scale(${scale})`, width: RENDER_WIDTH }}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => e.preventDefault()}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="p-10 text-white">로딩 중...</div>}
          >
            <Page
              pageNumber={pageNumber}
              width={RENDER_WIDTH}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadSuccess={() => {
                setTimeout(() => {
                  if (pdfWrapperRef.current) {
                    setWrapperHeight(pdfWrapperRef.current.offsetHeight);
                  }
                }, 100);
              }}
            />
          </Document>

          {/* 마스크 렌더링 */}
          {masks.filter(m => m.page === pageNumber).map((mask, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: mask.x,
                top: mask.y,
                width: mask.w,
                height: mask.h,
                border: '2px solid red',
                backgroundColor: 'white',
                opacity: 0.8,
              }}
              className="group"
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteMask(idx); }}
                className="absolute -top-2 -right-2 bg-status-danger/100 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}

          {/* 선택 영역 (진행 중) 렌더링 */}
          {selection.w > 0 && (
            <div
              style={{
                position: 'absolute',
                left: selection.x,
                top: selection.y,
                width: selection.w,
                height: selection.h,
                border: `2px solid ${isMaskMode ? 'red' : ocrMode === 'part_name' ? 'blue' : ocrMode === 'material' ? 'green' : 'red'}`,
                backgroundColor: isMaskMode ? 'white' : ocrMode === 'part_name' ? 'rgba(0, 0, 255, 0.2)' : ocrMode === 'material' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                boxShadow: isMaskMode ? 'none' : '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none',
                opacity: isMaskMode ? 0.8 : 1
              }}
            >
              <div className={`absolute -top-6 left-0 text-white text-[10px] px-1 py-0.5 font-bold whitespace-nowrap ${isMaskMode ? 'bg-status-danger' : ocrMode === 'part_name' ? 'bg-brand-500' : ocrMode === 'material' ? 'bg-status-success' : 'bg-status-danger'}`}>
                {isMaskMode ? '마스킹 영역' : '인식 중...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
