-- 20260904000000_add_group_to_invitations.sql
-- 초대 생성 시 사용자 그룹(group_id)을 사전 지정할 수 있도록 컬럼 추가 및 RPC 갱신

-- 1. invitations 테이블에 group_id 추가
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.user_groups(id) ON DELETE SET NULL;

-- 2. accept_invitation RPC 갱신 (링크 토큰 기반 수락)
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite public.invitations;
BEGIN
    -- 유효한 초대 확인
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE token = p_token AND status = 'pending' AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;

    -- 초대 상태 업데이트
    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = v_invite.id;

    -- 사용자 프로필에 company_id, role, group_id 반영
    UPDATE public.profiles
    SET company_id = v_invite.company_id,
        role = v_invite.role,
        group_id = COALESCE(v_invite.group_id, profiles.group_id),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;

-- 3. accept_invitation_by_code RPC 갱신 (6자리 코드 기반 수락)
CREATE OR REPLACE FUNCTION public.accept_invitation_by_code(p_code text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_role text;
    v_group_id uuid;
    v_invite_id uuid;
BEGIN
    -- 유효한 초대 확인
    SELECT id, company_id, role, group_id
    INTO v_invite_id, v_company_id, v_role, v_group_id
    FROM public.invitations
    WHERE invite_code = p_code AND status = 'pending' AND expires_at > now();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invite code';
    END IF;

    -- 초대 상태 업데이트
    UPDATE public.invitations
    SET status = 'accepted', updated_at = NOW()
    WHERE id = v_invite_id;

    -- 사용자 프로필에 company_id, role, group_id 반영
    UPDATE public.profiles
    SET company_id = v_company_id,
        role = v_role,
        group_id = COALESCE(v_group_id, profiles.group_id),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;
