import { useState, useEffect, useCallback } from 'react';
import { getOrderWithItems, updateOrderItemSupply } from '../services/orderService';
import { supabase } from '../../../shared/services/supabase';
import type { Order, OrderItem } from '../types';
import { generateOrderItemSequence } from '@/shared/utils/poNumberUtils';
import { matchFilesToItems } from '../../../shared/utils/fileMatching';
import { toast } from '../../../shared/stores/useToastStore';

export function useOrderDetail(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 로컬 상태 추적을 위한 변수들
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [deletedFileIds, setDeletedFileIds] = useState<string[]>([]);

  const fetchOrderDetail = useCallback(async () => {
    if (!orderId) return;
    
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getOrderWithItems(orderId);
      setOrder(data);
      setItems(data.order_items || []);
      setDeletedItemIds([]);
      setPendingFiles([]);
      setDeletedFileIds([]);
      setIsDirty(false);
    } catch (error: any) {
      console.error('Failed to fetch order details:', error);
      setErrorMsg(error.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  // 로컬 상태 업데이트만 수행
  const updateItemSupply = (itemId: string, supplyType: string, useStock: boolean) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, supply_type: supplyType, use_stock: useStock } as any
        : item
    ));
    setIsDirty(true);
  };

  const updateOrder = (updates: Partial<Order>) => {
    if (!order) return;
    setOrder({ ...order, ...updates });
    setIsDirty(true);
  };

  const recalculateTotalAmount = (currentItems: OrderItem[]) => {
    if (!order) return;
    const newTotal = currentItems.reduce((sum, item) => sum + Math.ceil((item.unit_price || 0) * (item.quantity || item.qty || 1)), 0);
    setOrder(prev => prev ? { ...prev, total_amount: newTotal } : null);
  };

  const addEmptyItem = () => {
    if (!order) return;
    const seq = generateOrderItemSequence(items.length + 1);
    const itemNo = `${order.po_no || 'PO'}-${seq}`;
    const newId = crypto.randomUUID();

    const newItem = {
      id: newId,
      order_id: order.id,
      order_item_no: itemNo,
      client_po_no: String(items.length + 1),
      part_name: `신규 품목 ${items.length + 1}`,
      part_no: itemNo,
      spec: '',
      qty: 1,
      unit_price: 0,
      supply_price: 0,
      production_status: 'PENDING',
      work_days: 0,
      isNew: true // 식별 플래그
    };

    const updatedItems = [...items, newItem as any];
    setItems(updatedItems);
    recalculateTotalAmount(updatedItems);
    setIsDirty(true);
  };

  const deleteOrderItem = (itemId: string) => {
    if (!order) return;
    if (!window.confirm('선택한 품목을 삭제하시겠습니까?')) return;

    const itemToDelete = items.find(i => i.id === itemId);
    if (itemToDelete && !(itemToDelete as any).isNew) {
      setDeletedItemIds(prev => [...prev, itemId]);
    }

    const updatedItems = items.filter(i => i.id !== itemId);
    setItems(updatedItems);
    recalculateTotalAmount(updatedItems);
    setIsDirty(true);
  };

  const batchUpdateItems = (itemIds: string[], updates: Partial<OrderItem>) => {
    const updatedItems = items.map(item => 
      itemIds.includes(item.id) ? { ...item, ...updates } as any : item
    );
    setItems(updatedItems);
    if (updates.qty !== undefined || updates.unit_price !== undefined || updates.supply_price !== undefined) {
      recalculateTotalAmount(updatedItems);
    }
    setIsDirty(true);
  };

  const updateOrderItemsBulk = (matches: any[]) => {
    const newItems = [...items];
    matches.forEach(match => {
      const idx = newItems.findIndex(i => i.part_no === match.part_no);
      if (idx !== -1) {
        newItems[idx] = { ...newItems[idx], ...match } as any;
      }
    });
    setItems(newItems);
    recalculateTotalAmount(newItems);
    setIsDirty(true);
  };

  const generateOrderNos = (format: string, overwrite: boolean, poNo: string) => {
    const updates = items.map((item, index) => {
      if (!overwrite && item.order_item_no && !(item as any).isNew) return item;
      const seq = String(index + 1).padStart(3, '0');
      const generated = format.replace('{PO}', poNo).replace('{SEQ}', seq);
      return { ...item, order_item_no: generated } as any;
    });
    setItems(updates);
    setIsDirty(true);
  };

  const deleteOrder = async () => {
    if (!order) return false;
    try {
      if (order.estimate_id) {
        const estimateItemIds = items.map(i => i.estimate_item_id).filter(Boolean);
        if (estimateItemIds.length > 0) {
           await supabase.from('estimate_items').update({ order_status: 'PENDING' }).in('id', estimateItemIds);
        }
        await supabase.from('estimates').update({ status: 'SENT' }).eq('id', order.estimate_id);
      }
      const { error } = await supabase.from('orders').delete().eq('id', order.id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(err);
      alert('수주 삭제 실패 (진행중인 공정이 있을 수 있습니다)');
      return false;
    }
  };

  const handleFilesDrop = async (droppedFiles: File[]) => {
    toast.info(`[디버그] 드롭된 파일 수: ${droppedFiles.length}개`);
    if (!order) {
      toast.error('수주 정보가 없습니다.');
      return;
    }
    
    const { matched, unmatched } = matchFilesToItems(droppedFiles, items);
    
    toast.info(`[디버그] 매칭 성공 품목 수: ${matched.length}개, 실패(미아) 파일 수: ${unmatched.length}개`);

    if (unmatched.length > 0) {
      toast.error(`${unmatched.length}개의 파일은 일치하는 품목이 없습니다.`);
    }
    if (matched.length === 0) return;

    try {
      const newFilesToInsert: any[] = [];
      const currentYear = new Date().getFullYear().toString();
      const poNo = order.po_no || 'UNKNOWN_PO';

      for (const match of matched) {
        const item = items.find(i => i.id === match.itemId);
        if (!item) continue;
        
        const safePartName = (item.part_no || item.part_name || 'UNKNOWN').replace(/[^a-zA-Z0-9가-힣_-]/g, '');
        const targetFolderName = `${safePartName}_${item.id.split('-')[0]}`;
        const targetPath = `${currentYear}/Orders/${poNo}/${targetFolderName}`;

        for (const file of match.files) {
          let srcPath = (file as any).path || (file as any).file_path;
          if (!srcPath && (window as any).webUtils) {
            srcPath = (window as any).webUtils.getPathForFile(file);
          }
          
          let finalFilePath = `browser_temp/${Date.now()}_${file.name}`; // 폴백 경로 (브라우저 테스트용)

          // 실제 디스크에 파일 저장 (동기화)
          if (window.fileSystem && window.fileSystem.saveFile && srcPath) {
            const res = await window.fileSystem.saveFile(srcPath, order.company_id, targetPath);
            if (res.success && res.filePath) {
              finalFilePath = res.filePath;
            } else {
               console.warn("로컬 파일 저장 실패", res);
            }
          } else if (window.fileSystem && (window.fileSystem as any).saveFileFromBuffer && !srcPath) {
            const arrayBuffer = await file.arrayBuffer();
            const res = await (window.fileSystem as any).saveFileFromBuffer(arrayBuffer, order.company_id, targetPath, file.name);
            if (res.success && res.filePath) {
              finalFilePath = res.filePath;
            } else {
              console.warn("로컬 파일 저장 실패 (버퍼)", res);
            }
          } else {
            console.warn("Electron 환경이 아니거나 srcPath를 찾을 수 없어 가상 경로로 대체합니다.", file.name);
          }

          const tempFileId = crypto.randomUUID();
          newFilesToInsert.push({
            id: tempFileId,
            order_item_id: item.id,
            file_name: file.name,
            file_path: finalFilePath,
            file_type: file.type?.startsWith('image/') ? 'IMAGE' : (file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCUMENT'),
            file_size: file.size || 0,
            isNew: true
          });
        }
      }

      if (newFilesToInsert.length > 0) {
        // 로컬 상태 업데이트
        setItems(prevItems => prevItems.map(item => {
          const matchedFilesForThisItem = newFilesToInsert
            .filter(f => f.order_item_id === item.id)
            .map(f => ({ ...f, name: f.file_name })); 
          
          if (matchedFilesForThisItem.length > 0) {
            return {
              ...item,
              files: [...(item.files || []), ...matchedFilesForThisItem]
            } as any;
          }
          return item;
        }));

        setPendingFiles(prev => [...prev, ...newFilesToInsert]);
        setIsDirty(true);
        toast.success(`${newFilesToInsert.length}개의 도면 파일이 로컬에 매칭되었습니다. (저장 시 반영)`);
      }
    } catch (err) {
      console.error(err);
      toast.error('파일 매칭 및 처리 중 오류가 발생했습니다.');
    }
  };

  const addHistoryItem = (historyItem: any) => {
    if (!order) return;
    const seq = generateOrderItemSequence(items.length + 1);
    const itemNo = `${order.po_no || 'PO'}-${seq}`;
    const newId = crypto.randomUUID();

    const newItemData = {
      id: newId,
      order_id: order.id,
      order_item_no: itemNo,
      client_po_no: String(items.length + 1),
      part_name: historyItem.part_name,
      part_no: historyItem.part_no,
      spec: historyItem.spec,
      material_name: historyItem.material_name,
      original_material_name: historyItem.original_material_name,
      material_id: historyItem.material_id,
      qty: historyItem.qty || 1,
      unit_price: historyItem.unit_price || 0,
      supply_price: historyItem.supply_price || 0,
      production_status: 'PENDING',
      work_days: historyItem.work_days || 0,
      isNew: true
    };

    let filesToInsert: any[] = [];
    if (historyItem.files && historyItem.files.length > 0) {
      filesToInsert = historyItem.files.map((file: any) => ({
        id: crypto.randomUUID(),
        order_item_id: newId,
        file_name: file.file_name || file.name,
        file_path: file.file_path,
        file_type: file.file_type,
        file_size: file.file_size,
        isNew: true
      }));
      (newItemData as any).files = filesToInsert.map(f => ({ ...f, name: f.file_name }));
    }

    setItems(prev => [...prev, newItemData as any]);
    setPendingFiles(prev => [...prev, ...filesToInsert]);
    recalculateTotalAmount([...items, newItemData as any]);
    setIsDirty(true);
  };

  const removeOrderItemFiles = (itemId: string) => {
    if (!window.confirm('해당 품목의 모든 첨부파일을 삭제하시겠습니까?')) return;
    
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const fileIdsToRemove = (item.files || []).map((f: any) => f.id);
        
        // 새로 추가된 파일은 pendingFiles에서 제거하고, 기존 파일은 deletedFileIds에 추가
        fileIdsToRemove.forEach((id: string) => {
          if (pendingFiles.find(p => p.id === id)) {
            setPendingFiles(p => p.filter(f => f.id !== id));
          } else {
            setDeletedFileIds(d => [...d, id]);
          }
        });

        return { ...item, files: [] } as any;
      }
      return item;
    }));
    setIsDirty(true);
  };

  const removeSingleFile = (itemId: string, fileId: string, skipConfirm?: boolean) => {
    if (!skipConfirm && !window.confirm('이 파일을 삭제하시겠습니까?')) return;
    
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newFiles = (item.files || []).filter((f: any) => f.id !== fileId);
        
        if (pendingFiles.find(p => p.id === fileId)) {
          setPendingFiles(p => p.filter(f => f.id !== fileId));
        } else {
          setDeletedFileIds(d => [...d, fileId]);
        }
        
        return { ...item, files: newFiles } as any;
      }
      return item;
    }));
    setIsDirty(true);
  };

  const removeMultipleFiles = (itemId: string, fileIds: string[]) => {
    if (!window.confirm(`해당 타입의 첨부파일 ${fileIds.length}개를 모두 삭제하시겠습니까?`)) return;
    
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newFiles = (item.files || []).filter((f: any) => !fileIds.includes(f.id));
        
        fileIds.forEach(id => {
          if (pendingFiles.find(p => p.id === id)) {
            setPendingFiles(p => p.filter(f => f.id !== id));
          } else {
            setDeletedFileIds(d => [...d, id]);
          }
        });
        
        return { ...item, files: newFiles } as any;
      }
      return item;
    }));
    setIsDirty(true);
  };

  // 수동 저장 함수
  const saveOrderDetail = async (updatedOrder?: Partial<Order>, updatedItems?: OrderItem[]) => {
    if (!order) return false;
    
    const targetOrder = updatedOrder || order;
    const targetItems = updatedItems || items;
    
    setSaving(true);
    try {
      // 1. Update orders table
      const { clients, estimates, order_items, ...restOrder } = targetOrder as any;
      const orderUpdates = { ...restOrder, total_amount: targetOrder.total_amount || 0 };
      const { error: orderError } = await supabase.from('orders').update(orderUpdates).eq('id', order.id);
      if (orderError) throw orderError;

      // 2. Delete removed items
      if (deletedItemIds.length > 0) {
        const { error } = await supabase.from('order_items').delete().in('id', deletedItemIds);
        if (error) throw error;
      }

      // 3. Upsert items
      const itemsToUpsert = targetItems.map(item => {
        const { files, isNew, estimate_items, ...rest } = item as any;
        return rest;
      });
      if (itemsToUpsert.length > 0) {
        const { error } = await supabase.from('order_items').upsert(itemsToUpsert, { onConflict: 'id' });
        if (error) throw error;
      }

      // 4. Delete removed files
      if (deletedFileIds.length > 0) {
        const { error } = await supabase.from('files').delete().in('id', deletedFileIds);
        if (error) throw error;
      }

      // 5. Insert new files
      if (pendingFiles.length > 0) {
        const validPendingFiles = pendingFiles
          .filter(f => targetItems.some(i => i.id === f.order_item_id))
          .map(f => {
            const { isNew, ...rest } = f;
            return rest;
          });
          
        if (validPendingFiles.length > 0) {
          const { error } = await supabase.from('files').insert(validPendingFiles);
          if (error) throw error;
        }
      }

      toast.success('수주 정보가 성공적으로 저장되었습니다.');
      await fetchOrderDetail(); // DB에서 최신 데이터로 리로드
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error('수주 정보 저장 실패: ' + err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    order,
    items,
    loading,
    saving,
    isDirty,
    errorMsg,
    updateItemSupply,
    updateOrder,
    batchUpdateItems,
    updateOrderItemsBulk,
    generateOrderNos,
    deleteOrder,
    handleFilesDrop,
    addHistoryItem,
    addEmptyItem,
    deleteOrderItem,
    removeOrderItemFiles,
    removeSingleFile,
    removeMultipleFiles,
    saveOrderDetail, // 신규 추가
    reload: fetchOrderDetail
  };
}
