-- Migration: 1단계 조달 구분 및 롤백 엔진 스키마 업데이트
-- Description: order_items에 조달 구분 컬럼 추가, N:M 묶음 발주 테이블 생성, 재고 수불부(Transaction) 테이블 신설

-- 1. order_items 테이블 확장
-- supply_type: 'INHOUSE'(사내 가공), 'OUTSOURCE'(외주), 'PURCHASE'(구매품)
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS supply_type VARCHAR(20) DEFAULT 'INHOUSE',
ADD COLUMN IF NOT EXISTS use_stock BOOLEAN DEFAULT false;

-- 2. material_order_items (N:M 매핑 테이블) 생성
-- 목적: 여러 개의 order_item(부품)이 하나의 material_order(소재 발주)를 공유할 수 있도록 지원
CREATE TABLE IF NOT EXISTS public.material_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_order_id UUID NOT NULL REFERENCES public.material_orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    required_qty INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(material_order_id, order_item_id) -- 중복 매핑 방지
);

-- RLS 설정
ALTER TABLE public.material_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view material_order_items for their company"
    ON public.material_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.material_orders mo
            WHERE mo.id = material_order_items.material_order_id
            AND mo.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can manage material_order_items for their company"
    ON public.material_order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.material_orders mo
            WHERE mo.id = material_order_items.material_order_id
            AND mo.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- 3. inventory_transactions (재고 수불부) 테이블 생성
-- 목적: 롤백 및 정확한 재고 추적을 위한 이벤트 소싱 테이블
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventories(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- 'IN'(입고), 'OUT'(출고/차감), 'ADJUST'(조정), 'RETURN'(취소로인한복구)
    quantity INTEGER NOT NULL, -- 양수 또는 음수
    reference_id UUID, -- 연관된 ID (예: order_item_id)
    reference_type VARCHAR(50), -- 참조 타입 (예: 'ORDER_ITEM_CONSUMPTION')
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- RLS 설정
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory_transactions for their company"
    ON public.inventory_transactions FOR SELECT
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert inventory_transactions for their company"
    ON public.inventory_transactions FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
