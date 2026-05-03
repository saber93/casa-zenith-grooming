-- Casa queue system and exact-slot booking conflict protection.

-- ============ BOOKING EXACT-SLOT CONFLICTS ============
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_barber_id_booking_date_booking_time_key'
  ) THEN
    ALTER TABLE public.bookings
      DROP CONSTRAINT bookings_barber_id_booking_date_booking_time_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_active_barber_slot
  ON public.bookings (barber_id, booking_date, booking_time)
  WHERE status IN ('pending', 'confirmed');

-- ============ QUEUE SCHEMA ============
CREATE TABLE IF NOT EXISTS public.queue_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token uuid NOT NULL DEFAULT gen_random_uuid(),

  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,

  customer_name text NOT NULL,
  customer_phone text NOT NULL,

  queue_date date NOT NULL DEFAULT CURRENT_DATE,
  queue_number integer NOT NULL,

  mode text NOT NULL DEFAULT 'any_barber'
    CHECK (mode IN ('any_barber', 'specific_barber')),

  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'called', 'in_service', 'completed', 'cancelled', 'no_show')),

  estimated_wait_min integer,
  estimated_wait_max integer,
  estimated_start_time timestamptz,
  actual_service_minutes integer,
  prediction_confidence text DEFAULT 'low'
    CHECK (prediction_confidence IN ('low', 'medium', 'high')),

  called_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  language text DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS queue_tickets_unique_daily_number
  ON public.queue_tickets (queue_date, queue_number);

CREATE UNIQUE INDEX IF NOT EXISTS queue_tickets_public_token_key
  ON public.queue_tickets (public_token);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_date_status
  ON public.queue_tickets (queue_date, status);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_barber_date_status
  ON public.queue_tickets (barber_id, queue_date, status);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_customer_phone
  ON public.queue_tickets (customer_phone);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_public_token
  ON public.queue_tickets (public_token);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_active_order
  ON public.queue_tickets (barber_id, queue_date, queue_number, created_at)
  WHERE status IN ('waiting', 'called', 'in_service');

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_duration_min integer DEFAULT 25,
  ADD COLUMN IF NOT EXISTS default_duration_max integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS buffer_minutes integer DEFAULT 5;

UPDATE public.services
SET
  default_duration_min = COALESCE(default_duration_min, GREATEST(5, duration_minutes - 5), 25),
  default_duration_max = COALESCE(default_duration_max, GREATEST(duration_minutes + 10, 40), 40),
  buffer_minutes = COALESCE(buffer_minutes, 5);

CREATE OR REPLACE VIEW public.service_duration_history
WITH (security_invoker = true) AS
SELECT
  qt.barber_id,
  qt.service_id,
  EXTRACT(dow FROM qt.started_at)::integer AS day_of_week,
  EXTRACT(hour FROM qt.started_at)::integer AS hour_of_day,
  (EXTRACT(epoch FROM (qt.completed_at - qt.started_at)) / 60.0)::numeric(10, 2) AS duration_minutes
FROM public.queue_tickets qt
WHERE qt.started_at IS NOT NULL
  AND qt.completed_at IS NOT NULL
  AND qt.completed_at > qt.started_at
  AND qt.status = 'completed'
  AND (EXTRACT(epoch FROM (qt.completed_at - qt.started_at)) / 60.0) BETWEEN 5 AND 120;

CREATE OR REPLACE VIEW public.barber_service_duration_stats
WITH (security_invoker = true) AS
SELECT
  barber_id,
  service_id,
  COUNT(*)::integer AS sample_size,
  AVG(duration_minutes)::numeric(10, 2) AS avg_minutes,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_minutes)::numeric(10, 2) AS p50_minutes,
  percentile_cont(0.8) WITHIN GROUP (ORDER BY duration_minutes)::numeric(10, 2) AS p80_minutes,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_minutes)::numeric(10, 2) AS p90_minutes
FROM public.service_duration_history
GROUP BY barber_id, service_id;

REVOKE SELECT ON public.service_duration_history FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.barber_service_duration_stats FROM PUBLIC, anon, authenticated;

