import { useState, useEffect } from 'react';
import { supabase } from '../../../shared/services/supabase';

export interface ReceivingResult {
  type: 'P' | 'M' | 'UNKNOWN';
  itemData: any;
  outsourceData?: any[];
  processLogs?: any[];
  materialData?: any;
}

export const useReceivingScan = (barcode: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReceivingResult | null>(null);

  useEffect(() => {
    if (!barcode) return;
    fetchData();
  }, [barcode]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      if (barcode.startsWith('P')) {
        // 1. order_items 조회 (수주 품목)
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_item_no', barcode)
          .maybeSingle();

        if (itemError || !orderItem) throw new Error('품목을 찾을 수 없습니다.');

        // 2. outsource_orders 조회 (취소 제외 전부)
        const { data: outsourceOrders } = await supabase
          .from('outsource_orders')
          .select('*')
          .eq('order_item_id', orderItem.id)
          .neq('status', '취소')
          .order('created_at', { ascending: false });

        // 3. process_logs 조회
        const { data: processLogs } = await supabase
          .from('process_logs')
          .select('*')
          .eq('order_item_id', orderItem.id)
          .order('sequence_no', { ascending: true });

        setData({
          type: 'P',
          itemData: orderItem,
          outsourceData: outsourceOrders || [],
          processLogs: processLogs || []
        });
      } else if (barcode.startsWith('M')) {
        // 1. material_orders 조회 (원소재 발주)
        const { data: materialOrder, error: matError } = await supabase
          .from('material_orders')
          .select('*, order_items(*)')
          .eq('po_no', barcode)
          .maybeSingle();

        if (matError || !materialOrder) throw new Error('자재 발주를 찾을 수 없습니다.');

        setData({
          type: 'M',
          itemData: materialOrder.order_items,
          materialData: materialOrder
        });
      } else {
        throw new Error('유효하지 않은 바코드 형식입니다. (P 또는 M으로 시작해야 합니다)');
      }
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const submitPBarcodeReceiving = async ({ receiveQty, defectQty, defectReason }: { receiveQty: number; defectQty: number; defectReason: string }) => {
    if (!data || data.type !== 'P') return false;
    setLoading(true);
    try {
      const isPurchase = data.itemData.supply_type === 'PURCHASE';

      if (isPurchase) {
        // 기성품 구매인 경우
        const { error } = await supabase
          .from('order_items')
          .update({ production_status: 'COMPLETED' })
          .eq('id', data.itemData.id);
        if (error) throw error;
      } else {
        // 외주가공 또는 중간 외주인 경우
        if (data.outsourceData && data.outsourceData.length > 0) {
          const outsourceIds = data.outsourceData.map(o => o.id);
          const now = new Date().toISOString();
          const today = now.split('T')[0];
          const { error: outError } = await supabase
            .from('outsource_orders')
            .update({ 
              status: '입고완료', 
              received_qty: receiveQty,
              received_date: today,
              updated_at: now
            })
            .in('id', outsourceIds);
          if (outError) throw outError;
        }

        if (data.processLogs && data.processLogs.length > 0) {
          const processIds = data.processLogs.map(p => p.id);
          const { error: logError } = await supabase
            .from('process_logs')
            .update({ status: '완료' })
            .in('id', processIds);
          if (logError) throw logError;
        }

        // 외주품이 사내로 입고되었으므로, 다음 작업자가 공정 설계나 가공을 진행할 수 있도록 사내 대기(PRODUCTION_READY) 상태로 전환
        await supabase
          .from('order_items')
          .update({ production_status: 'PRODUCTION_READY' })
          .eq('id', data.itemData.id);
      }
      return true;
    } catch (err: any) {
      console.error(err);
      setError('입고 처리 중 오류가 발생했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const submitMBarcodeReceiving = async ({ receiveQty, defectQty, defectReason }: { receiveQty: number; defectQty: number; defectReason: string }) => {
    if (!data || data.type !== 'M' || !data.materialData) return false;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const { error } = await supabase
        .from('material_orders')
        .update({ 
          status: '입고완료',
          received_qty: receiveQty,
          received_date: today,
          updated_at: now
        })
        .eq('id', data.materialData.id);
      
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error(err);
      setError('자재 입고 처리 중 오류가 발생했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const undoReceiving = async () => {
    if (!data) return false;
    setLoading(true);
    try {
      if (data.type === 'P' && data.itemData) {
        // 1. 방어 로직: 완제품 출하 완료 확인
        if (data.itemData.production_status === 'DONE') {
          throw new Error('이미 출하가 완료되어 입고를 취소할 수 없습니다.');
        }

        const isPurchase = data.itemData.supply_type === 'PURCHASE';

        if (isPurchase) {
          const { error } = await supabase
            .from('order_items')
            .update({ production_status: 'OUTSOURCE_READY' }) // 다시 발주 대기 상태로
            .eq('id', data.itemData.id);
          if (error) throw error;
        } else {
          // 최신 완료된 외주발주 찾기
          const completedOutsource = data.outsourceData?.find(o => o.status === '입고완료');
          if (!completedOutsource) throw new Error('취소할 수 있는 입고 내역이 없습니다.');

          // 2. 방어 로직: 후속 공정 확인
          if (data.processLogs && data.processLogs.length > 0) {
            const currentLog = data.processLogs.find(log => log.process_name === completedOutsource.process_name);
            if (currentLog) {
              const subsequentLogs = data.processLogs.filter(log => log.sequence_no > currentLog.sequence_no);
              const hasNextStarted = subsequentLogs.some(log => log.status !== '대기');
              if (hasNextStarted) {
                throw new Error('외주 이후 다음 공정이 이미 진행 중이어서 입고를 취소할 수 없습니다.');
              }
            }
          }

          // 3. 롤백 실행
          const now = new Date().toISOString();
          const { error: outError } = await supabase
            .from('outsource_orders')
            .update({ status: '발주완료', received_qty: 0, received_date: null, updated_at: now })
            .eq('id', completedOutsource.id);
          if (outError) throw outError;

          if (completedOutsource.process_name) {
            await supabase
              .from('process_logs')
              .update({ status: '외주가공중' })
              .eq('order_item_id', data.itemData.id)
              .eq('process_name', completedOutsource.process_name)
              .eq('status', '완료');
          }

          // 4. 상태 강등
          await supabase
            .from('order_items')
            .update({ production_status: 'OUTSOURCE_READY' })
            .eq('id', data.itemData.id)
            .eq('production_status', 'SHIPPING_READY');
        }

      } else if (data.type === 'M' && data.materialData) {
        if (data.materialData.status !== '입고완료') throw new Error('취소할 수 있는 입고 내역이 없습니다.');

        // 연동된 order_items의 process_logs 확인
        const itemIds = Array.isArray(data.itemData) 
          ? data.itemData.map((item: any) => item.id) 
          : (data.itemData?.id ? [data.itemData.id] : []);
        if (itemIds.length > 0) {
          const { data: logs } = await supabase
            .from('process_logs')
            .select('status')
            .in('order_item_id', itemIds)
            .neq('status', '대기');
            
          if (logs && logs.length > 0) {
            throw new Error('자재 입고 후 공정이 이미 진행되어 입고를 취소할 수 없습니다.');
          }
        }

        const now = new Date().toISOString();
        const { error } = await supabase
          .from('material_orders')
          .update({ status: '발주완료', received_qty: 0, received_date: null, updated_at: now })
          .eq('id', data.materialData.id);
        if (error) throw error;
      }
      return true;
    } catch (err: any) {
      console.error(err);
      setError(err.message || '입고 취소 중 오류가 발생했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    data,
    submitPBarcodeReceiving,
    submitMBarcodeReceiving,
    undoReceiving
  };
};
