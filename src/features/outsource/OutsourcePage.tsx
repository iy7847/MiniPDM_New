import React, { useState, useMemo, useEffect } from 'react';
import { useStickySearchParams } from '@/hooks/useStickySearchParams';
import { useProcurementList } from './hooks/useProcurementList';
import type { ProcurementTab, ProcurementOrder } from './hooks/useProcurementList';
import { PageHeader, PageTabs, Button, BaseInput, Badge, Toggle, Checkbox, Table, Thead, Tbody, Tr, Th, Td } from '@/design-system';
import { Search, Mail, Package, ExternalLink, Download } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
} from '@tanstack/react-table';
import type { SortingState, GroupingState, ExpandedState } from '@tanstack/react-table';
import { FileBadge } from '@/features/estimates/components/FileBadge';
import { EXT_2D, EXT_3D } from '@/shared/utils/fileMatching';
import { DocumentMaskingModal } from '@/shared/components/DocumentMaskingModal';
import { ImagePreviewModal } from '@/shared/components/ImagePreviewModal';
import { DeleteConfirmModal } from '@/shared/components/DeleteConfirmModal';
import { toast } from '@/shared/stores/useToastStore';
import { supabase } from '@/shared/services/supabase';

import { OrderDispatchModal } from './components/OrderDispatchModal';

