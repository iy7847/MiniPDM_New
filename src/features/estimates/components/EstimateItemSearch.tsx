import React, { useState } from 'react';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
} from '@tanstack/react-table';
import { Search, Loader2, Plus, Check, FileText, Edit3, Send, Rocket, Ruler, RotateCcw } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { BaseInput } from '../../../design-system/BaseInput';
import { useEstimateItemSearch } from '../hooks/useEstimateItemSearch';
import { TargetEstimatePanel } from './TargetEstimatePanel';
import { copyItemsToEstimate } from '../services/estimateService';
import { toast } from '../../../shared/stores/useToastStore';

const columnHelper = createColumnHelper<any>();

interface EstimateItemSearchProps {
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
}

export const EstimateItemSearch: React.FC<EstimateItemSearchProps> = ({ cart, setCart }) => {
  const [targetMode, setTargetMode] = useState<'new' | 'existing'>('new');
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [isAddingId, setIsAddingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    items,
    totalCount,
    isLoading,
    localSearch,
    setLocalSearch,
    localNoteSearch,
    setLocalNoteSearch,
    statusFilter,
    sizeW,
    sizeD,
    sizeH,
    tolerance,
    updateParams,
    page,
    pageSize
  } = useEstimateItemSearch();

  const handleSearch = () => {
    updateParams({ keyword: localSearch, noteKeyword: localNoteSearch, page: 1 });
  };

  const handleAddItem = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (targetMode === 'new') {
      const exists = cart.find(c => c.id === item.id);
      if (!exists) {
        setCart(prev => [...prev, item]);
        toast.success('장바구니에 담겼습니다.');
      }
    } else {
      if (!selectedEstimateId) {
        toast.error('먼저 좌측에서 추가할 견적서를 선택해주세요.');
        return;
      }
      setIsAddingId(item.id);
      try {
        await copyItemsToEstimate(selectedEstimateId, [item]);
        toast.success('견적서에 품목이 추가되었습니다.');
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error(err);
        toast.error('추가 실패');
      } finally {
        setIsAddingId(null);
      }
    }
  };

  const columns = React.useMemo(() => [
    columnHelper.accessor('part_no', { header: '품번' }),
    columnHelper.accessor('part_name', { header: '품명' }),
    columnHelper.accessor('material.name', { 
      header: '소재',
      cell: info => info.getValue() || info.row.original.material_id || '-'
    }),
    columnHelper.accessor('spec_w', {
      header: '규격',
      cell: info => {
        const row = info.row.original;
        const parts = [];
        if (row.spec_w) parts.push(row.spec_w);
        if (row.spec_d) parts.push(row.spec_d);
        if (row.spec_h) parts.push(row.spec_h);
        return parts.length > 0 ? parts.join(' × ') : '-';
      }
    }),
    columnHelper.accessor('unit_price', {
      header: '단가',
      cell: info => new Intl.NumberFormat('ko-KR').format(info.getValue() || 0),
    }),
    columnHelper.accessor('estimate.status', {
      header: '상태',
      cell: info => {
        const status = info.getValue();
        if (status === 'DRAFT') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-bg-elevated text-text-secondary border border-border-default">작성중</span>;
        if (status === 'SENT') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">제출완료</span>;
        if (status === 'ORDERED') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">수주확정</span>;
        return <span className="text-text-muted">-</span>;
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: info => {
        const item = info.row.original;
        const isInCart = targetMode === 'new' && !!cart.find(c => c.id === item.id);
        const isAdding = isAddingId === item.id;
        
        return (
          <div className="flex justify-end">
            <Button 
              variant={isInCart ? "secondary" : "primary"}
              size="sm"
              className="w-20 text-xs py-1 h-8"
              disabled={isInCart || isAdding}
              onClick={(e) => handleAddItem(item, e)}
            >
              {isAdding ? <Loader2 className="animate-spin" size={14} /> : 
               isInCart ? <><Check size={14} className="mr-1"/> 담김</> : 
               <><Plus size={14} className="mr-1"/> 담기</>}
            </Button>
          </div>
        );
      },
      size: 100,
    })
  ], [items, cart, targetMode, selectedEstimateId, isAddingId]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex h-[calc(100vh-140px)] w-[calc(100%+3rem)] overflow-hidden border-t border-border-default -mx-6 -mb-6 mt-4">
      {/* Left Panel: Target Builder */}
      <TargetEstimatePanel
        targetMode={targetMode}
        setTargetMode={setTargetMode}
        cart={cart}
        setCart={setCart}
        selectedEstimateId={selectedEstimateId}
        setSelectedEstimateId={setSelectedEstimateId}
        refreshTrigger={refreshTrigger}
      />

      {/* Right Panel: Search Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-base">
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

        <div className="flex-1 overflow-auto p-6 pt-4">
          <div className="border border-border-default rounded-xl overflow-hidden bg-bg-surface">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bg-elevated border-b border-border-default text-text-muted text-xs uppercase tracking-wider">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 font-medium" style={{ width: header.getSize() !== 150 ? header.getSize() : 'auto' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border-subtle text-text-secondary">
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-text-muted">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        데이터를 불러오는 중...
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-32 text-center text-text-muted">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-bg-overlay/50 transition-colors"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 gap-2 pb-8">
              <Button 
                variant="secondary" 
                onClick={() => updateParams({ page: Math.max(1, page - 1) })}
                disabled={page === 1}
              >
                이전
              </Button>
              <span className="text-sm text-text-secondary mx-4">
                {page} / {totalPages}
              </span>
              <Button 
                variant="secondary" 
                onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}
                disabled={page === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
