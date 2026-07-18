import React, { useMemo, useState, Fragment } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel
} from '@tanstack/react-table';
import type { Row } from '@tanstack/react-table';
import { Edit2, FileText, Box, ChevronDown, ChevronRight, FileUp, Trash2 } from 'lucide-react';
import type { EstimateItem } from '../types';
import { INITIAL_ITEM_FORM } from '../types';
import { EstimateItemExpanded } from './EstimateItemExpanded';
import { BaseInput } from '../../../design-system/BaseInput';
import { Badge } from '../../../design-system/Badge';
import { EXT_2D, EXT_3D } from '../utils/fileMatching';

interface EstimateTableProps {
  items: EstimateItem[];
  onChange: (items: EstimateItem[]) => void;
  onRowClick?: (item: EstimateItem) => void;
  onAddManualItem?: () => void;
  onOpenModal?: (item: EstimateItem) => void;
  isReadOnly?: boolean;
  companyInfo?: any;
  metadata?: any;
  estimateId?: string;
  currency?: string;
  exchangeRate?: number;
  onSaveSuccess?: () => void;
  onSaveFiles?: any;
  onSaveFiles?: any;
  onDeleteExistingFile?: any;
  showForeign?: boolean;
}

const columnHelper = createColumnHelper<EstimateItem>();

