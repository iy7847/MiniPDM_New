import React, { useState, useRef, useMemo } from 'react';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { BaseInput as Input } from '../../design-system/BaseInput';
import { PageHeader } from '../../design-system/PageHeader';
import { PageTabs } from '../../design-system/PageTabs';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../design-system/Table';
import { 
  Search, Truck, Printer, Package, RotateCcw, Calendar, 
  CheckSquare, Square, Barcode, ArrowRight, CheckCircle2,
  Building2, List, Layers, ChevronDown, ChevronRight
} from 'lucide-react';
import { useShippingList } from './hooks/useShippingList';
import type { PendingShippingItem } from './hooks/useShippingList';
import { CreateShipmentModal } from './components/CreateShipmentModal';
import { ShippingLabelPreview } from './components/ShippingLabelPreview';
import { toast } from '@/shared/stores/useToastStore';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useStickySearchParams } from '@/hooks/useStickySearchParams';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

const calculateDDay = (targetDate?: string) => {
  if (!targetDate) return null;
  const cleanDate = targetDate.split('T')[0];
  const target = new Date(cleanDate).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  const diff = target - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return { text: `D+${Math.abs(days)}`, variant: 'danger' as const };
  if (days === 0) return { text: 'D-Day', variant: 'danger' as const };
  if (days <= 3) return { text: `D-${days}`, variant: 'warning' as const };
  return { text: `D-${days}`, variant: 'default' as const };
};

