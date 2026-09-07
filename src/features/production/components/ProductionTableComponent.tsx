import React, { useState, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';
import { Badge, Table, Thead, Tbody, Tr, Th, Td, Toggle, NumberInput } from '../../../design-system';
import { FileBadge } from '../../../features/estimates/components/FileBadge';
import { EXT_2D, EXT_3D } from '../../../shared/utils/fileMatching';
import { toast } from '../../../shared/stores/useToastStore';

export const calculateDDay = (targetDate?: string) => {
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

const columnHelper = createColumnHelper<any>();

export interface ProductionTableComponentProps {
  items: any[];
  selectedItemIds: Set<string>;
  onToggleItem: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  onOpenMasking: (file: any, itemId?: string) => void;
  onOpenDesignModal: (itemId: string) => void;
  onOpenProcessDetail: (item: any) => void;
  onQtyBlur: (item: any, value: string) => void;
  onUpdateSupplyConfig: (itemId: string, config: any) => void;
}

export const ProductionTableComponent: React.FC<ProductionTableComponentProps> = ({
  items,
  selectedItemIds,
  onToggleItem,
  onToggleSelectAll,
  onOpenMasking,
  onOpenDesignModal,
  onOpenProcessDetail,
  onQtyBlur,
  onUpdateSupplyConfig,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'selection',
      header: () => {
        const selectableItems = items.filter(i => {
          const status = i.production_status || 'PENDING';
          return status === 'PENDING' || status.endsWith('_READY');
        });
        const isAllSelected = selectableItems.length > 0 && selectableItems.every(i => selectedItemIds.has(i.id));
        return (
          <input 
            type="checkbox"
            checked={isAllSelected}
            onChange={() => onToggleSelectAll(selectableItems)}
            className="w-4 h-4 rounded border-border-default text-brand-500 focus:ring-brand-500 bg-bg-base cursor-pointer"
            disabled={selectableItems.length === 0}
          />
        );
      },
      cell: ({ row }) => {
        const id = row.original.id;
        const isChecked = selectedItemIds.has(id);
        const status = row.original.production_status || 'PENDING';
        const isSelectable = status === 'PENDING' || status.endsWith('_READY');
        return (
          <input 
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleItem(id)}
            disabled={!isSelectable}
            className={`w-4 h-4 rounded border-border-default focus:ring-brand-500 bg-bg-base ${isSelectable ? 'text-brand-500 cursor-pointer' : 'text-gray-400 opacity-50 cursor-not-allowed'}`}
          />
        );
      },
      size: 40,
    }),
    columnHelper.accessor('client_name', {
      header: '거래처 / 시스템 품번',
      cell: info => {
        const item = info.row.original;
        return (
          <div className="flex flex-col gap-1 w-full overflow-hidden">
            <span className="font-semibold text-text-primary text-xs whitespace-nowrap truncate" title={item.client_name}>
              {item.client_name}
            </span>
            <div className="mt-0.5">
              <span className="font-mono text-[11px] font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded">
                {item.order_item_no || item.po_no}
              </span>
            </div>
          </div>
        );
      },
      size: 160,
    }),
    columnHelper.accessor('part_name', {
      header: '도면번호 / 품명',
      cell: info => {
        const item = info.row.original;
        const status = item.production_status || 'PENDING';
        const isSelectable = status === 'PENDING' || status.endsWith('_READY');
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-text-primary text-xs">{item.part_no || '-'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSelectable) {
                    toast.error('이미 공정이 시작되어 설계를 수정할 수 없습니다.');
                    return;
                  }
                  onOpenDesignModal(item.id);
                }}
                className={`text-[9px] px-2 py-0.5 font-medium rounded-full border whitespace-nowrap transition-all ${
                  item.has_routing 
                    ? 'bg-brand-500/10 text-brand-500 border-brand-500/30 hover:bg-brand-500/20' 
                    : 'bg-orange-500/10 text-orange-500/90 border-orange-500/30 hover:bg-orange-500/20'
                }`}
                title={item.has_routing ? "공정 설계 수정" : "공정 설계 추가"}
              >
                {item.has_routing ? "공정 O" : "공정 X"}
              </button>
            </div>
            <div className="text-xs text-text-secondary mt-0.5 font-medium truncate w-full" title={item.part_name}>
              {item.part_name}
            </div>
          </div>
        );
      },
      size: 180,
    }),
    columnHelper.accessor('qty', {
      header: '수주 수량',
      cell: info => <span className="font-medium text-text-secondary text-xs">{info.getValue()}</span>,
      size: 70,
    }),
    columnHelper.accessor('production_qty', {
      header: '생산 수량',
      cell: info => {
        const item = info.row.original;
        const isPending = item.production_status === 'PENDING' || !item.production_status;
        
        if (!isPending) {
          return <span className="font-bold text-brand-400 text-xs font-mono">{item.production_qty ?? item.qty}</span>;
        }

        const [localVal, setLocalVal] = React.useState<number>(item.production_qty ?? item.qty);
        React.useEffect(() => {
          setLocalVal(item.production_qty ?? item.qty);
        }, [item.production_qty, item.qty]);

        return (
          <NumberInput 
            allowDecimal={false}
            className="w-16 px-1 py-1 text-center text-xs font-mono font-medium bg-bg-elevated"
            value={localVal}
            onChange={(val) => setLocalVal(val)}
            onBlur={() => onQtyBlur(item, localVal.toString())}
          />
        );
      },
      size: 80,
    }),
    columnHelper.accessor('delivery_date', {
      header: '납기일',
      cell: info => {
        const dday = calculateDDay(info.getValue());
        return (
          <div className="flex flex-col gap-1 items-start whitespace-nowrap">
            <span className="text-text-primary text-xs font-mono">{info.getValue()?.split('T')[0] || '-'}</span>
            <Badge variant={dday.variant} className="text-[9px] px-1.5 py-0.5 font-bold">{dday.text}</Badge>
          </div>
        );
      },
      size: 100,
    }),
    columnHelper.accessor('supply_type', {
      header: '구분',
      cell: info => {
        const item = info.row.original;
        const isPending = item.production_status === 'PENDING' || !item.production_status;
        
        if (!isPending) {
          let label = '사내 가공';
          if (item.supply_type === 'OUTSOURCE') label = '외주 제작';
          if (item.supply_type === 'PURCHASE') label = '기성품 구매';
          return <span className="text-text-primary text-xs whitespace-nowrap">{label}</span>;
        }

        return (
          <select
            value={item.supply_type || 'INHOUSE'}
            onChange={(e) => onUpdateSupplyConfig(item.id, { supply_type: e.target.value })}
            className="w-full text-xs py-1 px-2 bg-bg-surface border border-border-default rounded-md text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer shadow-sm"
          >
            <option value="INHOUSE">사내 가공</option>
            <option value="OUTSOURCE">외주 제작</option>
            <option value="PURCHASE">기성품 구매</option>
          </select>
        );
      },
      size: 110,
    }),
    columnHelper.accessor('use_stock', {
      header: '재고',
      cell: info => {
        const item = info.row.original;
        const isPending = item.production_status === 'PENDING' || !item.production_status;
        
        if (!isPending) {
          return (
            <div className="whitespace-nowrap">
              <Badge variant={item.use_stock ? 'success' : 'default'} className="px-1.5 py-0.5 text-[10px]">
                {item.use_stock ? '사용' : '미사용'}
              </Badge>
            </div>
          );
        }

        return (
          <Toggle 
            checked={item.use_stock || false}
            onChange={(val) => onUpdateSupplyConfig(item.id, { use_stock: val })} 
          />
        );
      },
      size: 65,
    }),
    columnHelper.accessor('material_supply_type', {
      header: '소재 조달',
      cell: info => {
        const item = info.row.original as any;
        const isPending = item.production_status === 'PENDING' || !item.production_status;
        
        if (!isPending) {
          let label = '해당없음';
          const effectiveType = item.material_supply_type || ((!item.use_stock && (item.supply_type === 'INHOUSE' || item.supply_type === 'OUTSOURCE')) ? 'ORDER' : 'NONE');
          
          if (effectiveType === 'ORDER') label = '발주';
          if (effectiveType === 'STOCK') label = '소재 재고';
          if (effectiveType === 'PROVIDED') label = '도급';
          
          let statusBadge = null;
          if (effectiveType === 'ORDER' && item.material_orders?.length > 0) {
            const isReceived = item.material_orders.some((m: any) => m.status === '입고완료');
            const isOrdered = item.material_orders.some((m: any) => m.status === '발주완료');
            
            if (isReceived) {
              statusBadge = <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">입고완료</span>;
            } else if (isOrdered) {
              statusBadge = <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20">발주완료</span>;
            } else {
              statusBadge = <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">발주대기</span>;
            }
          }

          return (
            <div className="flex flex-col gap-1 items-start whitespace-nowrap">
              <span className="text-text-primary text-xs">{label}</span>
              {statusBadge}
            </div>
          );
        }

        let disabled = false;
        let options = [
          { value: 'ORDER', label: '발주' },
          { value: 'STOCK', label: '재고사용' },
          { value: 'PROVIDED', label: '도급' },
          { value: 'NONE', label: '해당없음' }
        ];

        if (item.use_stock || item.supply_type === 'PURCHASE') {
          disabled = true;
          options = [{ value: 'NONE', label: '해당없음' }];
        } else if (item.supply_type === 'INHOUSE') {
          options = options.filter(o => o.value !== 'PROVIDED' && o.value !== 'NONE');
        } else if (item.supply_type === 'OUTSOURCE') {
          options = options.filter(o => o.value !== 'NONE');
          options = options.map(o => {
            if (o.value === 'ORDER') return { value: 'ORDER', label: '사급(발주)' };
            if (o.value === 'STOCK') return { value: 'STOCK', label: '사급(재고)' };
            return o;
          });
        }

        return (
          <select
            value={item.material_supply_type || 'NONE'}
            onChange={(e) => onUpdateSupplyConfig(item.id, { material_supply_type: e.target.value })}
            disabled={disabled}
            className="w-full text-xs py-1 px-2 bg-bg-surface border border-border-default rounded-md text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      },
      size: 110,
    }),
    columnHelper.accessor('production_status', {
      header: '진행 상태',
      cell: info => {
        const item = info.row.original as any;
        const status = (info.getValue() || 'PENDING').toUpperCase();
        let label = status;
        let variant: any = 'default';
        if (status === 'PENDING') { label = '대기'; variant = 'primary'; }
        else if (status === 'PRODUCTION_READY') { label = '생산 대기'; variant = 'warning'; }
        else if (status === 'OUTSOURCE_READY') { label = '외주 대기'; variant = 'warning'; }
        else if (status === 'PURCHASE_READY') { label = '구매 대기'; variant = 'warning'; }
        else if (status === 'IN_PROGRESS') { label = '진행 중'; variant = 'warning'; }
        else if (status === 'QC') { label = 'QC 검사'; variant = 'primary'; }
        else if (status === 'SHIPPING_READY') { label = '출하 대기'; variant = 'success'; }
        else if (status === 'DONE') { label = '완료'; variant = 'success'; }
        
        let subBadge = null;
        if (status === 'OUTSOURCE_READY' || status === 'PURCHASE_READY') {
          if (item.outsource_orders?.length > 0) {
            const isReceived = item.outsource_orders.some((o: any) => o.status === '입고완료');
            const isOrdered = item.outsource_orders.some((o: any) => o.status === '발주완료');
            
            if (isReceived) {
              subBadge = <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">입고완료</span>;
            } else if (isOrdered) {
              subBadge = <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20">발주완료</span>;
            } else {
              subBadge = <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">발주대기</span>;
            }
          }
        }

        const curProc = item.current_process;
        let processChip = null;
        if (curProc) {
          const isActive = curProc.is_active;
          const isOutsource = curProc.is_outsource;
          processChip = (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenProcessDetail(item);
              }}
              className={`mt-1 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border transition-all text-left cursor-pointer whitespace-nowrap group ${
                isOutsource
                  ? 'border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:border-orange-500'
                  : isActive 
                  ? 'border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 hover:border-brand-500' 
                  : 'border-border-default bg-bg-surface hover:border-brand-500 text-text-secondary hover:text-brand-300'
              }`}
              title="클릭하여 공정 진행 상세 보기"
            >
              {isActive && (
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOutsource ? 'bg-orange-400' : 'bg-brand-500'}`} />
              )}
              <span className="font-semibold truncate max-w-[120px]">{curProc.name}</span>
              <span className="text-[10px] text-text-tertiary font-normal">({curProc.status})</span>
            </button>
          );
        } else if (item.has_routing) {
          processChip = (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenProcessDetail(item);
              }}
              className="mt-1 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-border-default bg-bg-surface hover:border-brand-500 text-text-tertiary hover:text-brand-300 transition-all text-left cursor-pointer whitespace-nowrap"
              title="클릭하여 공정 진행 상세 보기"
            >
              <span>공정 상세 보기</span>
            </button>
          );
        }

        return (
          <div className="flex flex-col gap-1 items-start whitespace-nowrap">
            <Badge variant={variant}>{label}</Badge>
            {!curProc && subBadge}
            {processChip}
          </div>
        );
      },
      size: 150,
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
                onViewFile={(file) => onOpenMasking(file, item.id)} 
              />
            )}
            {count3D > 0 && (
              <FileBadge 
                type="3D" 
                count={count3D} 
                files={files3D} 
                onViewFile={(file) => onOpenMasking(file, item.id)} 
              />
            )}
          </div>
        );
      },
      size: 110,
    }),
  ], [items, selectedItemIds, onToggleItem, onToggleSelectAll, onOpenMasking, onOpenDesignModal, onOpenProcessDetail, onQtyBlur, onUpdateSupplyConfig]);

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table>
      <Thead>
        <Tr className="bg-bg-elevated/80 border-b border-border-default">
          {table.getHeaderGroups().map(headerGroup => (
            headerGroup.headers.map(header => (
              <Th 
                key={header.id} 
                className="py-3.5 text-xs font-semibold whitespace-nowrap"
                style={{ width: header.column.getSize() }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </Th>
            ))
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {table.getRowModel().rows.map(row => {
          const isSelected = selectedItemIds.has(row.original.id);
          return (
            <Tr 
              key={row.id} 
              className={`hover:bg-bg-elevated/60 transition-colors ${isSelected ? 'bg-brand-500/10' : ''}`}
            >
              {row.getVisibleCells().map(cell => (
                <Td 
                  key={cell.id} 
                  className="py-3 text-xs whitespace-nowrap"
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </Tr>
          );
        })}
        {table.getRowModel().rows.length === 0 && (
          <Tr>
            <Td colSpan={columns.length} className="py-16 text-center text-text-secondary">
              품목 내역이 없습니다.
            </Td>
          </Tr>
        )}
      </Tbody>
    </Table>
  );
};
