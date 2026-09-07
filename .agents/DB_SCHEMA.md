# 🗄️ Database Schema Reference (Auto-Generated)

> 이 파일은 현재 Supabase 클라우드 DB의 실제 스키마를 덤프한 파일입니다.
> `database.types.ts` 대신 **이 파일을 Single Source of Truth로 사용**하세요.

## 📄 Table: `clients`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `name` | `text` | NO | NULL |
| `biz_num` | `text` | YES | NULL |
| `manager_name` | `text` | YES | NULL |
| `manager_phone` | `text` | YES | NULL |
| `manager_email` | `text` | YES | NULL |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
| `is_foreign` | `boolean` | YES | false |
| `country` | `text` | YES | 'KR'::text |
| `currency` | `text` | YES | 'KRW'::text |
| `client_type` | `text` | YES | 'CUSTOMER'::text |
|---|---|---|---|

## 📄 Table: `companies`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `name` | `text` | NO | NULL |
| `biz_num` | `text` | YES | NULL |
| `root_path` | `text` | YES | NULL |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
| `default_exchange_rate` | `numeric` | YES | 1400.0 |
| `discount_policy_json` | `jsonb` | YES | NULL |
| `default_hourly_rate` | `numeric` | YES | 50000 |
| `logo_path` | `text` | YES | NULL |
| `seal_path` | `text` | YES | NULL |
| `quotation_template_type` | `text` | YES | 'A'::text |
| `ceo_name` | `text` | YES | NULL |
| `address` | `text` | YES | NULL |
| `phone` | `text` | YES | NULL |
| `fax` | `text` | YES | NULL |
| `email` | `text` | YES | NULL |
| `default_payment_terms` | `text` | YES | NULL |
| `default_incoterms` | `text` | YES | NULL |
| `default_delivery_period` | `text` | YES | NULL |
| `default_destination` | `text` | YES | NULL |
| `default_note` | `text` | YES | NULL |
| `label_printer_width` | `integer` | YES | 55 |
| `label_printer_height` | `integer` | YES | 35 |
| `default_margin_w` | `numeric` | YES | 5 |
| `default_margin_d` | `numeric` | YES | 5 |
| `default_margin_h` | `numeric` | YES | 0 |
| `default_margin_round_w` | `numeric` | YES | 5 |
| `default_margin_round_d` | `numeric` | YES | 5 |
| `default_rounding_unit` | `integer` | YES | 1000 |
| `default_time_step` | `numeric` | YES | 0.1 |
| `default_profit_rate_step` | `numeric` | YES | 1 |
| `alert_days_before_deadline` | `ARRAY` | YES | '{1,3,7}'::integer[] |
| `theme` | `text` | YES | 'dark'::text |
| `custom_estimate_columns` | `jsonb` | YES | '[]'::jsonb |
| `license_status` | `text` | YES | 'ACTIVE'::text |
| `license_plan` | `text` | YES | 'PRO'::text |
| `trial_days` | `integer` | YES | 30 |
| `license_expires_at` | `timestamp with time zone` | YES | (now() + '1 year'::interval) |
| `max_users` | `integer` | YES | 5 |
| `is_master_vendor` | `boolean` | YES | false |
| `billing_memo` | `text` | YES | NULL |
|---|---|---|---|

## 📄 Table: `custom_quotation_templates`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `name` | `text` | NO | NULL |
| `layout_json` | `jsonb` | NO | '[]'::jsonb |
| `is_default` | `boolean` | YES | false |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
|---|---|---|---|

