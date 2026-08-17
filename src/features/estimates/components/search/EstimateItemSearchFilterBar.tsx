import React from 'react';
import { Search, FileText, Edit3, Send, Rocket, Ruler, RotateCcw } from 'lucide-react';
import { Button } from '../../../../design-system/Button';
import { BaseInput } from '../../../../design-system/BaseInput';

interface EstimateItemSearchFilterBarProps {
  statusFilter: string;
  localSearch: string;
  setLocalSearch: (val: string) => void;
  localNoteSearch: string;
  setLocalNoteSearch: (val: string) => void;
  handleSearch: () => void;
  updateParams: (params: any) => void;
  sizeW: number | string;
  sizeD: number | string;
  sizeH: number | string;
  tolerance: number;
}

export const EstimateItemSearchFilterBar: React.FC<EstimateItemSearchFilterBarProps> = ({
  statusFilter,
  localSearch,
  setLocalSearch,
  localNoteSearch,
  setLocalNoteSearch,
  handleSearch,
  updateParams,
  sizeW,
  sizeD,
  sizeH,
  tolerance
}) => {
  return (
    <div className="flex flex-col px-6 py-4 border-b border-border-default gap-3 bg-bg-surface/50 backdrop-blur-sm">
      {/* Top Row: Search Inputs & Actions */}
      <div className="flex items-center gap-3">
        <div className="flex bg-bg-surface p-1 rounded-lg border border-border-default shadow-sm shrink-0">
          <button
            onClick={() => updateParams({ statusFilter: 'ALL', page: 1 })}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              statusFilter === 'ALL' 
                ? 'bg-bg-elevated text-text-primary shadow-sm ring-1 ring-border-default' 
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/50'
            }`}
          >
            <FileText size={14} /> 전체상태
          </button>
          <button
            onClick={() => updateParams({ statusFilter: 'DRAFT', page: 1 })}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              statusFilter === 'DRAFT' 
                ? 'bg-bg-elevated text-text-primary shadow-sm ring-1 ring-border-default' 
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/50'
            }`}
          >
            <Edit3 size={14} /> 작성중
          </button>
          <button
            onClick={() => updateParams({ statusFilter: 'SENT', page: 1 })}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              statusFilter === 'SENT' 
                ? 'bg-bg-elevated text-text-primary shadow-sm ring-1 ring-border-default' 
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/50'
            }`}
          >
            <Send size={14} /> 제출완료
          </button>
          <button
            onClick={() => updateParams({ statusFilter: 'ORDERED', page: 1 })}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              statusFilter === 'ORDERED' 
                ? 'bg-bg-elevated text-text-primary shadow-sm ring-1 ring-border-default' 
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/50'
            }`}
          >
            <Rocket size={14} /> 수주확정
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <BaseInput 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="품번, 품명 검색..."
            className="pl-9 h-[34px] text-sm bg-bg-base border-border-default focus:border-brand-500 shadow-sm"
          />
        </div>
        
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <BaseInput 
            value={localNoteSearch}
            onChange={(e) => setLocalNoteSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="비고 내용 검색..."
            className="pl-9 h-[34px] text-sm bg-bg-base border-border-default focus:border-brand-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 border-l border-border-default pl-3 ml-1">
          <Button variant="primary" size="sm" onClick={handleSearch} className="h-[34px] px-4">
            검색
          </Button>
          <Button variant="secondary" size="sm" onClick={() => updateParams({ keyword: '', noteKeyword: '', statusFilter: 'ALL', sizeW: '', sizeD: '', sizeH: '', tolerance: 0, page: 1 })} className="h-[34px] px-3">
            <RotateCcw size={14} />
          </Button>
        </div>
      </div>

      {/* Bottom Row: Advanced Filters (Size) */}
      <div className="flex items-center gap-4 text-xs mt-1">
        <div className="flex items-center text-text-muted font-medium">
          <Ruler size={14} className="mr-1.5" />
          규격 검색
        </div>
        
        <div className="flex items-center bg-bg-surface border border-border-default rounded-md shadow-sm overflow-hidden h-[30px]">
          <div className="flex items-center px-3 bg-bg-elevated border-r border-border-default h-full">
            <span className="text-brand-400 font-medium mr-2">오차범위 ±</span>
            <input
              type="number"
              value={tolerance}
              onChange={(e) => updateParams({ tolerance: parseFloat(e.target.value) || 0, page: 1 })}
              className="w-8 text-right font-semibold text-text-primary outline-none bg-transparent"
              min="0" max="100"
            />
            <span className="text-text-muted ml-1">%</span>
          </div>
          
          <div className="flex items-center px-2 h-full">
            <span className="text-text-muted font-medium mr-1.5">W</span>
            <input
              type="number"
              value={sizeW || ''}
              onChange={(e) => updateParams({ sizeW: e.target.value ? parseFloat(e.target.value) : '', page: 1 })}
              className="w-14 text-right bg-transparent text-text-primary outline-none placeholder:text-text-muted/30"
              placeholder="mm"
            />
          </div>
          
          <div className="h-4 w-px bg-border-default" />
          
          <div className="flex items-center px-2 h-full">
            <span className="text-text-muted font-medium mr-1.5">D</span>
            <input
              type="number"
              value={sizeD || ''}
              onChange={(e) => updateParams({ sizeD: e.target.value ? parseFloat(e.target.value) : '', page: 1 })}
              className="w-14 text-right bg-transparent text-text-primary outline-none placeholder:text-text-muted/30"
              placeholder="mm"
            />
          </div>
          
          <div className="h-4 w-px bg-border-default" />
          
          <div className="flex items-center px-2 h-full">
            <span className="text-text-muted font-medium mr-1.5">H</span>
            <input
              type="number"
              value={sizeH || ''}
              onChange={(e) => updateParams({ sizeH: e.target.value ? parseFloat(e.target.value) : '', page: 1 })}
              className="w-14 text-right bg-transparent text-text-primary outline-none placeholder:text-text-muted/30"
              placeholder="mm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
