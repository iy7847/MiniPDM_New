import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderList } from './hooks/useOrderList';
import { Badge, Button, BaseInput, Tabs, PageHeader, PageTabs, FilterBar } from '../../design-system';
import { Search, Plus, List, ArrowRight, ArrowUpDown } from 'lucide-react';
import { CreateOrderModal } from './components/CreateOrderModal';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';

const calculateDDay = (targetDate: string) => {
  const target = new Date(targetDate).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  const diff = target - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return { text: `D+${Math.abs(days)}`, variant: 'danger' as const };
  if (days === 0) return { text: 'D-Day', variant: 'danger' as const };
  if (days <= 3) return { text: `D-${days}`, variant: 'warning' as const };
  return { text: `D-${days}`, variant: 'default' as const };
};

const columnHelper = createColumnHelper<any>();

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    orders,
    clients,
    companyId,
    totalCount,
    isLoading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    clientId,
    setClientId,
    page,
    setPage,
    resetFilters,
    errorMsg
  } = useOrderList();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const pageSize = 15;
  const totalPages = Math.ceil(totalCount / pageSize);

  const columns = [
    columnHelper.accessor(row => row.po_no || row.order_number || row.id.slice(0,8), {
      id: 'po_no',
      header: 'PO 번호 (발주번호)',
      cell: info => <span className="font-mono font-bold text-text-primary">{info.getValue()}</span>,
    }),
    columnHelper.accessor(row => row.clients?.name, {
      id: 'client_name',
      header: '고객사',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor(row => row.estimates?.project_name || row.po_no, {
      id: 'project_name',
      header: '프로젝트명',
      cell: info => {
        const order = info.row.original;
        const count = order.order_items?.[0]?.count || 0;
        return (
          <div className="flex items-center gap-2">
            <span className="truncate">{info.getValue() || '-'}</span>
            {count > 0 && (
              <span className="shrink-0 bg-bg-overlay px-2 py-0.5 rounded-full text-[11px] font-medium text-text-secondary border border-border-default">
                {count}종
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('total_amount', {
      header: '수주금액',
      cell: info => <span className="font-medium text-text-primary">{info.getValue()?.toLocaleString() || 0}원</span>,
    }),
    columnHelper.accessor('delivery_date', {
      header: '납기일',
      cell: info => {
        const date = info.getValue();
        if (!date) return '-';
        const dday = calculateDDay(date);
        return (
          <div className="flex items-center gap-2">
            <span>{date}</span>
            <Badge variant={dday.variant} className="text-xs">{dday.text}</Badge>
          </div>
        );
      }
    }),
    columnHelper.accessor('status', {
      header: '상태',
      cell: info => {
        const status = info.getValue();
        const shippingStatus = info.row.original.shipping_status;
        
        let label = status;
        let variant: any = 'default';
        if (status === 'ORDERED' || status === 'PENDING') { label = '수주등록'; variant = 'primary'; }
        else if (status === 'PRODUCTION') { label = '생산중'; variant = 'warning'; }
        else if (status === 'INSPECTION') { label = '출하대기'; variant = 'success'; }
        else if (status === 'DONE' || status === 'COMPLETED') { label = '완료'; variant = 'default'; }
        
        return (
          <div className="flex items-center gap-1">
            <Badge variant={variant}>{label}</Badge>
            {shippingStatus === 'shipped' && <Badge variant="success">출하완료</Badge>}
            {shippingStatus === 'partially_shipped' && <Badge variant="warning">부분출하</Badge>}
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right w-full">관리</div>,
      cell: info => (
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={(e) => {
            e.stopPropagation();
            navigate(`/orders/${info.row.original.id}`);
          }}>
            상세
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ),
    })
  ];

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="flex flex-col h-full bg-bg-base animate-in fade-in">
      {/* Header */}
      <div className="p-6 pb-0">
        <PageHeader
          title="수주 관리"
          actions={
            <Button
              variant="primary"
              className="gap-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} /> 신규 수주 등록
            </Button>
          }
        />

        {/* Status Tabs */}
        <PageTabs
          tabs={[
            { id: '전체', label: '전체' },
            { id: '수주등록', label: '수주등록' },
            { id: '생산중', label: '생산중' },
            { id: '출하대기', label: '출하대기' },
            { id: '출하완료', label: '출하완료' },
            { id: '완료', label: '완료' },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId);
            setPage(1);
          }}
          rightContent={
            <div className="text-xs text-text-secondary">
              총 <span className="text-brand-400 font-bold">{totalCount}</span> 건의 수주
            </div>
          }
        />

        {/* Extended Filters & Search Bar */}
        <FilterBar>
          <div className="flex flex-wrap items-center justify-between gap-3 w-full bg-bg-surface p-3 rounded-lg border border-border-default">
            <div className="flex flex-wrap items-center gap-3">
            {/* Customer Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary whitespace-nowrap">거래처</span>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setPage(1);
                }}
                className="bg-bg-base border border-border-default text-text-primary rounded h-8 text-xs px-2 outline-none focus:border-brand-500 min-w-[130px]"
              >
                <option value="ALL">전체 거래처</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary whitespace-nowrap">수주일</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-bg-base border border-border-default text-text-primary rounded h-8 text-xs px-2 outline-none focus:border-brand-500"
              />
              <span className="text-text-secondary text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-bg-base border border-border-default text-text-primary rounded h-8 text-xs px-2 outline-none focus:border-brand-500"
              />
            </div>

            {/* Reset Button */}
            {(searchTerm || activeTab !== '전체' || startDate || endDate || clientId !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
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
              placeholder="PO 번호, 수주번호 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          </div>
        </FilterBar>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 pt-0 overflow-hidden flex flex-col">
        <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden flex flex-col h-full shadow-sm">
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
                          <span className={header.id === 'actions' ? 'w-full text-right' : ''}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getCanSort() && (
                            {
                              asc: <ArrowUpDown size={14} className="text-brand-500" />,
                              desc: <ArrowUpDown size={14} className="text-brand-500 rotate-180" />,
                            }[header.column.getIsSorted() as string] ?? (
                              <ArrowUpDown size={14} className="text-text-secondary/30 opacity-0 group-hover:opacity-100" />
                            )
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {errorMsg ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-danger font-medium">
                      오류 발생: {errorMsg}
                    </td>
                  </tr>
                ) : isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                        데이터를 불러오는 중...
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-text-secondary">
                      수주 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id} 
                      onClick={() => navigate(`/orders/${row.original.id}`)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-border-default bg-bg-surface">
              <div className="text-sm text-text-secondary">
                총 {totalCount}건의 수주
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  이전
                </Button>
                <div className="text-sm font-medium text-text-primary px-4 bg-bg-elevated py-1 rounded">
                  {page} / {totalPages}
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        clients={clients}
        companyId={companyId}
        onSuccess={(newOrderId) => {
          navigate(`/orders/${newOrderId}`);
        }}
      />
    </div>
  );
};