## 📄 Table: `estimate_items`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `estimate_id` | `uuid` | NO | NULL |
| `part_no` | `text` | YES | NULL |
| `part_name` | `text` | YES | NULL |
| `spec_w` | `numeric` | YES | 0 |
| `spec_d` | `numeric` | YES | 0 |
| `spec_h` | `numeric` | YES | 0 |
| `material_id` | `uuid` | YES | NULL |
| `process_time` | `numeric` | YES | 0 |
| `difficulty` | `text` | YES | 'B'::text |
| `qty` | `integer` | YES | 1 |
| `unit_price` | `numeric` | YES | 0 |
| `supply_price` | `numeric` | YES | 0 |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
| `raw_w` | `numeric` | YES | 0 |
| `raw_d` | `numeric` | YES | 0 |
| `raw_h` | `numeric` | YES | 0 |
| `hourly_rate` | `numeric` | YES | 50000 |
| `material_cost` | `numeric` | YES | 0 |
| `processing_cost` | `numeric` | YES | 0 |
| `post_process_cost` | `numeric` | YES | 0 |
| `general_admin_cost` | `numeric` | YES | 0 |
| `shape` | `text` | YES | 'rect'::text |
| `work_days` | `integer` | YES | 0 |
| `original_material_name` | `text` | YES | NULL |
| `post_processing_id` | `uuid` | YES | NULL |
| `profit_rate` | `numeric` | YES | 0 |
| `heat_treatment_id` | `uuid` | YES | NULL |
| `heat_treatment_cost` | `numeric` | YES | 0 |
| `note` | `text` | YES | NULL |
| `outsource_cost` | `numeric` | YES | 0 |
| `outsource_company` | `text` | YES | NULL |
| `calculated_price` | `numeric` | YES | NULL |
| `order_status` | `character varying` | YES | 'PENDING'::character varying |
| `custom_costs` | `jsonb` | YES | '{}'::jsonb |
|---|---|---|---|

## 📄 Table: `estimates`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `client_id` | `uuid` | YES | NULL |
| `project_name` | `text` | NO | NULL |
| `status` | `text` | YES | 'DRAFT'::text |
| `currency` | `text` | YES | 'KRW'::text |
| `base_exchange_rate` | `numeric` | YES | 1.0 |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
| `total_amount` | `numeric` | YES | 0 |
| `quotation_no` | `text` | YES | NULL |
| `payment_terms` | `text` | YES | NULL |
| `incoterms` | `text` | YES | NULL |
| `delivery_period` | `text` | YES | NULL |
| `destination` | `text` | YES | NULL |
| `validity` | `text` | YES | NULL |
| `note` | `text` | YES | NULL |
| `exchange_rate` | `numeric` | YES | 1.0 |
| `parent_estimate_id` | `uuid` | YES | NULL |
| `version` | `integer` | YES | 1 |
| `custom_columns` | `jsonb` | YES | '[]'::jsonb |
|---|---|---|---|

## 📄 Table: `excel_export_presets`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | YES | NULL |
| `name` | `text` | NO | NULL |
| `columns` | `jsonb` | NO | '[]'::jsonb |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
|---|---|---|---|

## 📄 Table: `files`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `estimate_item_id` | `uuid` | YES | NULL |
| `file_path` | `text` | NO | NULL |
| `file_name` | `text` | NO | NULL |
| `file_type` | `text` | YES | NULL |
| `version` | `integer` | YES | 1 |
| `is_current` | `boolean` | YES | true |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
| `file_size` | `integer` | YES | NULL |
| `order_item_id` | `uuid` | YES | NULL |
| `original_name` | `text` | YES | NULL |
|---|---|---|---|

## 📄 Table: `heat_treatments`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `name` | `text` | NO | NULL |
| `price_per_kg` | `numeric` | YES | 0 |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
|---|---|---|---|

## 📄 Table: `inventories`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `material_name` | `text` | NO | NULL |
| `spec` | `text` | YES | NULL |
| `quantity` | `integer` | YES | 0 |
| `weight` | `numeric` | YES | 0 |
| `location` | `text` | YES | NULL |
| `company_id` | `uuid` | NO | NULL |
| `updated_at` | `timestamp with time zone` | YES | now() |
|---|---|---|---|

## 📄 Table: `inventory_transactions`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | uuid_generate_v4() |
| `company_id` | `uuid` | NO | NULL |
| `inventory_id` | `uuid` | NO | NULL |
| `transaction_type` | `character varying` | NO | NULL |
| `quantity` | `integer` | NO | NULL |
| `reference_id` | `uuid` | YES | NULL |
| `reference_type` | `character varying` | YES | NULL |
| `notes` | `text` | YES | NULL |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `created_by` | `uuid` | YES | NULL |
|---|---|---|---|

