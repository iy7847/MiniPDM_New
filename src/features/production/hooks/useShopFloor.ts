import { useState } from 'react';
import { supabase } from '@/shared/services/supabase';

export interface ProcessLog {
  id: string;
  process_name: string;
  worker: string;
  start_time: string;
  end_time?: string;
  status: string;
  notes?: string;
  sequence_no?: number;
  is_planned?: boolean;
  is_outsource?: boolean;
  description?: string | null;
}

export interface ShopFloorPart {
  id: string;
  part_name: string;
  part_no: string;
  spec: string;
  qty: number;
  orderId: string;
  client: string;
  history: ProcessLog[];
  currentProcess?: ProcessLog;
}

export function useShopFloor() {
  const [loading, setLoading] = useState(false);
  const [scannedPart, setScannedPart] = useState<ShopFloorPart | null>(null);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);

  // 1. 바코드로 품목 조회
  const fetchPartByBarcode = async (barcode: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('order_items')
        .select(`
          id, part_name, part_no, spec, qty, order_id,
          orders ( po_no, clients ( name ) ),
          process_logs ( id, process_name, process_type, worker, start_time, end_time, status, notes, sequence_no, is_planned )
        `);
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barcode);
      if (isUuid) {
        query = query.eq('id', barcode);
      } else {
        query = query.eq('order_item_no', barcode);
      }
      
      const { data, error } = await query.single();
      if (error) throw error;
      if (!data) throw new Error('품목을 찾을 수 없습니다.');

      // 외주 여부 및 설명 확인을 위해 processes 테이블 조회
      const { data: processesData } = await supabase.from('processes').select('id, name, is_outsource, description');
      
      const sortedLogs = (data.process_logs || [])
        .map((log: any) => {
          const proc = processesData?.find(p => p.name === log.process_name);
          return {
            ...log,
            description: proc?.description || null,
            is_outsource: log.process_type === 'OUTSOURCE' || (proc?.is_outsource ?? false)
          };
        })
        .sort((a: any, b: any) => {
          const seqA = a.sequence_no ?? 9999;
          const seqB = b.sequence_no ?? 9999;
          return seqA - seqB;
        });

      const inProgressLog = sortedLogs.find((log: any) => !log.end_time && log.status === '진행중');
      const nextWaitingLog = sortedLogs.find((log: any) => !log.end_time && log.status === '대기');
      
      const currentLog = inProgressLog || nextWaitingLog;
      setCurrentLogId(currentLog ? currentLog.id : null);

      const parsedPart: ShopFloorPart = {
        id: data.id,
        part_name: data.part_name,
        part_no: data.part_no,
        spec: data.spec,
        qty: data.qty,
        orderId: (data.orders as any)?.po_no || data.order_id,
        client: Array.isArray((data.orders as any)?.clients) 
            ? (data.orders as any).clients[0]?.name 
            : (data.orders as any)?.clients?.name || '알 수 없음',
        history: sortedLogs,
        currentProcess: currentLog
      };

      setScannedPart(parsedPart);
      return { success: true, part: parsedPart };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 2. 작업 시작 (process_logs INSERT 또는 UPDATE)
  const startProcess = async (processName: string, workerName: string = '작업자', isAdhoc: boolean = false) => {
    if (!scannedPart) return;
    setLoading(true);
    try {
      let logData;
      
      if (!isAdhoc && scannedPart.currentProcess && scannedPart.currentProcess.status === '대기') {
        const { data, error } = await supabase
          .from('process_logs')
          .update({
            status: '진행중',
            worker: workerName,
            start_time: new Date().toISOString()
          })
          .eq('id', scannedPart.currentProcess.id)
          .select()
          .single();
          
        if (error) throw error;
        logData = data;
      } else {
        const { data, error } = await supabase
          .from('process_logs')
          .insert({
            order_item_id: scannedPart.id,
            process_name: processName,
            process_type: 'INTERNAL',
            worker: workerName,
            status: '진행중',
            start_time: new Date().toISOString(),
            is_planned: false
          })
          .select()
          .single();
          
        if (error) throw error;
        logData = data;
      }
      
      setCurrentLogId(logData.id);
      
      setScannedPart(prev => {
        if (!prev) return null;
        let newHistory;
        if (!isAdhoc && prev.currentProcess && prev.currentProcess.status === '대기') {
          newHistory = prev.history.map(log => log.id === logData.id ? { ...log, ...logData } : log);
        } else {
          newHistory = [...prev.history, logData];
        }
        return {
          ...prev,
          history: newHistory,
          currentProcess: { ...prev.currentProcess, ...logData }
        };
      });

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 3. 작업 종료 및 불량 분할 처리
  const completeProcess = async (
    completeQty: number,
    defectQty: number = 0,
    defectReason: string = '',
    workerName: string = '작업자'
  ) => {
    if (!currentLogId || !scannedPart) return;
    setLoading(true);
    try {
      let rpcData = null;
      if (defectQty > 0) {
        const { data, error: rpcError } = await supabase.rpc('split_rework_order', {
          p_order_item_id: scannedPart.id,
          p_defect_qty: defectQty,
          p_defect_reason: defectReason,
          p_worker: workerName
        });
        if (rpcError) throw rpcError;
        rpcData = data;
      }

      const { error: updateError } = await supabase
        .from('process_logs')
        .update({
          end_time: new Date().toISOString(),
          status: '완료',
          notes: defectQty > 0 ? `양품: ${completeQty}, 불량: ${defectQty} (${defectReason})` : `양품: ${completeQty}`
        })
        .eq('id', currentLogId);

      if (updateError) throw updateError;
      
      // If the completed process was '출하', mark the order_item as DONE
      if (scannedPart.currentProcess?.process_name === '출하') {
        const { error: itemUpdateError } = await supabase
          .from('order_items')
          .update({ production_status: 'DONE', completed_at: new Date().toISOString() })
          .eq('id', scannedPart.id);
        if (itemUpdateError) throw itemUpdateError;
      }
      
      setCurrentLogId(null);
      setScannedPart(null);

      return { success: true, rpcData };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 4. 외주 현장 발주
  const createFieldOutsourceOrder = async (
    supplierId: string, 
    supplierName: string, 
    processName: string,
    workerName: string = '작업자'
  ) => {
    if (!scannedPart || !scannedPart.currentProcess) return { success: false, error: '선택된 공정이 없습니다.' };
    
    setLoading(true);
    try {
      const { data: outOrder, error: outError } = await supabase
        .from('outsource_orders')
        .insert({
          order_item_id: scannedPart.id,
          process_id: scannedPart.currentProcess.id,
          supplier_id: supplierId,
          supplier_name: supplierName,
          process_name: processName,
          quantity: scannedPart.qty,
          outsource_type: 'FIELD',
          status: '발주완료',
          order_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
        
      if (outError) throw outError;
      
      const { data: logData, error: logError } = await supabase
        .from('process_logs')
        .update({
          status: '진행중',
          worker: workerName,
          outsource_id: outOrder.id,
          start_time: new Date().toISOString()
        })
        .eq('id', scannedPart.currentProcess.id)
        .select()
        .single();
        
      if (logError) throw logError;
      
      setCurrentLogId(logData.id);
      
      setScannedPart(prev => {
        if (!prev) return null;
        return {
          ...prev,
          history: prev.history.map(log => log.id === logData.id ? { ...log, ...logData } : log),
          currentProcess: { ...prev.currentProcess, ...logData }
        };
      });
      
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    scannedPart,
    isWorking: !!currentLogId,
    fetchPartByBarcode,
    startProcess,
    completeProcess,
    createFieldOutsourceOrder,
    clearScan: () => { setScannedPart(null); setCurrentLogId(null); }
  };
}
