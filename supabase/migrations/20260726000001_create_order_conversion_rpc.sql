-- Migration: 0단계 수주 확정 로직 (Order Conversion RPC)
-- Description: 견적에서 수주로 전환 시 고유 수주 번호를 발급하고, 트랜잭션을 통해 orders 및 order_items 레코드를 생성합니다.

-- 1. 수주 번호 채번을 위한 Sequence 생성
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

-- 2. orders 테이블에 order_number 컬럼 추가 (기존 앱 호환성을 위해 기본값 null 허용)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

-- 3. 수주 번호 생성 유틸리티 함수 (예: ORD-2607-0001)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix TEXT;
    v_seq_val BIGINT;
    v_order_number TEXT;
BEGIN
    -- 접두사 생성: ORD-YYMM (예: ORD-2607)
    v_prefix := 'ORD-' || to_char(CURRENT_DATE, 'YYMM');
    
    -- 시퀀스에서 다음 번호 채번 (안전한 동시성 보장)
    v_seq_val := nextval('public.order_number_seq');
    
    -- 4자리 패딩 결합 (예: -0001)
    v_order_number := v_prefix || '-' || lpad(v_seq_val::text, 4, '0');
    
    RETURN v_order_number;
END;
$$;

-- 4. 견적 -> 수주 전환 메인 RPC 함수 (트랜잭션)
CREATE OR REPLACE FUNCTION public.convert_estimate_to_order(
    p_estimate_id UUID,
    p_company_id UUID,
    p_user_id UUID,
    p_selected_item_ids UUID[] -- 부분 수주를 위한 선택된 견적 아이템 ID 배열
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- RLS를 우회하여 트랜잭션 내결함성 확보
AS $$
DECLARE
    v_estimate RECORD;
    v_new_order_id UUID;
    v_new_order_number TEXT;
    v_total_amount NUMERIC := 0;
BEGIN
    -- 1. 원본 견적 데이터 조회
    SELECT * INTO v_estimate
    FROM public.estimates
    WHERE id = p_estimate_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Estimate not found';
    END IF;

    -- 2. 새 수주 번호 발급
    v_new_order_number := public.generate_order_number();

    -- 3. 선택된 아이템들의 총 금액 계산
    SELECT COALESCE(SUM(supply_price), 0) INTO v_total_amount
    FROM public.estimate_items
    WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids);

    -- 4. Orders 테이블에 INSERT
    -- 주의: 기존 앱 호환성을 위해 상태는 반드시 'ORDERED'로 세팅
    INSERT INTO public.orders (
        company_id,
        client_id,
        estimate_id,
        order_date,
        delivery_date,
        po_no,
        currency,
        exchange_rate,
        total_amount,
        status,
        order_number, -- 신규 추가된 고유 번호
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        v_estimate.client_id,
        p_estimate_id,
        CURRENT_DATE,            -- 수주일자는 오늘
        CURRENT_DATE + interval '14 days',  -- 납기일은 2주 뒤로 임시 세팅
        v_estimate.project_name, 
        v_estimate.currency,
        v_estimate.base_exchange_rate,
        v_total_amount,
        'ORDERED',               -- [필수] 기존 앱 호환성
        v_new_order_number,
        now(),
        now()
    ) RETURNING id INTO v_new_order_id;

    -- 5. Order Items 테이블에 INSERT (부분 수주 처리)
    -- 생산 관련 초기 상태(production_status = 'PENDING') 부여
    INSERT INTO public.order_items (
        order_id,
        part_name,
        part_no,
        material_name,
        qty,
        unit_price,
        supply_price,
        note,
        production_status,
        created_at,
        updated_at
    )
    SELECT 
        v_new_order_id,
        part_name,
        part_no,
        material_name,
        qty,
        unit_price,
        supply_price,
        notes,
        'PENDING', -- 초기 생산 대기 상태
        now(),
        now()
    FROM public.estimate_items
    WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids);

    -- 6. 원본 견적 상태 업데이트 (부분 수주인지 전체 수주인지 판단)
    -- 여기서는 단순화를 위해 일단 'ORDERED'로 통일 (기존 앱 호환)
    UPDATE public.estimates
    SET status = 'ORDERED',
        updated_at = now()
    WHERE id = p_estimate_id;

    -- 완료 후 생성된 수주 ID 반환
    RETURN v_new_order_id;
END;
$$;