## 📄 Table: `invitations`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | YES | NULL |
| `email` | `text` | NO | NULL |
| `token` | `uuid` | NO | gen_random_uuid() |
| `invite_code` | `character varying` | YES | upper(SUBSTRING(md5((random())::text) FROM 1 FOR 6)) |
| `role` | `text` | NO | NULL |
| `status` | `text` | YES | 'pending'::text |
| `expires_at` | `timestamp with time zone` | YES | (now() + '7 days'::interval) |
| `created_at` | `timestamp with time zone` | YES | now() |
|---|---|---|---|

## 📄 Table: `item_suppliers`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `item_id` | `uuid` | NO | NULL |
| `item_type` | `text` | NO | NULL |
| `client_id` | `uuid` | NO | NULL |
| `unit_price` | `numeric` | YES | NULL |
| `moq` | `numeric` | YES | NULL |
| `memo` | `text` | YES | NULL |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |
|---|---|---|---|
## 📄 Table: `material_orders`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `order_item_id` | `uuid` | YES | NULL |
| `material_name` | `text` | NO | NULL |
| `spec` | `text` | YES | NULL |
| `quantity` | `integer` | YES | 0 |
| `weight` | `numeric` | YES | 0 |
| `unit_price` | `numeric` | YES | 0 |
| `total_price` | `numeric` | YES | 0 |
| `supplier_id` | `uuid` | YES | NULL |
| `supplier_name` | `text` | YES | NULL |
| `order_date` | `date` | YES | NULL |
| `expected_date` | `date` | YES | NULL |
| `received_date` | `date` | YES | NULL |
| `status` | `text` | YES | '발주대기'::text |
| `company_id` | `uuid` | NO | NULL |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |
| `received_qty` | `integer` | YES | 0 |
| `read_at` | `timestamp with time zone` | YES | NULL |
| `po_receipt_token` | `uuid` | YES | NULL |
| `po_no` | `text` | YES | NULL |
| `shape` | `text` | YES | NULL |
| `estimated_price` | `numeric` | YES | 0 |
|---|---|---|---|

## 📄 Table: `material_price_history`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `material_id` | `uuid` | YES | NULL |
| `unit_price` | `numeric` | NO | NULL |
| `company_id` | `uuid` | NO | NULL |
| `changed_at` | `timestamp with time zone` | YES | now() |
| `changed_by` | `uuid` | YES | NULL |
|---|---|---|---|

## 📄 Table: `materials`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `code` | `text` | YES | NULL |
| `name` | `text` | NO | NULL |
| `category` | `text` | YES | NULL |
| `density` | `numeric` | YES | 7.85 |
| `unit_price` | `numeric` | YES | 0 |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
|---|---|---|---|

## 📄 Table: `notification_settings`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `alert_days` | `ARRAY` | YES | '{1,3,7}'::integer[] |
| `email_enabled` | `boolean` | YES | false |
| `created_at` | `timestamp with time zone` | YES | now() |
|---|---|---|---|

## 📄 Table: `order_items`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `order_id` | `uuid` | YES | NULL |
| `estimate_item_id` | `uuid` | YES | NULL |
| `process_type` | `text` | YES | 'INTERNAL'::text |
| `outsource_company` | `text` | YES | NULL |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
| `part_name` | `text` | NO | ''::text |
| `part_no` | `text` | YES | NULL |
| `spec` | `text` | YES | NULL |
| `material_name` | `text` | YES | NULL |
| `qty` | `integer` | NO | 1 |
| `unit_price` | `numeric` | NO | 0 |
| `supply_price` | `numeric` | NO | 0 |
| `process_status` | `text` | YES | 'WAITING'::text |
| `work_days` | `integer` | YES | 3 |
| `due_date` | `date` | YES | NULL |
| `note` | `text` | YES | NULL |
| `order_item_no` | `text` | YES | NULL |
| `currency` | `text` | YES | 'KRW'::text |
| `exchange_rate` | `numeric` | YES | 1.0 |
| `post_processing_name` | `text` | YES | NULL |
| `heat_treatment_name` | `text` | YES | NULL |
| `production_type` | `character varying` | YES | 'INHOUSE'::character varying |
| `production_note` | `text` | YES | NULL |
| `completed_at` | `timestamp with time zone` | YES | NULL |
| `production_status` | `text` | YES | 'PENDING'::text |
| `supply_type` | `character varying` | YES | 'INHOUSE'::character varying |
| `use_stock` | `boolean` | YES | false |
| `original_material_name` | `text` | YES | NULL |
| `material_id` | `uuid` | YES | NULL |
| `client_po_no` | `character varying` | YES | NULL |
| `material_supply_type` | `text` | YES | 'NONE'::text |
| `production_qty` | `integer` | NO | 1 |
| `material_spec` | `character varying` | YES | NULL |
|---|---|---|---|

