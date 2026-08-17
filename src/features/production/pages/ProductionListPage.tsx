import React, { useState, useMemo } from 'react';
import { useStickySearchParams } from '../../../hooks/useStickySearchParams';
import { useProductionList } from '../hooks/useProductionList';
import { PageHeader, PageTabs, FilterBar, Button, BaseInput, Badge, BaseSelect, Toggle, Tabs } from '../../../design-system';
import { Search, Hammer, Package, List, KanbanSquare, FileText, Box } from 'lucide-react';
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
import { FileBadge } from '../../../features/estimates/components/FileBadge';
import { EXT_2D, EXT_3D } from '../../../shared/utils/fileMatching';
import { DocumentMaskingModal } from '../../../shared/components/DocumentMaskingModal';
import { ImagePreviewModal } from '../../../shared/components/ImagePreviewModal';
import { toast } from '../../../shared/stores/useToastStore';

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

const columnHelper = createColumnHelper<any>();

export const ProductionListPage = () => {
  const [searchParams, setSearchParams] = useStickySearchParams('production_list_filters', { keyword: '', view: 'list', supply: 'ALL', status: 'ALL' });
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [viewMode, setViewMode] = useState<'list'|'kanban'>((searchParams.get('view') as 'list'|'kanban') || 'list');
  const [supplyFilter, setSupplyFilter] = useState(searchParams.get('supply') || 'ALL');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  
  const { items, loading, error, updateItemSupplyConfig, transferToOutsourceOrPurchase, cancelProgress } = useProductionList();
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Filter items based on search, status, and supply
  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const status = i.production_status || 'PENDING';
      const supply = i.supply_type || 'INHOUSE';

      // 1. 계획 대기(PENDING) 상태가 아니면서, 사내 가공(INHOUSE)이 아닌 항목은
      // 생산 관리 화면이 아닌 외주/구매 관리 화면에서 보여야 하므로 필터링 제외
      // 단, 사용자가 명시적으로 '전체 상태'나 특정 조달 구분을 보고자 할 때는 제외하지 않음
      if (status !== 'PENDING' && supply !== 'INHOUSE') {
        if (statusFilter !== 'ALL') return false;
      }

      // 2. Keyword search
      if (keyword) {
        const lower = keyword.toLowerCase();
        const matchesKeyword = i.part_name?.toLowerCase().includes(lower) || 
                               i.po_no?.toLowerCase().includes(lower) ||
                               i.client_name?.toLowerCase().includes(lower);
        if (!matchesKeyword) return false;
      }
      
      // 3. Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'IN_PROGRESS') {
          if (!['IN_PROGRESS', 'PRODUCTION_READY'].includes(status)) return false;
        } else {
          if (status !== statusFilter) return false;
        }
      }
      
      // 4. Supply filter
      if (supplyFilter !== 'ALL') {
        if (supply !== supplyFilter) return false;
      }
      
      return true;
    });
  }, [items, keyword, statusFilter, supplyFilter]);

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

  // Debounced quantity update
  const handleQtyBlur = (item: any, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num !== item.production_qty) {
      updateItemSupplyConfig(item.id, { production_qty: num });
    }
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'selection',
      header: () => {
        // Allow selecting PENDING or *_READY items
        const selectableItems = filteredItems.filter(i => {
          const status = i.production_status || 'PENDING';
          return status === 'PENDING' || status.endsWith('_READY');
        });
        const isAllSelected = selectableItems.length > 0 && selectableItems.every(i => selectedItemIds.has(i.id));
        return (
          <input 
            type="checkbox"
            checked={isAllSelected}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedItemIds(new Set(selectableItems.map(item => item.id)));
              } else {
                setSelectedItemIds(new Set());
              }
            }}
            className="rounded border-border-default text-brand-500 focus:ring-brand-500"
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
            onChange={() => toggleItem(id)}
            disabled={!isSelectable}
            className={`rounded border-border-default focus:ring-brand-500 ${isSelectable ? 'text-brand-500' : 'text-gray-400 opacity-50 cursor-not-allowed'}`}
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
      header: '도면번호 / 품명',
      cell: info => {
        const item = info.row.original;
        return (
          <div>
            <div className="font-bold text-text-primary text-[13px] mb-0.5">{item.part_no || '-'}</div>
            <div className="text-xs text-text-secondary flex gap-2">
              <span>{item.part_name}</span>
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
        const isPending = item.production_status === 'PENDING' || !item.production_status;
        
        if (!isPending) {
          return <span className="font-medium text-brand-500">{item.production_qty ?? item.qty}</span>;
        }

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
        const isPending = item.production_status === 'PENDING' || !item.production_status;
        
        if (!isPending) {
          let label = '사내 가공';
          if (item.supply_type === 'OUTSOURCE') label = '외주 제작';
          if (item.supply_type === 'PURCHASE') label = '기성품 구매';
          return <span className="text-text-primary text-xs">{label}</span>;
        }

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
      header: '재고',
      cell: info => {
        const item = info.row.original;
        const isPending = item.production_status === 'PENDING' || !item.production_status;
        
        if (!isPending) {
          return (
            <Badge variant={item.use_stock ? 'success' : 'default'}>
              {item.use_stock ? '사용' : '미사용'}
            </Badge>
          );
        }

        return (
          <Toggle 
            checked={item.use_stock || false}
            onChange={(val) => updateItemSupplyConfig(item.id, { use_stock: val })} 
          />
        );
      },
      size: 60,
    }),
    columnHelper.accessor('material_supply_type', {
      header: '소재 조달',
      cell: info => {
        const item = info.row.original;
        const isPending = item.production_status === 'PENDING' || !item.production_status;
        
        if (!isPending) {
          let label = '해당없음';
          if (item.material_supply_type === 'ORDER') label = '발주';
          if (item.material_supply_type === 'STOCK') label = '소재 재고';
          if (item.material_supply_type === 'PROVIDED') label = '도급';
          return <span className="text-text-primary text-xs">{label}</span>;
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
    columnHelper.accessor('production_status', {
      header: '진행 상태',
      cell: info => {
        const status = (info.getValue() || 'PENDING').toUpperCase();
        let label = status;
        let variant: any = 'default';
        if (status === 'PENDING') { label = '대기'; variant = 'primary'; }
        else if (status === 'PRODUCTION_READY') { label = '생산 대기'; variant = 'warning'; }
        else if (status === 'OUTSOURCE_READY') { label = '외주 대기'; variant = 'warning'; }
        else if (status === 'PURCHASE_READY') { label = '구매 대기'; variant = 'warning'; }
        else if (status === 'IN_PROGRESS') { label = '진행 중'; variant = 'warning'; }
        else if (status === 'QC') { label = 'QC 검사'; variant = 'primary'; }
        else if (status === 'DONE') { label = '완료'; variant = 'success'; }
        
        return <Badge variant={variant}>{label}</Badge>;
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
      size: 150,
    })
  ], [filteredItems, selectedItemIds, updateItemSupplyConfig]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting, grouping, expanded, columnVisibility: { po_no: false } },
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

  const renderKanban = () => {
    const kanbanColumns = [
      { id: 'PENDING', label: '대기', color: 'border-gray-500/50' },
      { id: 'PRODUCTION_READY', label: '생산 대기', color: 'border-yellow-500/50' },
      { id: 'OUTSOURCE_READY', label: '외주 대기', color: 'border-yellow-500/50' },
      { id: 'PURCHASE_READY', label: '구매 대기', color: 'border-yellow-500/50' },
      { id: 'IN_PROGRESS', label: '진행 중', color: 'border-blue-500/50' },
      { id: 'QC', label: 'QC 검사', color: 'border-brand-500/50' },
      { id: 'DONE', label: '완료', color: 'border-green-500/50' },
    ];

    return (
      <div className="flex gap-4 h-full overflow-x-auto custom-scrollbar p-6 pt-0 animate-in fade-in">
        {kanbanColumns.map(col => {
          const colItems = filteredItems.filter(i => (i.production_status || 'PENDING') === col.id);
          // 탭이 선택되어 있다면 관련된 컬럼만 표시 (선택사항)
          if (statusFilter !== 'ALL') {
            if (statusFilter === 'IN_PROGRESS' && !['PRODUCTION_READY', 'IN_PROGRESS'].includes(col.id)) return null;
            if (statusFilter !== 'IN_PROGRESS' && statusFilter !== col.id) return null;
          }

          return (
            <div key={col.id} className={`flex flex-col min-w-[280px] w-[280px] bg-bg-surface rounded-lg border-t-4 ${col.color} border-l border-r border-b border-border-default`}>
              <div className="p-3 border-b border-border-default flex justify-between items-center bg-bg-elevated/50">
                <span className="font-bold text-sm text-text-primary">{col.label}</span>
                <span className="bg-bg-base px-2 py-0.5 rounded text-xs font-mono text-text-secondary">{colItems.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {colItems.map(item => {
                  const dday = calculateDDay(item.delivery_date);
                  let statusLabel = '대기';
                  let statusVariant: any = 'primary';
                  if (col.id === 'PRODUCTION_READY') { statusLabel = '생산 대기'; statusVariant = 'warning'; }
                  else if (col.id === 'OUTSOURCE_READY') { statusLabel = '외주 대기'; statusVariant = 'warning'; }
                  else if (col.id === 'PURCHASE_READY') { statusLabel = '구매 대기'; statusVariant = 'warning'; }
                  else if (col.id === 'IN_PROGRESS') { statusLabel = '진행 중'; statusVariant = 'warning'; }
                  else if (col.id === 'QC') { statusLabel = 'QC 검사'; statusVariant = 'primary'; }
                  else if (col.id === 'DONE') { statusLabel = '완료'; statusVariant = 'success'; }

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
                          onClick={(e) => { e.stopPropagation(); handleOpenMasking({name: 'placeholder.pdf'}, item.id); }}
                        >
                          <FileText size={12} className="text-text-secondary" /> 2D
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-border-default">
                        <div className="flex gap-2 items-center">
                          <span className="text-text-secondary" title="수주 수량">수주: {item.qty}</span>
                          <span className="text-brand-500 font-medium" title="생산 수량">생산: {item.production_qty ?? item.qty}</span>
                        </div>
                        <Badge variant={statusVariant} className="text-[10px]">{statusLabel}</Badge>
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

  return (
    <div className="flex flex-col h-full bg-bg-base animate-in fade-in">
      <div className="p-6 pb-0">
        <PageHeader
          title={
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Hammer className="text-brand-500" />
                생산 관리
              </div>
              <Tabs 
                tabs={[
                  { id: 'list', label: '리스트', icon: <List size={16} /> },
                  { id: 'kanban', label: '칸반', icon: <KanbanSquare size={16} /> }
                ]} 
                activeTab={viewMode} 
                onChange={(tab) => {
                  setViewMode(tab as 'list'|'kanban');
                  setSearchParams({ keyword, view: tab, supply: supplyFilter, status: statusFilter });
                }} 
              />
            </div>
          }
          actions={
            <div className="flex items-center gap-4">
              <div className="w-64 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <BaseInput 
                  className="pl-9 bg-bg-surface text-sm border-border-default h-9" 
                  placeholder="품명, PO번호, 거래처 검색..."
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setSearchParams({ keyword: e.target.value, view: viewMode, supply: supplyFilter, status: statusFilter });
                  }}
                />
              </div>

              {(() => {
                const hasPending = Array.from(selectedItemIds).some(id => {
                  const i = items.find(item => item.id === id);
                  return i && (i.production_status === 'PENDING' || !i.production_status);
                });
                const hasReady = Array.from(selectedItemIds).some(id => {
                  const i = items.find(item => item.id === id);
                  return i && i.production_status && i.production_status.endsWith('_READY');
                });
                
                return (
                  <div className="flex gap-2">
                    {hasReady && (
                      <Button 
                        variant="secondary"
                        onClick={async () => {
                          const res = await cancelProgress(Array.from(selectedItemIds));
                          if (res.success) {
                            toast.success(`${res.count}개 항목의 계획이 취소되었습니다.`);
                            setSelectedItemIds(new Set());
                          } else {
                            toast.error(res.error || '취소 처리에 실패했습니다.');
                          }
                        }}
                      >
                        선택 계획 취소 ({Array.from(selectedItemIds).filter(id => {
                          const i = items.find(item => item.id === id);
                          return i && i.production_status && i.production_status.endsWith('_READY');
                        }).length})
                      </Button>
                    )}
                    
                    <Button 
                      variant="primary"
                      disabled={!hasPending}
                      onClick={async () => {
                        const res = await transferToOutsourceOrPurchase(Array.from(selectedItemIds));
                        if (res.success) {
                          toast.success(`${res.count}개 항목의 계획 확정 및 진행 처리가 완료되었습니다.`);
                          setSelectedItemIds(new Set());
                        } else {
                          toast.error(res.error || '진행 처리에 실패했습니다. 대기(PENDING) 항목인지 확인하세요.');
                        }
                      }}
                    >
                      선택 항목 진행 ({Array.from(selectedItemIds).filter(id => {
                        const i = items.find(item => item.id === id);
                        return i && (i.production_status === 'PENDING' || !i.production_status);
                      }).length})
                    </Button>
                  </div>
                );
              })()}
            </div>
          }
        />

        <PageTabs
          tabs={[
            { id: 'ALL', label: '전체 상태' },
            { id: 'PENDING', label: '대기' },
            { id: 'IN_PROGRESS', label: '진행 중' },
            { id: 'QC', label: 'QC 검사' },
            { id: 'DONE', label: '완료' },
          ]}
          activeTab={statusFilter}
          onChange={(tab) => {
            setStatusFilter(tab);
            setSelectedItemIds(new Set());
            setSearchParams({ keyword, view: viewMode, supply: supplyFilter, status: tab });
          }}
          rightContent={
            <div className="flex items-center gap-4 text-sm">
              <div className="text-text-secondary flex items-center gap-2 mr-2">
                <Package size={16} />
                <span>총 <span className="text-brand-400 font-bold">{filteredItems.length}</span>개</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-medium text-xs whitespace-nowrap">조달 구분</span>
                <BaseSelect
                  value={supplyFilter}
                  onChange={(e) => {
                    setSupplyFilter(e.target.value);
                    setSelectedItemIds(new Set());
                    setSearchParams({ keyword, view: viewMode, supply: e.target.value, status: statusFilter });
                  }}
                  options={[
                    { value: 'ALL', label: '전체 조달' },
                    { value: 'INHOUSE', label: '사내' },
                    { value: 'OUTSOURCE', label: '외주' },
                    { value: 'PURCHASE', label: '구매' },
                  ]}
                  className="w-24"
                  selectClassName="text-xs py-1 px-2 bg-transparent border-none focus:ring-0 cursor-pointer hover:bg-bg-elevated transition-colors"
                />
              </div>

              <div className="h-4 w-[1px] bg-border-default mx-2"></div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-medium text-xs whitespace-nowrap">수주번호 그룹화</span>
                <Toggle 
                  checked={grouping.length > 0} 
                  onChange={(checked) => {
                    if (checked) {
                      setGrouping(['po_no']);
                      setExpanded(true); // true means expand all in tanstack table
                    } else {
                      setGrouping([]);
                      setExpanded({});
                    }
                  }} 
                />
              </div>
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col mt-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-secondary">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            데이터를 불러오는 중...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-danger">오류: {error}</div>
        ) : viewMode === 'list' ? (
          <div className="p-6 pt-0 h-full flex flex-col">
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
                          품목 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          renderKanban()
        )}
      </div>

      <DocumentMaskingModal
        isOpen={maskingModalOpen}
        onClose={() => setMaskingModalOpen(false)}
        file={maskingFile}
        isViewerOnly={true}
        onSaveMaskedPdf={(newFile) => {
          // This modal acts as viewer-only here
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
