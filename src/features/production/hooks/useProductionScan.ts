import { useState, useCallback } from 'react';
import { supabase } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthProvider';

export type ProcessLog = {
  id: string;
  order_item_id: string;
  process_name: string;
  process_type: string;
  status: string;
  worker: string | null;
  machine: string | null;
  outsource_id: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  start_qty: number;
  good_qty: number;
  defect_qty: number;
  sequence_no: number | null;
  is_planned: boolean;
};

export type MasterProcess = {
  id: string;
  name: string;
  is_outsource: boolean;
  type: 'process' | 'heat_treatment' | 'post_processing';
  description?: string | null;
};

export const useProductionScan = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 데이터 패칭: 바코드로 품목 찾고 관련된 로그 및 마스터 데이터를 모두 가져옴
  const fetchScanData = useCallback(async (barcode: string) => {
    if (!user) return null;
    setLoading(true);
    setError(null);

    try {
      // 1. 바코드(item_no)로 order_item 찾기
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select(`
          id, part_name, part_no, order_item_no, qty, production_qty, supply_type, production_status, material_name, spec,
          orders!inner(id, po_no, client_id)
        `)
        .eq('order_item_no', barcode)
        .maybeSingle();

      if (itemError || !itemData) {
        throw new Error('바코드에 해당하는 품목을 찾을 수 없습니다.');
      }

      // 2. 해당 품목의 process_logs 및 outsource_orders 찾기
      const [
        { data: logsData, error: logsError },
        { data: outOrdersData }
      ] = await Promise.all([
        supabase
          .from('process_logs')
          .select('*')
          .eq('order_item_id', itemData.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('outsource_orders')
          .select('*')
          .eq('order_item_id', itemData.id)
          .order('created_at', { ascending: false })
      ]);

      if (logsError) throw logsError;

      // 3. 공정 마스터 데이터 (사내, 열처리, 후처리) 통합 조회
      const [
        { data: procData },
        { data: heatData },
        { data: postData },
        { data: supplierData }
      ] = await Promise.all([
        supabase.from('processes').select('id, name, is_outsource, description').order('name'),
        supabase.from('heat_treatments').select('id, name').order('name'),
        supabase.from('post_processings').select('id, name').order('name'),
        supabase.from('clients').select('id, name').in('client_type', ['SUPPLIER', 'BOTH', '매입/외주처', '매출/매입처', '매입처']).order('name')
      ]);

      const masterProcesses: MasterProcess[] = [
        ...(procData || []).map(p => ({ id: p.id, name: p.name, is_outsource: p.is_outsource, description: p.description || null, type: 'process' as const })),
        ...(heatData || []).map(h => ({ id: h.id, name: h.name, is_outsource: true, description: null, type: 'heat_treatment' as const })),
        ...(postData || []).map(p => ({ id: p.id, name: p.name, is_outsource: true, description: null, type: 'post_processing' as const })),
      ];

      return {
        item: itemData,
        logs: (logsData || []) as ProcessLog[],
        outsourceOrders: outOrdersData || [],
        masterProcesses,
        suppliers: supplierData || []
      };

    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 1. 공정 시작 (사내 가공 시작 or 첫 공정 외주 발송)
  const startProcess = async (
    orderItemId: string,
    processName: string,
    startQty: number,
    isOutsource: boolean = false,
    existingLogId?: string,
    supplierId?: string,
    supplierName?: string
  ) => {
    if (!user) return false;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { data: profile } = await supabase.from('profiles').select('company_id, name').eq('id', user.id).single();
      const companyId = profile?.company_id;
      const workerName = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || '작업자';

      let outsourceOrderId = null;

      // 외주 공정인 경우 먼저 outsource_orders 생성
      if (isOutsource) {
        const { data: outData, error: outError } = await supabase
          .from('outsource_orders')
          .insert({
            company_id: companyId,
            order_item_id: orderItemId,
            supplier_id: supplierId || null,
            supplier_name: supplierName || null,
            process_name: processName,
            quantity: startQty, // 시작 수량 저장
            outsource_type: 'FIELD',
            status: supplierId ? '진행중' : '발주대기',
            order_date: now
          })
          .select('id')
          .single();
        if (outError) throw outError;
        outsourceOrderId = outData.id;
      }

      if (existingLogId) {
        // 기존 대기 중인 로그 업데이트 (만약 계획된 대기 로그가 start_qty 0이었다면 여기서 채워야 함)
        const { error } = await supabase
          .from('process_logs')
          .update({
            status: isOutsource ? '외주가공중' : '가공중',
            start_time: now,
            worker: isOutsource ? null : workerName,
            outsource_id: outsourceOrderId,
            process_type: isOutsource ? 'OUTSOURCE' : 'INTERNAL',
            start_qty: startQty
          })
          .eq('id', existingLogId);
        if (error) throw error;
      } else {
        // Ad-hoc 신규 로그 생성
        const { error } = await supabase
          .from('process_logs')
          .insert({
            company_id: companyId,
            order_item_id: orderItemId,
            process_name: processName,
            process_type: isOutsource ? 'OUTSOURCE' : 'INTERNAL',
            status: isOutsource ? '외주가공중' : '가공중',
            start_time: now,
            worker: isOutsource ? null : workerName,
            outsource_id: outsourceOrderId,
            is_planned: false,
            start_qty: startQty
          });
        if (error) throw error;
      }

      // 사내 공정이 새로 시작되었다면, 외주에 나갔다 들어온 것으로 간주하여 미입고된 외주 발주를 강제로 입고완료 처리
      if (!isOutsource) {
        await supabase
          .from('outsource_orders')
          .update({ status: '입고완료' })
          .eq('order_item_id', orderItemId)
          .neq('status', '입고완료')
          .neq('status', '취소');
      }

      // 품목 전체 진행 상태를 '진행 중'으로 동기화
      await supabase
        .from('order_items')
        .update({ 
          production_status: 'IN_PROGRESS',
          process_status: 'PROCESSING',
          updated_at: now
        })
        .eq('id', orderItemId)
        .neq('production_status', 'SHIPPING_READY')
        .neq('production_status', 'COMPLETED');

      return true;
    } catch (err: any) {
      console.error(err);
      setError('작업 시작 처리에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 2. 가공 완료 및 다음 목적지 지정
  const completeProcess = async (
    logId: string,
    orderItemId: string,
    goodQty: number,
    defectQty: number,
    defectReason?: string,
    nextStep?: 'IDLE' | 'INTERNAL' | 'OUTSOURCE',
    nextProcessName?: string,
    nextPlannedLogId?: string,
    nextSupplierId?: string,
    nextSupplierName?: string
  ) => {
    if (!user) return false;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      const companyId = profile?.company_id;
      
      // 1) 현재 로그 완료 처리
      let notes = defectQty > 0 ? `불량 ${defectQty}개 발생: ${defectReason}` : '정상 완료';
      if (nextStep === 'OUTSOURCE') notes += ` [외주 발송] ${nextProcessName}`;
      
      const { data: updatedLog, error: logError } = await supabase
        .from('process_logs')
        .update({
          status: '완료',
          end_time: now,
          notes,
          good_qty: goodQty,
          defect_qty: defectQty
        })
        .eq('id', logId)
        .select('process_name, order_item_id')
        .single();
        
      if (logError) throw logError;

      // === [불량 발생 시: 재작업 오더 파생 분할(Rework Splitting) 로직] ===
      if (defectQty > 0) {
        // 원본 품목 조회
        const { data: originalItem, error: origError } = await supabase
          .from('order_items')
          .select('*')
          .eq('id', orderItemId)
          .single();

        if (origError) throw origError;

        // 원본 수량 차감
        await supabase
          .from('order_items')
          .update({ 
            qty: originalItem.qty - defectQty,
            updated_at: now
          })
          .eq('id', orderItemId);

        // 파생 오더 번호 채번 (-R1, -R2...)
        const baseItemNo = originalItem.order_item_no.split('-R')[0];
        const { count } = await supabase
          .from('order_items')
          .select('*', { count: 'exact', head: true })
          .eq('order_id', originalItem.order_id)
          .like('order_item_no', `${baseItemNo}-R%`);

        const nextReworkNum = (count || 0) + 1;
        const newItemNo = `${baseItemNo}-R${nextReworkNum}`;

        // ID 등 고유 필드를 제외하고 복제할 데이터 구성
        const { 
          id, created_at, updated_at, 
          ...itemDataToCopy 
        } = originalItem;
        
        // 재작업 오더 INSERT (완전히 독립적으로 진행되도록 초기 상태로 설정)
        const { error: insertError } = await supabase
          .from('order_items')
          .insert({
            ...itemDataToCopy,
            order_item_no: newItemNo,
            qty: defectQty,
            production_qty: defectQty,
            production_status: 'PRODUCTION_READY',
            process_status: 'WAIT',
            update_memo: `불량 분할: 원본 ${originalItem.order_item_no}에서 파생`,
            updated_by: user.id
          });

        if (insertError) throw insertError;
      }
      // =========================================================

      // 2) 다음 단계 지정 처리 (생략되거나 단순화됨)
      if (nextStep === 'INTERNAL' && nextProcessName && !nextPlannedLogId) {
        await supabase.from('process_logs').insert({
          company_id: companyId,
          order_item_id: orderItemId,
          process_name: nextProcessName,
          process_type: 'INTERNAL',
          status: '대기',
          is_planned: false
        });
      } else if (nextStep === 'OUTSOURCE' && nextProcessName) {
        const { data: outData } = await supabase.from('outsource_orders').insert({
          company_id: companyId,
          order_item_id: orderItemId,
          supplier_id: nextSupplierId || null,
          supplier_name: nextSupplierName || null,
          process_name: nextProcessName,
          quantity: goodQty, // 다음 외주는 양품 수량만큼만 발송
          outsource_type: 'INTERMEDIATE',
          status: nextSupplierId ? '진행중' : '발주대기',
          order_date: now
        }).select('id').single();

        if (nextPlannedLogId) {
          await supabase.from('process_logs').update({
            process_type: 'OUTSOURCE',
            status: '외주가공중',
            outsource_id: outData?.id,
            start_time: now
          }).eq('id', nextPlannedLogId);
        } else {
          await supabase.from('process_logs').insert({
            company_id: companyId,
            order_item_id: orderItemId,
            process_name: nextProcessName,
            process_type: 'OUTSOURCE',
            status: '외주가공중',
            outsource_id: outData?.id,
            is_planned: false,
            start_time: now
          });
        }
      }

      // 3) 출하/포장 체크 또는 다음 공정 없는 출하(IDLE) 체크
      if (
        updatedLog.process_name.includes('출하') || 
        updatedLog.process_name.includes('포장') || 
        updatedLog.process_name.includes('완료') ||
        nextStep === 'IDLE'
      ) {
        await supabase.from('order_items').update({ production_status: 'SHIPPING_READY', updated_at: now }).eq('id', updatedLog.order_item_id);
      } else {
        await supabase.from('order_items').update({ production_status: 'IN_PROGRESS', updated_at: now }).eq('id', updatedLog.order_item_id);
      }

      return true;
    } catch (err: any) {
      console.error(err);
      setError('완료 처리에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 3. 이력 취소 (되돌리기 - 시작/종료를 하나로 보고 무조건 '대기'로 완전 리셋)
  const rollbackProcess = async (logId: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      // 1) 롤백 대상 로그 정보 가져오기
      const { data: targetLog, error: fetchError } = await supabase
        .from('process_logs')
        .select('*')
        .eq('id', logId)
        .single();
        
      if (fetchError) throw fetchError;
      if (targetLog.status === '대기') {
        throw new Error('이미 대기 상태인 공정입니다.');
      }

      // 2) 가장 최신 진행 공정인지 검증
      const { data: allLogs } = await supabase
        .from('process_logs')
        .select('*')
        .eq('order_item_id', targetLog.order_item_id)
        .order('sequence_no', { ascending: true });
        
      if (allLogs) {
        const subsequentLogs = allLogs.filter(l => l.sequence_no > targetLog.sequence_no);
        const hasNextStarted = subsequentLogs.some(l => l.status !== '대기');
        if (hasNextStarted) {
          throw new Error('다음 공정이 이미 진행 중이어서 취소할 수 없습니다.');
        }
      }

      // 3) 만약 외주가공중이었다면 outsource_orders 취소 처리
      if (targetLog.outsource_id) {
        await supabase.from('outsource_orders').delete().eq('id', targetLog.outsource_id);
      }

      // 4) 롤백 실행 (가공시작/종료를 하나의 단위로 보고 '대기'로 초기화)
      if (targetLog.is_planned) {
        // 계획된 공정: 대기 상태로 데이터 초기화
        const { error: updateError } = await supabase
          .from('process_logs')
          .update({
            status: '대기',
            start_time: null,
            end_time: null,
            worker: null,
            machine: null,
            notes: null,
            outsource_id: null
          })
          .eq('id', logId);
        if (updateError) throw updateError;
      } else {
        // Ad-hoc 수동 추가 공정: 완전히 삭제
        const { error: deleteError } = await supabase
          .from('process_logs')
          .delete()
          .eq('id', logId);
        if (deleteError) throw deleteError;
      }

      // 5) 상태 역산 (order_items.production_status)
      const isFinalProcess = targetLog.process_name.includes('출하') || targetLog.process_name.includes('포장') || targetLog.process_name.includes('완료');
      const startedLogsCount = allLogs?.filter(l => l.status !== '대기').length || 0;

      // 만약 방금 취소한 공정이 유일하게 진행되었던 첫 공정이라면, 이제 진행된 공정이 아예 없으므로 대기 상태로 강등
      if (startedLogsCount <= 1) {
        await supabase
          .from('order_items')
          .update({ production_status: 'PRODUCTION_READY' })
          .eq('id', targetLog.order_item_id);
      } else if (isFinalProcess) {
        // 첫 공정은 아니지만 마지막 공정을 취소했다면, 진행중 상태로 강등
        await supabase
          .from('order_items')
          .update({ production_status: 'IN_PROGRESS' })
          .eq('id', targetLog.order_item_id);
      }

      return true;
    } catch (err: any) {
      console.error(err);
      setError(err.message || '공정 취소 처리에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 4. 외주 발주 입고 처리 (원클릭 입고 확정)
  const receiveOutsourceOrder = async (outsourceOrderId: string, receiveQty: number) => {
    if (!user) return false;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      // 1) outsource_orders 업데이트
      const { data: outOrder, error: outErr } = await supabase
        .from('outsource_orders')
        .update({
          status: '입고완료',
          received_qty: receiveQty,
          received_date: today,
          updated_at: now
        })
        .eq('id', outsourceOrderId)
        .select('order_item_id')
        .single();

      if (outErr) throw outErr;

      // 2) 관련 process_logs가 있다면 외주가공중 -> 완료 처리
      if (outOrder?.order_item_id) {
        await supabase
          .from('process_logs')
          .update({
            status: '완료',
            good_qty: receiveQty,
            end_time: now
          })
          .eq('outsource_id', outsourceOrderId);
      }

      return true;
    } catch (err: any) {
      console.error(err);
      setError(err.message || '외주 입고 처리에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 5. 출하 상태 취소 (공정 진행 중으로 롤백)
  const cancelShipping = async (orderItemId: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('order_items')
        .update({
          production_status: 'IN_PROGRESS',
          updated_at: now
        })
        .eq('id', orderItemId);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error(err);
      setError(err.message || '출하 취소 처리에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchScanData,
    startProcess,
    completeProcess,
    rollbackProcess,
    receiveOutsourceOrder,
    cancelShipping
  };
};