-- ============ PRIVATE HELPERS ============
CREATE SCHEMA IF NOT EXISTS casa_private;
REVOKE ALL ON SCHEMA casa_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin privileges required.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.assert_admin() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.normalize_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g'), '')
$$;
REVOKE EXECUTE ON FUNCTION casa_private.normalize_phone(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.generate_daily_queue_number(p_queue_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_next integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('casa_queue_' || p_queue_date::text)::bigint);

  SELECT COALESCE(MAX(qt.queue_number), 0) + 1
  INTO v_next
  FROM public.queue_tickets qt
  WHERE qt.queue_date = p_queue_date;

  RETURN v_next;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.generate_daily_queue_number(date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.get_duration_bounds(
  p_barber_id uuid,
  p_service_id uuid
)
RETURNS TABLE (
  min_minutes integer,
  max_minutes integer,
  buffer_minutes integer,
  confidence text,
  sample_size integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_default_min integer := 25;
  v_default_max integer := 40;
  v_buffer integer := 5;
  v_sample_size integer := 0;
  v_p50 numeric;
  v_p80 numeric;
BEGIN
  SELECT
    COALESCE(s.default_duration_min, GREATEST(5, s.duration_minutes - 5), 25),
    COALESCE(s.default_duration_max, GREATEST(s.duration_minutes + 10, 40), 40),
    COALESCE(s.buffer_minutes, 5)
  INTO v_default_min, v_default_max, v_buffer
  FROM public.services s
  WHERE s.id = p_service_id;

  v_default_min := COALESCE(v_default_min, 25);
  v_default_max := COALESCE(v_default_max, GREATEST(v_default_min, 40));
  v_buffer := COALESCE(v_buffer, 5);

  SELECT
    COALESCE(stats.sample_size, 0),
    stats.p50_minutes,
    stats.p80_minutes
  INTO v_sample_size, v_p50, v_p80
  FROM public.barber_service_duration_stats stats
  WHERE stats.barber_id = p_barber_id
    AND stats.service_id = p_service_id;

  v_sample_size := COALESCE(v_sample_size, 0);

  IF COALESCE(v_sample_size, 0) >= 20 THEN
    min_minutes := GREATEST(5, ROUND(COALESCE(v_p50, v_default_min))::integer);
    max_minutes := GREATEST(min_minutes, ROUND(COALESCE(v_p80, v_default_max))::integer);
    confidence := 'high';
  ELSIF COALESCE(v_sample_size, 0) BETWEEN 5 AND 19 THEN
    min_minutes := GREATEST(5, ROUND((COALESCE(v_p50, v_default_min) + v_default_min) / 2.0)::integer);
    max_minutes := GREATEST(min_minutes, ROUND((COALESCE(v_p80, v_default_max) + v_default_max) / 2.0)::integer);
    confidence := 'medium';
  ELSE
    min_minutes := GREATEST(5, v_default_min);
    max_minutes := GREATEST(min_minutes, v_default_max);
    confidence := 'low';
  END IF;

  buffer_minutes := GREATEST(0, v_buffer);
  sample_size := COALESCE(v_sample_size, 0);
  RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.get_duration_bounds(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.calculate_barber_workload(
  p_barber_id uuid,
  p_queue_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket record;
  v_bounds record;
  v_elapsed integer;
  v_workload integer := 0;
BEGIN
  IF p_barber_id IS NULL THEN
    RETURN 2147483647;
  END IF;

  FOR v_ticket IN
    SELECT qt.service_id, qt.status, qt.started_at, qt.queue_number, qt.created_at
    FROM public.queue_tickets qt
    WHERE qt.barber_id = p_barber_id
      AND qt.queue_date = p_queue_date
      AND qt.status IN ('in_service', 'called', 'waiting')
    ORDER BY
      CASE qt.status
        WHEN 'in_service' THEN 0
        WHEN 'called' THEN 1
        ELSE 2
      END,
      qt.queue_number,
      qt.created_at
  LOOP
    SELECT *
    INTO v_bounds
    FROM casa_private.get_duration_bounds(p_barber_id, v_ticket.service_id);

    IF v_ticket.status = 'in_service' THEN
      IF v_ticket.started_at IS NULL THEN
        v_workload := v_workload + COALESCE(v_bounds.max_minutes, 40);
      ELSE
        v_elapsed := GREATEST(0, FLOOR(EXTRACT(epoch FROM (now() - v_ticket.started_at)) / 60.0)::integer);
        v_workload := v_workload + GREATEST(0, COALESCE(v_bounds.max_minutes, 40) - v_elapsed);
      END IF;
    ELSE
      v_workload := v_workload + COALESCE(v_bounds.max_minutes, 40) + COALESCE(v_bounds.buffer_minutes, 5);
    END IF;
  END LOOP;

  RETURN GREATEST(0, v_workload);
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.calculate_barber_workload(uuid, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.assign_any_available_barber(
  p_service_id uuid,
  p_queue_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_barber_id uuid;
BEGIN
  SELECT b.id
  INTO v_barber_id
  FROM public.barbers b
  WHERE b.is_active IS TRUE
  ORDER BY casa_private.calculate_barber_workload(b.id, p_queue_date), b.name_en, b.id
  LIMIT 1;

  IF v_barber_id IS NULL THEN
    RAISE EXCEPTION 'No active barber is available.'
      USING ERRCODE = '22023';
  END IF;

  RETURN v_barber_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.assign_any_available_barber(uuid, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.broadcast_booking_slot_changed(
  p_barber_id uuid,
  p_booking_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_barber_id IS NULL OR p_booking_date IS NULL THEN
    RETURN;
  END IF;

  PERFORM realtime.send(
    jsonb_build_object('event', 'booking_slot_changed'),
    'booking_slot_changed',
    'booking-slots:' || p_barber_id::text || ':' || p_booking_date::text,
    false
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.broadcast_booking_slot_changed(uuid, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.broadcast_queue_status_changed(p_public_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_public_token IS NULL THEN
    RETURN;
  END IF;

  PERFORM realtime.send(
    jsonb_build_object('event', 'queue_status_changed'),
    'queue_status_changed',
    'queue-ticket:' || p_public_token::text,
    false
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.broadcast_queue_status_changed(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.recalculate_queue_estimates(
  p_queue_date date,
  p_barber_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket record;
  v_bounds record;
  v_elapsed integer;
  v_carry_min integer := 0;
  v_carry_max integer := 0;
  v_remaining_min integer;
  v_remaining_max integer;
BEGIN
  IF p_queue_date IS NULL OR p_barber_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_ticket IN
    SELECT qt.id, qt.public_token, qt.service_id, qt.started_at, qt.queue_number
    FROM public.queue_tickets qt
    WHERE qt.barber_id = p_barber_id
      AND qt.queue_date = p_queue_date
      AND qt.status = 'in_service'
    ORDER BY qt.started_at NULLS LAST, qt.queue_number, qt.created_at
  LOOP
    SELECT *
    INTO v_bounds
    FROM casa_private.get_duration_bounds(p_barber_id, v_ticket.service_id);

    IF v_ticket.started_at IS NULL THEN
      v_remaining_min := COALESCE(v_bounds.min_minutes, 25);
      v_remaining_max := COALESCE(v_bounds.max_minutes, 40);
    ELSE
      v_elapsed := GREATEST(0, FLOOR(EXTRACT(epoch FROM (now() - v_ticket.started_at)) / 60.0)::integer);
      v_remaining_min := GREATEST(0, COALESCE(v_bounds.min_minutes, 25) - v_elapsed);
      v_remaining_max := GREATEST(5, COALESCE(v_bounds.max_minutes, 40) - v_elapsed);
    END IF;

    UPDATE public.queue_tickets qt
    SET
      estimated_wait_min = 0,
      estimated_wait_max = 0,
      estimated_start_time = COALESCE(v_ticket.started_at, now()),
      prediction_confidence = COALESCE(v_bounds.confidence, 'low')
    WHERE qt.id = v_ticket.id;

    v_carry_min := v_carry_min + v_remaining_min;
    v_carry_max := v_carry_max + v_remaining_max;

    PERFORM casa_private.broadcast_queue_status_changed(v_ticket.public_token);
  END LOOP;

  FOR v_ticket IN
    SELECT qt.id, qt.public_token, qt.service_id, qt.queue_number
    FROM public.queue_tickets qt
    WHERE qt.barber_id = p_barber_id
      AND qt.queue_date = p_queue_date
      AND qt.status IN ('called', 'waiting')
    ORDER BY
      CASE qt.status WHEN 'called' THEN 0 ELSE 1 END,
      qt.queue_number,
      qt.created_at
  LOOP
    SELECT *
    INTO v_bounds
    FROM casa_private.get_duration_bounds(p_barber_id, v_ticket.service_id);

    UPDATE public.queue_tickets qt
    SET
      estimated_wait_min = GREATEST(0, v_carry_min),
      estimated_wait_max = GREATEST(GREATEST(0, v_carry_min), v_carry_max),
      estimated_start_time = now() + (GREATEST(0, v_carry_min)::text || ' minutes')::interval,
      prediction_confidence = COALESCE(v_bounds.confidence, 'low')
    WHERE qt.id = v_ticket.id;

    PERFORM casa_private.broadcast_queue_status_changed(v_ticket.public_token);

    v_carry_min := v_carry_min + COALESCE(v_bounds.min_minutes, 25) + COALESCE(v_bounds.buffer_minutes, 5);
    v_carry_max := v_carry_max + COALESCE(v_bounds.max_minutes, 40) + COALESCE(v_bounds.buffer_minutes, 5);
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.recalculate_queue_estimates(date, uuid) FROM PUBLIC, anon, authenticated;

-- ============ PUBLIC RPC WRAPPERS ============
CREATE OR REPLACE FUNCTION public.get_unavailable_booking_slots(
  p_barber_id uuid,
  p_booking_date date
)
RETURNS TABLE (booking_time text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT to_char(b.booking_time, 'HH24:MI') AS booking_time
  FROM public.bookings b
  WHERE b.barber_id = p_barber_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('pending', 'confirmed')
  ORDER BY b.booking_time
$$;
REVOKE EXECUTE ON FUNCTION public.get_unavailable_booking_slots(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unavailable_booking_slots(uuid, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_queue_ticket_status(p_public_token uuid)
RETURNS TABLE (
  queue_number integer,
  status text,
  "position" integer,
  service_display_name text,
  barber_display_name text,
  estimated_wait_min integer,
  estimated_wait_max integer,
  estimated_start_time timestamptz,
  prediction_confidence text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    qt.queue_number,
    qt.status,
    CASE
      WHEN qt.status IN ('waiting', 'called') AND qt.barber_id IS NOT NULL THEN (
        SELECT COUNT(*)::integer + 1
        FROM public.queue_tickets ahead
        WHERE ahead.barber_id = qt.barber_id
          AND ahead.queue_date = qt.queue_date
          AND ahead.status IN ('waiting', 'called')
          AND (
            ahead.queue_number < qt.queue_number
            OR (
              ahead.queue_number = qt.queue_number
              AND ahead.created_at < qt.created_at
            )
          )
      )
      ELSE 0
    END AS "position",
    CASE WHEN qt.language = 'ar' THEN s.title_ar ELSE s.title_en END AS service_display_name,
    CASE WHEN qt.language = 'ar' THEN b.name_ar ELSE b.name_en END AS barber_display_name,
    qt.estimated_wait_min,
    qt.estimated_wait_max,
    qt.estimated_start_time,
    COALESCE(qt.prediction_confidence, 'low') AS prediction_confidence
  FROM public.queue_tickets qt
  LEFT JOIN public.services s ON s.id = qt.service_id
  LEFT JOIN public.barbers b ON b.id = qt.barber_id
  WHERE qt.public_token = p_public_token
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_queue_ticket_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_ticket_status(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_queue(
  p_service_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_mode text DEFAULT 'any_barber',
  p_barber_id uuid DEFAULT NULL,
  p_language text DEFAULT 'en',
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  public_token uuid,
  queue_number integer,
  status text,
  "position" integer,
  service_display_name text,
  barber_display_name text,
  estimated_wait_min integer,
  estimated_wait_max integer,
  estimated_start_time timestamptz,
  prediction_confidence text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_phone text;
  v_mode text;
  v_language text;
  v_queue_date date := CURRENT_DATE;
  v_queue_number integer;
  v_barber_id uuid;
  v_public_token uuid;
BEGIN
  IF p_service_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.services s WHERE s.id = p_service_id AND s.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Choose an active service.'
      USING ERRCODE = '22023';
  END IF;

  IF length(trim(COALESCE(p_customer_name, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Customer name is required.'
      USING ERRCODE = '22023';
  END IF;

  v_phone := casa_private.normalize_phone(p_customer_phone);
  IF v_phone IS NULL OR length(v_phone) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Customer phone is required.'
      USING ERRCODE = '22023';
  END IF;

  v_mode := COALESCE(NULLIF(p_mode, ''), 'any_barber');
  IF v_mode NOT IN ('any_barber', 'specific_barber') THEN
    RAISE EXCEPTION 'Choose a valid queue mode.'
      USING ERRCODE = '22023';
  END IF;

  v_language := CASE WHEN p_language = 'ar' THEN 'ar' ELSE 'en' END;

  IF v_mode = 'specific_barber' THEN
    IF p_barber_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.barbers b WHERE b.id = p_barber_id AND b.is_active IS TRUE
    ) THEN
      RAISE EXCEPTION 'Choose an active barber.'
        USING ERRCODE = '22023';
    END IF;
    v_barber_id := p_barber_id;
  ELSE
    v_barber_id := casa_private.assign_any_available_barber(p_service_id, v_queue_date);
  END IF;

  INSERT INTO public.customers (full_name, phone, preferred_language, updated_at)
  VALUES (trim(p_customer_name), v_phone, v_language, now())
  ON CONFLICT (phone) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    preferred_language = EXCLUDED.preferred_language,
    updated_at = now()
  RETURNING id INTO v_customer_id;

  v_queue_number := casa_private.generate_daily_queue_number(v_queue_date);

  INSERT INTO public.queue_tickets (
    customer_id,
    service_id,
    barber_id,
    customer_name,
    customer_phone,
    queue_date,
    queue_number,
    mode,
    status,
    language,
    notes
  )
  VALUES (
    v_customer_id,
    p_service_id,
    v_barber_id,
    trim(p_customer_name),
    v_phone,
    v_queue_date,
    v_queue_number,
    v_mode,
    'waiting',
    v_language,
    NULLIF(trim(COALESCE(p_notes, '')), '')
  )
  RETURNING queue_tickets.public_token
  INTO v_public_token;

  PERFORM casa_private.recalculate_queue_estimates(v_queue_date, v_barber_id);
  PERFORM casa_private.broadcast_queue_status_changed(v_public_token);

  RETURN QUERY
  SELECT
    v_public_token AS public_token,
    s.queue_number,
    s.status,
    s."position",
    s.service_display_name,
    s.barber_display_name,
    s.estimated_wait_min,
    s.estimated_wait_max,
    s.estimated_start_time,
    s.prediction_confidence
  FROM public.get_queue_ticket_status(v_public_token) s;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.join_queue(uuid, text, text, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_queue(uuid, text, text, text, uuid, text, text) TO anon, authenticated;

-- ============ ADMIN RPC WRAPPERS ============
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
BEGIN
  PERFORM casa_private.assert_admin();

  SELECT *
  INTO v_ticket
  FROM public.queue_tickets qt
  WHERE qt.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue ticket not found.'
      USING ERRCODE = '22023';
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
      SELECT 1 FROM public.barbers b WHERE b.id = p_barber_id AND b.is_active IS TRUE
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

CREATE OR REPLACE FUNCTION public.recalculate_queue_estimates(
  p_queue_date date,
  p_barber_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM casa_private.assert_admin();
  PERFORM casa_private.recalculate_queue_estimates(p_queue_date, p_barber_id);
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.recalculate_queue_estimates(date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_queue_estimates(date, uuid) TO authenticated;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION casa_private.set_queue_ticket_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.set_queue_ticket_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS queue_tickets_set_updated_at ON public.queue_tickets;
CREATE TRIGGER queue_tickets_set_updated_at
  BEFORE UPDATE ON public.queue_tickets
  FOR EACH ROW
  EXECUTE FUNCTION casa_private.set_queue_ticket_updated_at();

CREATE OR REPLACE FUNCTION casa_private.handle_booking_slot_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM casa_private.broadcast_booking_slot_changed(NEW.barber_id, NEW.booking_date);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM casa_private.broadcast_booking_slot_changed(OLD.barber_id, OLD.booking_date);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.handle_booking_slot_broadcast() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_broadcast_slot_changed ON public.bookings;
CREATE TRIGGER bookings_broadcast_slot_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION casa_private.handle_booking_slot_broadcast();

CREATE OR REPLACE FUNCTION casa_private.handle_queue_ticket_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM casa_private.broadcast_queue_status_changed(NEW.public_token);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM casa_private.broadcast_queue_status_changed(OLD.public_token);
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.handle_queue_ticket_broadcast() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS queue_tickets_broadcast_status_changed ON public.queue_tickets;
CREATE TRIGGER queue_tickets_broadcast_status_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.queue_tickets
  FOR EACH ROW
  EXECUTE FUNCTION casa_private.handle_queue_ticket_broadcast();

-- ============ RLS AND TABLE GRANTS ============
ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read queue tickets" ON public.queue_tickets;
CREATE POLICY "Admins can read queue tickets"
  ON public.queue_tickets FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update queue tickets" ON public.queue_tickets;
CREATE POLICY "Admins can update queue tickets"
  ON public.queue_tickets FOR UPDATE
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

REVOKE ALL ON public.queue_tickets FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.queue_tickets TO authenticated;

REVOKE ALL ON SCHEMA casa_private FROM PUBLIC, anon, authenticated;
