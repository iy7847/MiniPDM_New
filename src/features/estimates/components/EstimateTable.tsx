import React, { useMemo, useState, Fragment } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel
} from '@tanstack/react-table';
import type { Row } from '@tanstack/react-table';
import { Edit2, FileText, Box, ChevronDown, ChevronRight, FileUp, Trash2, Search } from 'lucide-react';
import type { EstimateItem } from '../types';

import { EstimateItemExpanded } from './EstimateItemExpanded';
import { FileBadge } from './FileBadge';
import { BaseInput } from '../../../design-system/BaseInput';
import { Badge } from '../../../design-system/Badge';
import { EXT_2D, EXT_3D } from '../utils/fileMatching';
import { getCurrencySymbol } from '../../../shared/utils/currency';
import { DocumentMaskingModal } from '../../../shared/components/DocumentMaskingModal';
import { ImagePreviewModal } from '../../../shared/components/ImagePreviewModal';
import { useCadViewerStore } from '../../../shared/stores/useCadViewerStore';
import { toast } from '../../../shared/stores/useToastStore';
import { MaskedText } from '../../../design-system';
import { usePermissions } from '../../../shared/hooks/usePermissions';

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
  onDeleteExistingFile?: any;
  showForeign?: boolean;
  onRemoveSingleFile?: (itemId: string, file: any, skipConfirm?: boolean) => void;
  onRemoveMultipleFiles?: (itemId: string, files: any[]) => void;
  estimate?: any;
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
  showForeign = false,
  onRemoveSingleFile,
  onRemoveMultipleFiles,
  estimate
}) => {
  const { hasPermission } = usePermissions();
  const canViewMargins = hasPermission('can_view_margins');

  const [expanded, setExpanded] = useState({});
  const [prevLength, setPrevLength] = useState(items.length);

  React.useEffect(() => {
    if (items.length > prevLength) {
      setExpanded({ [items.length - 1]: true });
    }
    setPrevLength(items.length);
  }, [items.length, prevLength]);

  const [maskingModalOpen, setMaskingModalOpen] = React.useState(false);
  const [maskingFile, setMaskingFile] = React.useState<any>(null);
  const [maskingItemId, setMaskingItemId] = React.useState<string | null>(null);
  const [imagePreviewModalOpen, setImagePreviewModalOpen] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<any>(null);

  const handleOpenMasking = async (file: any, itemId?: string) => {
    const fileName = (file.name || file.file_name || '').toLowerCase();
    const rawFileName = file.name || file.file_name || 'model.stp';
    
    if (fileName.endsWith('.pdf')) {
      setMaskingFile(file);
      setMaskingItemId(itemId || null);
      setMaskingModalOpen(true);
    } else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      setPreviewFile(file);
      setImagePreviewModalOpen(true);
    } else if (fileName.endsWith('.stp') || fileName.endsWith('.step')) {
      // 🚀 3D CAD 파일은 전역 3D CAD 뷰어로 엽니다.
      useCadViewerStore.getState().openCadViewer(file);
      return;
    } else {
      let filePath = file.file_path || file.path;
      if (!filePath && (window as any).webUtils && file instanceof File) {
        try {
          filePath = (window as any).webUtils.getPathForFile(file);
        } catch (e) {}
      }
      if (!filePath) {
        // toast가 import 안되어 있을 수 있으므로 window.toast.error 대체 혹은 toast 유지
        if (typeof (window as any).toast !== 'undefined') (window as any).toast.error('로컬 파일 경로를 찾을 수 없어 외부 앱으로 열 수 없습니다.');
        else toast.error('로컬 파일 경로를 찾을 수 없어 외부 앱으로 열 수 없습니다.');
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

  const formatPrice = (value: number) => {
    if (showForeign && exchangeRate > 0) {
      const foreignValue = Math.ceil((value / exchangeRate) * 100) / 100;
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(foreignValue);
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
      cell: info => <MaskedText isVisible={canViewMargins} value={formatPrice(info.getValue() || 0)} />,
      size: 90,
    }),
    columnHelper.accessor('processing_cost', {
      header: '가공비',
      cell: info => <MaskedText isVisible={canViewMargins} value={formatPrice(info.getValue() || 0)} />,
      size: 90,
    }),
    columnHelper.display({
      id: 'extra_cost',
      header: '열/후처리비',
      cell: ({ row }) => {
        const { heat_treatment_cost = 0, post_process_cost = 0 } = row.original;
        const totalExtra = heat_treatment_cost + post_process_cost;
        return <MaskedText isVisible={canViewMargins} value={formatPrice(totalExtra)} />;
      },
      size: 100,
    }),



    columnHelper.accessor('unit_price', {
      header: () => `단가 ${showForeign ? `(${getCurrencySymbol(currency)})` : '(₩)'}`,
      cell: info => formatPrice(info.getValue() || 0),
      size: 100,
    }),
    columnHelper.accessor('supply_price', {
      header: () => `합계 ${showForeign ? `(${getCurrencySymbol(currency)})` : '(₩)'}`,
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

        const files2D = files.filter((f: any) => !EXT_3D.includes('.' + ((f.name || f.file_name || '').split('.').pop()?.toLowerCase() || '')));
        const files3D = files.filter((f: any) => EXT_3D.includes('.' + ((f.name || f.file_name || '').split('.').pop()?.toLowerCase() || '')));

        return (
          <div className="flex items-center gap-1.5 overflow-visible min-h-[24px]">
            {count2D > 0 && (
              <FileBadge 
                type="2D" 
                count={count2D} 
                files={files2D} 
                onFileClick={(file) => handleOpenMasking(file, item.id)}
                onFileRemove={onRemoveSingleFile && !isReadOnly ? (file) => onRemoveSingleFile(item.id, file.id || file) : undefined}
                onRemoveAll={onRemoveMultipleFiles && !isReadOnly ? () => onRemoveMultipleFiles(item.id, files2D.map((f: any) => f.id || f)) : undefined}
              />
            )}
            {count3D > 0 && (
              <FileBadge 
                type="3D" 
                count={count3D} 
                files={files3D} 
                onFileClick={(file) => handleOpenMasking(file, item.id)}
                onFileRemove={onRemoveSingleFile && !isReadOnly ? (file) => onRemoveSingleFile(item.id, file.id || file) : undefined}
                onRemoveAll={onRemoveMultipleFiles && !isReadOnly ? () => onRemoveMultipleFiles(item.id, files3D.map((f: any) => f.id || f)) : undefined}
              />
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
            {!isReadOnly ? (
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (onOpenModal) onOpenModal(row.original);
                }}
                className="p-1 text-text-secondary hover:text-brand-500 hover:bg-brand-500/10 rounded transition-colors"
                title="상세 모달 열기"
              >
                <Edit2 size={15} />
              </button>
            ) : (
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (onOpenModal) onOpenModal(row.original);
                }}
                className="p-1 text-text-secondary hover:text-brand-500 hover:bg-brand-500/10 rounded transition-colors"
                title="상세 보기"
              >
                <Search size={15} />
              </button>
            )}
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
  ], [items, isReadOnly, onChange, showForeign, exchangeRate, estimate?.custom_columns, canViewMargins]);

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
                      row.toggleExpanded();
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
                              customColumns={estimate?.custom_columns || []}
                              isReadOnly={isReadOnly}
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

      <DocumentMaskingModal 
        isOpen={maskingModalOpen} 
        onClose={() => setMaskingModalOpen(false)} 
        file={maskingFile} 
        onSaveMaskedPdf={(newFile) => {
          if (!maskingItemId || isReadOnly) return;
          
          const isTemp = !maskingFile?.id;
          if (isTemp) {
            // 1) 아직 DB에 저장되지 않은 임시 파일(tempFiles)인 경우
            onChange(items.map(it => {
              if (it.id === maskingItemId || `temp-${it.part_no || it.part_name}` === maskingItemId) {
                const oldName = maskingFile?.name || maskingFile?.file_name;
                return {
                  ...it,
                  tempFiles: (it.tempFiles || []).map((f: any) => f.name === oldName ? newFile : f)
                };
              }
              return it;
            }));

            if (onSaveFiles) {
              onSaveFiles(maskingItemId, [newFile]);
            }
          } else {
            // 2) 이미 DB에 등록된 파일인 경우: 기존 DB 파일 레코드와 중복되지 않도록 교체 처리
            if (onRemoveSingleFile && maskingFile.id) {
              onRemoveSingleFile(maskingItemId, maskingFile.id);
            }

            onChange(items.map(it => {
              if (it.id === maskingItemId || `temp-${it.part_no || it.part_name}` === maskingItemId) {
                const oldName = maskingFile?.name || maskingFile?.file_name;
                const filteredFiles = (it.files || []).filter((f: any) => f.id !== maskingFile.id);
                const remainingTemp = (it.tempFiles || []).filter((f: any) => f.name !== oldName);
                return {
                  ...it,
                  files: filteredFiles,
                  tempFiles: [...remainingTemp, newFile]
                };
              }
              return it;
            }));

            if (onSaveFiles) {
              onSaveFiles(maskingItemId, [newFile]);
            }
          }

          // 3) 현재 열려있는 maskingFile 참조 갱신
          setMaskingFile(newFile);
        }} 
      />

      <ImagePreviewModal
        isOpen={imagePreviewModalOpen}
        onClose={() => setImagePreviewModalOpen(false)}
        file={previewFile}
      />
    </div>
  );
};
