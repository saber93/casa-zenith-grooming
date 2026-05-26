-- Extend existing app_role enum type safely
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reception';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'barber';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';

-- Alter table user_roles to add barber_id
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL;

-- Enforce one active role per user (Unique constraint on user_id)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles(role);

-- Redefine public.has_role(user_uuid, required_role) to cast app_role enum
CREATE OR REPLACE FUNCTION public.has_role(user_uuid uuid, required_role text)
RETURNS boolean
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND (role::text = required_role OR role::text = 'admin')
  );
END;
$$ LANGUAGE plpgsql STABLE;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;

-- Create public.get_user_role(user_uuid)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS TABLE(role text, barber_id uuid)
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role::text, ur.barber_id
  FROM public.user_roles ur
  WHERE ur.user_id = user_uuid
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

-- Redefine assert_admin to support transaction-local override
CREATE OR REPLACE FUNCTION casa_private.assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If override config is set to 'true', bypass the admin role check
  IF current_setting('casa.override_admin', true) = 'true' THEN
    RETURN;
  END IF;

  IF NOT public.has_role((SELECT auth.uid()), 'admin') THEN
    RAISE EXCEPTION 'Admin privileges required.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.assert_admin() FROM public, anon, authenticated;

-- Create public.staff_queue_action wrapper RPC
CREATE OR REPLACE FUNCTION public.staff_queue_action(
  p_ticket_id uuid,
  p_action text,
  p_barber_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_role text;
  v_user_barber_id uuid;
  v_ticket public.queue_tickets%ROWTYPE;
  v_action text := lower(COALESCE(p_action, ''));
BEGIN
  -- 1. Resolve executor's role and barber mapping
  SELECT ur.role::text, ur.barber_id INTO v_user_role, v_user_barber_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid();

  -- If not registered, deny
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied. No assigned staff role.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Fetch queue ticket to verify ownership (for barbers)
  SELECT * INTO v_ticket
  FROM public.queue_tickets qt
  WHERE qt.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue ticket not found.'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Enforce Role-based permissions on actions
  IF v_user_role = 'admin' THEN
    -- Admin allowed all actions
    NULL;
  ELSIF v_user_role = 'reception' OR v_user_role = 'cashier' THEN
    -- Reception / Cashier allowed call and cancel
    IF v_action NOT IN ('call', 'cancel') THEN
      RAISE EXCEPTION 'Restricted Action. Reception/Cashier cannot perform action %.', p_action
        USING ERRCODE = '42501';
    END IF;
  ELSIF v_user_role = 'barber' THEN
    -- Barber allowed start, complete, no_show
    IF v_action NOT IN ('start', 'complete', 'no_show') THEN
      RAISE EXCEPTION 'Restricted Action. Barbers cannot perform action %.', p_action
        USING ERRCODE = '42501';
    END IF;
    -- Barbers must only operate on their own queue
    IF v_ticket.barber_id IS DISTINCT FROM v_user_barber_id THEN
      RAISE EXCEPTION 'Restricted Action. Barbers can only operate on their assigned queue tickets.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Viewers or other roles get rejected
    RAISE EXCEPTION 'Restricted Action. Viewers do not have action privileges.'
      USING ERRCODE = '42501';
  END IF;

  -- 4. Set transaction-local override so inner assert_admin() passes
  PERFORM set_config('casa.override_admin', 'true', true);

  -- 5. Delegate to the stable admin_queue_action
  RETURN public.admin_queue_action(p_ticket_id, p_action, p_barber_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.staff_queue_action(uuid, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_queue_action(uuid, text, uuid) TO authenticated, service_role;
