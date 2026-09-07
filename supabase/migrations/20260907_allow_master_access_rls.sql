-- ==============================================================================
-- KEP 슈퍼 마스터 관리자 RLS 접근 권한 부여 마이그레이션 (무한 재귀 해결)
-- 대상 테이블: companies, profiles, invitations
-- 허용 계정: iy7847@naver.com, iy7847@gmail.com, *@kendp.com
-- ==============================================================================

DO $$ 
BEGIN
  -- 1. 마스터 관리자 식별 함수 (profiles 조회 없이 auth.jwt() 기반으로 무한 재귀 원천 차단)
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.is_master_admin()
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $body$
      SELECT (
        (auth.jwt() ->> 'email') IN ('iy7847@naver.com', 'iy7847@gmail.com')
        OR (auth.jwt() ->> 'email') LIKE '%@kendp.com'
      );
    $body$;
  $func$;

  -- 2. profiles 테이블 RLS 정책 복원 (서브쿼리 없이 재귀 0%)
  DROP POLICY IF EXISTS "Master view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;

  CREATE POLICY "Profiles access policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);


  -- 3. companies 테이블 RLS 정책 갱신 (마스터는 전체 조회 및 수정 허용)
  DROP POLICY IF EXISTS "Strict company_id policy" ON public.companies;
  DROP POLICY IF EXISTS "Master and company access policy" ON public.companies;

  CREATE POLICY "Master and company access policy" ON public.companies
  FOR ALL TO authenticated
  USING (
    public.is_master_admin()
    OR id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    public.is_master_admin()
    OR id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

  -- 4. invitations 테이블 RLS 정책
  DROP POLICY IF EXISTS "Master view all invitations" ON public.invitations;
  CREATE POLICY "Master view all invitations" ON public.invitations
  FOR SELECT TO authenticated
  USING (
    public.is_master_admin()
    OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

  -- 5. PostgREST 스키마 캐시 리로드
  PERFORM pg_notify('pgrst', 'reload schema');

END $$;