const calculateDDay = (targetDate?: string) => {
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

const columnHelper = createColumnHelper<ProcurementOrder>();

export const OutsourcePage = () => {
  const [searchParams, setSearchParams] = useStickySearchParams('outsource_list_filters', { keyword: '', status: 'ALL', tab: 'STATUS' });
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [mainTab, setMainTab] = useState<ProcurementTab>((searchParams.get('tab') as ProcurementTab) || 'STATUS');
  
  const { orders, loading, fetchOrders, undoBatchOrders, processBatchOrder } = useProcurementList(mainTab);
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  // Suppliers for dropdown
  const [suppliers, setSuppliers] = useState<{id: string, name: string, manager_email?: string, manager_name?: string}[]>([]);
  useEffect(() => {
    supabase.from('clients').select('id, name, manager_email, manager_name').in('client_type', ['SUPPLIER', 'BOTH']).then(({ data }) => {
      if (data) setSuppliers(data);
    });
  }, []);

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    return orders.filter(i => {
      // 1. Keyword search
      if (keyword) {
        const lower = keyword.toLowerCase();
        const matchesKeyword = i.item_name?.toLowerCase().includes(lower) || 
                               i.po_no?.toLowerCase().includes(lower) ||
                               (i.supplier_name || '').toLowerCase().includes(lower);
        if (!matchesKeyword) return false;
      }
      
      // 2. Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === '지연') {
            const isDelayed = i.expected_date && new Date(i.expected_date).getTime() < new Date().setHours(0,0,0,0) && i.status !== '입고완료';
            if (!isDelayed) return false;
        } else if (statusFilter === '진행') {
            if (i.status !== '발주완료' && i.status !== '수신확인') return false;
        } else if (statusFilter === '완료') {
            if (i.status !== '입고완료') return false;
        } else {
            if (i.status !== statusFilter) return false;
        }
      }
      
      return true;
    });
  }, [orders, keyword, statusFilter]);

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [maskingModalOpen, setMaskingModalOpen] = React.useState(false);
  const [maskingFile, setMaskingFile] = React.useState<any>(null);
  const [maskingItemId, setMaskingItemId] = React.useState<string | null>(null);
  const [imagePreviewModalOpen, setImagePreviewModalOpen] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<any>(null);

  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const handleOpenMasking = async (file: any, itemId?: string) => {
    const fileName = (file.name || file.file_name || '').toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      setMaskingFile(file);
      setMaskingItemId(itemId || null);
      setMaskingModalOpen(true);
    } else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      setPreviewFile(file);
      setImagePreviewModalOpen(true);
    } else {
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

  const columns = useMemo(() => {
    const allCols = [
    columnHelper.display({
      id: 'selection',
      header: () => {
        const selectableItems = filteredItems;
        const isAllSelected = selectableItems.length > 0 && selectableItems.every(i => selectedItemIds.has(i.id));
        return (
          <Checkbox 
            checked={isAllSelected}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedItemIds(new Set(selectableItems.map(item => item.id)));
              } else {
                setSelectedItemIds(new Set());
              }
            }}
          />
        );
      },
      cell: ({ row }) => {
        const id = row.original.id;
        const isChecked = selectedItemIds.has(id);
        return (
          <Checkbox 
            checked={isChecked}
            onChange={() => toggleItem(id)}
          />
        );
      },
      size: 40,
    }),
    columnHelper.accessor('supplier_name', {
      id: 'supplier_name',
      header: '외주/공급 업체',
      cell: info => <span className="font-bold text-brand-500">{info.getValue() || '미지정'}</span>,
      size: 140,
    }),
    columnHelper.accessor('po_no', {
      id: 'po_no',
      header: 'PO 번호',
      cell: ({ row, getValue }) => {
        const hasItems = row.original.type === 'MATERIAL' && row.original.items && row.original.items.length > 0;
        return (
          <div className="flex items-center gap-2">
            {hasItems && (
              <button 
                onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                className="text-text-tertiary hover:text-text-primary p-0.5 rounded transition-transform"
                style={{ transform: row.getIsExpanded() ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▶
              </button>
            )}
            <span className="font-mono text-text-secondary">{getValue()}</span>
          </div>
        );
      },
      size: 130,
    }),
    columnHelper.accessor('item_name', {
      header: '도면번호 / 품명',
      cell: info => {
        const item = info.row.original;
        return (
          <div>
            <div className="font-bold text-text-primary text-[13px] mb-0.5">{item.part_no || '-'}</div>
            <div className="text-xs text-text-secondary flex gap-2">
              <span>{item.item_name}</span>
            </div>
          </div>
        );
      },
      size: 200,
    }),
    columnHelper.accessor('process_name', {
      id: 'process_name',
      header: '공정/분류',
      cell: info => {
        const item = info.row.original;
        if (item.type === 'MATERIAL') {
          return (
            <div className="flex flex-col gap-1 items-start">
              {item.shape && <Badge variant="secondary" className="text-[11px] px-1.5 py-0">{item.shape}</Badge>}
              <span className="text-text-secondary">{item.item_spec !== '-' ? item.item_spec : ''}</span>
            </div>
          );
        }
        return <span className="text-text-secondary">{info.getValue()}</span>;
      },
      size: 130,
    }),
    columnHelper.accessor('quantity', {
      header: '수량(잔여)',
      cell: info => {
        const qty = info.getValue();
        const received = info.row.original.received_qty || 0;
        const remain = qty - received;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-text-secondary">{qty}</span>
            {received > 0 && <span className="text-xs text-brand-400">잔여: {remain}</span>}
          </div>
        );
      },
      size: 80,
    }),
    columnHelper.accessor('unit_price', {
      header: '단가',
      cell: info => {
        const item = info.row.original;
        if (item.type === 'MATERIAL' && item.estimated_price && !item.unit_price) {
          return (
            <div className="flex flex-col">
              <span className="text-text-secondary">{(item.estimated_price).toLocaleString()}</span>
              <span className="text-[10px] text-brand-400">예상가</span>
            </div>
          );
        }
        return <span className="text-text-secondary">{(info.getValue() || 0).toLocaleString()}</span>;
      },
      size: 100,
    }),
    columnHelper.accessor('expected_date', {
      header: '납기일',
      cell: info => {
        const dday = calculateDDay(info.getValue());
        return (
          <div className="flex flex-col gap-1">
            <span className="text-text-secondary">{info.getValue()?.split('T')[0] || '-'}</span>
            {info.getValue() && <Badge variant={dday.variant} className="text-[10px] px-1.5 py-0 w-fit">{dday.text}</Badge>}
          </div>
        );
      },
      size: 120,
    }),
    columnHelper.accessor('status', {
      header: '상태',
      cell: info => {
        const status = info.getValue();
        const readAt = info.row.original.read_at;
        
        let badgeVariant: any = 'default';
        if (status === '발주완료') badgeVariant = 'warning';
        else if (status === '수신확인') badgeVariant = 'success';
        else if (status === '입고완료') badgeVariant = 'primary';
        
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant={badgeVariant}>{status}</Badge>
            {status === '수신확인' && readAt && (
              <span className="text-[10px] text-brand-500 font-medium">
                {new Date(readAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 읽음
              </span>
            )}
          </div>
        );
      },
      size: 110,
    }),
    columnHelper.display({
      id: 'attachments',
      header: '첨부파일',
      cell: ({ row }) => {
        const files = row.original.files || [];
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
                onFileClick={(file) => handleOpenMasking(file, row.original.id)}
              />
            )}
            {count3D > 0 && (
              <FileBadge 
                type="3D" 
                count={count3D} 
                files={files3D}
                onFileClick={(file) => handleOpenMasking(file, row.original.id)}
              />
            )}
          </div>
        );
      },
      size: 110,
    })
  ];

    if (mainTab !== 'STATUS') {
      return allCols.filter(col => {
        const colId = (col as any).id || (col as any).accessorKey;
        return colId !== 'supplier_name' && colId !== 'process_name';
      });
    }
    
    return allCols;
  }, [filteredItems, selectedItemIds, suppliers, mainTab]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting, grouping, expanded },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
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
    <div className="flex flex-col h-full bg-bg-base animate-in fade-in">
      <div className="p-6 pb-0">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Package className="text-brand-500" />
              외주/구매 관리
            </div>
          }
          actions={
            <div className="flex items-center gap-4">
              <div className="w-64 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <BaseInput 
                  className="pl-9 bg-bg-surface text-sm border-border-default h-9" 
                  placeholder="품명, PO번호, 업체명 검색..."
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setSearchParams({ keyword: e.target.value, status: statusFilter, tab: mainTab });
                  }}
                />
              </div>

              {(() => {
                const pendingSelected = Array.from(selectedItemIds).filter(id => {
                  const i = orders.find(item => item.id === id);
                  return i && i.status === '발주대기';
                });

                const nonPendingSelected = Array.from(selectedItemIds).filter(id => {
                  const i = orders.find(item => item.id === id);
                  return i && i.status !== '발주대기' && i.status !== '입고완료';
                });
                
                return (
                  <div className="flex items-center gap-2">
                    {nonPendingSelected.length > 0 && mainTab === 'STATUS' && (
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          setCancelConfirmOpen(true);
                        }}
                      >
                        발주 취소 ({nonPendingSelected.length})
                      </Button>
                    )}
                    
                    {mainTab !== 'STATUS' && (
                      <Button 
                        variant="primary"
                        disabled={pendingSelected.length === 0}
                        onClick={() => {
                          if (mainTab === 'MATERIAL') {
                            setOrderModalOpen(true);
                          } else {
                            setOrderModalOpen(true);
                          }
                        }}
                      >
                        선택 발주 ({pendingSelected.length})
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          }
        />
        
        {/* Main Tabs and Status Filters combined */}
        <div className="flex items-end justify-between mt-4 border-b border-border-default pb-0">
          <div className="flex gap-2">
            {[
              { id: 'STATUS', label: '발주 현황' },
              { id: 'OUTSOURCE', label: '외주발주' },
              { id: 'PURCHASE', label: '구매발주' },
              { id: 'MATERIAL', label: '소재발주' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setMainTab(tab.id as ProcurementTab);
                  setSelectedItemIds(new Set());
                  const nextStatus = tab.id === 'STATUS' ? (statusFilter === 'ALL' ? 'ALL' : statusFilter) : 'ALL';
                  setStatusFilter(nextStatus);
                  setSearchParams({ keyword, status: nextStatus, tab: tab.id });
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  mainTab === tab.id 
                    ? 'border-brand-500 text-brand-400' 
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 pb-2 text-sm">
            {mainTab === 'STATUS' ? (
              <>
                <div className="flex items-center bg-bg-elevated rounded-md p-1 border border-border-default">
                  {[
                    { id: 'ALL', label: '전체' },
                    { id: '진행', label: '진행' },
                    { id: '지연', label: '지연' },
                    { id: '완료', label: '완료' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setStatusFilter(f.id);
                        setSelectedItemIds(new Set());
                        setSearchParams({ keyword, status: f.id, tab: mainTab });
                      }}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        statusFilter === f.id ? 'bg-brand-500/20 text-brand-400' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-[1px] bg-border-default"></div>

                <div className="text-text-secondary flex items-center gap-2">
                  <Package size={16} />
                  <span>총 <span className="text-brand-400 font-bold">{filteredItems.length}</span>건</span>
                </div>
                
                <div className="h-4 w-[1px] bg-border-default"></div>

                <div className="flex items-center gap-2">
                  <span className="text-text-secondary font-medium text-xs whitespace-nowrap">업체명 그룹화</span>
                  <Toggle 
                    checked={grouping.length > 0} 
                    onChange={(checked) => {
                      if (checked) {
                        setGrouping(['supplier_name']);
                        setExpanded(true); // true means expand all
                      } else {
                        setGrouping([]);
                        setExpanded({});
                      }
                    }} 
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-xs text-text-tertiary">
                  * 목록에서 발주할 항목을 선택한 후 우측 상단의 [선택 발주] 버튼을 클릭하세요.
                </div>
                <div className="h-4 w-[1px] bg-border-default"></div>
                <div className="text-text-secondary flex items-center gap-2">
                  <Package size={16} />
                  <span>발주 대기 총 <span className="text-brand-400 font-bold">{filteredItems.length}</span>건</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col mt-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-secondary">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            데이터를 불러오는 중...
          </div>
        ) : (
          <div className="p-6 pt-0 h-full flex flex-col">
            <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden flex flex-col h-full shadow-sm">
              <div className="overflow-auto flex-1 custom-scrollbar">
                <Table className="w-full text-left border-collapse">
                  <Thead className="bg-bg-elevated sticky top-0 z-10 shadow-sm">
                    {table.getHeaderGroups().map(headerGroup => (
                      <Tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <Th 
                            key={header.id} 
                            className="px-4 py-3 text-sm font-medium text-text-secondary border-b border-border-default select-none whitespace-nowrap"
                            style={{ width: header.column.getSize() }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </Th>
                        ))}
                      </Tr>
                    ))}
                  </Thead>
                  <Tbody>
                    {table.getRowModel().rows.map(row => {
                      if (row.getIsGrouped()) {
                        return (
                          <Tr 
                            key={row.id} 
                            className="bg-bg-elevated hover:bg-bg-surface transition-colors cursor-pointer group"
                            onClick={row.getToggleExpandedHandler()}
                          >
                            <Td colSpan={columns.length} className="px-4 py-3 font-bold text-text-primary text-sm border-b border-border-default">
                              <div className="flex items-center gap-3">
                                업체: <span className="text-brand-400">{row.getValue('supplier_name') || '미지정'}</span>
                                <span className="text-text-secondary font-normal ml-2 text-xs">
                                  ({row.subRows.length}건 발주)
                                </span>
                              </div>
                            </Td>
                          </Tr>
                        );
                      }
                      
                      return (
                        <React.Fragment key={row.id}>
                          <Tr 
                            className={`border-b border-border-default hover:bg-bg-elevated/50 transition-colors ${selectedItemIds.has(row.original.id) ? 'bg-brand-500/5' : ''}`}
                          >
                            {row.getVisibleCells().map(cell => {
                              if (cell.getIsGrouped()) return null;
                              if (cell.getIsPlaceholder()) return <Td key={cell.id} style={{ width: cell.column.getSize() }}></Td>;
                              
                              return (
                                <Td 
                                  key={cell.id} 
                                  className="px-4 py-2 text-sm text-text-secondary"
                                  style={{ width: cell.column.getSize() }}
                                  onClick={(e) => {
                                    // Prevent row toggle if clicking on checkbox or action buttons
                                    if (cell.column.id === 'selection') {
                                      e.stopPropagation();
                                    }
                                  }}
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </Td>
                              );
                            })}
                          </Tr>
                        </React.Fragment>
                      );
                    })}
                    {table.getRowModel().rows.length === 0 && (
                      <Tr>
                        <Td colSpan={columns.length} className="px-4 py-12 text-center text-text-secondary">
                          조회된 내역이 없습니다.
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>

      <DocumentMaskingModal
        isOpen={maskingModalOpen}
        onClose={() => setMaskingModalOpen(false)}
        file={maskingFile}
        isViewerOnly={true}
        onSaveMaskedPdf={(newFile) => {
          // Viewer only
        }}
      />
      <ImagePreviewModal
        isOpen={imagePreviewModalOpen}
        onClose={() => setImagePreviewModalOpen(false)}
        file={previewFile}
      />
      
      {orderModalOpen && (
        <OrderDispatchModal 
          isOpen={orderModalOpen} 
          onClose={() => {
            setOrderModalOpen(false);
            setSelectedItemIds(new Set());
          }}
          selectedOrders={orders.filter(o => selectedItemIds.has(o.id))}
          suppliers={suppliers}
          processBatchOrder={processBatchOrder}
        />
      )}



      <DeleteConfirmModal
        isOpen={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        title="발주 취소 확인"
        description={`선택한 ${Array.from(selectedItemIds).filter(id => {
          const i = orders.find(item => item.id === id);
          return i && i.status !== '발주대기' && i.status !== '입고완료';
        }).length}개 항목의 발주를 정말 취소(대기 상태로 변경)하시겠습니까?`}
        confirmText="취소(대기) 진행"
        isDanger={false}
        icon={<Package className="w-5 h-5" />}
        onConfirm={async () => {
          const nonPendingSelected = Array.from(selectedItemIds).filter(id => {
            const i = orders.find(item => item.id === id);
            return i && i.status !== '발주대기' && i.status !== '입고완료';
          });
          const res = await undoBatchOrders(nonPendingSelected);
          if (res.success) {
            toast.success(`${res.count}개 항목의 발주가 취소(대기 상태로 변경)되었습니다.`);
            setSelectedItemIds(new Set());
          } else {
            toast.error(res.error || '발주 취소에 실패했습니다.');
          }
        }}
      />
    </div>
  );
};
