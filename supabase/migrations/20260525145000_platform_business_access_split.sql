-- Split platform-level admin access from business-scoped owner/staff access.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';

ALTER TABLE public.business_memberships
  ADD COLUMN IF NOT EXISTS barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'business_memberships_role_check'
      AND c.conrelid = 'public.business_memberships'::regclass
  ) THEN
    ALTER TABLE public.business_memberships DROP CONSTRAINT business_memberships_role_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'business_memberships_status_check'
      AND c.conrelid = 'public.business_memberships'::regclass
  ) THEN
    ALTER TABLE public.business_memberships DROP CONSTRAINT business_memberships_status_check;
  END IF;

  ALTER TABLE public.business_memberships
    ADD CONSTRAINT business_memberships_role_check
    CHECK (
      role IN (
        'business_owner',
        'business_admin',
        'business_manager',
        'reception',
        'cashier',
        'barber',
        'viewer',
        'staff',
        'customer'
      )
    );

  ALTER TABLE public.business_memberships
    ADD CONSTRAINT business_memberships_status_check
    CHECK (status IN ('active', 'inactive'));
END $$;

CREATE INDEX IF NOT EXISTS idx_business_memberships_user_status
  ON public.business_memberships (user_id, status);

CREATE INDEX IF NOT EXISTS idx_business_memberships_business_role_status
  ON public.business_memberships (business_id, role, status);

