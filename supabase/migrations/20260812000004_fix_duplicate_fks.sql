DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. material_order_items -> order_items 로 연결된 모든 외래 키(Foreign Key) 조회 및 삭제
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.material_order_items'::regclass
          AND confrelid = 'public.order_items'::regclass
          AND contype = 'f'
    ) LOOP
        EXECUTE 'ALTER TABLE public.material_order_items DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- 2. 오직 1개의 외래 키만 명시적으로 다시 생성
    ALTER TABLE public.material_order_items 
    ADD CONSTRAINT fk_material_order_items_order_item 
    FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;

END $$;

-- Supabase PostgREST 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';
