-- Server-controlled first-login password-change flag for business owners.

ALTER TABLE public.business_memberships
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_business_memberships_user_password_change
  ON public.business_memberships (user_id, must_change_password);

CREATE OR REPLACE FUNCTION public.get_must_change_password()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.user_id = (SELECT auth.uid())
      AND bm.must_change_password IS TRUE
  )
$$;

REVOKE EXECUTE ON FUNCTION public.get_must_change_password() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_must_change_password() TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.business_memberships bm
  SET must_change_password = false,
      password_changed_at = now()
  WHERE bm.user_id = v_user_id
    AND bm.must_change_password IS TRUE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'updated_memberships', v_updated);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_must_change_password() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;
