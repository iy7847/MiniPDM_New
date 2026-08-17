import React, { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
} from '@tanstack/react-table';
import type {
  GroupingState,
  ExpandedState,
  SortingState
} from '@tanstack/react-table';
import { Badge } from '../../../design-system';
import { FileBadge } from '../../../features/estimates/components/FileBadge';
import { EXT_2D, EXT_3D } from '../../../shared/utils/fileMatching';
import { FileText, Box } from 'lucide-react';

const columnHelper = createColumnHelper<any>();

const calculateDDay = (targetDate: string) => {
  if (!targetDate) return { text: '-', variant: 'default' as const };
  const target = new Date(targetDate).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  const diff = target - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return { text: `D+${Math.abs(days)}`, variant: 'danger' as const };
  if (days === 0) return { text: 'D-Day', variant: 'danger' as const };
  if (days <= 3) return { text: `D-${days}`, variant: 'warning' as const };
  return { text: `D-${days}`, variant: 'default' as const };
};

const getStatusBadge = (status: string) => {
  let label = status;
  let variant: any = 'default';
  if (status === 'PRODUCTION_READY') { label = '생산 대기'; variant = 'warning'; }
  else if (status === 'OUTSOURCE_READY') { label = '외주 대기'; variant = 'warning'; }
  else if (status === 'PURCHASE_READY') { label = '구매 대기'; variant = 'warning'; }
  else if (status === 'IN_PROGRESS') { label = '진행 중'; variant = 'warning'; }
  else if (status === 'QC') { label = 'QC 검사'; variant = 'primary'; }
  else if (status === 'DONE') { label = '완료'; variant = 'success'; }
  return { label, variant };
};

const getSupplyTypeLabel = (type: string) => {
  if (type === 'INHOUSE') return '사내 가공';
  if (type === 'OUTSOURCE') return '외주 제작';
  if (type === 'PURCHASE') return '기성품 구매';
  return type || '사내 가공';
};

const getMaterialSupplyLabel = (type: string) => {
  if (type === 'ORDER') return '발주';
  if (type === 'STOCK') return '소재 재고';
  if (type === 'PROVIDED') return '도급';
  if (type === 'NONE') return '해당없음';
  return type || '해당없음';
};

interface TrackingBoardProps {
  items: any[];
  viewMode: 'list' | 'kanban';
  grouping: GroupingState;
  expanded: ExpandedState;
  setExpanded: React.Dispatch<React.SetStateAction<ExpandedState>>;
  handleOpenMasking: (file: any, itemId?: string) => void;
}

