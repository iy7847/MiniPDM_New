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
import { Badge, BaseSelect, Toggle } from '../../../design-system';
import { FileBadge } from '../../../features/estimates/components/FileBadge';
import { EXT_2D, EXT_3D } from '../../../shared/utils/fileMatching';

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

interface PendingTableProps {
  items: any[];
  selectedItemIds: Set<string>;
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleItem: (id: string) => void;
  updateItemSupplyConfig: (id: string, updates: any) => void;
  grouping: GroupingState;
  expanded: ExpandedState;
  setExpanded: React.Dispatch<React.SetStateAction<ExpandedState>>;
  handleOpenMasking: (file: any, itemId?: string) => void;
}

export const PendingTable: React.FC<PendingTableProps> = ({
  items,
  selectedItemIds,
  setSelectedItemIds,
  toggleItem,
  updateItemSupplyConfig,
  grouping,
  expanded,
  setExpanded,
  handleOpenMasking
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Debounced update for quantity to avoid excessive API calls
  // In a real scenario, this would use a local state and onBlur, but for simplicity we keep it inline
  const handleQtyBlur = (item: any, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num !== item.production_qty) {
      updateItemSupplyConfig(item.id, { production_qty: num });
    }
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'selection',
      header: () => (
        <input 
          type="checkbox"
          checked={items.length > 0 && selectedItemIds.size === items.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedItemIds(new Set(items.map(item => item.id)));
            } else {
              setSelectedItemIds(new Set());
            }
          }}
          className="rounded border-border-default text-brand-500 focus:ring-brand-500"
        />
      ),
      cell: ({ row }) => {
        const id = row.original.id;
        const isChecked = selectedItemIds.has(id);
        return (
          <input 
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleItem(id)}
            className="rounded border-border-default text-brand-500 focus:ring-brand-500"
          />
        );
      },
      size: 40,
    }),
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
        const [localVal, setLocalVal] = React.useState<string>((item.production_qty ?? item.qty).toString());
        
        React.useEffect(() => {
          setLocalVal((item.production_qty ?? item.qty).toString());
        }, [item.production_qty, item.qty]);

        return (
          <input 
            type="number"
            min={0}
            className="w-14 px-1 py-1 text-center text-xs font-medium text-text-primary bg-bg-elevated border border-border-default rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={(e) => handleQtyBlur(item, e.target.value)}
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
        return (
          <BaseSelect
            value={item.supply_type || 'INHOUSE'}
            onChange={(e) => updateItemSupplyConfig(item.id, { supply_type: e.target.value })}
            options={[
              { value: 'INHOUSE', label: '사내 가공' },
              { value: 'OUTSOURCE', label: '외주 제작' },
              { value: 'PURCHASE', label: '기성품 구매' }
            ]}
            className="w-full"
            selectClassName="text-xs py-1.5 px-3"
          />
        );
      },
      size: 130,
    }),
    columnHelper.accessor('use_stock', {
      header: '완제품 재고',
      cell: info => {
        const item = info.row.original;
        const isDisabled = item.supply_type === 'OUTSOURCE' || item.supply_type === 'PURCHASE';
        return (
          <Toggle 
            checked={item.use_stock || false}
            disabled={isDisabled}
            onChange={(val) => updateItemSupplyConfig(item.id, { use_stock: val })} 
          />
        );
      },
      size: 80,
    }),
    columnHelper.accessor('material_supply_type', {
      header: '소재 조달',
      cell: info => {
        const item = info.row.original;
        
        let disabled = false;
        let options = [
          { value: 'ORDER', label: '발주' },
          { value: 'STOCK', label: '소재 재고사용' },
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
          <BaseSelect
            value={item.material_supply_type || 'NONE'}
            onChange={(e) => updateItemSupplyConfig(item.id, { material_supply_type: e.target.value })}
            options={options}
            disabled={disabled}
            className="w-full"
            selectClassName="text-xs py-1.5 px-3"
          />
        );
      },
      size: 130,
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
  ], [items, selectedItemIds, updateItemSupplyConfig]);

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
                    className={`border-b border-border-default hover:bg-bg-elevated/50 transition-colors ${selectedItemIds.has(row.original.id) ? 'bg-brand-500/5' : ''}`}
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
                    대기 중인 품목이 없습니다.
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