CREATE INDEX IF NOT EXISTS idx_business_memberships_barber
  ON public.business_memberships (barber_id)
  WHERE barber_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.has_role(user_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = user_uuid
      AND (
        ur.role::text = required_role
        OR ur.role::text = 'admin'
        OR ur.role::text = 'platform_admin'
      )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION casa_private.assert_business_admin(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.has_role((SELECT auth.uid()), 'admin') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = (SELECT auth.uid())
      AND bm.status = 'active'
      AND bm.role IN ('business_owner', 'business_admin', 'business_manager')
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'You do not have permission to manage this business.'
    USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.assert_business_admin(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_business_context(p_slug text DEFAULT 'casa')
RETURNS TABLE (
  id uuid,
  slug text,
  name_en text,
  name_ar text,
  business_type text,
  status text,
  default_locale text,
  timezone text,
  currency text,
  logo_url text,
  accent_color text,
  phone text,
  email text,
  whatsapp_number text,
  address_en text,
  address_ar text,
  city text,
  country text,
  modules jsonb,
  current_user_role text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business public.businesses%ROWTYPE;
  v_modules jsonb;
  v_role text;
BEGIN
  SELECT *
  INTO v_business
  FROM public.businesses b
  WHERE b.slug = COALESCE(NULLIF(p_slug, ''), 'casa')
    AND b.status = 'active';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT jsonb_object_agg(g.module_key, g.enabled)
  INTO v_modules
  FROM public.get_enabled_modules(v_business.id) g;

  IF (SELECT auth.uid()) IS NOT NULL AND public.has_role((SELECT auth.uid()), 'admin') THEN
    v_role := 'platform_admin';
  ELSE
    SELECT bm.role
    INTO v_role
    FROM public.business_memberships bm
    WHERE bm.business_id = v_business.id
      AND bm.user_id = (SELECT auth.uid())
      AND bm.status = 'active'
    ORDER BY
      CASE bm.role
        WHEN 'business_owner' THEN 1
        WHEN 'business_admin' THEN 2
        WHEN 'business_manager' THEN 3
        WHEN 'reception' THEN 4
        WHEN 'cashier' THEN 5
        WHEN 'barber' THEN 6
        WHEN 'staff' THEN 7
        WHEN 'viewer' THEN 8
        ELSE 9
      END
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT
    v_business.id,
    v_business.slug,
    v_business.name_en,
    v_business.name_ar,
    v_business.business_type,
    v_business.status,
    v_business.default_locale,
    v_business.timezone,
    v_business.currency,
    v_business.logo_url,
    v_business.accent_color,
    v_business.phone,
    v_business.email,
    v_business.whatsapp_number,
    v_business.address_en,
    v_business.address_ar,
    v_business.city,
    v_business.country,
    COALESCE(v_modules, '{}'::jsonb),
    v_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_business_context(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_context(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_business_staff(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.has_role((SELECT auth.uid()), 'admin') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = (SELECT auth.uid())
      AND bm.status = 'active'
      AND bm.role IN ('business_owner', 'business_admin', 'business_manager')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_business_staff(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_business_staff(uuid) TO authenticated;

DROP POLICY IF EXISTS "Business admins can read their modules" ON public.business_modules;
CREATE POLICY "Business admins can read their modules"
  ON public.business_modules FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = business_modules.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.status = 'active'
        AND bm.role IN ('business_owner', 'business_admin', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Business admins can manage modules" ON public.business_modules;
CREATE POLICY "Business admins can manage modules"
  ON public.business_modules FOR ALL
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = business_modules.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.status = 'active'
        AND bm.role IN ('business_owner', 'business_admin', 'business_manager')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = business_modules.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.status = 'active'
        AND bm.role IN ('business_owner', 'business_admin', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Users can read own business memberships" ON public.business_memberships;
CREATE POLICY "Users can read own business memberships"
  ON public.business_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Platform admins can manage business memberships" ON public.business_memberships;
CREATE POLICY "Platform admins can manage business memberships"
  ON public.business_memberships FOR ALL
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Business owners can manage business staff memberships" ON public.business_memberships;
CREATE POLICY "Business owners can manage business staff memberships"
  ON public.business_memberships FOR ALL
  TO authenticated
  USING (
    role <> 'business_owner'
    AND public.can_manage_business_staff(business_id)
  )
  WITH CHECK (
    role <> 'business_owner'
    AND role IN ('business_admin', 'business_manager', 'reception', 'cashier', 'barber', 'viewer', 'staff')
    AND status = 'active'
    AND public.can_manage_business_staff(business_id)
  );

CREATE OR REPLACE FUNCTION public.admin_queue_action(
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
  v_ticket public.queue_tickets%ROWTYPE;
  v_updated public.queue_tickets%ROWTYPE;
  v_action text := lower(COALESCE(p_action, ''));
  v_now timestamptz := now();
  v_actual_minutes integer;
  v_member_role text;
  v_member_barber_id uuid;
BEGIN
  SELECT *
  INTO v_ticket
  FROM public.queue_tickets qt
  WHERE qt.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue ticket not found.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT public.has_role((SELECT auth.uid()), 'admin') THEN
    SELECT bm.role, bm.barber_id
    INTO v_member_role, v_member_barber_id
    FROM public.business_memberships bm
    WHERE bm.business_id = v_ticket.business_id
      AND bm.user_id = (SELECT auth.uid())
      AND bm.status = 'active'
    ORDER BY
      CASE bm.role
        WHEN 'business_owner' THEN 1
        WHEN 'business_admin' THEN 2
        WHEN 'business_manager' THEN 3
        WHEN 'reception' THEN 4
        WHEN 'cashier' THEN 5
        WHEN 'barber' THEN 6
        ELSE 9
      END
    LIMIT 1;

    IF v_member_role IS NULL THEN
      RAISE EXCEPTION 'Admin privileges required.'
        USING ERRCODE = '42501';
    END IF;

    IF v_member_role IN ('reception', 'cashier') AND v_action NOT IN ('call', 'cancel', 'reassign') THEN
      RAISE EXCEPTION 'Restricted action for this staff role.'
        USING ERRCODE = '42501';
    END IF;

    IF v_member_role = 'barber' THEN
      IF v_action NOT IN ('start', 'complete', 'no_show') THEN
        RAISE EXCEPTION 'Restricted action for barber role.'
          USING ERRCODE = '42501';
      END IF;

      IF v_ticket.barber_id IS DISTINCT FROM v_member_barber_id THEN
        RAISE EXCEPTION 'Barbers can only manage their assigned queue.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF v_action = 'call' THEN
    UPDATE public.queue_tickets qt
    SET status = 'called', called_at = COALESCE(qt.called_at, v_now)
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'start' THEN
    UPDATE public.queue_tickets qt
    SET status = 'in_service', started_at = COALESCE(qt.started_at, v_now)
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'complete' THEN
    IF v_ticket.started_at IS NULL THEN
      RAISE EXCEPTION 'Start the service before completing it.'
        USING ERRCODE = '22023';
    END IF;

    IF v_now <= v_ticket.started_at THEN
      RAISE EXCEPTION 'Completion time must be after service start time.'
        USING ERRCODE = '22023';
    END IF;

    v_actual_minutes := GREATEST(1, FLOOR(EXTRACT(epoch FROM (v_now - v_ticket.started_at)) / 60.0)::integer);

    UPDATE public.queue_tickets qt
    SET
      status = 'completed',
      completed_at = v_now,
      actual_service_minutes = v_actual_minutes,
      estimated_wait_min = 0,
      estimated_wait_max = 0,
      estimated_start_time = COALESCE(qt.started_at, v_now)
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'no_show' THEN
    UPDATE public.queue_tickets qt
    SET status = 'no_show'
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'cancel' THEN
    UPDATE public.queue_tickets qt
    SET status = 'cancelled'
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'reassign' THEN
    IF p_barber_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.id = p_barber_id
        AND b.business_id = v_ticket.business_id
        AND b.is_active IS TRUE
    ) THEN
      RAISE EXCEPTION 'Choose an active barber.'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.queue_tickets qt
    SET barber_id = p_barber_id
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSE
    RAISE EXCEPTION 'Unsupported queue action.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM casa_private.recalculate_queue_estimates(v_ticket.queue_date, v_ticket.barber_id);
  IF v_updated.barber_id IS DISTINCT FROM v_ticket.barber_id THEN
    PERFORM casa_private.recalculate_queue_estimates(v_updated.queue_date, v_updated.barber_id);
  END IF;
  PERFORM casa_private.broadcast_queue_status_changed(v_updated.public_token);

  RETURN jsonb_build_object(
    'ok', true,
    'action', v_action,
    'public_token', v_updated.public_token
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_queue_action(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_queue_action(uuid, text, uuid) TO authenticated;
