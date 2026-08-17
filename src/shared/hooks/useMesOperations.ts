import { useState } from 'react';
import { supabase } from '@/shared/services/supabase';

export function useMesOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createBundledMaterialOrder = async (params: {
    companyId: string;
    orderItemIds: string[];
    materialName: string;
    spec?: string;
    quantity: number;
    weight?: number;
    unitPrice?: number;
    totalPrice?: number;
    supplierId?: string;
    supplierName?: string;
    orderDate?: string;
    expectedDate?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('create_bundled_material_order', {
        p_company_id: params.companyId,
        p_order_item_ids: params.orderItemIds,
        p_material_name: params.materialName,
        p_spec: params.spec || null,
        p_quantity: params.quantity,
        p_weight: params.weight || 0,
        p_unit_price: params.unitPrice || 0,
        p_total_price: params.totalPrice || 0,
        p_supplier_id: params.supplierId || null,
        p_supplier_name: params.supplierName || null,
        p_order_date: params.orderDate || null,
        p_expected_date: params.expectedDate || null
      });

      if (error) throw error;
      return data as string; // returns material_order_id UUID
    } catch (err: any) {
      console.error('Failed to create bundled material order:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startFirstProcessAndConsumeMaterial = async (params: {
    companyId: string;
    orderItemId: string;
    processName: string;
    processType: string;
    worker?: string;
    machine?: string;
    userId: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('start_first_process_and_consume_material', {
        p_company_id: params.companyId,
        p_order_item_id: params.orderItemId,
        p_process_name: params.processName,
        p_process_type: params.processType,
        p_worker: params.worker || null,
        p_machine: params.machine || null,
        p_user_id: params.userId
      });

      if (error) throw error;
      return data as string; // returns process_log_id UUID
    } catch (err: any) {
      console.error('Failed to start process and consume material:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelLastProcessAndRevertMaterial = async (params: {
    companyId: string;
    orderItemId: string;
    processLogId: string;
    userId: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('cancel_last_process_and_revert_material', {
        p_company_id: params.companyId,
        p_order_item_id: params.orderItemId,
        p_process_log_id: params.processLogId,
        p_user_id: params.userId
      });

      if (error) throw error;
      return data as boolean;
    } catch (err: any) {
      console.error('Failed to cancel process and revert material:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createBundledMaterialOrder,
    startFirstProcessAndConsumeMaterial,
    cancelLastProcessAndRevertMaterial,
    loading,
    error
  };
}
