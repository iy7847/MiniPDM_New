import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type {
  MaterialOrder,
  Inventory,
  ProcessLog,
  OutsourceOrder,
  ProcessStatus,
  OutsourceStatus,
} from '../types/mes';

// TODO: Replace with actual types when data_engineer creates them
export interface Estimate {
  id: string;
  [key: string]: any;
}

export interface Order {
  id: string;
  [key: string]: any;
}

interface MesState {
  materialOrders: MaterialOrder[];
  inventories: Inventory[];
  processLogs: ProcessLog[];
  outsourceOrders: OutsourceOrder[];
  estimates: Estimate[];
  orders: Order[];
  
  loading: boolean;
  error: string | null;

  // Async Fetch Actions (Supabase)
  fetchEstimates: () => Promise<void>;
  fetchOrders: () => Promise<void>;

  // 소재 발주
  addMaterialOrder: (order: Omit<MaterialOrder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaterialOrder: (id: string, data: Partial<MaterialOrder>) => void;
  receiveMaterial: (id: string) => void; // 소재 입고 처리 (재고 증가 포함)

  // 재고 관리
  addInventory: (inventory: Omit<Inventory, 'id' | 'updatedAt'>) => void;
  updateInventory: (id: string, data: Partial<Inventory>) => void;
  allocateInventory: (id: string, quantity: number) => void; // 재고 사용/할당

  // 공정 관리
  addProcessLog: (log: Omit<ProcessLog, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProcessStatus: (id: string, status: ProcessStatus, data?: Partial<ProcessLog>) => void;
  startProcess: (id: string, worker?: string, machine?: string) => void;
  endProcess: (id: string) => void;

  // 외주 발주 관리
  addOutsourceOrder: (order: Omit<OutsourceOrder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOutsourceOrder: (id: string, data: Partial<OutsourceOrder>) => void;
  receiveOutsourceOrder: (id: string) => void; // 외주 입고(수신) 확인
}

export const useMesStore = create<MesState>((set) => ({
  materialOrders: [],
  inventories: [],
  processLogs: [],
  outsourceOrders: [],
  estimates: [],
  orders: [],
  
  loading: false,
  error: null,
  isNotificationOpen: false,

  fetchEstimates: async () => {
    set({ loading: true, error: null });
    try {
      // Basic supabase fetch (Assume estimateService will replace this later)
      const { data, error } = await supabase.from('estimates').select('*');
      if (error) throw error;
      set({ estimates: data || [], loading: false });
    } catch (err: any) {
      console.error('Error fetching estimates:', err);
      set({ error: err.message, loading: false });
    }
  },

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('orders').select('*');
      if (error) throw error;
      set({ orders: data || [], loading: false });
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      set({ error: err.message, loading: false });
    }
  },

  addMaterialOrder: (order) => set((state) => ({
    materialOrders: [
      ...state.materialOrders,
      {
        ...order,
        id: `mo_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  })),

  updateMaterialOrder: (id, data) => set((state) => ({
    materialOrders: state.materialOrders.map((order) =>
      order.id === id ? { ...order, ...data, updatedAt: new Date().toISOString() } : order
    )
  })),

  receiveMaterial: (id) => set((state) => {
    const order = state.materialOrders.find(o => o.id === id);
    if (!order) return state;

    const now = new Date().toISOString();
    
    // 동일 자재(소재명+규격)가 재고에 있는지 확인
    const existingInvIndex = state.inventories.findIndex(
      inv => inv.materialName === order.materialName && inv.spec === order.spec
    );

    let newInventories = [...state.inventories];
    if (existingInvIndex >= 0) {
      // 기존 재고 수량/중량 증가
      newInventories[existingInvIndex] = {
        ...newInventories[existingInvIndex],
        quantity: newInventories[existingInvIndex].quantity + order.quantity,
        weight: newInventories[existingInvIndex].weight + order.weight,
        updatedAt: now,
      };
    } else {
      // 신규 재고 등록
      newInventories.push({
        id: `inv_${Date.now()}`,
        materialName: order.materialName,
        spec: order.spec,
        quantity: order.quantity,
        weight: order.weight,
        location: '대기장', // 기본값
        updatedAt: now,
      });
    }

    return {
      materialOrders: state.materialOrders.map(o => 
        o.id === id ? { ...o, status: '입고완료', receivedDate: now, updatedAt: now } : o
      ),
      inventories: newInventories,
    };
  }),

  addInventory: (inventory) => set((state) => ({
    inventories: [
      ...state.inventories,
      {
        ...inventory,
        id: `inv_${Date.now()}`,
        updatedAt: new Date().toISOString(),
      }
    ]
  })),

  updateInventory: (id, data) => set((state) => ({
    inventories: state.inventories.map((inv) =>
      inv.id === id ? { ...inv, ...data, updatedAt: new Date().toISOString() } : inv
    )
  })),

  allocateInventory: (id, quantity) => set((state) => ({
    inventories: state.inventories.map(inv => 
      inv.id === id ? { 
        ...inv, 
        quantity: Math.max(0, inv.quantity - quantity),
        updatedAt: new Date().toISOString()
      } : inv
    )
  })),

  addProcessLog: (log) => set((state) => ({
    processLogs: [
      ...state.processLogs,
      {
        ...log,
        id: `pl_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  })),

  updateProcessStatus: (id, status, data) => set((state) => ({
    processLogs: state.processLogs.map((log) =>
      log.id === id ? { ...log, status, ...data, updatedAt: new Date().toISOString() } : log
    )
  })),

  startProcess: (id, worker, machine) => set((state) => ({
    processLogs: state.processLogs.map((log) =>
      log.id === id ? { 
        ...log, 
        status: '진행중', 
        worker: worker || log.worker, 
        machine: machine || log.machine, 
        startTime: new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      } : log
    )
  })),

  endProcess: (id) => set((state) => ({
    processLogs: state.processLogs.map((log) =>
      log.id === id ? { 
        ...log, 
        status: '완료', 
        endTime: new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      } : log
    )
  })),

  addOutsourceOrder: (order) => set((state) => ({
    outsourceOrders: [
      ...state.outsourceOrders,
      {
        ...order,
        id: `oo_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  })),

  updateOutsourceOrder: (id, data) => set((state) => ({
    outsourceOrders: state.outsourceOrders.map((order) =>
      order.id === id ? { ...order, ...data, updatedAt: new Date().toISOString() } : order
    )
  })),

  receiveOutsourceOrder: (id) => set((state) => {
    const order = state.outsourceOrders.find(o => o.id === id);
    if (!order) return state;

    const now = new Date().toISOString();

    // 외주 발주 완료 처리
    const newOutsourceOrders = state.outsourceOrders.map(o => 
      o.id === id ? { ...o, status: '완료' as OutsourceStatus, receivedDate: now, updatedAt: now } : o
    );

    // 관련된 공정 로그 상태도 '완료'로 연동
    let newProcessLogs = state.processLogs;
    if (order.processId) {
      newProcessLogs = state.processLogs.map(p => 
        p.id === order.processId ? { ...p, status: '완료' as ProcessStatus, endTime: now, updatedAt: now } : p
      );
    }

    return {
      outsourceOrders: newOutsourceOrders,
      processLogs: newProcessLogs,
    };
  }),
}));
