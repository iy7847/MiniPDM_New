-- ==============================================================================
-- [MiniPDM v2.0] 고객사 업무 데이터 초기화 (공장 리셋 / 가입 정보 & 계정 유지)
-- ==============================================================================
-- 💡 특징 및 설명:
-- 1. [보존되는 정보]:
--    - 회사 기본 정보 (업체명, 사업자번호, 대표자명, 연락처, 주소, 환경설정 등)
--    - 라이선스 정보 (이용 기한, 플랜, 최대 허용 계정 수, 계약 메모)
--    - 사내 사용자 로그인 계정 (이메일, 비밀번호, 직책, 권한 유지 -> 그대로 로그인 가능)
--    - (기본 유지) 거래처 목록, 소재/단가 마스터, 공정 마스터 (단, 원하시면 주석 해제하여 삭제 가능)
-- 2. [초기화(삭제)되는 정보]:
--    - 테스트 중에 입력했던 견적서, 수주서, 도면 첨부 파일
--    - 생산 공정 실적 로그, 외주 발주서, 소재 발주서, 출하 내역, 재고 수불부
-- 3. [용도]:
--    - 테스트 기간을 마치고 실전 가동을 위해 업무 데이터를 깨끗하게 0건으로 비우고 새로 시작할 때
-- ==============================================================================

DO $$
DECLARE
    -- ==========================================================================
    -- ⚙️ [설정] 초기화할 대상 회사를 지정하세요 (방법 1 또는 방법 2 중 하나 사용)
    -- ==========================================================================
    
    -- [방법 1] 회사 ID(UUID)를 직접 입력할 경우 (아래 따옴표 안에 UUID 입력)
    v_target_company_id UUID := NULL; 
    
    -- [방법 2] 회사명과 사업자번호로 찾을 경우 (방법 1이 NULL일 때 작동)
    -- 예: 회사명이 '유림'이고 사업자번호가 '469-88-00755'인 경우
    v_company_name TEXT := '유림'; 
    v_biz_num      TEXT := '469-88-00755'; -- 사업자번호가 없다면 NULL 입력

    -- 내부 처리용 변수
    v_comp RECORD;
    v_cnt_shipment INT := 0;
    v_cnt_process INT := 0;
    v_cnt_orders INT := 0;
    v_cnt_estimates INT := 0;
