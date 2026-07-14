import React from 'react';
import { Button } from '../../../design-system/Button';

interface SmartPdfToolbarProps {
  pageNumber: number;
  numPages: number;
  changePage: (offset: number) => void;
  isMaskMode: boolean;
  setIsMaskMode: (b: boolean) => void;
  ocrMode: 'part_no' | 'part_name' | 'material';
  setOcrMode: (mode: 'part_no' | 'part_name' | 'material') => void;
  isProcessing: boolean;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  onReset: () => void;
}

export function SmartPdfToolbar({
  pageNumber,
  numPages,
  changePage,
  isMaskMode,
  setIsMaskMode,
  ocrMode,
  setOcrMode,
  isProcessing,
  scale,
  setScale,
  onReset
}: SmartPdfToolbarProps) {
  return (
    <div className="bg-bg-elevated p-2 border-b border-border-default flex flex-wrap gap-2 items-center z-10 shadow-none w-full min-h-[50px]">
      {/* 1. Page Nav */}
      <div className="flex items-center gap-1 border-r border-border-default pr-2">
        <span className="text-xs font-bold text-text-tertiary bg-bg-base px-2 py-1 rounded min-w-[80px] text-center">
          {pageNumber} / {numPages}
        </span>
        <div className="flex gap-0.5">
          <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="w-9 h-7 border border-border-default rounded hover:bg-bg-surface flex items-center justify-center text-text-secondary text-xs" title="이전 페이지 (방향키 ◀)">◀</button>
          <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="w-9 h-7 border border-border-default rounded hover:bg-bg-surface flex items-center justify-center text-text-secondary text-xs" title="다음 페이지 (방향키 ▶)">▶</button>
        </div>
      </div>

      {/* 2. Tools Group */}
      <div className="flex items-center gap-2">
        {/* Mask Toggle */}
        <button
          onClick={() => setIsMaskMode(!isMaskMode)}
          className={`px-3 py-1.5 text-xs font-bold rounded border border-border-default flex items-center gap-1 transition-all ${isMaskMode ? 'bg-status-danger/10 text-status-danger border-status-danger/30 ring-2 ring-status-danger/20' : 'bg-bg-elevated text-text-secondary hover:bg-bg-surface'}`}
          title="단축키: 1"
        >
          <span>🛡️</span>
          <span>마스킹 <span className="opacity-50 font-normal">(1)</span></span>
        </button>

        <div className="h-5 w-[1px] bg-border-default"></div>

        {/* OCR Modes */}
        <div className="flex bg-bg-base p-0.5 rounded border">
          <button
            onClick={() => { setIsMaskMode(false); setOcrMode('part_no'); }}
            className={`px-3 py-1 text-xs rounded font-bold transition-all ${!isMaskMode && ocrMode === 'part_no' ? 'bg-bg-elevated text-status-danger shadow-none' : 'text-text-tertiary hover:bg-bg-surface'}`}
            title="단축키: 2"
          >
            도번 <span className="opacity-50 font-normal">(2)</span>
          </button>
          <button
            onClick={() => { setIsMaskMode(false); setOcrMode('part_name'); }}
            className={`px-3 py-1 text-xs rounded font-bold transition-all ${!isMaskMode && ocrMode === 'part_name' ? 'bg-bg-elevated text-brand-500 shadow-none' : 'text-text-tertiary hover:bg-bg-surface'}`}
            title="단축키: 3"
          >
            품명 <span className="opacity-50 font-normal">(3)</span>
          </button>
          <button
            onClick={() => { setIsMaskMode(false); setOcrMode('material'); }}
            className={`px-3 py-1 text-xs rounded font-bold transition-all ${!isMaskMode && ocrMode === 'material' ? 'bg-bg-elevated text-status-success shadow-none' : 'text-text-tertiary hover:bg-bg-surface'}`}
            title="단축키: 4"
          >
            재질 <span className="opacity-50 font-normal">(4)</span>
          </button>
        </div>

        {/* Status Indicator */}
        <span className="text-xs font-bold text-brand-500 ml-2 hidden lg:inline-block">
          {isProcessing ? '🔄 분석 중...' : isMaskMode ? '영역을 드래그하여 가림' : `🖱️ ${ocrMode === 'part_no' ? '도번' : ocrMode === 'part_name' ? '품명' : '재질'} 영역 지정`}
        </span>
      </div>

      <div className="flex-1"></div>

      {/* 3. Right Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-border-default rounded overflow-hidden">
          <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="px-2 py-1 hover:bg-bg-surface text-text-secondary text-xs">－</button>
          <span className="text-xs font-mono w-10 text-center bg-bg-surface py-1 border-x">{Math.round(scale * 100 * (1 / 0.25))}%</span>
          <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="px-2 py-1 hover:bg-bg-surface text-text-secondary text-xs">＋</button>
        </div>

        <button
          onClick={onReset}
          className="px-3 py-1.5 text-xs font-bold text-status-danger border border-border-default border-transparent hover:bg-status-danger/10 rounded transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  );
}