## 📄 Table: `orders`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `client_id` | `uuid` | YES | NULL |
| `po_no` | `text` | YES | NULL |
| `order_date` | `date` | YES | CURRENT_DATE |
| `delivery_date` | `date` | YES | NULL |
| `total_amount` | `numeric` | YES | 0 |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
| `currency` | `text` | YES | 'KRW'::text |
| `exchange_rate` | `numeric` | YES | 1.0 |
| `estimate_id` | `uuid` | YES | NULL |
| `status` | `text` | NO | 'ORDERED'::text |
| `note` | `text` | YES | NULL |
| `shipping_status` | `text` | YES | 'unshipped'::text |
| `order_number` | `text` | YES | NULL |
|---|---|---|---|

## 📄 Table: `outsource_orders`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `order_item_id` | `uuid` | YES | NULL |
| `process_id` | `uuid` | YES | NULL |
| `supplier_id` | `uuid` | YES | NULL |
| `supplier_name` | `text` | YES | NULL |
| `process_name` | `text` | NO | NULL |
| `quantity` | `integer` | YES | 0 |
| `unit_price` | `numeric` | YES | 0 |
| `total_price` | `numeric` | YES | 0 |
| `actual_unit_price` | `numeric` | YES | NULL |
| `actual_total_price` | `numeric` | YES | NULL |
| `order_date` | `date` | YES | NULL |
| `expected_date` | `date` | YES | NULL |
| `received_date` | `date` | YES | NULL |
| `outsource_type` | `character varying` | NO | 'NORMAL'::character varying |
| `status` | `text` | YES | '발주대기'::text |
| `notes` | `text` | YES | NULL |
| `company_id` | `uuid` | NO | NULL |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |
| `received_qty` | `integer` | YES | 0 |
| `read_at` | `timestamp with time zone` | YES | NULL |
| `po_receipt_token` | `uuid` | YES | NULL |
|---|---|---|---|

## 📄 Table: `material_orders`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `order_item_id` | `uuid` | YES | NULL |
| `supplier_id` | `uuid` | YES | NULL |
| `supplier_name` | `text` | YES | NULL |
| `material_name` | `text` | YES | NULL |
| `spec` | `text` | YES | NULL |
| `quantity` | `integer` | YES | 0 |
| `unit_price` | `numeric` | YES | 0 |
| `total_price` | `numeric` | YES | 0 |
| `actual_unit_price` | `numeric` | YES | NULL |
| `actual_total_price` | `numeric` | YES | NULL |
| `shape` | `text` | YES | NULL |
| `estimated_price` | `numeric` | YES | 0 |
| `po_no` | `text` | YES | NULL |
| `order_date` | `date` | YES | NULL |
| `expected_date` | `date` | YES | NULL |
| `received_date` | `date` | YES | NULL |
| `status` | `text` | YES | '발주대기'::text |
| `notes` | `text` | YES | NULL |
| `company_id` | `uuid` | NO | NULL |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |
| `received_qty` | `integer` | YES | 0 |
| `read_at` | `timestamp with time zone` | YES | NULL |
| `po_receipt_token` | `uuid` | YES | NULL |
|---|---|---|---|

## 📄 Table: `page_guides`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `page_key` | `text` | NO | NULL |
| `content` | `text` | YES | ''::text |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
|---|---|---|---|

## 📄 Table: `routing_templates`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `name` | `text` | NO | NULL |
| `description` | `text` | YES | NULL |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |
|---|---|---|---|

## 📄 Table: `routing_template_items`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `template_id` | `uuid` | NO | NULL |
| `sequence_no` | `integer` | NO | NULL |
| `process_id` | `uuid` | NO | NULL |
| `created_at` | `timestamp with time zone` | YES | now() |
|---|---|---|---|