BEGIN
    -- 1. 대상 회사 찾기
    IF v_target_company_id IS NOT NULL THEN
        SELECT * INTO v_comp FROM public.companies WHERE id = v_target_company_id;
    ELSE
        IF v_biz_num IS NOT NULL THEN
            SELECT * INTO v_comp FROM public.companies 
            WHERE name = v_company_name AND biz_num = v_biz_num LIMIT 1;
        ELSE
            SELECT * INTO v_comp FROM public.companies 
            WHERE name = v_company_name AND (biz_num IS NULL OR biz_num = '') LIMIT 1;
        END IF;
    END IF;

    -- 검증
    IF v_comp.id IS NULL THEN
        RAISE EXCEPTION '❌ 초기화 대상을 찾을 수 없습니다. (입력한 ID 또는 회사명/사업자번호를 확인하세요)';
    END IF;

    -- 본사 보호 가드
    IF v_comp.is_master_vendor = true THEN
        RAISE EXCEPTION '🛑 [보호 조치] 본사(KEP 마스터) 계정은 초기화할 수 없습니다!';
    END IF;

    v_target_company_id := v_comp.id;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '🔄 [고객사 업무 데이터 공장 리셋(초기화) 시작]';
    RAISE NOTICE '   - 회사명: %', v_comp.name;
    RAISE NOTICE '   - 회사 ID: %', v_target_company_id;
    RAISE NOTICE '   - 사업자번호: %', COALESCE(v_comp.biz_num, '(미등록)');
    RAISE NOTICE '   - 대표자: %', COALESCE(v_comp.ceo_name, '(미등록)');
    RAISE NOTICE '   - 라이선스 만료일: %', v_comp.license_expires_at;
    RAISE NOTICE '=======================================================';

    -- [1] 출하 내역 초기화
    DELETE FROM public.shipment_items WHERE company_id = v_target_company_id;
    DELETE FROM public.shipments WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_shipment = ROW_COUNT;
    RAISE NOTICE '✔ 출하 내역 초기화 완료 (%건)', v_cnt_shipment;

    -- [2] 생산 공정 실적 로그 초기화 (공정 마스터 자체는 보존)
    DELETE FROM public.process_logs WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_process = ROW_COUNT;
    RAISE NOTICE '✔ 생산 공정 실적 로그 초기화 완료 (%건)', v_cnt_process;

    -- [3] 외주 및 소재 발주 내역 초기화
    -- ※ material_order_items는 이전 버전에서 제거되었으므로 존재할 때만 동적 삭제
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_order_items') THEN
        EXECUTE 'DELETE FROM public.material_order_items WHERE material_order_id IN (SELECT id FROM public.material_orders WHERE company_id = $1)' USING v_target_company_id;
    END IF;
    DELETE FROM public.material_orders WHERE company_id = v_target_company_id;
    DELETE FROM public.outsource_orders WHERE company_id = v_target_company_id;
    RAISE NOTICE '✔ 외주 및 소재 발주 내역 초기화 완료';

    -- [4] 수주 내역 및 첨부 도면 초기화
    DELETE FROM public.files WHERE order_item_id IN (
        SELECT oi.id FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE o.company_id = v_target_company_id
    );
    DELETE FROM public.order_items WHERE order_id IN (
        SELECT id FROM public.orders WHERE company_id = v_target_company_id
    );
    DELETE FROM public.orders WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_orders = ROW_COUNT;
    RAISE NOTICE '✔ 수주 내역 및 수주 도면 초기화 완료 (%건)', v_cnt_orders;

    -- [5] 견적 내역 및 첨부 도면 초기화
    DELETE FROM public.files WHERE estimate_item_id IN (
        SELECT ei.id FROM public.estimate_items ei
        JOIN public.estimates e ON ei.estimate_id = e.id
        WHERE e.company_id = v_target_company_id
    );
    DELETE FROM public.estimate_items WHERE estimate_id IN (
        SELECT id FROM public.estimates WHERE company_id = v_target_company_id
    );
    DELETE FROM public.estimates WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_estimates = ROW_COUNT;
    RAISE NOTICE '✔ 견적 내역 및 견적 품목 초기화 완료 (%건)', v_cnt_estimates;

    -- [6] 재고 입출고 수불 내역 초기화 (소재 마스터는 유지)
    DELETE FROM public.inventory_transactions WHERE company_id = v_target_company_id;
    -- 재고 수량 0으로 리셋 (원할 경우 실행)
    UPDATE public.inventories SET quantity = 0, weight = 0 WHERE company_id = v_target_company_id;
    RAISE NOTICE '✔ 재고 수불 이력 및 재고 수량 리셋 완료';

    -- --------------------------------------------------------------------------
    -- 💡 [선택 옵션] 기준정보(거래처, 자재단가, 공정마스터)까지 모두 비우고 싶을 경우
    -- 아래 주석(--)을 해제하고 실행하시면 됩니다. (기본값: 유지됨)
    -- --------------------------------------------------------------------------
    /*
    DELETE FROM public.item_suppliers WHERE company_id = v_target_company_id;
    DELETE FROM public.materials WHERE company_id = v_target_company_id;
    DELETE FROM public.clients WHERE company_id = v_target_company_id;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routing_template_items') THEN
        EXECUTE 'DELETE FROM public.routing_template_items WHERE template_id IN (SELECT id FROM public.routing_templates WHERE company_id = $1)' USING v_target_company_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routing_templates') THEN
        EXECUTE 'DELETE FROM public.routing_templates WHERE company_id = $1' USING v_target_company_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'processes') THEN
        EXECUTE 'DELETE FROM public.processes WHERE company_id = $1' USING v_target_company_id;
    END IF;
    RAISE NOTICE '✔ (선택) 거래처, 자재단가, 공정 마스터 기준정보 초기화 완료';
    */

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '🎉 [%] 고객사의 업무 데이터가 깨끗하게 초기화되었습니다.', v_comp.name;
    RAISE NOTICE '   - 회사 기본 정보 및 라이선스는 그대로 보존됩니다.';
    RAISE NOTICE '   - 기존 사용자 계정으로 로그인하여 새 업무를 시작할 수 있습니다.';
    RAISE NOTICE '=======================================================';

END $$;
