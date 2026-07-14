export type ClientType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

export interface Client {
  id: string;
  name: string;
  biz_num: string;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  is_foreign: boolean;
  country: string;
  currency: string;
  client_type: ClientType;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export type ClientFormData = Omit<Client, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
