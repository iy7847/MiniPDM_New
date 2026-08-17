export type OrderStatus = 'ORDERED' | 'PRODUCTION' | 'INSPECTION' | 'DONE' | 'HOLD';

export interface Order {
  id: string;
  company_id: string;
  client_id: string;
  estimate_id?: string | null;
  estimates?: {
    id: string;
    base_exchange_rate: number;
    currency: string;
  };

  po_no: string;
  order_date: string;
  delivery_date: string;

  status: OrderStatus;
  shipping_status?: 'unshipped' | 'partially_shipped' | 'shipped';

  currency: string;
  exchange_rate: number;
  total_amount: number;

  note?: string;

  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  estimate_item_id?: string | null;
  client_po_no?: string | null;

  part_name: string;
  part_no: string;
  spec: string;

  material_name: string;
  original_material_name?: string | null;
  material_id?: string | null;

  qty: number;
  production_qty?: number;
  unit_price: number;
  supply_price: number;

  production_status: 'PENDING' | 'IN_PROGRESS' | 'QC' | 'DONE';

  work_days?: number;
  due_date?: string;

  note?: string;
  order_item_no?: string;
  currency?: string;
  exchange_rate?: number;

  estimate_items?: {
    unit_price: number;
    supply_price: number;
    estimates?: {
      exchange_rate: number;
    };
  };

  post_processing_name?: string;

  supply_type?: 'INHOUSE' | 'OUTSOURCE' | 'PURCHASE';
  material_supply_type?: 'ORDER' | 'STOCK' | 'PROVIDED' | 'NONE';
  use_stock?: boolean;
  production_type?: 'INHOUSE' | 'OUTSOURCE';
  production_note?: string;
  completed_at?: string;
}

export interface OrderForm {
  client_id: string;
  po_no: string;
  order_date: string;
  delivery_date: string;
  note: string;
}