export const ShippingPage: React.FC = () => {
  const { confirm } = useConfirm();
  const [searchParams, setSearchParams] = useStickySearchParams('shipping_list_filters', { keyword: '', tab: 'pending' });
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pending');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('keyword') || '');

  // 고객사 필터 및 보기 모드 (리스트 vs 고객사별 묶음)
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');

  const { pendingItems, shipments, loading, reload, cancelShipment } = useShippingList();
  
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [printShipment, setPrintShipment] = useState<any>(null);
  const [expandedShipmentIds, setExpandedShipmentIds] = useState<Set<string>>(new Set());

  const toggleExpandShipment = (id: string) => {
    setExpandedShipmentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 바코드 스캔 전용 상태
  const [barcodeInput, setBarcodeInput] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedPendingIds(new Set());
    setSearchParams({ keyword: searchTerm, tab });
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setSearchParams({ keyword: val, tab: activeTab });
  };

  // 고객사 드롭다운 옵션 목록
  const clientOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    pendingItems.forEach(item => {
      const existing = map.get(item.client_id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.client_id, { name: item.client_name, count: 1 });
      }
    });

    const list = Array.from(map.entries()).map(([id, data]) => ({
      value: id,
      label: `${data.name} (${data.count}건)`
    }));

    return [{ value: 'ALL', label: `전체 고객사 (${pendingItems.length}건)` }, ...list];
  }, [pendingItems]);

  // 바코드 인식 공통 핸들러
  const handleBarcodeScan = (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    if (activeTab !== 'pending') {
      setActiveTab('pending');
      setSearchParams({ keyword: searchTerm, tab: 'pending' });
    }

    // 출하 대기 목록에서 해당 바코드, 도면번호, 고객 PO와 일치하는 항목 검색
    const targetItem = pendingItems.find(
      i => i.order_item_no?.toLowerCase() === code.toLowerCase() ||
           i.part_no?.toLowerCase() === code.toLowerCase() ||
           i.client_po_no?.toLowerCase() === code.toLowerCase()
    );

    if (targetItem) {
      setSelectedPendingIds(prev => {
        const next = new Set(prev);
        next.add(targetItem.id);
        return next;
      });

      setHighlightedItemId(targetItem.id);
      setTimeout(() => setHighlightedItemId(null), 3000);

      toast.success(`[${targetItem.order_item_no}] ${targetItem.part_name} 선택되었습니다.`);
    } else {
      toast.error(`[${code}] 품목을 출하 대기 목록에서 찾을 수 없습니다.`);
    }
  };

  // 하드웨어 바코드 스캐너 연동
  useBarcodeScanner({
    onScan: (code) => {
      handleBarcodeScan(code);
    }
  });

  // 수동 바코드 입력 폼 제출
  const handleBarcodeManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput) {
      handleBarcodeScan(barcodeInput);
      setBarcodeInput('');
    }
  };

  // Filter pending items
  const filteredPending = useMemo(() => {
    return pendingItems.filter(item => {
      if (selectedClientId !== 'ALL' && item.client_id !== selectedClientId) {
        return false;
      }
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (item.client_name || '').toLowerCase().includes(lower) || 
             (item.part_name || '').toLowerCase().includes(lower) || 
             (item.part_no || '').toLowerCase().includes(lower) || 
             (item.order_item_no || '').toLowerCase().includes(lower) ||
             (item.client_po_no || '').toLowerCase().includes(lower) ||
             (item.order_no || '').toLowerCase().includes(lower);
    });
  }, [pendingItems, selectedClientId, searchTerm]);

  // 고객사별 그룹핑 연산
  const groupedPending = useMemo(() => {
    const map = new Map<string, { clientId: string; clientName: string; items: PendingShippingItem[] }>();
    filteredPending.forEach(item => {
      const group = map.get(item.client_id);
      if (group) {
        group.items.push(item);
      } else {
        map.set(item.client_id, {
          clientId: item.client_id,
          clientName: item.client_name,
          items: [item]
        });
      }
    });
    return Array.from(map.values());
  }, [filteredPending]);

  // Filter shipments
  const filteredShipments = shipments.filter(ship => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    const clientName = ship.recipient_name || ship.clients?.name || ship.shipment_items?.[0]?.order_items?.orders?.clients?.name || '';
    return clientName.toLowerCase().includes(lower) || 
           (ship.shipment_no || '').toLowerCase().includes(lower) ||
           (ship.tracking_no || '').toLowerCase().includes(lower);
  });

  const handleTogglePending = (id: string) => {
    setSelectedPendingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedPendingIds.size === filteredPending.length) {
      setSelectedPendingIds(new Set());
    } else {
      setSelectedPendingIds(new Set(filteredPending.map(item => item.id)));
    }
  };

  const handleSelectGroup = (items: PendingShippingItem[]) => {
    const allSelected = items.every(i => selectedPendingIds.has(i.id));
    setSelectedPendingIds(prev => {
      const next = new Set(prev);
      items.forEach(i => {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      });
      return next;
    });
  };

  // 특정 고객사 건들만 즉시 일괄 출하 모달 띄우기
  const handleShipGroupImmediately = (items: PendingShippingItem[]) => {
    setSelectedPendingIds(new Set(items.map(i => i.id)));
    setShowCreateModal(true);
  };

  const handleCreateShipmentClick = () => {
    if (selectedPendingIds.size === 0) {
      toast.error('출하할 품목을 선택해주세요.');
      return;
    }
    
    // 같은 고객사의 품목인지 확인
    const selected = pendingItems.filter(i => selectedPendingIds.has(i.id));
    const clients = new Set(selected.map(i => i.client_id));
    
    if (clients.size > 1) {
      toast.error('같은 고객사의 품목만 합배송(묶음 출하) 할 수 있습니다.');
      return;
    }
    
    setShowCreateModal(true);
  };

  const handleSingleItemShip = (item: PendingShippingItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPendingIds(new Set([item.id]));
    setShowCreateModal(true);
  };

  const handleCancelShipment = async (shipmentId: string, shipmentNo: string) => {
    const isOk = await confirm({
      title: '출하 취소',
      description: `출하 전표 [${shipmentNo}]를 취소하시겠습니까?\n출하되었던 품목들은 다시 '출하 대기' 상태로 복구됩니다.`,
      confirmLabel: '출하 취소',
      isDanger: true,
    });
    if (isOk) {
      await cancelShipment(shipmentId);
    }
  };

  // 공통 대기 품목 테이블 컴포넌트 렌더러
  const renderPendingTable = (items: PendingShippingItem[], showClientCol: boolean = true) => (
    <Table>
      <Thead>
        <Tr className="bg-bg-elevated/80 border-b border-border-default">
          <Th className="w-12 text-center py-3.5 whitespace-nowrap">
            <input 
              type="checkbox"
              className="w-4 h-4 rounded border-border-default text-brand-500 focus:ring-brand-500 bg-bg-base cursor-pointer"
              checked={items.length > 0 && items.every(i => selectedPendingIds.has(i.id))}
              onChange={() => handleSelectGroup(items)}
            />
          </Th>
          {showClientCol && <Th className="w-44 whitespace-nowrap">거래처 / 시스템 품번</Th>}
          {!showClientCol && <Th className="w-36 whitespace-nowrap">시스템 품번</Th>}
          <Th className="min-w-[160px] whitespace-nowrap">도면번호 / 품명</Th>
          <Th className="w-36 whitespace-nowrap">규격</Th>
          <Th className="w-32 whitespace-nowrap">고객사 PO</Th>
          <Th className="w-32 whitespace-nowrap">수주 번호</Th>
          <Th className="w-32 whitespace-nowrap">납기일</Th>
          <Th className="w-28 text-right whitespace-nowrap pr-4">출하 가능 수량</Th>
          <Th className="w-24 text-center whitespace-nowrap">개별 출하</Th>
        </Tr>
      </Thead>
      <Tbody>
        {items.map(item => {
          const isSelected = selectedPendingIds.has(item.id);
          const isHighlighted = highlightedItemId === item.id;
          const dDay = calculateDDay(item.delivery_date);
          const formattedDate = item.delivery_date ? item.delivery_date.split('T')[0] : '-';

          return (
            <Tr 
              key={item.id}
              className={`cursor-pointer transition-colors ${
                isHighlighted 
                  ? 'bg-brand-500/20 ring-1 ring-brand-500/50' 
                  : isSelected 
                    ? 'bg-brand-500/10' 
                    : 'hover:bg-bg-elevated/60'
              }`}
              onClick={() => handleTogglePending(item.id)}
            >
              {/* 선택 체크박스 */}
              <Td className="text-center whitespace-nowrap py-3" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-border-default text-brand-500 focus:ring-brand-500 bg-bg-base cursor-pointer"
                  checked={isSelected}
                  onChange={() => handleTogglePending(item.id)}
                />
              </Td>

              {/* 거래처 / 시스템 품번 */}
              {showClientCol ? (
                <Td className="whitespace-nowrap py-3">
                  <div className="font-semibold text-text-primary text-xs">{item.client_name}</div>
                  <div className="mt-1">
                    <span className="font-mono text-[11px] font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded">
                      {item.order_item_no}
                    </span>
                  </div>
                </Td>
              ) : (
                <Td className="whitespace-nowrap py-3">
                  <span className="font-mono text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                    {item.order_item_no}
                  </span>
                </Td>
              )}

              {/* 도면번호 / 품명 (2줄) */}
              <Td className="whitespace-nowrap py-3">
                <div className="font-mono font-bold text-text-primary text-xs">{item.part_no || '-'}</div>
                <div className="text-xs text-text-secondary mt-0.5 font-medium truncate" title={item.part_name}>
                  {item.part_name}
                </div>
              </Td>

              {/* 규격 */}
              <Td className="text-xs font-mono text-text-secondary whitespace-nowrap py-3">
                {item.spec || '-'}
              </Td>

              {/* 고객사 PO (진짜 고객 발주번호) */}
              <Td className="text-xs font-mono text-text-primary whitespace-nowrap py-3 font-semibold">
                {item.client_po_no || '-'}
              </Td>

              {/* 수주 번호 (내부 PO 번호) */}
              <Td className="text-xs font-mono text-text-tertiary whitespace-nowrap py-3">
                {item.order_no || '-'}
              </Td>

              {/* 납기일 (2줄 형태: 윗줄 날짜, 아랫줄 D-Day 뱃지) */}
              <Td className="whitespace-nowrap py-3">
                {item.delivery_date ? (
                  <div className="flex flex-col gap-1 items-start">
                    <span className="text-text-primary text-xs font-mono">{formattedDate}</span>
                    {dDay && (
                      <Badge variant={dDay.variant} className="text-[9px] px-1.5 py-0.5 font-bold">
                        {dDay.text}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-text-tertiary text-xs">-</span>
                )}
              </Td>

              {/* 출하 가능 수량 */}
              <Td className="text-right font-mono font-bold text-brand-400 text-sm whitespace-nowrap pr-4 py-3">
                {item.shippable_qty.toLocaleString()}
              </Td>

              {/* 개별 출하 액션 */}
              <Td className="text-center whitespace-nowrap py-3" onClick={(e) => e.stopPropagation()}>
                <button 
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 h-7.5 px-3 rounded-lg text-xs font-semibold bg-bg-elevated text-text-primary border border-border-default hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-all shadow-sm whitespace-nowrap"
                  onClick={(e) => handleSingleItemShip(item, e)}
                >
                  <span>출하</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );

  return (
    <div className="flex flex-col gap-5 animate-in fade-in h-full bg-bg-base w-full">
      <div className="flex flex-col gap-4 p-6 pb-0">
        <PageHeader
          icon={Truck}
          title="출하 관리"
          description="가공 완료된 부품을 고객사에 출하(배송) 처리하고 공식 거래명세서를 발행합니다."
          className="mb-0"
          actions={
            activeTab === 'pending' ? (
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleCreateShipmentClick}
                disabled={selectedPendingIds.size === 0}
                className="h-9 text-xs font-semibold px-4 shadow-sm"
              >
                <Truck className="w-4 h-4 mr-1.5" />
                선택 묶음 출하 ({selectedPendingIds.size}건)
              </Button>
            ) : undefined
          }
        />

        <PageTabs
          tabs={[
            { id: 'pending', label: `출하 대기 (${filteredPending.length})` },
            { id: 'shipped', label: `출하 완료 (${filteredShipments.length})` }
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
          rightContent={
            <div className="text-xs text-text-secondary">
              총 <span className="text-brand-400 font-bold">{activeTab === 'pending' ? filteredPending.length : filteredShipments.length}</span> 건
            </div>
          }
        />

        {/* 🛠️ 필터 및 전용 툴바 영역 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-surface p-3 rounded-xl border border-border-default shadow-sm">
          {/* 좌측: 바코드 스캔 + 고객사 드롭다운 + 검색창 */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 바코드 스캔/입력 폼 */}
            <form onSubmit={handleBarcodeManualSubmit} className="relative flex items-center">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
              <input 
                ref={barcodeInputRef}
                type="text"
                className="pl-9 pr-14 h-9 text-xs font-mono bg-bg-base border border-brand-500/40 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 w-48 transition-all shadow-sm"
                placeholder="바코드 스캔 (P...)"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
              <button 
                type="submit" 
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-semibold bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors shadow-sm"
              >
                입력
              </button>
            </form>

            {/* 고객사 선택 필터 콤보박스 (대기 탭일 때) */}
            {activeTab === 'pending' && (
              <div className="relative w-44">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full h-9 pl-3 pr-8 text-xs font-medium bg-bg-base border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer appearance-none shadow-sm"
                >
                  {clientOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>
            )}

            {/* 통합 검색창 */}
            <div className="relative w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input 
                className="pl-9 h-9 text-xs bg-bg-base" 
                placeholder="품명, 품번, PO 검색..." 
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* 우측: 보기 모드 전환 & 전체 선택 (대기 탭일 때) */}
          {activeTab === 'pending' && (
            <div className="flex items-center gap-2">
              {/* 리스트 vs 고객사별 묶음 토글 */}
              <div className="flex items-center bg-bg-base border border-border-default rounded-lg p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
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
                  onClick={() => setViewMode('grouped')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'grouped'
                      ? 'bg-brand-500 text-white shadow-sm font-semibold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="고객사별로 묶어서 보기"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>고객사별</span>
                </button>
              </div>

              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleToggleSelectAll}
                disabled={filteredPending.length === 0}
                className="h-9 text-xs px-3 bg-bg-base"
              >
                {selectedPendingIds.size > 0 && selectedPendingIds.size === filteredPending.length ? (
                  <CheckSquare className="w-4 h-4 mr-1.5 text-brand-400" />
                ) : (
                  <Square className="w-4 h-4 mr-1.5 text-text-tertiary" />
                )}
                전체 선택
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'pending' ? (
          /* =========================================================
             1. 출하 대기 화면 (리스트 뷰 vs 고객사별 묶음 뷰)
             ========================================================= */
          filteredPending.length === 0 ? (
            <div className="bg-bg-surface border border-border-default rounded-xl py-20 text-center text-text-secondary shadow-sm">
              <Package className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-40" />
              <p className="font-medium text-text-primary mb-1">출하 대기 중인 품목이 없습니다.</p>
              <p className="text-xs text-text-tertiary">생산 관리 또는 현장 스캐너에서 가공이 완료되면 이곳에 실시간 집계됩니다.</p>
            </div>
          ) : viewMode === 'list' ? (
            /* Mode A: 전체 통합 리스트 뷰 */
            <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
              {renderPendingTable(filteredPending, true)}
            </div>
          ) : (
            /* Mode B: 고객사별 묶음 뷰 (Grouped View) */
            <div className="flex flex-col gap-5">
              {groupedPending.map(group => {
                const totalPcs = group.items.reduce((sum, i) => sum + i.shippable_qty, 0);
                const allGroupSelected = group.items.every(i => selectedPendingIds.has(i.id));

                return (
                  <div 
                    key={group.clientId}
                    className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm transition-all"
                  >
                    {/* 고객사 그룹 헤더 */}
                    <div className="px-5 py-3.5 bg-bg-elevated/90 border-b border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-text-primary text-sm tracking-wide">
                              {group.clientName}
                            </h3>
                            <Badge variant="primary" className="text-[10px] px-2 py-0.5">
                              대기 {group.items.length}개 품목
                            </Badge>
                          </div>
                          <p className="text-[11px] text-text-tertiary mt-0.5 font-mono">
                            총 출하 대기 수량: <span className="font-bold text-brand-400">{totalPcs.toLocaleString()}</span>개
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs px-2.5"
                          onClick={() => handleSelectGroup(group.items)}
                        >
                          {allGroupSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 mr-1.5 text-text-tertiary" />
                          )}
                          이 고객사 전체 선택
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-8 text-xs font-semibold px-3 shadow-sm"
                          onClick={() => handleShipGroupImmediately(group.items)}
                        >
                          <Truck className="w-3.5 h-3.5 mr-1.5" />
                          이 고객사 바로 출하 등록
                        </Button>
                      </div>
                    </div>

                    {/* 고객사 품목 테이블 */}
                    {renderPendingTable(group.items, false)}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* =========================================================
             2. 출하 완료 테이블 (고밀도 리스트 형태)
             ========================================================= */
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
            <Table>
              <Thead>
                <Tr className="bg-bg-elevated/80 border-b border-border-default">
                  <Th className="w-32 whitespace-nowrap py-3.5">출하일자</Th>
                  <Th className="w-44 whitespace-nowrap">전표 번호</Th>
                  <Th className="w-36 whitespace-nowrap">고객사</Th>
                  <Th className="min-w-[160px] whitespace-nowrap">출하 품목 요약</Th>
                  <Th className="w-60 whitespace-nowrap">배송 수단 / 송장 번호</Th>
                  <Th className="w-32 whitespace-nowrap">수령인</Th>
                  <Th className="w-24 text-center whitespace-nowrap">상태</Th>
                  <Th className="w-48 text-right whitespace-nowrap pr-4">관리</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredShipments.map((ship) => {
                  const clientName = ship.clients?.name || ship.recipient_name || '고객사';
                  const itemsCount = ship.shipment_items?.length || 0;
                  const firstItem = ship.shipment_items?.[0]?.order_items;
                  const totalQty = ship.shipment_items?.reduce((sum: number, si: any) => sum + Number(si.quantity), 0) || 0;
                  const itemSummary = firstItem 
                    ? `${firstItem.part_name}${itemsCount > 1 ? ` 외 ${itemsCount - 1}건` : ''} (${totalQty.toLocaleString()})`
                    : `${itemsCount}개 품목`;
                  const isExpanded = expandedShipmentIds.has(ship.id);

                  return (
                    <React.Fragment key={ship.id}>
                      <Tr 
                        className={`hover:bg-bg-elevated/70 transition-colors cursor-pointer select-none ${isExpanded ? 'bg-bg-elevated/40' : ''}`}
                        onClick={() => toggleExpandShipment(ship.id)}
                      >
                        {/* 출하일자 + 펼침 아이콘 */}
                        <Td className="text-xs font-mono text-text-secondary whitespace-nowrap py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-text-tertiary transition-transform duration-200">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-brand-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-text-tertiary" />
                              )}
                            </span>
                            <span>{new Date(ship.shipped_at || ship.created_at).toLocaleDateString()}</span>
                          </div>
                        </Td>

                        {/* 전표 번호 (스타일리시 칩) */}
                        <Td className="whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                            {ship.shipment_no}
                          </span>
                        </Td>

                        {/* 고객사 */}
                        <Td className="font-semibold text-text-primary text-xs whitespace-nowrap">
                          {clientName}
                        </Td>

                        {/* 출하 품목 요약 */}
                        <Td className="text-sm font-medium text-text-primary whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{itemSummary}</span>
                            <span className="text-[11px] text-text-tertiary font-normal">
                              {isExpanded ? '(접기)' : '(상세보기)'}
                            </span>
                          </div>
                        </Td>

                        {/* 배송 수단 / 송장 번호 */}
                        <Td className="text-xs text-text-secondary font-mono whitespace-nowrap">
                          <span>{ship.courier || '직접 배송'}</span>
                          {ship.tracking_no && (
                            <span className="text-text-tertiary ml-1.5">({ship.tracking_no})</span>
                          )}
                        </Td>

                        {/* 수령인 */}
                        <Td className="text-xs text-text-secondary whitespace-nowrap">
                          {ship.recipient_name || '-'}
                        </Td>

                        {/* 상태 뱃지 */}
                        <Td className="text-center whitespace-nowrap">
                          <Badge variant="primary" className="text-[10px] uppercase font-semibold">
                            {ship.status === 'shipped' ? '출하완료' : ship.status}
                          </Badge>
                        </Td>

                        {/* 액션 버튼 */}
                        <Td className="text-right whitespace-nowrap pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              type="button"
                              className="inline-flex items-center justify-center gap-1 h-7.5 px-2.5 rounded-lg text-xs font-medium bg-bg-elevated text-text-primary border border-border-default hover:bg-brand-500/20 hover:text-brand-400 hover:border-brand-500/30 transition-all shadow-sm"
                              onClick={() => setPrintShipment(ship)}
                            >
                              <Printer className="w-3.5 h-3.5 text-text-secondary" />
                              <span>명세서</span>
                            </button>
                            <button 
                              type="button"
                              className="inline-flex items-center justify-center gap-1 h-7.5 px-2.5 rounded-lg text-xs font-medium bg-danger-500/10 text-danger-400 border border-danger-500/20 hover:bg-danger-500 hover:text-white hover:border-danger-500 transition-all shadow-sm"
                              onClick={() => handleCancelShipment(ship.id, ship.shipment_no)}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>취소</span>
                            </button>
                          </div>
                        </Td>
                      </Tr>

                      {/* 행 클릭 시 펼쳐지는 출하 품목 상세 서브 테이블 */}
                      {isExpanded && (
                        <Tr className="bg-bg-base/80 border-b border-border-default animate-in fade-in duration-200">
                          <Td colSpan={8} className="p-4 pl-8">
                            <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-inner">
                              <div className="px-4 py-2.5 bg-bg-elevated/70 border-b border-border-default flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-brand-400" />
                                  <span className="text-xs font-bold text-text-primary">출하 전표 상세 품목 목록</span>
                                  <Badge variant="primary" className="text-[10px] px-2 py-0.5">
                                    총 {ship.shipment_items?.length || 0}개 품목
                                  </Badge>
                                </div>
                                <span className="text-xs font-mono text-text-tertiary">
                                  전체 출하 수량: <span className="font-bold text-brand-400">{totalQty.toLocaleString()}</span>개
                                </span>
                              </div>

                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-bg-elevated/40 border-b border-border-default/70 text-[11px] font-semibold text-text-secondary">
                                    <th className="py-2.5 px-4">시스템 품번</th>
                                    <th className="py-2.5 px-4">도면번호 / 품명</th>
                                    <th className="py-2.5 px-4">규격</th>
                                    <th className="py-2.5 px-4 text-center">수주 수량</th>
                                    <th className="py-2.5 px-4 text-right">출하 수량</th>
                                    <th className="py-2.5 px-4">수주 번호 / 고객 PO</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ship.shipment_items?.map((si: any) => {
                                    const oi = si.order_items || {};
                                    const parentOrder = oi.orders || {};
                                    return (
                                      <tr key={si.id} className="border-b border-border-default/40 hover:bg-bg-elevated/40 transition-colors text-xs">
                                        {/* 시스템 품번 */}
                                        <td className="py-2.5 px-4 font-mono font-semibold text-brand-400 whitespace-nowrap">
                                          {oi.order_item_no || '-'}
                                        </td>

                                        {/* 도면번호 / 품명 */}
                                        <td className="py-2.5 px-4 whitespace-nowrap">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="font-mono font-bold text-text-primary text-xs">{oi.part_no || '-'}</span>
                                            <span className="text-text-secondary text-[11px] truncate max-w-[240px]" title={oi.part_name}>
                                              {oi.part_name || '-'}
                                            </span>
                                          </div>
                                        </td>

                                        {/* 규격 */}
                                        <td className="py-2.5 px-4 text-text-tertiary font-mono text-xs whitespace-nowrap">
                                          {oi.spec || '-'}
                                        </td>

                                        {/* 수주 수량 */}
                                        <td className="py-2.5 px-4 text-center font-mono text-text-secondary text-xs whitespace-nowrap">
                                          {(oi.production_qty ?? oi.qty ?? '-')}
                                        </td>

                                        {/* 출하 수량 */}
                                        <td className="py-2.5 px-4 text-right font-mono font-bold text-brand-400 text-sm whitespace-nowrap">
                                          {Number(si.quantity || 0).toLocaleString()}
                                        </td>

                                        {/* 수주 번호 / 전표 번호 */}
                                        <td className="py-2.5 px-4 whitespace-nowrap">
                                          <span className="text-text-secondary font-mono text-xs font-medium">
                                            {oi.order_item_no ? oi.order_item_no.split('-').slice(0, 2).join('-') : ship.shipment_no}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Tbody>
            </Table>

            {filteredShipments.length === 0 && (
              <div className="py-20 text-center text-text-secondary">
                <Truck className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-40" />
                <p className="font-medium text-text-primary mb-1">출하 완료된 내역이 없습니다.</p>
                <p className="text-xs text-text-tertiary">출하 대기 목록에서 품목을 선택하여 출하를 등록해보세요.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateShipmentModal
          selectedItems={pendingItems.filter(i => selectedPendingIds.has(i.id))}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedPendingIds(new Set());
            reload();
            setActiveTab('shipped');
          }}
        />
      )}

      {printShipment && (
        <ShippingLabelPreview
          shipment={printShipment}
          isOpen={true}
          onClose={() => setPrintShipment(null)}
        />
      )}
    </div>
  );
};
