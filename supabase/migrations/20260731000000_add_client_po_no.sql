-- 1. order_items 테이블에 client_po_no 컬럼 추가 (기본값: 기존 order_item_no 복사)
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS client_po_no VARCHAR(100);

UPDATE public.order_items 
SET client_po_no = order_item_no 
WHERE client_po_no IS NULL;

-- 2. UNIQUE 제약 조건 신설 (무결성 강제)
-- 회사 내에서 수주번호(po_no)는 절대 중복될 수 없음
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_company_po_unique'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_company_po_unique UNIQUE (company_id, po_no);
    END IF;
END $$;

-- 수주 내에서(또는 회사 내에서) 품번(order_item_no)은 절대 중복될 수 없음
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_item_no_unique'
    ) THEN
        ALTER TABLE public.order_items 
        ADD CONSTRAINT order_items_order_item_no_unique UNIQUE (order_id, order_item_no);
    END IF;
END $$;
