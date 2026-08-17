-- Migration: 1단계 조달 구분 및 롤백 엔진 스키마 업데이트 (RPC)
-- Description: N:1 소재 묶음 발주 RPC 및 첫 공정 시작/재고 차감/롤백 RPC 생성

-- 1. N:1 소재 묶음 발주 RPC
CREATE OR REPLACE FUNCTION public.create_bundled_material_order(
    p_company_id UUID,
    p_order_item_ids UUID[],
    p_material_name TEXT,
    p_spec TEXT,
    p_quantity INTEGER,
    p_weight NUMERIC,
    p_unit_price NUMERIC,
    p_total_price NUMERIC,
    p_supplier_id UUID,
    p_supplier_name TEXT,
    p_order_date DATE,
    p_expected_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_material_order_id UUID;
    v_item_id UUID;
BEGIN
    -- 1. Insert into material_orders
    INSERT INTO public.material_orders (
        company_id,
        material_name,
        spec,
        quantity,
        weight,
        unit_price,
        total_price,
        supplier_id,
        supplier_name,
        order_date,
        expected_date,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        p_material_name,
        p_spec,
        p_quantity,
        p_weight,
        p_unit_price,
        p_total_price,
        p_supplier_id,
        p_supplier_name,
        p_order_date,
        p_expected_date,
        '발주대기',
        now(),
        now()
    ) RETURNING id INTO v_new_material_order_id;

    -- 2. Insert into material_order_items for each order_item_id
    FOREACH v_item_id IN ARRAY p_order_item_ids
    LOOP
        INSERT INTO public.material_order_items (
            material_order_id,
            order_item_id,
            required_qty,
            created_at
        ) VALUES (
            v_new_material_order_id,
            v_item_id,
            1,
            now()
        );
    END LOOP;

    RETURN v_new_material_order_id;
END;
$$;

-- 2. 현장 공정 시작 및 소재 100% 차감 로직
CREATE OR REPLACE FUNCTION public.start_first_process_and_consume_material(
    p_company_id UUID,
    p_order_item_id UUID,
    p_process_name TEXT,
    p_process_type TEXT,
    p_worker TEXT,
    p_machine TEXT,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_process_log_id UUID;
    v_material_order RECORD;
    v_inventory_count INTEGER;
    v_inventory_id UUID;
BEGIN
    -- 1. process_logs에 새 공정 기록
    INSERT INTO public.process_logs (
        company_id,
        order_item_id,
        process_name,
        process_type,
        status,
        worker,
        machine,
        start_time,
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        p_order_item_id,
        p_process_name,
        p_process_type,
        '진행중',
        p_worker,
        p_machine,
        now(),
        now(),
        now()
    ) RETURNING id INTO v_process_log_id;

    -- 2. 재고 차감 로직
    -- 해당 부품이 속한 material_order_items를 조회
    FOR v_material_order IN 
        SELECT mo.id, mo.material_name, mo.spec, mo.quantity 
        FROM public.material_order_items moi
        JOIN public.material_orders mo ON mo.id = moi.material_order_id
        WHERE moi.order_item_id = p_order_item_id
    LOOP
        -- 이미 해당 material_order로 인해 재고가 차감된 적 있는지 확인 (N:1 묶음 중 첫 시작인지)
        SELECT count(*) INTO v_inventory_count
        FROM public.inventory_transactions
        WHERE reference_id = v_material_order.id 
          AND reference_type = 'MATERIAL_ORDER_CONSUMPTION'
          AND transaction_type = 'OUT';
          
        IF v_inventory_count = 0 THEN
            -- 아직 차감되지 않은 소재: 해당하는 창고 재고를 찾아 100% 차감
            SELECT id INTO v_inventory_id 
            FROM public.inventories 
            WHERE company_id = p_company_id 
              AND material_name = v_material_order.material_name 
              AND COALESCE(spec, '') = COALESCE(v_material_order.spec, '')
            LIMIT 1;
            
            IF v_inventory_id IS NOT NULL THEN
                -- 원장 차감
                UPDATE public.inventories 
                SET quantity = quantity - v_material_order.quantity,
                    updated_at = now()
                WHERE id = v_inventory_id;
                
                -- 트랜잭션 기록 (이벤트 소싱)
                INSERT INTO public.inventory_transactions (
                    company_id,
                    inventory_id,
                    transaction_type,
                    quantity,
                    reference_id,
                    reference_type,
                    notes,
                    created_by
                ) VALUES (
                    p_company_id,
                    v_inventory_id,
                    'OUT',
                    -v_material_order.quantity,
                    v_material_order.id,
                    'MATERIAL_ORDER_CONSUMPTION',
                    '현장 가공 첫 시작으로 인한 N:1 묶음 소재 전량 투입',
                    p_user_id
                );
            END IF;
        END IF;
    END LOOP;

    RETURN v_process_log_id;
END;
$$;

-- 3. 공정 취소 (LIFO) 시 재고 원복 로직
CREATE OR REPLACE FUNCTION public.cancel_last_process_and_revert_material(
    p_company_id UUID,
    p_order_item_id UUID,
    p_process_log_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_material_order RECORD;
    v_other_processes_count INTEGER;
    v_inv_transaction RECORD;
BEGIN
    -- 1. 공정 로그 삭제 (LIFO 롤백)
    DELETE FROM public.process_logs 
    WHERE id = p_process_log_id AND company_id = p_company_id;

    -- 2. 재고 복구 검증
    -- 취소한 공정이 속한 묶음 발주의 다른 부품들이 공정을 시작한 이력이 없다면 소재를 반환
    FOR v_material_order IN 
        SELECT mo.id
        FROM public.material_order_items moi
        JOIN public.material_orders mo ON mo.id = moi.material_order_id
        WHERE moi.order_item_id = p_order_item_id
    LOOP
        -- 이 묶음 발주(v_material_order.id)를 공유하는 전체 부품 중, 
        -- 시작된 공정이 존재하는지 체크
        SELECT count(*) INTO v_other_processes_count
        FROM public.process_logs pl
        JOIN public.material_order_items moi2 ON moi2.order_item_id = pl.order_item_id
        WHERE moi2.material_order_id = v_material_order.id;

        -- 만약 다른 부품들의 공정이 하나도 없다면, 우리가 취소한 것이 이 묶음의 유일했던 '첫' 공정이므로 소재를 원복함
        IF v_other_processes_count = 0 THEN
            -- 차감(OUT) 내역을 찾음
            SELECT * INTO v_inv_transaction
            FROM public.inventory_transactions
            WHERE reference_id = v_material_order.id 
              AND reference_type = 'MATERIAL_ORDER_CONSUMPTION'
              AND transaction_type = 'OUT'
            ORDER BY created_at DESC
            LIMIT 1;

            IF FOUND THEN
                -- 원장 원복
                UPDATE public.inventories 
                SET quantity = quantity + abs(v_inv_transaction.quantity),
                    updated_at = now()
                WHERE id = v_inv_transaction.inventory_id;
                
                -- 보상 트랜잭션 기록
                INSERT INTO public.inventory_transactions (
                    company_id,
                    inventory_id,
                    transaction_type,
                    quantity,
                    reference_id,
                    reference_type,
                    notes,
                    created_by
                ) VALUES (
                    p_company_id,
                    v_inv_transaction.inventory_id,
                    'RETURN',
                    abs(v_inv_transaction.quantity),
                    v_material_order.id,
                    'MATERIAL_ORDER_CONSUMPTION_REVERT',
                    '모든 관련 공정 취소로 인한 소재 미투입 처리 (원복)',
                    p_user_id
                );
            END IF;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$;
