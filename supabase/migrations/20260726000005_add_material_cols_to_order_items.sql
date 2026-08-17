-- Migration: Add material columns to order_items
-- Description: order_items 테이블에 도면 재질(original_material_name)과 실사용 재질(material_id) 컬럼을 추가합니다.

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS original_material_name TEXT,
ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.materials(id);
