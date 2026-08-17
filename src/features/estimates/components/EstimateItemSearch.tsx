import React, { useState } from 'react';
import { 
  createColumnHelper, 
  getCoreRowModel, 
  useReactTable, 
} from '@tanstack/react-table';
import { Loader2, Plus, Check } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { useEstimateItemSearch } from '../hooks/useEstimateItemSearch';
import { TargetEstimatePanel } from './TargetEstimatePanel';
import { copyItemsToEstimate } from '../services/estimateService';
import { toast } from '../../../shared/stores/useToastStore';
import { EstimateItemSearchFilterBar } from './search/EstimateItemSearchFilterBar';
import { EstimateItemSearchTable } from './search/EstimateItemSearchTable';

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
      <TargetEstimatePanel
        targetMode={targetMode}
        setTargetMode={setTargetMode}
        cart={cart}
        setCart={setCart}
        selectedEstimateId={selectedEstimateId}
        setSelectedEstimateId={setSelectedEstimateId}
        refreshTrigger={refreshTrigger}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-base">
        <EstimateItemSearchFilterBar
          statusFilter={statusFilter}
          localSearch={localSearch}
          setLocalSearch={setLocalSearch}
          localNoteSearch={localNoteSearch}
          setLocalNoteSearch={setLocalNoteSearch}
          handleSearch={handleSearch}
          updateParams={updateParams}
          sizeW={sizeW}
          sizeD={sizeD}
          sizeH={sizeH}
          tolerance={tolerance}
        />
        
        <EstimateItemSearchTable
          table={table}
          isLoading={isLoading}
          items={items}
          columnsCount={columns.length}
          totalPages={totalPages}
          page={page}
          updateParams={updateParams}
        />
      </div>
    </div>
  );
};
