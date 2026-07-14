-- 20260707000005_estimate_rpc.sql
CREATE OR REPLACE FUNCTION upsert_estimate_with_items(
  p_estimate jsonb,
  p_items jsonb[]
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_estimate_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_item_ids uuid[] := '{}';
BEGIN
  -- 1. Upsert Estimate
  v_estimate_id := (p_estimate->>'id')::uuid;
  
  IF v_estimate_id IS NULL THEN
    v_estimate_id := gen_random_uuid();
    p_estimate := jsonb_set(p_estimate, '{id}', to_jsonb(v_estimate_id));
  END IF;

  INSERT INTO estimates (
    id, company_id, client_id, project_name, currency, base_exchange_rate, total_amount, status, created_at, updated_at
  )
  VALUES (
    v_estimate_id,
    (p_estimate->>'company_id')::uuid,
    (p_estimate->>'client_id')::uuid,
    p_estimate->>'project_name',
    COALESCE(p_estimate->>'currency', 'KRW'),
    COALESCE((p_estimate->>'base_exchange_rate')::numeric, 1.0),
    COALESCE((p_estimate->>'total_amount')::numeric, 0),
    COALESCE(p_estimate->>'status', 'DRAFT'),
    COALESCE((p_estimate->>'created_at')::timestamptz, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    client_id = EXCLUDED.client_id,
    project_name = EXCLUDED.project_name,
    currency = EXCLUDED.currency,
    base_exchange_rate = EXCLUDED.base_exchange_rate,
    total_amount = EXCLUDED.total_amount,
    status = EXCLUDED.status,
    updated_at = now();

  -- 2. Upsert Estimate Items
  IF p_items IS NOT NULL THEN
    FOREACH v_item IN ARRAY p_items LOOP
      v_item_id := (v_item->>'id')::uuid;
      
      IF v_item_id IS NULL THEN
        v_item_id := gen_random_uuid();
      END IF;

      v_item_ids := array_append(v_item_ids, v_item_id);

      INSERT INTO estimate_items (
        id, estimate_id, part_name, part_no, shape,
        spec_w, spec_d, spec_h, raw_w, raw_d, raw_h,
        material_id, post_processing_id, heat_treatment_id,
        process_time, hourly_rate, difficulty, profit_rate,
        post_process_cost, heat_treatment_cost, material_cost, processing_cost, outsource_cost,
        qty, unit_price, supply_price, work_days, note
      )
      VALUES (
        v_item_id,
        v_estimate_id,
        v_item->>'part_name',
        v_item->>'part_no',
        v_item->>'shape',
        (v_item->>'spec_w')::numeric,
        (v_item->>'spec_d')::numeric,
        (v_item->>'spec_h')::numeric,
        (v_item->>'raw_w')::numeric,
        (v_item->>'raw_d')::numeric,
        (v_item->>'raw_h')::numeric,
        (v_item->>'material_id')::uuid,
        (v_item->>'post_processing_id')::uuid,
        (v_item->>'heat_treatment_id')::uuid,
        (v_item->>'process_time')::numeric,
        (v_item->>'hourly_rate')::numeric,
        v_item->>'difficulty',
        (v_item->>'profit_rate')::numeric,
        (v_item->>'post_process_cost')::numeric,
        (v_item->>'heat_treatment_cost')::numeric,
        (v_item->>'material_cost')::numeric,
        (v_item->>'processing_cost')::numeric,
        (v_item->>'outsource_cost')::numeric,
        COALESCE((v_item->>'qty')::integer, 1),
        (v_item->>'unit_price')::numeric,
        (v_item->>'supply_price')::numeric,
        COALESCE((v_item->>'work_days')::integer, 3),
        v_item->>'note'
      )
      ON CONFLICT (id) DO UPDATE SET
        part_name = EXCLUDED.part_name,
        part_no = EXCLUDED.part_no,
        shape = EXCLUDED.shape,
        spec_w = EXCLUDED.spec_w,
        spec_d = EXCLUDED.spec_d,
        spec_h = EXCLUDED.spec_h,
        raw_w = EXCLUDED.raw_w,
        raw_d = EXCLUDED.raw_d,
        raw_h = EXCLUDED.raw_h,
        material_id = EXCLUDED.material_id,
        post_processing_id = EXCLUDED.post_processing_id,
        heat_treatment_id = EXCLUDED.heat_treatment_id,
        process_time = EXCLUDED.process_time,
        hourly_rate = EXCLUDED.hourly_rate,
        difficulty = EXCLUDED.difficulty,
        profit_rate = EXCLUDED.profit_rate,
        post_process_cost = EXCLUDED.post_process_cost,
        heat_treatment_cost = EXCLUDED.heat_treatment_cost,
        material_cost = EXCLUDED.material_cost,
        processing_cost = EXCLUDED.processing_cost,
        outsource_cost = EXCLUDED.outsource_cost,
        qty = EXCLUDED.qty,
        unit_price = EXCLUDED.unit_price,
        supply_price = EXCLUDED.supply_price,
        work_days = EXCLUDED.work_days,
        note = EXCLUDED.note;
    END LOOP;
  END IF;

  -- 3. Delete items not in p_items for this estimate
  IF array_length(v_item_ids, 1) > 0 THEN
    DELETE FROM estimate_items
    WHERE estimate_id = v_estimate_id
      AND id != ALL(v_item_ids);
  ELSE
    DELETE FROM estimate_items
    WHERE estimate_id = v_estimate_id;
  END IF;

  RETURN v_estimate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_estimate_with_items TO authenticated;
