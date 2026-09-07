import React, { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AlertTriangle, PackageOpen, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { OrderItem } from '../../types';
import { FileBadge } from '../../../estimates/components/FileBadge';
import { EXT_2D, EXT_3D } from '../../../../shared/utils/fileMatching';
import { FileDropZone } from '../../../../shared/components/FileDropZone';
import { DocumentMaskingModal } from '../../../../shared/components/DocumentMaskingModal';
import { ImagePreviewModal } from '../../../../shared/components/ImagePreviewModal';
import { getCurrencySymbol } from '../../../../shared/utils/currency';
import { toast } from '../../../../shared/stores/useToastStore';
import { Button } from '../../../../design-system';

interface OrderItemsTableProps {
  items: OrderItem[];
  parentPoNo?: string;
  parentOrderDate?: string;
  onSupplyChange?: (itemId: string, supplyType: string, useStock: boolean) => void;
  onDueDateChange?: (itemId: string, date: string) => void;
  onOpenHistorySearch?: () => void;
  onAddEmptyItem?: () => void;
  onDeleteItem?: (id: string) => void;
  onAddMaskedFile?: (itemId: string, files: File[]) => void;
  showForeign?: boolean;
  currency?: string;
  exchangeRate?: number;
  selectedItems?: string[];
  onSelectItem?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onOrderItemNoChange?: (itemId: string, poNo: string) => void;
  onRemoveFile?: (itemId: string) => void;
  onRemoveSingleFile?: (itemId: string, fileId: string, skipConfirm?: boolean) => void;
  onRemoveMultipleFiles?: (itemId: string, fileIds: string[]) => void;
  onPriceChange?: (itemId: string, field: 'unit_price' | 'supply_price' | 'qty', value: number) => void;
  onFieldChange?: (itemId: string, field: 'part_name' | 'part_no' | 'spec' | 'client_po_no', value: string) => void;
  onToggleItemStatus?: (itemId: string, currentStatus: string) => void;
  isLocked?: boolean;
}

const TextInput = ({ value, onChange, className, placeholder, isLocked }: { value: string, onChange: (val: string) => void, className?: string, placeholder?: string, isLocked?: boolean }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue.trim() !== (value || '').trim()) {
      onChange(localValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        className={`h-7 px-1 text-xs rounded border border-brand-500 bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500 w-full ${className || ''}`}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        onFocus={(e) => e.target.select()}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div 
      className={`px-1 py-1 rounded w-full truncate min-h-[24px] ${!value ? 'text-text-disabled italic' : ''} ${className || ''} ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:bg-bg-overlay/50 transition-colors'}`}
      onClick={() => !isLocked && setIsEditing(true)}
      title={value || placeholder}
    >
      {value || placeholder || '-'}
    </div>
  );
};

const PriceInput = ({ value, onChange, className, trend, isLocked }: { value: number, onChange: (val: number) => void, className?: string, trend?: 'up' | 'down', isLocked?: boolean }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value.toString());

  React.useEffect(() => {
    if (!isEditing) {
      setLocalValue(value.toString());
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = Number(localValue.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    } else {
      setLocalValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        className={`h-7 px-1 text-xs text-right rounded border border-brand-500 bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500 w-full ${className || ''}`}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        onFocus={(e) => e.target.select()}
      />
    );
  }

  const textColorClass = trend === 'up' ? 'text-success font-medium' : trend === 'down' ? 'text-danger font-medium' : '';

  return (
    <div 
      className={`px-1 py-1 rounded w-full text-right ${textColorClass} ${className || ''} ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:bg-bg-overlay/50 transition-colors'}`}
      onClick={() => !isLocked && setIsEditing(true)}
    >
      {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
    </div>
  );
};

const columnHelper = createColumnHelper<OrderItem>();

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({ 
  items, 
  parentPoNo,
  parentOrderDate,
  onSupplyChange,
  onFilesDrop,
  showForeign = false,
  currency = 'KRW',
  exchangeRate = 1,
  selectedItems = [],
  onSelectItem,
  onSelectAll,
  onDueDateChange,
  onOpenHistorySearch,
  onAddEmptyItem,
  onDeleteItem,
  onRemoveFile,
  onRemoveSingleFile,
  onRemoveMultipleFiles,
  onAddMaskedFile,
  onOrderItemNoChange,
  onPriceChange,
  onFieldChange,
  onToggleItemStatus,
  isLocked,
}) => {
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const fractionOpts = showForeign && exchangeRate > 0 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 };
  
  const handlePriceChange = (itemId: string, field: 'unit_price' | 'supply_price', value: number) => {
    if (onPriceChange) {
      // 외화 모드일 경우 입력된 외화값에 환율을 곱해 KRW 기준으로 변환
      const krwValue = showForeign && exchangeRate > 0 ? Math.round(value * exchangeRate) : value;
      onPriceChange(itemId, field, krwValue);
    }
  };

  const [maskingModalOpen, setMaskingModalOpen] = React.useState(false);
  const [maskingFile, setMaskingFile] = React.useState<any>(null);
  const [maskingItemId, setMaskingItemId] = React.useState<string | null>(null);
  const [imagePreviewModalOpen, setImagePreviewModalOpen] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<any>(null);

  const handleOpenMasking = async (file: any, itemId?: string) => {
    const fileName = (file.name || file.file_name || '').toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      // PDF는 마스킹/뷰어 모달로 엽니다.
      setMaskingFile(file);
      setMaskingItemId(itemId || null);
      setMaskingModalOpen(true);
    } else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      // 이미지는 미리보기 모달로 엽니다.
      setPreviewFile(file);
      setImagePreviewModalOpen(true);
    } else {
      // PDF나 이미지가 아니면(STEP 등) 로컬 기본 뷰어로 엽니다.
      let filePath = file.file_path || file.path;
      if (!filePath && (window as any).webUtils && file instanceof File) {
        try {
          filePath = (window as any).webUtils.getPathForFile(file);
        } catch (e) {}
      }

      if (!filePath) {
        toast.error('로컬 파일 경로를 찾을 수 없어 외부 앱으로 열 수 없습니다.');
        return;
      }

      try {
        const res = await (window as any).ipcRenderer.invoke('open-local-file', filePath);
        if (!res.success) {
          toast.error('파일을 여는 데 실패했습니다: ' + res.error);
        }
      } catch (err: any) {
        toast.error('파일을 열 수 없습니다: ' + err.message);
      }
    }
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'selection',
      header: ({ table }) => (
        <div className="flex justify-center w-full">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border-strong text-brand-500 focus:ring-brand-500 bg-bg-surface cursor-pointer"
            checked={isAllSelected}
            onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center w-full">
          <input
            type="checkbox"
            className={`w-4 h-4 rounded border-border-strong text-brand-500 focus:ring-brand-500 bg-bg-surface ${row.original.production_status === 'CANCELLED' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            checked={selectedItems.includes(row.original.id)}
            onChange={(e) => onSelectItem && onSelectItem(row.original.id, e.target.checked)}
            disabled={row.original.production_status === 'CANCELLED'}
          />
        </div>
      ),
      size: 40,
    }),
    columnHelper.display({
      id: 'status',
      header: '진행 상태',
      cell: ({ row }) => {
        const status = row.original.production_status || 'PENDING';
        if (status === 'CANCELLED') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-danger/10 text-danger border border-danger/30 whitespace-nowrap">
              ❌ 취소됨
            </span>
          );
        }
        if (status === 'PRODUCTION_READY') {
          return (
            <button 
              onClick={() => !isLocked && onToggleItemStatus && onToggleItemStatus(row.original.id, status)}
              disabled={isLocked}
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-brand-500/10 text-brand-500 border border-brand-500/30 whitespace-nowrap transition-colors ${!isLocked ? 'hover:bg-brand-500/20 cursor-pointer' : 'opacity-80 cursor-default'}`}
              title={!isLocked ? '클릭하여 이관 취소' : ''}
            >
              🚀 생산 이관
            </button>
          );
        }
        return (
          <button 
            onClick={() => !isLocked && onToggleItemStatus && onToggleItemStatus(row.original.id, status)}
            disabled={isLocked}
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-bg-elevated text-text-secondary border border-border-default whitespace-nowrap transition-colors ${!isLocked ? 'hover:bg-bg-overlay cursor-pointer hover:text-text-primary' : 'opacity-80 cursor-default'}`}
            title={!isLocked ? '클릭하여 생산 이관' : ''}
          >
            ⏳ 수주 대기
          </button>
        );
      },
      size: 85,
    }),
    columnHelper.accessor('client_po_no', {
      header: '고객사 발주번호',
      cell: ({ row, getValue }) => {
        return (
          <TextInput
            value={getValue() || ''}
            placeholder="고객사 관리 번호"
            onChange={(val) => onFieldChange && onFieldChange(row.original.id, 'client_po_no', val)}
            isLocked={isLocked || row.original.production_status === 'PRODUCTION_READY'}
          />
        );
      },
      size: 110,
    }),
    columnHelper.accessor('order_item_no', {
      header: '시스템 품번',
      cell: ({ getValue }) => {
        return (
          <div className="px-2 text-xs text-text-secondary font-mono">
            {getValue()}
          </div>
        );
      },
      size: 110,
    }),
    columnHelper.accessor('part_name', {
      header: '품명',
      cell: ({ row, getValue }) => (
        <TextInput
          value={getValue() || ''}
          placeholder="품명 입력"
          onChange={(val) => onFieldChange && onFieldChange(row.original.id, 'part_name', val)}
          className="font-medium"
          isLocked={true}
        />
      ),
      size: 150,
    }),
    columnHelper.accessor('part_no', {
      header: '도면 번호',
      cell: ({ row, getValue }) => (
        <TextInput
          value={getValue() || ''}
          placeholder="도면 번호 입력"
          onChange={(val) => onFieldChange && onFieldChange(row.original.id, 'part_no', val)}
          className="font-mono text-text-secondary"
          isLocked={true}
        />
      ),
      size: 110,
    }),
    columnHelper.accessor('spec', {
      header: '규격',
      cell: ({ row, getValue }) => (
        <TextInput
          value={getValue() || ''}
          placeholder="규격 입력"
          onChange={(val) => onFieldChange && onFieldChange(row.original.id, 'spec', val)}
          className="text-text-secondary"
          isLocked={true}
        />
      ),
      size: 120,
    }),
    columnHelper.accessor('qty', {
      header: () => <div className="text-right w-full">수량</div>,
      cell: ({ row }) => {
        const item = row.original;
        const estimateQty = item.estimate_items?.qty;
        let trend: 'up' | 'down' | undefined = undefined;
        
        if (estimateQty !== undefined && estimateQty !== item.qty) {
          trend = (item.qty || 0) > estimateQty ? 'up' : 'down';
        }

        return (
          <div className="flex items-center justify-end gap-1 w-full">
            {trend && (
              <div 
                className={`${trend === 'up' ? 'text-success' : 'text-danger'} cursor-help`} 
                title={`견적 수량: ${estimateQty} ➔ 수주 수량: ${item.qty}`}
              >
                {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
            )}
            <PriceInput
              value={item.qty || 0}
              trend={trend}
              onChange={(val) => onPriceChange && onPriceChange(item.id, 'qty', val)}
              className="font-medium"
              isLocked={isLocked || row.original.production_status === 'PRODUCTION_READY'}
            />
          </div>
        );
      },
      size: 60,
    }),
    columnHelper.accessor('unit_price', {
      header: () => <div className="text-right w-full">단가 {showForeign ? `(${getCurrencySymbol(currency)})` : '(₩)'}</div>,
      cell: ({ row }) => {
        const item = row.original;
        const displayUnitPrice = showForeign && exchangeRate > 0 ? Math.ceil(((item.unit_price || 0) / exchangeRate) * 100) / 100 : (item.unit_price || 0);
        const estimateUnitPrice = item.estimate_items?.unit_price;
        
        let trend: 'up' | 'down' | undefined = undefined;
        let displayEstimatePrice = estimateUnitPrice;

        if (estimateUnitPrice !== undefined) {
          if (showForeign && exchangeRate > 0) {
            displayEstimatePrice = Math.ceil((estimateUnitPrice / exchangeRate) * 100) / 100;
            if (Math.abs(displayUnitPrice - displayEstimatePrice) > 0.015) {
              trend = displayUnitPrice > displayEstimatePrice ? 'up' : 'down';
            }
          } else {
            if (estimateUnitPrice !== item.unit_price) {
              trend = (item.unit_price || 0) > estimateUnitPrice ? 'up' : 'down';
            }
          }
        }

        const fractionOpts = showForeign && ['USD', 'EUR'].includes(currency) ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 };

        return (
          <div className="flex items-center justify-end gap-1.5 w-full">
            {trend && (
              <div 
                className={`${trend === 'up' ? 'text-success' : 'text-danger'} cursor-help`} 
                title={`견적 단가: ${displayEstimatePrice?.toLocaleString(undefined, fractionOpts)} ➔ 수주 단가: ${displayUnitPrice.toLocaleString(undefined, fractionOpts)}\n차액: ${(displayUnitPrice - (displayEstimatePrice || 0)).toLocaleString(undefined, fractionOpts)} ${showForeign ? getCurrencySymbol(currency) : '₩'}`}
              >
                {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
            )}
            <PriceInput
              value={displayUnitPrice}
              trend={trend}
              onChange={(val) => handlePriceChange(item.id, 'unit_price', val)}
              isLocked={isLocked || row.original.production_status === 'PRODUCTION_READY'}
            />
          </div>
        );
      },
      size: 110,
    }),
    columnHelper.accessor('supply_price', {
      header: () => <div className="text-right w-full">공급가액 {showForeign ? `(${getCurrencySymbol(currency)})` : '(₩)'}</div>,
      cell: ({ row }) => {
        const item = row.original;
        const displaySupplyPrice = showForeign && exchangeRate > 0 ? Math.ceil(((item.supply_price || 0) / exchangeRate) * 100) / 100 : (item.supply_price || 0);
        return (
          <PriceInput
            value={displaySupplyPrice}
            className="text-brand-400 font-bold"
            onChange={(val) => handlePriceChange(item.id, 'supply_price', val)}
            isLocked={true}
          />
        );
      },
      size: 110,
    }),
    columnHelper.accessor('due_date', {
      header: '납기일',
      cell: ({ row }) => {
        let displayDate = (row.original.due_date as string) || '';
        if (!displayDate && parentOrderDate) {
          const workDays = row.original.work_days || (row.original as any).estimate_items?.work_days || 3;
          const dateObj = new Date(parentOrderDate);
          dateObj.setDate(dateObj.getDate() + workDays);
          displayDate = dateObj.toISOString().slice(0, 10);
        }
        return (
          <input
            type="date"
            className={`h-7 px-2 text-xs rounded border border-border-default bg-bg-surface text-text-primary focus:ring-1 focus:ring-brand-500 w-32 ${isLocked || row.original.production_status === 'PRODUCTION_READY' ? 'opacity-80 cursor-not-allowed' : ''}`}
            value={displayDate}
            onChange={(e) => onDueDateChange && onDueDateChange(row.original.id, e.target.value)}
            disabled={isLocked || row.original.production_status === 'PRODUCTION_READY'}
          />
        );
      },
      size: 140,
    }),
    columnHelper.display({
      id: 'files',
      header: '첨부파일',
      cell: ({ row }) => {
        const item = row.original as any;
        // order_items에 복사된 files가 있거나, 없으면(빈 배열이면) 조인된 estimate_items.files를 사용
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
                onFileRemove={(!isLocked && onRemoveSingleFile) ? (file) => onRemoveSingleFile(item.id, file.id) : undefined}
                onRemoveAll={(!isLocked && onRemoveMultipleFiles) ? () => onRemoveMultipleFiles(item.id, files2D.map((f: any) => f.id)) : undefined}
              />
            )}
            {count3D > 0 && (
              <FileBadge 
                type="3D" 
                count={count3D} 
                files={files3D} 
                onFileClick={(file) => handleOpenMasking(file, item.id)}
                onFileRemove={(!isLocked && onRemoveSingleFile) ? (file) => onRemoveSingleFile(item.id, file.id) : undefined}
                onRemoveAll={(!isLocked && onRemoveMultipleFiles) ? () => onRemoveMultipleFiles(item.id, files3D.map((f: any) => f.id)) : undefined}
              />
            )}
          </div>
        );
      },
      size: 100,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-center w-full">삭제</div>,
      cell: ({ row }) => (
        <div className="text-center">
          {(!isLocked && row.original.production_status !== 'PRODUCTION_READY') && onDeleteItem && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem(row.original.id);
              }}
              className="p-1 text-text-secondary hover:text-danger hover:bg-status-danger/10 rounded transition-colors"
              title="품목 삭제"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
      size: 50,
    })
  ], [items, showForeign, currency, exchangeRate, selectedItems, isAllSelected, onSelectItem, onSelectAll, fractionOpts, onDeleteItem]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderContent = () => (
    <div className="w-full h-full flex-1 flex flex-col min-h-[400px]">
      {items.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-border-default rounded-lg bg-bg-surface flex flex-col items-center justify-center p-12 transition-all hover:border-brand-500/50 hover:bg-bg-elevated group relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {onAddEmptyItem && (
              <Button variant="primary" size="sm" onClick={onAddEmptyItem} className="flex items-center gap-1.5">
                <Plus size={16} />
                신규 품목 추가
              </Button>
            )}
            {onOpenHistorySearch && (
              <Button variant="outline" size="sm" onClick={onOpenHistorySearch} className="flex items-center gap-2">
                <PackageOpen size={16} />
                과거 이력 불러오기
              </Button>
            )}
          </div>
          <PackageOpen size={48} className="text-text-disabled group-hover:text-brand-500 mb-4 transition-colors" />
          <h3 className="text-xl font-bold text-text-primary mb-2">수주 품목이 없습니다</h3>
          <p className="text-text-secondary mb-8">상단의 '신규 품목 추가' 또는 '과거 이력 불러오기'를 통해 품목을 추가하세요.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 relative">
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
                        width: ['part_name', 'spec', 'files'].includes(header.column.id) ? 'auto' : header.getSize(),
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
              {table.getRowModel().rows.map(row => {
                const isCancelled = row.original.production_status === 'CANCELLED';
                return (
                <tr 
                  key={row.id}
                  className={`border-b border-border-default/50 transition-colors ${
                    isCancelled 
                      ? 'bg-bg-overlay/50 text-text-disabled line-through opacity-70' 
                      : selectedItems.includes(row.original.id) 
                        ? 'bg-brand-500/5' 
                        : 'hover:bg-bg-elevated/50'
                  }`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td 
                      key={cell.id} 
                      className={`px-2 py-2 truncate border-r border-border-default/30 last:border-r-0 align-middle ${isCancelled ? 'pointer-events-none' : ''}`}
                      style={{ width: ['part_name', 'spec', 'files'].includes(cell.column.id) ? 'auto' : cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        </div>
      )}
      
      <DocumentMaskingModal 
        isOpen={maskingModalOpen} 
        onClose={() => setMaskingModalOpen(false)} 
        file={maskingFile} 
        onSaveMaskedPdf={(newFile) => {
          // 기존 마스킹 안 된 원본 파일 삭제 (확인창 생략)
          if (maskingFile && maskingFile.id && maskingItemId && onRemoveSingleFile) {
            onRemoveSingleFile(maskingItemId, maskingFile.id, true);
          }
          
          // 새로 생성된 마스킹 파일을 배열에 추가 (기존 파일 교체 효과)
          if (onAddMaskedFile) {
            onAddMaskedFile(maskingItemId, [newFile]);
          }
        }} 
      />

      <ImagePreviewModal
        isOpen={imagePreviewModalOpen}
        onClose={() => setImagePreviewModalOpen(false)}
        file={previewFile}
      />
    </div>
  );

  return renderContent();
};