export const EstimateTable: React.FC<EstimateTableProps> = ({
  items,
  onChange,
  onRowClick,
  onAddManualItem,
  onOpenModal,
  isReadOnly = false,
  companyInfo,
  metadata,
  estimateId,
  currency = 'KRW',
  exchangeRate = 1,
  onSaveSuccess,
  onSaveFiles,
  onDeleteExistingFile,
  showForeign = false
}) => {
  const [expanded, setExpanded] = useState({});
  const [prevLength, setPrevLength] = useState(items.length);

  React.useEffect(() => {
    if (items.length > prevLength) {
      setExpanded({ [items.length - 1]: true });
    }
    setPrevLength(items.length);
  }, [items.length, prevLength]);

  const formatPrice = (value: number) => {
    if (showForeign && exchangeRate > 0) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value / exchangeRate);
    }
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'selected',
      header: () => (
        <div className="flex justify-center w-full">
          <input
            type="checkbox"
            checked={items.length > 0 && items.every((i: any) => i.selected)}
            onChange={(e) => {
              onChange(items.map((i: any) => ({ ...i, selected: e.target.checked })));
            }}
            className="cursor-pointer"
            disabled={isReadOnly}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center w-full">
          <input
            type="checkbox"
            checked={(row.original as any).selected || false}
            onChange={(e) => {
              const newItems = [...items];
              (newItems[row.index] as any).selected = e.target.checked;
              onChange(newItems);
            }}
            className="cursor-pointer"
            disabled={isReadOnly}
          />
        </div>
      ),
      size: 40,
    }),
    columnHelper.accessor('part_no', {
      header: '품번',
      cell: info => <div className="truncate" title={info.getValue() || ''}>{info.getValue() || '-'}</div>,
      size: 100,
    }),
    columnHelper.accessor('part_name', {
      header: '품명',
      cell: info => <div className="truncate" title={info.getValue() || ''}>{info.getValue() || '-'}</div>,
      size: 120,
    }),
    columnHelper.accessor('original_material_name', {
      header: '소재(재질)',
      cell: info => <div className="truncate" title={info.getValue() || ''}>{info.getValue() || '-'}</div>,
      size: 100,
    }),
    columnHelper.accessor('spec_w', {
      header: '규격(W×D×T)',
      cell: ({ row }) => {
        const { spec_w = 0, spec_d = 0, spec_h = 0 } = row.original;
        return <div className="truncate" title={`${spec_w} × ${spec_d} × ${spec_h}`}>{`${spec_w} × ${spec_d} × ${spec_h}`}</div>;
      },
      size: 100,
    }),
    columnHelper.accessor('qty', {
      header: '수량',
      cell: info => info.getValue() || 0,
      size: 60,
    }),
    columnHelper.accessor('material_cost', {
      header: '소재비',
      cell: info => formatPrice(info.getValue() || 0),
      size: 90,
    }),
    columnHelper.accessor('processing_cost', {
      header: '가공비',
      cell: info => formatPrice(info.getValue() || 0),
      size: 90,
    }),
    columnHelper.display({
      id: 'extra_cost',
      header: '열/후처리비',
      cell: ({ row }) => {
        const { heat_treatment_cost = 0, post_process_cost = 0 } = row.original;
        const totalExtra = heat_treatment_cost + post_process_cost;
        return formatPrice(totalExtra);
      },
      size: 100,
    }),
    columnHelper.accessor('unit_price', {
      header: '단가',
      cell: info => formatPrice(info.getValue() || 0),
      size: 100,
    }),
    columnHelper.accessor('supply_price', {
      header: '합계',
      cell: info => <div className="font-semibold text-brand-400">{formatPrice(info.getValue() || 0)}</div>,
      size: 110,
    }),
    columnHelper.display({
      id: 'files',
      header: '첨부파일',
      cell: ({ row }) => {
        const item = row.original as any;
        const rawFiles = [...(item.files || []), ...(item.tempFiles || [])];
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

        return (
          <div className="flex items-center gap-1.5 overflow-hidden">
            {count2D > 0 && (
              <Badge variant="info" className="py-1 px-2 font-bold text-[10px] flex items-center">
                <FileText size={12} className="mr-1" /> 2D <span className="ml-1 opacity-70">({count2D})</span>
              </Badge>
            )}
            {count3D > 0 && (
              <Badge variant="warning" className="py-1 px-2 font-bold text-[10px] flex items-center">
                <Box size={12} className="mr-1" /> 3D <span className="ml-1 opacity-70">({count3D})</span>
              </Badge>
            )}
          </div>
        );
      },
      size: 100,
    }),
    columnHelper.display({
      id: 'actions',
      header: '분석',
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onPointerDown={(e) => {
                // onClick 대신 onPointerDown 사용 — 행 re-render 타이밍에 클릭 이벤트가 
                // 사라지는 문제를 방지합니다. (연필 버튼 한 번에 작동 보장)
                e.stopPropagation();
                if (onOpenModal) onOpenModal(row.original);
              }}
              className="p-1 text-text-secondary hover:text-brand-500 hover:bg-brand-500/10 rounded transition-colors"
              title="상세 모달 열기"
            >
              <Edit2 size={15} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
              className={`p-1 rounded transition-colors ${row.getIsExpanded() ? 'text-brand-500 bg-brand-500/10' : 'text-text-secondary hover:text-brand-500 hover:bg-bg-elevated'}`}
              title="빠른 수정 열기"
            >
              <ChevronDown size={15} className={`transform transition-transform ${row.getIsExpanded() ? 'rotate-180' : ''}`} />
            </button>
          </div>
        );
      },
      size: 60,
    }),
  ], [items, isReadOnly, onChange, showForeign, exchangeRate]);

  const table = useReactTable({
    data: items,
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-[400px]">
      {items.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-border-default rounded-lg bg-bg-surface flex flex-col items-center justify-center p-12 transition-all hover:border-brand-500/50 hover:bg-bg-elevated group">
          <FileUp size={48} className="text-text-disabled group-hover:text-brand-500 mb-4 transition-colors" />
          <h3 className="text-xl font-bold text-text-primary mb-2">도면 파일을 이 화면에 끌어다 놓으세요</h3>
          <p className="text-text-secondary mb-8">PDF, 3D 모델(STEP 등) 도면 파일이 자동 분석됩니다.</p>
          <button 
            onClick={onAddManualItem}
            className="flex items-center gap-2 px-6 py-3 rounded-md border border-brand-500/30 text-brand-500 hover:bg-brand-500/10 transition-colors font-medium text-lg"
          >
            <span>✍️</span> 수동으로 첫 품목 직접 추가하기
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border border-border-default rounded-lg bg-bg-surface relative">
          <table className="w-full text-left text-sm text-text-primary border-collapse">
            <thead className="bg-bg-elevated sticky top-0 z-10 border-b border-border-default">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className="px-2 py-3 border-r border-border-default/30 font-semibold text-text-secondary truncate last:border-r-0"
                      style={{ 
                        width: ['part_name', 'note', 'files'].includes(header.column.id) ? 'auto' : header.getSize(),
                        minWidth: header.getSize() 
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  <tr 
                    className={`border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors cursor-pointer ${row.getIsExpanded() ? 'bg-bg-elevated border-b-0' : ''}`}
                    onClick={() => {
                      if (!isReadOnly) row.toggleExpanded();
                    }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td 
                        key={cell.id} 
                        className="px-2 py-2 truncate border-r border-border-default/30 last:border-r-0"
                        style={{ width: ['part_name', 'note', 'files'].includes(cell.column.id) ? 'auto' : cell.column.getSize() }}
                        onClick={(e) => {
                          if (cell.column.id === 'selected' || cell.column.id === 'actions') e.stopPropagation();
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr className="bg-bg-elevated/30 border-b border-border-default">
                      <td colSpan={columns.length} className="p-0">
                        <div className="border-t border-border-default/50 shadow-inner">
                          {metadata ? (
                            <EstimateItemExpanded
                              onClose={() => row.toggleExpanded(false)}
                              editingItem={row.original}
                              onSave={(savedItem) => {
                                const newItems = [...items];
                                newItems[row.index] = savedItem;
                                onChange(newItems);
                              }}
                              metadata={metadata}
                              companyInfo={companyInfo}
                              onOpenModal={() => onOpenModal && onOpenModal(row.original)}
                              onSaveFiles={onSaveFiles || (async () => {})}
                              onDeleteExistingFile={onDeleteExistingFile || (async () => {})}
                              existingItems={items}
                            />
                          ) : (
                            <div className="p-4 text-center text-text-secondary">메타데이터를 불러오는 중입니다...</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
