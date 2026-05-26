-- Migration to add booking check-in functionality

-- 1. Add booking_id column to queue_tickets
ALTER TABLE public.queue_tickets
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Create unique index to prevent a booking from being checked in multiple times active in the queue
CREATE UNIQUE INDEX IF NOT EXISTS queue_tickets_booking_id_key
  ON public.queue_tickets (booking_id);

-- 2. Create the check_in_booking RPC function
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
  -- 1. Fetch booking details
  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.status = 'completed' OR v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking is already completed or cancelled'
      USING ERRCODE = '22023';
  END IF;

  -- 2. Check if already checked in
  SELECT id, public_token, queue_tickets.queue_number, queue_tickets.status
  INTO v_ticket_id, v_public_token, v_queue_number, v_status
  FROM public.queue_tickets
  WHERE booking_id = p_booking_id
  LIMIT 1;

  IF v_ticket_id IS NOT NULL THEN
    ticket_id := v_ticket_id;
    public_token := v_public_token;
    queue_number := v_queue_number;
    status := v_status;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 3. Get or create customer
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE phone = v_booking.customer_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (business_id, full_name, phone, preferred_language, updated_at)
    VALUES (v_booking.business_id, v_booking.customer_name, v_booking.customer_phone, COALESCE(v_booking.language, 'en'), now())
    RETURNING id INTO v_customer_id;
  END IF;

  -- 4. Calculate queue number
  v_queue_number := casa_private.generate_daily_queue_number(v_queue_date);

  -- 5. Insert queue ticket
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
  RETURNING id, public_token, queue_tickets.queue_number, queue_tickets.status
  INTO v_ticket_id, v_public_token, v_queue_number, v_status;

  -- 6. Recalculate queue estimates & broadcast
  PERFORM casa_private.recalculate_queue_estimates(v_queue_date, v_booking.barber_id);
  PERFORM casa_private.broadcast_queue_status_changed(v_public_token);

  -- 7. Update booking status and notes
  UPDATE public.bookings
  SET
    status = 'confirmed',
    notes = COALESCE(notes || E'\n', '') || '[Checked In: Queue Ticket #' || v_queue_number || ']'
  WHERE id = p_booking_id;

  ticket_id := v_ticket_id;
  public_token := v_public_token;
  queue_number := v_queue_number;
  status := v_status;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_in_booking(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_booking(uuid) TO authenticated;
