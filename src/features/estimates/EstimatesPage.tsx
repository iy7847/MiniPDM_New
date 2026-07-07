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
  const { estimates } = useEstimateList();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'SENT' | 'ORDERED' | 'ARCHIVED'>('ALL');

  const filteredData = React.useMemo(() => estimates.filter((item) => {
    if (activeTab !== 'ALL' && item.status !== activeTab) return false;
    if (searchTerm && !item.project_name.includes(searchTerm) && !(item.clients?.name || '').includes(searchTerm)) return false;
    return true;
  }), [estimates, activeTab, searchTerm]);

  const columns = React.useMemo(() => [
    columnHelper.accessor('id', {
      header: '견적번호',
      cell: info => <span className="font-medium text-text-primary">EST-{info.getValue()}</span>,
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
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('total_amount', {
      header: '견적금액',
      cell: info => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: '상태',
      cell: info => {
        const status = info.getValue();
        if (status === 'DRAFT') return <Badge variant="warning">대기중</Badge>;
        if (status === 'SENT' || status === 'ORDERED') return <Badge variant="default">진행중</Badge>;
        return <Badge variant="success">완료</Badge>;
      },
    }),
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab 
                    ? 'bg-bg-elevated text-text-primary shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
                }`}
              >
                {tab === 'ALL' && '전체'}
                {tab === 'DRAFT' && '대기중'}
                {tab === 'SENT' && '전송됨'}
                {tab === 'ORDERED' && '수주됨'}
                {tab === 'ARCHIVED' && '보관됨'}
              </button>
            ))}
          </div>
          
          <div className="w-72">
            <BaseInput 
              placeholder="프로젝트명 또는 거래처 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
        </div>
      </div>
    </div>
  );
};
