import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getSortedRowModel,
  type SortingState
} from '@tanstack/react-table';
import { Plus, ArrowUpDown } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { BaseInput } from '../../design-system/BaseInput';
import { PageHeader, PageTabs, FilterBar, StatusBadge } from '../../design-system';
import { Badge } from '../../design-system/Badge';
import { useEstimateList } from './hooks/useEstimate';
import type { Estimate } from './types';
import { Trash2 } from 'lucide-react';
import { deleteEstimate } from './services/estimateService';
import { DeleteConfirmModal } from '../../shared/components/DeleteConfirmModal';
import { toast } from '../../shared/stores/useToastStore';
import { Tabs } from '../../design-system/Tabs';
import { EstimateItemSearch } from './components/EstimateItemSearch';
import { DraftEstimateSelectModal } from './components/DraftEstimateSelectModal';
import { copyItemsToEstimate } from './services/estimateService';
import { List, Search, ShoppingCart, X, FileSpreadsheet } from 'lucide-react';
import { usePermissions } from '../../shared/hooks/usePermissions';

const columnHelper = createColumnHelper<Estimate>();

export const EstimatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { 
    estimates, totalCount, page, pageSize, localSearch, setLocalSearch, status, startDate, endDate, updateParams, reload
  } = useEstimateList();
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [activeTab, setActiveTab] = useState('list');
  const [cart, setCart] = useState<any[]>([]);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const columns = React.useMemo(() => [
    columnHelper.accessor('id', {
      header: '견적번호',
      cell: info => {
        const fullId = info.getValue() as string;
        // UUID일 경우 앞 8자리만 표시, 아닐 경우 그대로 표시
        const shortId = fullId.length > 8 ? fullId.substring(0, 8).toUpperCase() : fullId;
        return <span className="font-medium text-text-primary">EST-{shortId}</span>;
      },
    }),
    columnHelper.accessor('project_name', {
      header: '프로젝트명',
      cell: info => {
        const est = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="truncate">{info.getValue()}</span>
            {est.item_count !== undefined && est.item_count > 0 && (
              <span className="shrink-0 bg-bg-overlay px-2 py-0.5 rounded-full text-[11px] font-medium text-text-secondary border border-border-default">
                {est.item_count}종
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('clients.name', {
      header: '거래처',
      cell: info => info.getValue() || '알 수 없음',
    }),
    columnHelper.accessor('created_at', {
      header: '견적일자',
      cell: info => {
        const dateStr = info.getValue() as string;
        if (!dateStr) return '-';
        return new Intl.DateTimeFormat('ko-KR', { 
          year: 'numeric', month: '2-digit', day: '2-digit' 
        }).format(new Date(dateStr));
      },
    }),
    columnHelper.accessor('total_amount', {
      header: '견적금액',
      cell: info => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: '상태',
      cell: info => <StatusBadge type="estimate" status={info.getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: '관리',
      size: 80,
      enableSorting: false,
      cell: info => {
        const est = info.row.original;
        const isLocked = est.status === 'SENT' || est.status === 'ORDERED';
        return (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            {!isLocked && hasPermission('can_delete_estimates') && (
              <button
                className={`p-1.5 rounded transition-colors text-red-400 hover:bg-red-500/10`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTargetId(est.id);
                }}
                title="삭제"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      }
    })
  ], [hasPermission]);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      await deleteEstimate(deleteTargetId);
      toast.success('견적서가 정상적으로 삭제되었습니다.');
      reload();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || '견적서 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const table = useReactTable({
    data: estimates,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col h-full bg-bg-base animate-in fade-in">
      {/* Header */}
      <div className="p-6 pb-0">
        <PageHeader
          icon={FileSpreadsheet}
          title="견적 관리"
          description="도면 분석 및 단가 계산을 통해 고객사 견적서를 작성·발행합니다."
          actions={
            <div className="flex items-center gap-4">
              <Tabs 
                tabs={[
                  { id: 'list', label: '견적서 목록', icon: <List size={16} /> },
                  { id: 'search', label: '품목 검색', icon: <Search size={16} /> }
                ]} 
                activeTab={activeTab} 
                onChange={setActiveTab} 
              />
              {hasPermission('can_write_estimates') && (
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/estimates/new')}
                  className="flex items-center gap-2"
                >
                  <Plus size={18} />
                  새 견적 작성
                </Button>
              )}
            </div>
          }
        />

        {/* Filters and Search - Only show for list tab */}
        {activeTab === 'list' && (
          <>
            <PageTabs
              activeTab={status || 'ALL'}
              onChange={(tabId) => updateParams({ status: tabId as any })}
              tabs={[
                { id: 'ALL', label: '전체' },
                { id: 'DRAFT', label: '작성중' },
                { id: 'SENT', label: '견적제출' },
                { id: 'ORDERED', label: '수주완료' }
              ]}
              rightContent={
                <div className="text-xs text-text-secondary">
                  총 <span className="text-brand-400 font-bold">{totalCount}</span> 건의 견적서
                </div>
              }
            />
            <FilterBar>
              <div className="flex flex-wrap items-center justify-between gap-3 w-full bg-bg-surface p-3 rounded-lg border border-border-default">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Date Range Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary whitespace-nowrap">견적일자</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => updateParams({ start: e.target.value })}
                      className="bg-bg-base border border-border-default text-text-primary rounded h-8 text-xs px-2 outline-none focus:border-brand-500"
                    />
                    <span className="text-text-secondary text-xs">~</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => updateParams({ end: e.target.value })}
                      className="bg-bg-base border border-border-default text-text-primary rounded h-8 text-xs px-2 outline-none focus:border-brand-500"
                    />
                  </div>
                  
                  {/* Reset Button */}
                  {(localSearch || status !== 'ALL' || startDate || endDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocalSearch('');
                        updateParams({
                          search: '',
                          status: 'ALL',
                          start: '',
                          end: '',
                          page: 1
                        });
                      }}
                      className="text-xs text-text-secondary hover:text-status-danger h-8"
                    >
                      필터 초기화
                    </Button>
                  )}
                </div>

                {/* Search Box */}
                <div className="w-72 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <BaseInput 
                    className="pl-9 bg-bg-base text-xs" 
                    placeholder="프로젝트명, 거래처, 견적번호 검색..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                </div>
              </div>
            </FilterBar>
          </>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'list' ? (
        <div className="flex-1 p-6 pt-0 overflow-hidden flex flex-col">
          <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden flex flex-col h-full">
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-bg-elevated sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id} 
                        className="px-4 py-3 text-sm font-medium text-text-secondary border-b border-border-default hover:bg-bg-overlay transition-colors select-none"
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        style={{ 
                          width: header.column.getSize() !== 150 ? header.column.getSize() : undefined,
                          cursor: header.column.getCanSort() ? 'pointer' : 'default'
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {{
                            asc: <ArrowUpDown size={14} className="text-brand-500" />,
                            desc: <ArrowUpDown size={14} className="text-brand-500 rotate-180" />,
                          }[header.column.getIsSorted() as string] ?? (
                            <ArrowUpDown size={14} className="text-text-secondary/30 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id} 
                    onClick={() => navigate(`/estimates/${row.original.id}`)}
                    className="border-b border-border-default hover:bg-bg-elevated transition-colors cursor-pointer group"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td 
                        key={cell.id} 
                        className="px-4 py-3 text-sm text-text-secondary group-hover:text-text-primary"
                        style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-text-secondary">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-border-default bg-bg-surface">
              <div className="text-sm text-text-secondary">
                총 {totalCount}건
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => updateParams({ page: String(page - 1) })}
                  disabled={page <= 1}
                >
                  이전
                </Button>
                <div className="text-sm font-medium text-text-primary px-4">
                  {page} / {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => updateParams({ page: String(page + 1) })}
                  disabled={page >= totalPages}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      ) : (
        <EstimateItemSearch cart={cart} setCart={setCart} />
      )}



      <DeleteConfirmModal
        isOpen={!!deleteTargetId}
        title="견적서 삭제"
        description={<>정말로 이 견적서를 삭제하시겠습니까?<br/>삭제된 견적서는 복구할 수 없습니다.</>}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
