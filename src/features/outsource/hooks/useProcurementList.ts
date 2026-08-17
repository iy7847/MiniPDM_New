import { useState, useEffect } from 'react';
import { supabase } from '@/shared/services/supabase';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export type ProcurementTab = 'STATUS' | 'OUTSOURCE' | 'PURCHASE' | 'MATERIAL';
export type ProcurementType = 'OUTSOURCE' | 'PURCHASE' | 'MATERIAL';

export interface ProcurementOrder {
  id: string;
  type: ProcurementType;
  po_no?: string;
  order_item_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  item_name: string;
  part_no?: string;
  item_spec: string;
  process_name: string;
  quantity: number;
  received_qty: number;
  unit_price: number;
  status: string;
  order_date: string;
  read_at?: string;
  order_item_no?: string;
  shape?: string;
  files: any[];
  raw_data: any;
  items?: {
    id: string;
    part_name: string;
    part_no: string;
    spec: string;
    material_spec: string;
    material_id?: string | null;
    order_item_no: string;
    required_qty: number;
    files: any[];
  }[];
}

export function useProcurementList(activeTab: ProcurementTab) {
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let outsourceData: any[] = [];
      let materialData: any[] = [];

      // 1. 발주 현황 (STATUS): outsource_orders 와 material_orders 에서 발주대기가 아닌 모든 건 조회
      if (activeTab === 'STATUS') {
        const [outRes, matRes] = await Promise.all([
          supabase
            .from('outsource_orders')
            .select(`
              id, order_item_id, supplier_id, supplier_name, process_name, quantity, received_qty, unit_price, status, order_date, expected_date, read_at,
              order_items ( id, part_name, part_no, order_item_no, spec, material_name, files ( id, file_name, file_path, original_name ) )
            `)
            .neq('status', '발주대기')
            .order('created_at', { ascending: false }),
          supabase
            .from('material_orders')
            .select(`
              id, order_item_id, supplier_id, supplier_name, material_name, spec, quantity, received_qty, unit_price, status, order_date, expected_date, read_at, po_receipt_token, po_no, shape,
              order_items ( id, part_name, part_no, order_item_no, spec, material_spec, material_name, files ( id, file_name, file_path, original_name ) ),
              material_order_items (
                required_qty,
                order_items!fk_material_order_items_order_item ( id, part_name, part_no, order_item_no, spec, material_spec, material_name, files ( id, file_name, file_path, original_name ) )
              )
            `)
            .neq('status', '발주대기')
            .order('created_at', { ascending: false })
        ]);

        if (outRes.error) throw outRes.error;
        if (matRes.error) throw matRes.error;

        outsourceData = outRes.data || [];
        materialData = matRes.data || [];
      } 
      // 2. 개별 발주 탭: 발주대기 상태인 건만 조회
      else if (activeTab === 'OUTSOURCE' || activeTab === 'PURCHASE') {
        const { data, error } = await supabase
          .from('outsource_orders')
          .select(`
            id, order_item_id, supplier_id, supplier_name, process_name, quantity, received_qty, unit_price, status, order_date, expected_date, read_at,
            order_items ( id, part_name, part_no, order_item_no, spec, material_name, files ( id, file_name, file_path, original_name ) )
          `)
          .eq('status', '발주대기')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        let filtered = data || [];
        if (activeTab === 'PURCHASE') {
          filtered = filtered.filter((d: any) => d.process_name === '기성품 구매');
        } else {
          filtered = filtered.filter((d: any) => d.process_name !== '기성품 구매');
        }
        outsourceData = filtered;
      } 
      else if (activeTab === 'MATERIAL') {
        const { data, error } = await supabase
          .from('material_orders')
          .select(`
            id, order_item_id, supplier_id, supplier_name, material_name, spec, quantity, received_qty, unit_price, status, order_date, expected_date, read_at, po_receipt_token, shape, estimated_price, po_no,
            order_items ( id, part_name, part_no, order_item_no, spec, material_name, material_id, files ( id, file_name, file_path, original_name ) ),
            material_order_items (
              required_qty,
              order_items!fk_material_order_items_order_item ( id, part_name, part_no, order_item_no, spec, material_spec, material_name, material_id, files ( id, file_name, file_path, original_name ) )
            )
          `)
          .eq('status', '발주대기')
          .order('created_at', { ascending: false });

        if (error) throw error;
        materialData = data || [];
      }

      // 데이터 매핑
      const mappedOutsource = outsourceData.map((d: any) => ({
        id: d.id,
        type: d.process_name === '기성품 구매' ? 'PURCHASE' : 'OUTSOURCE' as ProcurementType,
        po_no: d.id.substring(0, 8).toUpperCase(),
        order_item_id: d.order_item_id,
        supplier_id: d.supplier_id,
        supplier_name: d.supplier_name,
        item_name: d.order_items?.part_name || '-',
        part_no: d.order_items?.part_no || '-',
        item_spec: d.order_items?.spec || '-',
        order_item_no: d.order_items?.order_item_no,
        process_name: d.process_name || '-',
        quantity: d.quantity,
        received_qty: d.received_qty || 0,
        unit_price: d.unit_price || 0,
        status: d.status,
        order_date: d.order_date,
        expected_date: d.expected_date,
        read_at: d.read_at,
        files: Array.isArray(d.order_items?.files) ? d.order_items.files : [],
        raw_data: d
      }));

      const mappedMaterial = materialData.map((d: any) => {
        // Fallback for legacy data that used material_order_items
        const legacyItem = d.material_order_items?.[0]?.order_items;
        const oi = d.order_items || legacyItem;
        const files = Array.isArray(oi?.files) ? oi.files : [];
        const rawPartNo = oi?.part_no || '-';
        const displayPartNo = rawPartNo !== '-' ? `[M]${rawPartNo}` : '-';

        let displayOrderItemNo = oi?.order_item_no || '-';
        if (displayOrderItemNo.startsWith('P')) {
          displayOrderItemNo = 'M' + displayOrderItemNo.substring(1);
        } else if (displayOrderItemNo.startsWith('TEMP-')) {
          displayOrderItemNo = displayOrderItemNo.replace('TEMP-', 'M-TEMP-');
        }

        return {
          id: d.id,
          type: 'MATERIAL' as ProcurementType,
          po_no: d.po_no || d.id.substring(0, 8).toUpperCase(),
          order_item_id: d.order_item_id || oi?.id || '',
          supplier_id: d.supplier_id,
          supplier_name: d.supplier_name,
          item_name: d.material_name || '-',
          part_no: displayPartNo,
          item_spec: d.spec || '-', // 원소재 치수
          shape: d.shape || '',
          order_item_no: displayOrderItemNo,
          process_name: '원소재 발주',
          quantity: d.quantity,
          received_qty: d.received_qty || 0,
          unit_price: d.unit_price || 0,
          status: d.status,
          order_date: d.order_date,
          expected_date: d.expected_date,
          read_at: d.read_at,
          files: files,
          raw_data: d
        };
      });

      // 발주 현황이면 두 배열을 합쳐서 보여줌
      if (activeTab === 'STATUS') {
        // created_at 기준으로 다시 정렬해야 하나, 일단 뷰 단에서 table sorting을 지원하므로 단순 합치기
        setOrders([...mappedOutsource, ...mappedMaterial]);
      } else {
        setOrders(activeTab === 'MATERIAL' ? mappedMaterial : mappedOutsource);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const getTableName = (type: ProcurementType) => {
    return type === 'MATERIAL' ? 'material_orders' : 'outsource_orders';
  };

  const undoBatchOrders = async (orderIds: string[]) => {
    try {
      setLoading(true);
      // orderIds를 타입별로 분류
      const targetOrders = orders.filter(o => orderIds.includes(o.id));
      const outsourceIds = targetOrders.filter(o => o.type !== 'MATERIAL').map(o => o.id);
      const materialIds = targetOrders.filter(o => o.type === 'MATERIAL').map(o => o.id);

      if (outsourceIds.length > 0) {
        const { error } = await supabase.from('outsource_orders').update({ status: '발주대기' }).in('id', outsourceIds);
        if (error) throw error;
      }
      if (materialIds.length > 0) {
        const { error } = await supabase.from('material_orders').update({ status: '발주대기' }).in('id', materialIds);
        if (error) throw error;
      }
      
      return { success: true, count: orderIds.length };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
      fetchOrders();
    }
  };

  // 모달을 통한 묶음 발주 확정 (DB 저장)
  const processBatchOrder = async (
    updates: { id: string; type: ProcurementType; unit_price: number; note: string }[],
    supplierId: string,
    supplierName: string,
    expectedDate: string,
    token?: string // 발주 메일 수신 확인용 토큰
  ) => {
    try {
      setLoading(true);
      
      const outsourceUpdates = updates.filter(u => u.type !== 'MATERIAL');
      const materialUpdates = updates.filter(u => u.type === 'MATERIAL');

      const today = new Date().toISOString().split('T')[0];

      // Outsource Orders 업데이트
      for (const update of outsourceUpdates) {
        const order = orders.find(o => o.id === update.id);
        if (!order) continue;
        
        await supabase.from('outsource_orders').update({
          supplier_id: supplierId,
          supplier_name: supplierName,
          expected_date: expectedDate,
          unit_price: update.unit_price,
          total_price: update.unit_price * order.quantity,
          status: '발주완료',
          order_date: today,
          po_receipt_token: token
        }).eq('id', update.id);
      }

      // Material Orders 업데이트
      for (const update of materialUpdates) {
        const order = orders.find(o => o.id === update.id);
        if (!order) continue;

        await supabase.from('material_orders').update({
          supplier_id: supplierId,
          supplier_name: supplierName,
          expected_date: expectedDate,
          unit_price: update.unit_price,
          total_price: update.unit_price * order.quantity,
          status: '발주완료',
          order_date: today,
          po_receipt_token: token
        }).eq('id', update.id);
      }

      fetchOrders();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { 
    orders, 
    loading, 
    fetchOrders, 
    undoBatchOrders,
    processBatchOrder
  };
}
