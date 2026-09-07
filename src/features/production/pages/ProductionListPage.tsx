import React, { useState, useMemo } from 'react';
import { useStickySearchParams } from '../../../hooks/useStickySearchParams';
import { useProductionList } from '../hooks/useProductionList';
import { Button, BaseInput as Input, Badge } from '../../../design-system';
import { PageTabs } from '../../../design-system/PageTabs';
import { 
  Search, Hammer, Package, List, CheckSquare, Square, 
  ChevronDown, ArrowRight, RotateCcw, Truck, FileText 
} from 'lucide-react';
import { DocumentMaskingModal } from '../../../shared/components/DocumentMaskingModal';
import { ImagePreviewModal } from '../../../shared/components/ImagePreviewModal';
import { toast } from '../../../shared/stores/useToastStore';
import { ProcessDesignModal } from '../components/ProcessDesignModal';
import { ProductionProcessDetailModal } from '../components/ProductionProcessDetailModal';
import { ProductionTableComponent } from '../components/ProductionTableComponent';
import { ProductionGroupedView } from '../components/ProductionGroupedView';

export const ProductionListPage = () => {
  const [searchParams, setSearchParams] = useStickySearchParams('production_list_filters', { keyword: '', view: 'list', supply: 'ALL', status: 'ALL' });
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [viewMode, setViewMode] = useState<'list'|'grouped'>((searchParams.get('view') === 'grouped' ? 'grouped' : 'list'));
  const [supplyFilter, setSupplyFilter] = useState(searchParams.get('supply') || 'ALL');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  
  const { items, loading, error, updateItemSupplyConfig, transferToOutsourceOrPurchase, cancelProgress, fetchItems } = useProductionList();
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [processDesignModalOpen, setProcessDesignModalOpen] = useState(false);
  const [designTargetItemIds, setDesignTargetItemIds] = useState<string[] | null>(null);
  const [selectedItemForProcessDetail, setSelectedItemForProcessDetail] = useState<any | null>(null);

  const selectedItemsForDesign = useMemo(() => {
    const idsToUse = designTargetItemIds || Array.from(selectedItemIds);
    return items.filter(i => idsToUse.includes(i.id));
  }, [items, selectedItemIds, designTargetItemIds]);

  // Filter items based on search, status, and supply
  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const status = i.production_status || 'PENDING';
      const supply = i.supply_type || 'INHOUSE';

      if (status !== 'PENDING' && supply !== 'INHOUSE') {
        if (statusFilter !== 'ALL') return false;
      }

      // Keyword search
      if (keyword) {
        const lower = keyword.toLowerCase();
        const matchesKeyword = i.part_name?.toLowerCase().includes(lower) || 
                               i.po_no?.toLowerCase().includes(lower) ||
                               i.order_item_no?.toLowerCase().includes(lower) ||
                               i.client_name?.toLowerCase().includes(lower);
        if (!matchesKeyword) return false;
      }
      
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'IN_PROGRESS') {
          if (!['IN_PROGRESS', 'PRODUCTION_READY', 'OUTSOURCE_READY', 'PURCHASE_READY', 'QC'].includes(status)) return false;
        } else if (statusFilter === 'DONE') {
          if (!['DONE', 'SHIPPING_READY', 'COMPLETED'].includes(status)) return false;
        } else {
          if (status !== statusFilter) return false;
        }
      }
      
      // Supply filter
      if (supplyFilter !== 'ALL') {
        if (supply !== supplyFilter) return false;
      }
      
      return true;
    });
  }, [items, keyword, statusFilter, supplyFilter]);

  // 각 탭별 수량 계산 (제안 2: 전체, 생산 대기, 진행 중, 완료)
  const statusCounts = useMemo(() => {
    const counts = { ALL: items.length, PENDING: 0, IN_PROGRESS: 0, DONE: 0 };
    items.forEach(i => {
      const s = i.production_status || 'PENDING';
      if (s === 'PENDING') counts.PENDING++;
      else if (['IN_PROGRESS', 'PRODUCTION_READY', 'OUTSOURCE_READY', 'PURCHASE_READY', 'QC'].includes(s)) counts.IN_PROGRESS++;
      else if (['DONE', 'SHIPPING_READY', 'COMPLETED'].includes(s)) counts.DONE++;
    });
    return counts;
  }, [items]);

  // 수주번호별 그룹핑 연산
  const groupedOrders = useMemo(() => {
    const map = new Map<string, { poNo: string; clientName: string; deliveryDate?: string; items: any[] }>();
    filteredItems.forEach(item => {
      const poKey = item.po_no || '기타';
      const group = map.get(poKey);
      if (group) {
        group.items.push(item);
      } else {
        map.set(poKey, {
          poNo: poKey,
          clientName: item.client_name || '알 수 없음',
          deliveryDate: item.delivery_date,
          items: [item]
        });
      }
    });
    return Array.from(map.values());
  }, [filteredItems]);

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (selectableItems: any[]) => {
    const isAll = selectableItems.length > 0 && selectableItems.every(i => selectedItemIds.has(i.id));
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      selectableItems.forEach(i => {
        if (isAll) next.delete(i.id);
        else next.add(i.id);
      });
      return next;
    });
  };

  const handleSelectOrderGroup = (groupItems: any[]) => {
    const selectableItems = groupItems.filter(i => {
      const status = i.production_status || 'PENDING';
      return status === 'PENDING' || status.endsWith('_READY');
    });
    const allSelected = selectableItems.length > 0 && selectableItems.every(i => selectedItemIds.has(i.id));

    setSelectedItemIds(prev => {
      const next = new Set(prev);
      selectableItems.forEach(i => {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      });
      return next;
    });
  };

  const handleProceedOrderGroup = async (groupItems: any[]) => {
    const pendingItems = groupItems.filter(i => i.production_status === 'PENDING' || !i.production_status);
    if (pendingItems.length === 0) {
      toast.error('진행 가능한 대기(PENDING) 항목이 없습니다.');
      return;
    }

    const targetIds = pendingItems.map(i => i.id);
    const res = await transferToOutsourceOrPurchase(targetIds);
    if (res.success) {
      toast.success(`${res.count || targetIds.length}개 항목의 계획 확정 및 진행 처리가 완료되었습니다.`);
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        targetIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      toast.error(res.error || '진행 처리에 실패했습니다.');
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

  const handleQtyBlur = (item: any, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num !== item.production_qty) {
      updateItemSupplyConfig(item.id, { production_qty: num });
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full bg-bg-base w-full">
      {/* 1. 출하 관리와 100% 동일한 상단 헤더 & 툴바 구조 */}
      <div className="flex flex-col gap-4 p-6 pb-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <Hammer className="w-5 h-5" />
              </div>
              생산 관리
            </h1>
            <p className="text-text-secondary mt-1 text-sm">
              수주된 부품의 공정을 설계하고, 사내 가공 및 외주/구매 일정을 총괄 관리합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 조달 구분 선택 콤보박스 (출하 관리의 고객사 드롭다운과 동일 스타일) */}
            <div className="relative w-36">
              <select
                value={supplyFilter}
                onChange={(e) => {
                  setSupplyFilter(e.target.value);
                  setSelectedItemIds(new Set());
                  setSearchParams({ keyword, view: viewMode, supply: e.target.value, status: statusFilter });
                }}
                className="w-full h-9 pl-3 pr-8 text-xs font-medium bg-bg-surface border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer appearance-none shadow-sm"
              >
                <option value="ALL">전체 조달 구분</option>
                <option value="INHOUSE">사내 가공</option>
                <option value="OUTSOURCE">외주 제작</option>
                <option value="PURCHASE">기성품 구매</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            </div>

            {/* 통합 검색창 */}
            <div className="relative w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input 
                className="pl-9 h-9 text-xs" 
                placeholder="품명, 품번, PO 검색..." 
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setSearchParams({ keyword: e.target.value, view: viewMode, supply: supplyFilter, status: statusFilter });
                }}
              />
            </div>

            {/* 리스트 vs 수주별 묶음 토글 세그먼트 버튼 */}
            <div className="flex items-center bg-bg-surface border border-border-default rounded-lg p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  setSearchParams({ keyword, view: 'list', supply: supplyFilter, status: statusFilter });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-brand-500 text-white shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="전체 통합 리스트 보기"
              >
                <List className="w-3.5 h-3.5" />
                <span>리스트</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('grouped');
                  setSearchParams({ keyword, view: 'grouped', supply: supplyFilter, status: statusFilter });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-brand-500 text-white shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="수주번호별 묶어서 보기"
              >
                <Package className="w-3.5 h-3.5" />
                <span>수주별 묶음</span>
              </button>
            </div>

            {/* 액션 버튼 */}
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
                <div className="flex items-center gap-2">
                  {hasReady && (
                    <Button 
                      variant="secondary"
                      size="sm"
                      className="h-9 text-xs px-3"
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
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      선택 계획 취소 ({Array.from(selectedItemIds).filter(id => {
                        const i = items.find(item => item.id === id);
                        return i && i.production_status && i.production_status.endsWith('_READY');
                      }).length})
                    </Button>
                  )}

                  <Button 
                    variant="primary" 
                    size="sm"
                    className="h-9 text-xs font-semibold px-3 shadow-sm bg-brand-500 hover:bg-brand-600 text-white"
                    disabled={!hasPending}
                    onClick={async () => {
                      const targetItemIds = Array.from(selectedItemIds).filter(id => {
                        const i = items.find(item => item.id === id);
                        return i && (i.production_status === 'PENDING' || !i.production_status);
                      });
                      
                      const res = await transferToOutsourceOrPurchase(targetItemIds);
                      if (res.success) {
                        toast.success(`${res.count || targetItemIds.length}개 항목의 계획 확정 및 진행 처리가 완료되었습니다.`);
                        setSelectedItemIds(new Set());
                      } else {
                        toast.error(res.error || '진행 처리에 실패했습니다. 대기(PENDING) 항목인지 확인하세요.');
                      }
                    }}
                  >
                    <Hammer className="w-3.5 h-3.5 mr-1.5" />
                    선택 항목 진행 ({Array.from(selectedItemIds).filter(id => {
                      const i = items.find(item => item.id === id);
                      return i && (i.production_status === 'PENDING' || !i.production_status);
                    }).length}건)
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 2. 상태 탭 (PageTabs) - 실무 4대 핵심 탭 */}
        <PageTabs
          tabs={[
            { id: 'ALL', label: `전체 (${statusCounts.ALL})` },
            { id: 'PENDING', label: `생산 대기 (${statusCounts.PENDING})` },
            { id: 'IN_PROGRESS', label: `진행 중 (${statusCounts.IN_PROGRESS})` },
            { id: 'DONE', label: `완료 (${statusCounts.DONE})` },
          ]}
          activeTab={statusFilter}
          onChange={(tab) => {
            setStatusFilter(tab);
            setSelectedItemIds(new Set());
            setSearchParams({ keyword, view: viewMode, supply: supplyFilter, status: tab });
          }}
        />
      </div>

      {/* 3. 본문 스크롤 영역 (출하 관리와 동일한 패딩과 스크롤) */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-40 text-danger">오류: {error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-bg-surface border border-border-default rounded-xl py-20 text-center text-text-secondary shadow-sm">
            <Package className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-40" />
            <p className="font-medium text-text-primary mb-1">표시할 생산 품목이 없습니다.</p>
            <p className="text-xs text-text-tertiary">수주 관리에서 신규 수주를 등록하거나 필터 조건을 변경해보세요.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* =========================================================
             Mode A: 전체 통합 리스트 뷰 (출하 관리 스타일 둥근 박스)
             ========================================================= */
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
            <ProductionTableComponent
              items={filteredItems}
              selectedItemIds={selectedItemIds}
              onToggleItem={toggleItem}
              onToggleSelectAll={toggleSelectAll}
              onOpenMasking={handleOpenMasking}
              onOpenDesignModal={(id) => {
                setDesignTargetItemIds([id]);
                setProcessDesignModalOpen(true);
              }}
              onOpenProcessDetail={(item) => setSelectedItemForProcessDetail(item)}
              onQtyBlur={handleQtyBlur}
              onUpdateSupplyConfig={updateItemSupplyConfig}
            />
          </div>
        ) : (
          /* =========================================================
             Mode B: 출하 관리 스타일 수주별 묶음 뷰 (Grouped View)
             ========================================================= */
          <ProductionGroupedView
            groupedOrders={groupedOrders}
            selectedItemIds={selectedItemIds}
            onSelectOrderGroup={handleSelectOrderGroup}
            onProceedOrderGroup={handleProceedOrderGroup}
            onToggleItem={toggleItem}
            onToggleSelectAll={toggleSelectAll}
            onOpenMasking={handleOpenMasking}
            onOpenDesignModal={(id) => {
              setDesignTargetItemIds([id]);
              setProcessDesignModalOpen(true);
            }}
            onOpenProcessDetail={(item) => setSelectedItemForProcessDetail(item)}
            onQtyBlur={handleQtyBlur}
            onUpdateSupplyConfig={updateItemSupplyConfig}
          />
        )}
      </div>

      <DocumentMaskingModal
        isOpen={maskingModalOpen}
        onClose={() => setMaskingModalOpen(false)}
        file={maskingFile}
        isViewerOnly={true}
        onSaveMaskedPdf={() => {}}
      />
      {imagePreviewModalOpen && previewFile && (
        <ImagePreviewModal
          file={previewFile}
          onClose={() => {
            setImagePreviewModalOpen(false);
            setPreviewFile(null);
          }}
        />
      )}

      {processDesignModalOpen && (
        <ProcessDesignModal
          selectedItems={selectedItemsForDesign}
          onClose={() => {
            setProcessDesignModalOpen(false);
            setDesignTargetItemIds(null);
          }}
          onSuccess={() => {
            setProcessDesignModalOpen(false);
            setDesignTargetItemIds(null);
            setSelectedItemIds(new Set());
            fetchItems();
          }}
        />
      )}

      {selectedItemForProcessDetail && (
        <ProductionProcessDetailModal
          item={selectedItemForProcessDetail}
          onClose={() => setSelectedItemForProcessDetail(null)}
        />
      )}
    </div>
  );
};
