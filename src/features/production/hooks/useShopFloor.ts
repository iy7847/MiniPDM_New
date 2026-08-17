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
          process_logs ( id, process_name, worker, start_time, end_time, status, notes )
        `);
      
      // UUID 형식이면 id로 검색, 아니면 order_item_no로 검색 (하위호환성 유지)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barcode);
      if (isUuid) {
        query = query.eq('id', barcode);
      } else {
        query = query.eq('order_item_no', barcode);
      }
      
      const { data, error } = await query.single();

      if (error) throw error;
      if (!data) throw new Error('품목을 찾을 수 없습니다.');

      // 진행 중인 로그가 있는지 확인 (end_time이 없는 경우)
      const inProgressLog = data.process_logs?.find((log: any) => !log.end_time && log.status === '진행중');
      
      setCurrentLogId(inProgressLog ? inProgressLog.id : null);

      setScannedPart({
        id: data.id,
        part_name: data.part_name,
        part_no: data.part_no,
        spec: data.spec,
        qty: data.qty,
        orderId: (data.orders as any)?.po_no || data.order_id,
        client: Array.isArray((data.orders as any)?.clients) 
            ? (data.orders as any).clients[0]?.name 
            : (data.orders as any)?.clients?.name || '알 수 없음',
        history: data.process_logs || []
      });
      
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 2. 작업 시작 (process_logs INSERT)
  const startProcess = async (processName: string, workerName: string = '작업자') => {
    if (!scannedPart) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('process_logs')
        .insert({
          order_item_id: scannedPart.id,
          process_name: processName,
          worker: workerName,
          status: '진행중',
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentLogId(data.id);
      
      // 상태 업데이트
      setScannedPart(prev => prev ? {
        ...prev,
        history: [...prev.history, data]
      } : null);

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
      // 불량이 발생한 경우 RPC 호출하여 파생 오더 생성
      if (defectQty > 0) {
        const { data, error: rpcError } = await supabase.rpc('split_rework_order', {
          p_order_item_id: scannedPart.id,
          p_defect_qty: defectQty,
          p_defect_reason: defectReason,
          p_worker: workerName
        });
        
        if (rpcError) throw rpcError;
        rpcData = data;
        console.log('재작업 오더 생성됨:', rpcData);
      }

      // 공정 로그 업데이트 (종료 시간 기록)
      const { error: updateError } = await supabase
        .from('process_logs')
        .update({
          end_time: new Date().toISOString(),
          status: '완료',
          notes: defectQty > 0 ? `양품: ${completeQty}, 불량: ${defectQty} (${defectReason})` : `양품: ${completeQty}`
        })
        .eq('id', currentLogId);

      if (updateError) throw updateError;
      
      setCurrentLogId(null);
      // 스캔 초기화 (작업이 끝났으므로 다음 바코드 대기)
      setScannedPart(null);

      return { success: true, rpcData };
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
    clearScan: () => { setScannedPart(null); setCurrentLogId(null); }
  };
}