export const TrackingBoard: React.FC<TrackingBoardProps> = ({
  items,
  viewMode,
  grouping,
  expanded,
  setExpanded,
  handleOpenMasking
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = useMemo(() => [
    columnHelper.accessor('po_no', {
      id: 'po_no',
      header: 'PO 번호',
    }),
    columnHelper.accessor('client_name', {
      header: '거래처 / PO번호',
      cell: info => {
        const item = info.row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-text-primary">{item.client_name}</span>
            <span className="text-[11px] text-text-tertiary font-mono">{item.po_no}</span>
          </div>
        );
      },
      size: 160,
    }),
    columnHelper.accessor('part_name', {
      header: '품명 및 규격',
      cell: info => {
        const item = info.row.original;
        return (
          <div>
            <div className="font-medium text-text-primary">{item.part_name}</div>
            <div className="text-xs text-text-secondary flex gap-2 mt-0.5">
              <span>{item.spec}</span>
              {item.material_name && <span className="text-brand-300">{item.material_name}</span>}
            </div>
          </div>
        );
      },
      size: 250,
    }),
    columnHelper.accessor('qty', {
      header: '수주 수량',
      cell: info => <span className="font-medium text-text-secondary">{info.getValue()}</span>,
      size: 70,
    }),
    columnHelper.accessor('production_qty', {
      header: '생산 수량',
      cell: info => {
        const item = info.row.original;
        return <span className="font-medium text-brand-500">{item.production_qty ?? item.qty}</span>;
      },
      size: 80,
    }),
    columnHelper.accessor('delivery_date', {
      header: '납기일',
      cell: info => {
        const dday = calculateDDay(info.getValue());
        return (
          <div className="flex items-center gap-2">
            <span>{info.getValue()?.split('T')[0] || '-'}</span>
            <Badge variant={dday.variant} className="text-[10px] px-1.5 py-0">{dday.text}</Badge>
          </div>
        );
      },
      size: 140,
    }),
    columnHelper.accessor('supply_type', {
      header: '구분',
      cell: info => {
        const item = info.row.original;
        return <span className="text-text-primary text-xs">{getSupplyTypeLabel(item.supply_type)}</span>;
      },
      size: 90,
    }),
    columnHelper.accessor('use_stock', {
      header: '완제품 재고',
      cell: info => {
        const item = info.row.original;
        return (
          <Badge variant={item.use_stock ? 'success' : 'default'}>
            {item.use_stock ? '사용' : '미사용'}
          </Badge>
        );
      },
      size: 80,
    }),
    columnHelper.accessor('material_supply_type', {
      header: '소재 조달',
      cell: info => {
        const item = info.row.original;
        return <span className="text-text-primary text-xs">{getMaterialSupplyLabel(item.material_supply_type)}</span>;
      },
      size: 90,
    }),
    columnHelper.accessor('production_status', {
      header: '진행 상태',
      cell: info => {
        const statusInfo = getStatusBadge(info.getValue() || 'IN_PROGRESS');
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
      },
      size: 100,
    }),
    columnHelper.display({
      id: 'attachments',
      header: '첨부파일',
      cell: ({ row }) => {
        const item = row.original as any;
        const sourceFiles = (item.files && item.files.length > 0) ? item.files : (item.estimate_items?.files || []);
        const tempFiles = item.tempFiles || [];
        const rawFiles = [...sourceFiles, ...tempFiles];
        const files = rawFiles.filter((f: any) => f != null);
        if (files.length === 0) return null;
        
        let count3D = 0;
        let count2D = 0;
        
        files.forEach((f: any) => {
          const fileName = f.name || f.file_name || '';
          const extName = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
          if (EXT_3D.includes(extName)) {
            count3D++;
          } else {
            count2D++;
          }
        });

        const files2D = files.filter((f: any) => !EXT_3D.includes('.' + ((f.name || f.file_name || '').split('.').pop()?.toLowerCase() || '')));
        const files3D = files.filter((f: any) => EXT_3D.includes('.' + ((f.name || f.file_name || '').split('.').pop()?.toLowerCase() || '')));

        return (
          <div className="flex items-center gap-1.5 overflow-visible relative group min-h-[24px]">
            {count2D > 0 && (
              <FileBadge 
                type="2D" 
                count={count2D} 
                files={files2D}
                onFileClick={(file) => handleOpenMasking(file, item.id)}
              />
            )}
            {count3D > 0 && (
              <FileBadge 
                type="3D" 
                count={count3D} 
                files={files3D}
                onFileClick={(file) => handleOpenMasking(file, item.id)}
              />
            )}
          </div>
        );
      },
      size: 100,
    })
  ], [items]);

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, grouping, expanded, columnVisibility: { po_no: false } },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    autoResetExpanded: false,
    autoResetPageIndex: false,
    autoResetGrouping: false,
    autoResetSorting: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const renderKanban = () => {
    const kanbanColumns = [
      { id: 'PRODUCTION_READY', label: '생산 대기', color: 'border-yellow-500/50' },
      { id: 'OUTSOURCE_READY', label: '외주 대기', color: 'border-yellow-500/50' },
      { id: 'PURCHASE_READY', label: '구매 대기', color: 'border-yellow-500/50' },
      { id: 'IN_PROGRESS', label: '진행 중', color: 'border-blue-500/50' },
      { id: 'QC', label: 'QC 검사', color: 'border-brand-500/50' },
      { id: 'DONE', label: '완료', color: 'border-green-500/50' },
    ];

    // Filter columns to only show ones that have items (optional) or just show all
    return (
      <div className="flex gap-4 h-full overflow-x-auto custom-scrollbar p-6 pt-0 animate-in fade-in">
        {kanbanColumns.map(col => {
          const colItems = items.filter(i => i.production_status === col.id);
          // Hide columns that belong to OUTSOURCE or PURCHASE if empty to keep it cleaner, but let's just show them for consistency.
          
          return (
            <div key={col.id} className={`flex flex-col min-w-[280px] w-[280px] bg-bg-surface rounded-lg border-t-4 ${col.color} border-l border-r border-b border-border-default`}>
              <div className="p-3 border-b border-border-default flex justify-between items-center bg-bg-elevated/50">
                <span className="font-bold text-sm text-text-primary">{col.label}</span>
                <span className="bg-bg-base px-2 py-0.5 rounded text-xs font-mono text-text-secondary">{colItems.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {colItems.map(item => {
                  const dday = calculateDDay(item.delivery_date);
                  const statusInfo = getStatusBadge(item.production_status || 'IN_PROGRESS');
                  
                  return (
                    <div 
                      key={item.id} 
                      className="bg-bg-base border border-border-default p-3 rounded shadow-sm hover:border-brand-500 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={dday.variant} className="text-[10px] px-1.5 py-0">{dday.text}</Badge>
                        <span className="text-[10px] text-text-secondary">{item.client_name}</span>
                      </div>
                      <div className="font-medium text-sm text-text-primary leading-tight mb-1">{item.part_name}</div>
                      <div className="text-xs text-text-secondary font-mono mb-2">{item.spec}</div>
                      
                      <div className="flex items-center gap-1.5 mb-3">
                        <button 
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium border border-border-default rounded hover:bg-bg-elevated text-text-primary"
                          onClick={() => handleOpenMasking({name: 'placeholder.pdf'}, item.id)} // For UI demonstration
                        >
                          <FileText size={12} className="text-text-secondary" /> 2D
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-border-default">
                        <div className="flex gap-2 items-center">
                          <span className="text-text-secondary">수주: {item.qty}</span>
                          <span className="text-brand-500 font-medium">생산: {item.production_qty ?? item.qty}</span>
                        </div>
                        <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
                      </div>
                    </div>
                  );
                })}
                {colItems.length === 0 && (
                  <div className="text-center py-6 text-sm text-text-secondary">항목이 없습니다</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (viewMode === 'kanban') {
    return renderKanban();
  }

  return (
    <div className="p-6 pt-0 h-full flex flex-col animate-in fade-in">
      <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden flex flex-col h-full shadow-sm">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-elevated sticky top-0 z-10 shadow-sm">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className="px-4 py-3 text-sm font-medium text-text-secondary border-b border-border-default select-none whitespace-nowrap"
                      style={{ width: header.column.getSize() }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => {
                if (row.getIsGrouped()) {
                  return (
                    <tr 
                      key={row.id} 
                      className="bg-bg-elevated hover:bg-bg-surface transition-colors cursor-pointer group"
                      onClick={row.getToggleExpandedHandler()}
                    >
                      <td colSpan={columns.length} className="px-4 py-3 font-bold text-text-primary text-sm border-b border-border-default">
                        <div className="flex items-center gap-2">
                          <span className="text-text-tertiary transition-transform duration-200" style={{ transform: row.getIsExpanded() ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                            ▶
                          </span>
                          수주번호: <span className="text-brand-400">{row.getValue('po_no')}</span>
                          <span className="text-text-secondary font-normal ml-2 text-xs">
                            ({row.subRows.length}개 부품)
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }
                
                return (
                  <tr 
                    key={row.id} 
                    className="border-b border-border-default hover:bg-bg-elevated/50 transition-colors"
                  >
                    {row.getVisibleCells().map(cell => {
                      if (cell.getIsGrouped()) return null;
                      if (cell.getIsPlaceholder()) return <td key={cell.id} style={{ width: cell.column.getSize() }}></td>;
                      
                      return (
                        <td 
                          key={cell.id} 
                          className="px-4 py-2 text-sm text-text-secondary"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-text-secondary">
                    진행 중인 품목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