## 📄 Table: `post_processings`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | YES | NULL |
| `name` | `text` | NO | NULL |
| `price_per_kg` | `numeric` | YES | 0 |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |
|---|---|---|---|

## 📄 Table: `processes`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `name` | `text` | NO | NULL |
| `description` | `text` | YES | NULL |
| `is_outsource` | `boolean` | NO | false |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
|---|---|---|---|

## 📄 Table: `process_logs`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `order_item_id` | `uuid` | YES | NULL |
| `process_name` | `text` | NO | NULL |
| `process_type` | `text` | NO | NULL |
| `status` | `text` | YES | '대기'::text |
| `worker` | `text` | YES | NULL |
| `machine` | `text` | YES | NULL |
| `outsource_id` | `uuid` | YES | NULL |
| `start_time` | `timestamp with time zone` | YES | NULL |
| `end_time` | `timestamp with time zone` | YES | NULL |
| `notes` | `text` | YES | NULL |
| `start_qty` | `integer` | YES | 0 |
| `good_qty` | `integer` | YES | 0 |
| `defect_qty` | `integer` | YES | 0 |
| `company_id` | `uuid` | NO | NULL |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |
| `process_id` | `uuid` | YES | NULL |
| `sequence_no` | `integer` | YES | NULL |
| `is_planned` | `boolean` | YES | true |
|---|---|---|---|

## 📄 Table: `profiles`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | NULL |
| `email` | `text` | YES | NULL |
| `name` | `text` | YES | NULL |
| `role` | `text` | YES | 'member'::text |
| `company_id` | `uuid` | YES | NULL |
| `created_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_at` | `timestamp with time zone` | NO | timezone('utc'::text, now()) |
| `updated_by` | `uuid` | YES | NULL |
| `update_memo` | `text` | YES | NULL |
| `reserved_1` | `text` | YES | NULL |
| `reserved_2` | `text` | YES | NULL |
| `reserved_3` | `text` | YES | NULL |
| `reserved_4` | `text` | YES | NULL |
| `reserved_5` | `text` | YES | NULL |
| `permissions` | `jsonb` | YES | '{}'::jsonb |
| `client_id` | `uuid` | YES | NULL |
| `group_id` | `uuid` | YES | NULL |
| `join_date` | `date` | YES | NULL |
| `birth_date` | `date` | YES | NULL |
| `phone` | `text` | YES | NULL |
| `job_title` | `text` | YES | NULL |
|---|---|---|---|

## 📄 Table: `shipment_items`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `shipment_id` | `uuid` | NO | NULL |
| `order_item_id` | `uuid` | NO | NULL |
| `quantity` | `numeric` | NO | NULL |
| `box_no` | `integer` | YES | NULL |
| `note` | `text` | YES | NULL |
| `created_at` | `timestamp with time zone` | NO | now() |
|---|---|---|---|

## 📄 Table: `shipments`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `client_id` | `uuid` | YES | NULL |
| `order_id` | `uuid` | YES | NULL |
| `shipment_no` | `text` | NO | NULL |
| `status` | `text` | NO | 'pending'::text |
| `courier` | `text` | YES | NULL |
| `tracking_no` | `text` | YES | NULL |
| `recipient_name` | `text` | YES | NULL |
| `recipient_contact` | `text` | YES | NULL |
| `recipient_address` | `text` | YES | NULL |
| `memo` | `text` | YES | NULL |
| `shipped_at` | `timestamp with time zone` | YES | NULL |
| `created_at` | `timestamp with time zone` | NO | now() |
| `created_by` | `uuid` | YES | NULL |
| `updated_at` | `timestamp with time zone` | YES | NULL |
|---|---|---|---|

## 📄 Table: `user_groups`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | gen_random_uuid() |
| `company_id` | `uuid` | NO | NULL |
| `name` | `text` | NO | NULL |
| `description` | `text` | YES | NULL |
| `permissions` | `jsonb` | NO | '{}'::jsonb |
| `created_at` | `timestamp with time zone` | NO | now() |
| `updated_at` | `timestamp with time zone` | NO | now() |
