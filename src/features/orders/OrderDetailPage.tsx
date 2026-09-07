import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useOrderDetail } from './hooks/useOrderDetail';
import { OrderDetailHeader } from './components/detail/OrderDetailHeader';
import { OrderBasicInfo } from './components/detail/OrderBasicInfo';
import { OrderItemsTable } from './components/detail/OrderItemsTable';
import { OrderBatchToolbar } from './components/detail/OrderBatchToolbar';
import { OrderNoGeneratorModal } from './components/detail/OrderNoGeneratorModal';
import { ClipboardMatchModal } from './components/detail/ClipboardMatchModal';
import { LabelPrinterModal } from './components/detail/LabelPrinterModal';
import { HistorySearchModal } from './components/detail/HistorySearchModal';
import { OrderConfirmationPdfModal } from './components/detail/OrderConfirmationPdfModal';
import { OrderFilesManagerModal } from './components/detail/OrderFilesManagerModal';
import { exportOrderItemsToExcel } from './utils/orderExportUtils';
import { Card } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Loader2, AlertCircle, Plus, PackageOpen, Layers } from 'lucide-react';
import { toast } from '../../shared/stores/useToastStore';

export const OrderDetailPage = () => {
  const { confirm } = useConfirm();
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    order, items, loading, errorMsg, saving, isDirty,
    updateItemSupply, updateOrder, batchUpdateItems, 
    updateOrderItemsBulk, generateOrderNos, deleteOrder, handleFilesDrop, addHistoryItem, addFilesToItem, addEmptyItem, deleteOrderItem, removeOrderItemFiles, removeAllOrderFilesGlobally, removeSingleFile, removeMultipleFiles, saveOrderDetail
  } = useOrderDetail(id);
  
  const [showForeign, setShowForeign] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);

  // 모달 상태 관리
  const [isOrderNoModalOpen, setIsOrderNoModalOpen] = React.useState(false);
  const [isClipboardModalOpen, setIsClipboardModalOpen] = React.useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = React.useState(false);
  const [hideCancelled, setHideCancelled] = React.useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = React.useState(false);
  const [isFilesManagerOpen, setIsFilesManagerOpen] = React.useState(false);

  const isForeignMode = showForeign && order?.currency !== 'KRW' && (order?.exchange_rate || 0) > 0;

  const handleSelectItem = (itemId: string, selected: boolean) => {
    if (selected) setSelectedItems(prev => [...prev, itemId]);
    else setSelectedItems(prev => prev.filter(id => id !== itemId));
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const selectableItems = items.filter(i => i.production_status !== 'CANCELLED');
      setSelectedItems(selectableItems.map(item => item.id));
    }
    else setSelectedItems([]);
  };

  const handleDelete = async () => {
    if (await confirm({ 
      title: '수주 삭제', 
      description: '정말 이 수주를 삭제하시겠습니까? 관련된 모든 품목 정보가 삭제되며 이전 견적 상태로 롤백될 수 있습니다.',
      isDanger: true 
    })) {
      const success = await deleteOrder();
      if (success) {
        navigate('/orders');
      }
    }
  };

  const handleBatchConfirm = async () => {
    if (!(await confirm({ title: '수주 확정', description: `선택한 ${selectedItems.length}개 품목을 수주 확정(생산 이관)하시겠습니까?` }))) return;
    batchUpdateItems(selectedItems, { production_status: 'PRODUCTION_READY' });
    const currentSelected = [...selectedItems];
    setSelectedItems([]);
    await saveOrderDetail(undefined, items.map(i => currentSelected.includes(i.id) ? { ...i, production_status: 'PRODUCTION_READY' } : i));
  };

  const handleBatchCancelHandoff = async () => {
    if (!(await confirm({ title: '이관 취소', description: `선택한 ${selectedItems.length}개 품목의 이관을 취소하고 수주 대기 상태로 되돌리시겠습니까?`, isDanger: true }))) return;
    batchUpdateItems(selectedItems, { production_status: 'PENDING' });
    const currentSelected = [...selectedItems];
    setSelectedItems([]);
    await saveOrderDetail(undefined, items.map(i => currentSelected.includes(i.id) ? { ...i, production_status: 'PENDING' } : i));
  };

  const handleToggleItemStatus = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PRODUCTION_READY' ? 'PENDING' : 'PRODUCTION_READY';
    const actionText = newStatus === 'PRODUCTION_READY' ? '생산 관리로 이관' : '이관을 취소하고 수주 대기 상태로 변경';
    if (!(await confirm({ 
      title: '상태 일괄 변경', 
      description: `선택한 품목을 ${actionText}하시겠습니까?` 
    }))) return;
    
    batchUpdateItems([itemId], { production_status: newStatus });
    await saveOrderDetail(undefined, items.map(i => i.id === itemId ? { ...i, production_status: newStatus } : i));
  };

  const handleHistorySelect = async (item: any) => {
    await addHistoryItem(item);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-base text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={24} />
        데이터를 불러오는 중...
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg-base text-text-secondary">
        <AlertCircle size={48} className="text-status-danger mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">오류가 발생했습니다</h2>
        <p>{errorMsg || '수주 정보를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const isLocked = order.status === 'PRODUCTION' || order.status === 'COMPLETED';

  const handleOrderConfirm = async () => {
    if (!order) return;
    
    if (isLocked) {
      if (order.status === 'COMPLETED') {
        toast.error('이미 완료된 수주는 취소할 수 없습니다.');
        return;
      }
      if (!(await confirm({ 
        title: '생산 이관 취소', 
        description: '생산 이관을 취소하고 다시 수정 가능한 수주 대기 상태로 되돌리시겠습니까?',
        isDanger: true
      }))) return;
      
      try {
        const itemIds = items.map(i => i.id);
        batchUpdateItems(itemIds, { production_status: 'PENDING' });
        updateOrder({ status: 'PENDING' });
        const success = await saveOrderDetail({ status: 'PENDING' }, items.map(i => ({ ...i, production_status: 'PENDING' })));
        if (success) {
          toast.success('수주 대기 상태로 돌아왔습니다. 이제 다시 수정이 가능합니다.');
        }
      } catch (err) {
        console.error('Failed to rollback order:', err);
      }
      return;
    }

    if (items.length === 0) {
      toast.error('수주 품목이 없습니다.');
      return;
    }
    if (!(await confirm({ 
      title: '수주 확정 및 생산 이관', 
      description: '현재 수주를 확정하고 전체 품목을 생산 관리로 이관하시겠습니까? (이미 부분 이관된 품목은 그대로 유지됩니다)' 
    }))) return;

    try {
      const pendingItems = items.filter(i => !i.production_status || i.production_status === 'PENDING');
      const itemIds = pendingItems.map(i => i.id);
      
      if (itemIds.length > 0) {
        // We only change the order status to PRODUCTION.
        // The items remain PENDING until processed in Production Management.
      }
      
      updateOrder({ status: 'PRODUCTION' });
      const success = await saveOrderDetail(
        { status: 'PRODUCTION' }, 
        items // do not change production_status here, it should remain PENDING until processed in ProductionListPage
      );
      
      if (success) {
        toast.success('수주가 확정되어 생산 관리로 성공적으로 이관되었습니다.');
      }
    } catch (err) {
      console.error('Failed to confirm order:', err);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + Math.ceil(item.supply_price || ((item.unit_price || 0) * (item.quantity || item.qty || 1))), 0);

  return (
    <div className="h-full flex flex-col bg-bg-base text-text-primary">
      <div className="bg-bg-surface border-b border-border-default z-10 shadow-sm flex flex-col shrink-0">
        <OrderDetailHeader 
          order={order} 
          items={items}
          itemsCount={items.length}
          totalAmount={totalAmount}
          isForeignMode={isForeignMode}
          currency={order.currency || 'KRW'}
          isLocked={isLocked}
          onOpenOrderNoGenerator={() => setIsOrderNoModalOpen(true)}
          onOpenClipboardMatch={() => setIsClipboardModalOpen(true)}
          onOpenPdfModal={() => setIsPdfModalOpen(true)}
          onExportExcel={() => exportOrderItemsToExcel(order, items)}
          onOrderConfirm={handleOrderConfirm}
          onDeleteOrder={handleDelete}
          onSave={() => saveOrderDetail()}
          isSaving={saving}
          isDirty={isDirty}
        />
        <OrderBasicInfo 
          order={order} 
          showForeign={showForeign} 
          setShowForeign={setShowForeign} 
          onUpdateField={(field, value) => updateOrder({ [field]: value })}
          isLocked={isLocked}
        />
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col relative bg-bg-base">
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <Card className="flex-1 flex flex-col p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4 min-h-[40px]">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-text-primary">수주 품목 상세 내역</h3>
                {items.some(i => i.production_status === 'CANCELLED') && (
                  <div className="flex items-center gap-2 ml-2">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={hideCancelled} onChange={(e) => setHideCancelled(e.target.checked)} />
                        <div className={`block w-8 h-5 rounded-full transition-colors ${hideCancelled ? 'bg-brand-500' : 'bg-bg-elevated border border-border-default'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${hideCancelled ? 'transform translate-x-3' : ''}`}></div>
                      </div>
                      <span className="ml-2 text-xs text-text-secondary">취소 품목 숨기기</span>
                    </label>
                  </div>
                )}
                {!isLocked && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 px-3 text-xs" onClick={() => setIsFilesManagerOpen(true)}>
                    <Layers size={14} className="text-brand-500" /> 도면 일괄 매칭/관리
                  </Button>
                )}
              </div>
              
              {selectedItems.length > 0 ? (
                <div className="flex-1 flex justify-end ml-4">
                  <OrderBatchToolbar 
                    selectedCount={selectedItems.length}
                    isLocked={isLocked}
                    onClearSelection={() => setSelectedItems([])}
                    onApplyDueDate={(date) => batchUpdateItems(selectedItems, { due_date: date })}
                    onOrderConfirm={handleBatchConfirm}
                    onOrderCancelHandoff={handleBatchCancelHandoff}
                    hasPendingItems={items.filter(i => selectedItems.includes(i.id)).some(i => !i.production_status || i.production_status === 'PENDING')}
                    hasReadyItems={items.filter(i => selectedItems.includes(i.id)).some(i => i.production_status === 'PRODUCTION_READY')}
                    onOpenLabelPrinter={() => setIsLabelModalOpen(true)}
                  />
                </div>
              ) : !isLocked ? (
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={addEmptyItem} className="flex items-center gap-1.5">
                    <Plus size={16} />
                    품목 추가
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2">
                    <PackageOpen size={16} />
                    과거 이력 불러오기
                  </Button>
                </div>
              ) : null}
            </div>

            <OrderItemsTable 
              items={hideCancelled ? items.filter(i => i.production_status !== 'CANCELLED') : items} 
              parentPoNo={order?.po_no}
              parentOrderDate={order?.order_date}
              onSupplyChange={updateItemSupply} 
              showForeign={isForeignMode}
              currency={order.currency || 'KRW'}
              exchangeRate={order.exchange_rate || 1}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
              onDueDateChange={(itemId, date) => batchUpdateItems([itemId], { due_date: date })}
              onOpenHistorySearch={() => setIsHistoryModalOpen(true)}
              isLocked={isLocked}
              onAddEmptyItem={addEmptyItem}
              onDeleteItem={deleteOrderItem}
              onRemoveFile={removeOrderItemFiles}
              onRemoveSingleFile={removeSingleFile}
              onRemoveMultipleFiles={removeMultipleFiles}
              onAddMaskedFile={(itemId, files) => addFilesToItem(itemId, files, false)}
              onOrderItemNoChange={(itemId, poNo) => batchUpdateItems([itemId], { order_item_no: poNo })}
              onPriceChange={(itemId, field, value) => {
                const item = items.find(i => i.id === itemId);
                if (!item) return;

                let updates: any = {};
                if (field === 'unit_price') {
                  const qty = item.qty || 1;
                  updates = { unit_price: value, supply_price: value * qty };
                } else if (field === 'supply_price') {
                  const qty = item.qty || 1;
                  updates = { supply_price: value, unit_price: Math.round(value / qty) };
                } else if (field === 'qty') {
                  const unitPrice = item.unit_price || 0;
                  updates = { qty: value, supply_price: unitPrice * value };
                }
                batchUpdateItems([itemId], updates);
              }}
              onFieldChange={(itemId, field, value) => {
                batchUpdateItems([itemId], { [field]: value });
              }}
              onToggleItemStatus={handleToggleItemStatus}
            />
          </Card>
        </div>
      </div>

      <OrderNoGeneratorModal
        isOpen={isOrderNoModalOpen}
        onClose={() => setIsOrderNoModalOpen(false)}
        poNo={order.po_no}
        onGenerate={(format, overwrite) => generateOrderNos(format, overwrite, order.po_no)}
      />

      <ClipboardMatchModal
        isOpen={isClipboardModalOpen}
        onClose={() => setIsClipboardModalOpen(false)}
        defaultCurrency={order.currency || 'KRW'}
        onMatch={(matches, currency) => {
          if (currency !== order.currency) {
            updateOrder({ currency });
          }
          updateOrderItemsBulk(matches);
        }}
      />

      <LabelPrinterModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        order={order}
        items={items}
        selectedItems={selectedItems}
      />

      <HistorySearchModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelect={handleHistorySelect}
      />

      <OrderConfirmationPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        order={order}
        items={items}
      />
      
      <OrderFilesManagerModal
        isOpen={isFilesManagerOpen}
        onClose={() => setIsFilesManagerOpen(false)}
        items={items}
        addFilesToItem={addFilesToItem}
        removeSingleFile={removeSingleFile}
        removeOrderItemFiles={removeOrderItemFiles}
        removeAllOrderFilesGlobally={removeAllOrderFilesGlobally}
      />
    </div>
  );
};
