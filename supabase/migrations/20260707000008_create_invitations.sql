-- Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can insert and select for their company
CREATE POLICY "Users can insert invitations for their company" ON public.invitations
    FOR INSERT TO authenticated
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can select invitations for their company" ON public.invitations
    FOR SELECT TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update invitations for their company" ON public.invitations
    FOR UPDATE TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Security definer functions

-- 1. get_invitation_by_token(p_token uuid)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token uuid)
RETURNS SETOF public.invitations
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM public.invitations
    WHERE token = p_token AND status = 'pending' AND expires_at > now();
$$;

-- 2. accept_invitation(p_token uuid, p_user_id uuid)
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite public.invitations;
BEGIN
    -- Get the invitation
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE token = p_token AND status = 'pending' AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;

    -- Update invitation status
    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = v_invite.id;

    -- Update user profile
    UPDATE public.profiles
    SET company_id = v_invite.company_id,
        role = v_invite.role
    WHERE id = p_user_id;
END;
$$;
