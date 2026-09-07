DO $$
BEGIN
  -- 1. Companies 테이블에 라이선스 및 마스터 벤더 컬럼 추가
  ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS license_status text DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS license_plan text DEFAULT 'PRO',
    ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 30,
    ADD COLUMN IF NOT EXISTS license_expires_at timestamp with time zone DEFAULT (now() + interval '1 year'),
    ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 5,
    ADD COLUMN IF NOT EXISTS is_master_vendor boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS billing_memo text DEFAULT NULL;

  -- 2. 기존 등록된 업체들의 기본값 보정 (널값 방지)
  UPDATE public.companies
  SET 
    license_status = COALESCE(license_status, 'ACTIVE'),
    license_plan = COALESCE(license_plan, 'PRO'),
    trial_days = COALESCE(trial_days, 30),
    license_expires_at = COALESCE(license_expires_at, now() + interval '1 year'),
    max_users = COALESCE(max_users, 5),
    is_master_vendor = COALESCE(is_master_vendor, false)
  WHERE license_status IS NULL OR license_expires_at IS NULL;

  -- 3. KEP 사명인 경우 마스터 벤더로 지정
  UPDATE public.companies
  SET is_master_vendor = true
  WHERE name ILIKE '%KEP%' OR name ILIKE '%케이이피%';
END $$;
