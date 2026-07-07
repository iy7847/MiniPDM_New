-- 20260707000009_add_invite_code.sql
ALTER TABLE invitations
ADD COLUMN invite_code VARCHAR(6) UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 6));

-- RPC to accept invitation by code
CREATE OR REPLACE FUNCTION accept_invitation_by_code(p_code text, p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_company_id uuid;
    v_role text;
    v_invite_id uuid;
BEGIN
    -- Find pending invite by code
    SELECT id, company_id, role
    INTO v_invite_id, v_company_id, v_role
    FROM invitations
    WHERE invite_code = p_code AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invite code';
    END IF;

    -- Update invitation status
    UPDATE invitations
    SET status = 'accepted', updated_at = NOW()
    WHERE id = v_invite_id;

    -- Update profile with company_id and role
    UPDATE profiles
    SET company_id = v_company_id, role = v_role, updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
