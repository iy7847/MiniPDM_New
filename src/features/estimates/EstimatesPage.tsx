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
import { Badge } from '../../design-system/Badge';
import { useEstimateList } from './hooks/useEstimate';
import type { Estimate } from './types';

const columnHelper = createColumnHelper<Estimate>();

export const EstimatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    estimates, totalCount, page, pageSize, localSearch, setLocalSearch, status, startDate, endDate, updateParams 
  } = useEstimateList();
  
  const [sorting, setSorting] = useState<SortingState>([]);

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
      cell: info => info.getValue(),
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
      cell: info => {
        const status = info.getValue();
        if (status === 'DRAFT') return <Badge variant="warning">작성중</Badge>;
        if (status === 'SENT') return <Badge variant="default">견적제출</Badge>;
        if (status === 'ORDERED') return <Badge variant="success">수주완료</Badge>;
        if (status === 'ARCHIVED') return <Badge variant="default">보관됨</Badge>;
        return <Badge variant="default">{status}</Badge>;
      },
    }),
  ], []);

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary">견적 관리</h1>
          <Button 
            variant="primary" 
            onClick={() => navigate('/estimates/new')}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            새 견적 작성
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-1 bg-bg-surface p-1 rounded-lg border border-border-default">
            {(['ALL', 'DRAFT', 'SENT', 'ORDERED', 'ARCHIVED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => updateParams({ status: tab })}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  status === tab 
                    ? 'bg-bg-elevated text-text-primary shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
                }`}
              >
                {tab === 'ALL' && '전체'}
                {tab === 'DRAFT' && '작성중'}
                {tab === 'SENT' && '견적제출'}
                {tab === 'ORDERED' && '수주완료'}
                {tab === 'ARCHIVED' && '보관됨'}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BaseInput 
                type="date"
                value={startDate}
                onChange={(e) => updateParams({ start: e.target.value })}
                className="w-36"
              />
              <span className="text-text-secondary">~</span>
              <BaseInput 
                type="date"
                value={endDate}
                onChange={(e) => updateParams({ end: e.target.value })}
                className="w-36"
              />
            </div>
            <div className="w-64">
              <BaseInput 
                placeholder="프로젝트명, 거래처, 견적번호 검색"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
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
                        className="px-4 py-3 text-sm font-medium text-text-secondary border-b border-border-default cursor-pointer hover:bg-bg-overlay transition-colors select-none"
                        onClick={header.column.getToggleSortingHandler()}
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
                      <td key={cell.id} className="px-4 py-3 text-sm text-text-secondary group-hover:text-text-primary">
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
    </div>
  );
};
