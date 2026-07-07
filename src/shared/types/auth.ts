export interface UserPermissions {
  can_view_estimates: boolean;
  can_write_estimates: boolean;
  can_delete_estimates: boolean;
  can_view_margins: boolean;
  can_view_orders: boolean;
  can_manage_production: boolean;
  can_manage_clients: boolean;
  can_manage_materials: boolean;
  can_view_analytics: boolean;
}

export interface UserGroup {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  permissions: UserPermissions;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id: string;
  group_id?: string | null;
  join_date?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  job_title?: string | null;
  permissions?: UserPermissions;
  created_at: string;
  updated_at: string;
}
