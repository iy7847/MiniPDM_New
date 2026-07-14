import React from 'react';
import type { OcrResult } from './SmartPdfTypes';

interface SmartPdfResultsProps {
  ocrResults: OcrResult[];
  setOcrResults: React.Dispatch<React.SetStateAction<OcrResult[]>>;
  pageNumber: number;
  jumpToPage: (page: number) => void;
  toggleSkip: (index: number) => void;
}

export function SmartPdfResults({
  ocrResults,
  setOcrResults,
  pageNumber,
  jumpToPage,
  toggleSkip
}: SmartPdfResultsProps) {
  return (
    <div className="w-full lg:w-80 bg-bg-elevated rounded border border-border-default flex flex-col shrink-0">
      <div className="p-3 border-b border-border-default bg-bg-surface font-bold text-text-primary flex justify-between items-center shrink-0">
        <span>분석 결과 ({ocrResults.filter(r => r.part_no).length})</span>
        <span className="text-xs font-normal text-text-disabled">체크박스로 제외</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {ocrResults.map((res, idx) => (
          <div
            key={idx}
            onClick={() => jumpToPage(res.page)}
            className={`flex flex-col gap-2 p-2 border border-border-default rounded cursor-pointer transition-all ${pageNumber === res.page ? 'ring-2 ring-brand-500 bg-brand-500/10 border-brand-500/30' : 'bg-bg-elevated hover:bg-bg-surface border-border-default'
              } ${res.skip ? 'opacity-50' : ''}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-text-primary bg-bg-surface border border-border-default px-1.5 rounded">Page {res.page}</span>
              <input
                type="checkbox"
                checked={!res.skip}
                onChange={(e) => { e.stopPropagation(); toggleSkip(idx); }}
                className="w-4 h-4 cursor-pointer"
                title="포함/제외"
              />
            </div>

            <div className="flex gap-2">
              {res.thumbnail ? (
                <img src={res.thumbnail} alt="thumb" className="w-16 h-12 object-contain border border-border-default bg-bg-elevated" />
              ) : (
                <div className="w-16 h-12 bg-bg-base border border-border-default flex items-center justify-center text-[10px] text-text-disabled">
                  미인식
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] w-6 text-text-disabled">도번</span>
                  <input
                    value={res.part_no || ''}
                    onChange={(e) => {
                      const newResults = [...ocrResults];
                      newResults[idx].part_no = e.target.value;
                      setOcrResults(newResults);
                    }}
                    className="flex-1 border border-border-default p-1 rounded text-xs text-status-danger font-bold focus:border-red-500 outline-none hover:bg-status-danger/10"
                    placeholder="도번"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] w-6 text-text-disabled">품명</span>
                  <input
                    value={res.part_name || ''}
                    onChange={(e) => {
                      const newResults = [...ocrResults];
                      newResults[idx].part_name = e.target.value;
                      setOcrResults(newResults);
                    }}
                    className="flex-1 border border-border-default p-1 rounded text-xs text-brand-500 font-bold focus:border-blue-500 outline-none hover:bg-brand-500/10"
                    placeholder="품명"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] w-6 text-text-disabled">재질</span>
                  <input
                    value={res.material || ''}
                    onChange={(e) => {
                      const newResults = [...ocrResults];
                      newResults[idx].material = e.target.value;
                      setOcrResults(newResults);
                    }}
                    className="flex-1 border border-border-default p-1 rounded text-xs text-status-success font-bold focus:border-green-500 outline-none hover:bg-status-success/10"
                    placeholder="재질"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
