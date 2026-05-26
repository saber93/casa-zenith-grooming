-- Migration: 20260525112000_phase_a_db_lint_repairs.sql
-- Purpose: Repair schema-lint errors discovered during Phase A DB acceptance.

CREATE OR REPLACE FUNCTION casa_private.calculate_barber_workload(
  p_barber_id uuid,
  p_service_id uuid,
  p_queue_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT casa_private.calculate_barber_workload(p_barber_id, p_queue_date)
$$;

REVOKE EXECUTE ON FUNCTION casa_private.calculate_barber_workload(uuid, uuid, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_duration_booking(
  p_business_id uuid,
  p_service_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_staff_id uuid DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_language text DEFAULT 'en',
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  booking_id uuid,
  booking_item_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_booking_id uuid;
  v_item_id uuid;
  v_service record;
BEGIN
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'End time must be after start time.'
      USING ERRCODE = '22023';
  END IF;

  SELECT s.id, s.price, s.duration_minutes
  INTO v_service
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.business_id = p_business_id
    AND s.is_active IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Choose an active service.'
      USING ERRCODE = '22023';
  END IF;

  SELECT c.id
  INTO v_customer_id
  FROM public.customers c
  WHERE c.business_id = p_business_id
    AND c.phone = trim(p_customer_phone)
  ORDER BY c.created_at NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (business_id, full_name, phone, preferred_language, updated_at)
    VALUES (
      p_business_id,
      trim(p_customer_name),
      trim(p_customer_phone),
      COALESCE(NULLIF(p_language, ''), 'en'),
      now()
    )
    RETURNING id INTO v_customer_id;
  END IF;

  INSERT INTO public.bookings (
    business_id,
    customer_id,
    service_id,
    barber_id,
    customer_name,
    customer_phone,
    booking_date,
    booking_time,
    status,
    language,
    notes
  )
  VALUES (
    p_business_id,
    v_customer_id,
    p_service_id,
    p_staff_id,
    trim(p_customer_name),
    trim(p_customer_phone),
    p_starts_at::date,
    p_starts_at::time,
    'pending',
    COALESCE(NULLIF(p_language, ''), 'en'),
    p_notes
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (
    business_id,
    booking_id,
    service_id,
    barber_id,
    resource_id,
    starts_at,
    ends_at,
    status,
    price,
    duration_minutes,
    notes
  )
  VALUES (
    p_business_id,
    v_booking_id,
    p_service_id,
    p_staff_id,
    p_resource_id,
    p_starts_at,
    p_ends_at,
    'pending',
    v_service.price,
    COALESCE(v_service.duration_minutes, CEIL(EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 60)::integer),
    p_notes
  )
  RETURNING id INTO v_item_id;

  RETURN QUERY SELECT v_booking_id, v_item_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_duration_booking(uuid, uuid, text, text, timestamptz, timestamptz, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_duration_booking(uuid, uuid, text, text, timestamptz, timestamptz, uuid, uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_in_booking(p_booking_id uuid)
RETURNS TABLE (
  ticket_id uuid,
  public_token uuid,
  queue_number integer,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking record;
  v_customer_id uuid;
  v_queue_date date := CURRENT_DATE;
  v_queue_number integer;
  v_public_token uuid;
  v_ticket_id uuid;
  v_status text;
  v_mode text;
BEGIN
  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.status = 'completed' OR v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking is already completed or cancelled'
      USING ERRCODE = '22023';
  END IF;

  SELECT qt.id, qt.public_token, qt.queue_number, qt.status
  INTO v_ticket_id, v_public_token, v_queue_number, v_status
  FROM public.queue_tickets qt
  WHERE qt.booking_id = p_booking_id
  LIMIT 1;

  IF v_ticket_id IS NOT NULL THEN
    ticket_id := v_ticket_id;
    public_token := v_public_token;
    queue_number := v_queue_number;
    status := v_status;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT c.id
  INTO v_customer_id
  FROM public.customers c
  WHERE c.business_id = v_booking.business_id
    AND c.phone = v_booking.customer_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (business_id, full_name, phone, preferred_language, updated_at)
    VALUES (v_booking.business_id, v_booking.customer_name, v_booking.customer_phone, COALESCE(v_booking.language, 'en'), now())
    RETURNING id INTO v_customer_id;
  END IF;

  v_queue_number := casa_private.generate_daily_queue_number(v_queue_date);
  v_mode := CASE WHEN v_booking.barber_id IS NOT NULL THEN 'specific_barber' ELSE 'any_barber' END;

  INSERT INTO public.queue_tickets (
    business_id,
    booking_id,
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
    v_booking.business_id,
    p_booking_id,
    v_customer_id,
    v_booking.service_id,
    v_booking.barber_id,
    v_booking.customer_name,
    v_booking.customer_phone,
    v_queue_date,
    v_queue_number,
    v_mode,
    'waiting',
    COALESCE(v_booking.language, 'en'),
    v_booking.notes
  )
  RETURNING queue_tickets.id, queue_tickets.public_token, queue_tickets.queue_number, queue_tickets.status
  INTO v_ticket_id, v_public_token, v_queue_number, v_status;

  PERFORM casa_private.recalculate_queue_estimates(v_queue_date, v_booking.barber_id);
  PERFORM casa_private.broadcast_queue_status_changed(v_public_token);

  UPDATE public.bookings b
  SET
    status = 'confirmed',
    notes = COALESCE(b.notes || E'\n', '') || '[Checked In: Queue Ticket #' || v_queue_number || ']'
  WHERE b.id = p_booking_id;

  ticket_id := v_ticket_id;
  public_token := v_public_token;
  queue_number := v_queue_number;
  status := v_status;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_in_booking(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_booking(uuid) TO authenticated;
