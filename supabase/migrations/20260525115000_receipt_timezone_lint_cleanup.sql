-- Migration: 20260525115000_receipt_timezone_lint_cleanup.sql
-- Purpose: Keep receipt date business-local while preserving the legacy helper signature without lint warnings.

CREATE OR REPLACE FUNCTION casa_private.next_receipt_number(
  p_business_id uuid,
  p_receipt_date date DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business_timezone text;
  v_business_local_date date;
  v_receipt_date date;
  v_next_sequence integer;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'Business is required for receipt numbering.'
      USING ERRCODE = '22023';
  END IF;

  SELECT NULLIF(b.timezone, '')
  INTO v_business_timezone
  FROM public.businesses b
  WHERE b.id = p_business_id;

  v_business_timezone := COALESCE(v_business_timezone, 'Asia/Dubai');
  v_business_local_date := (now() AT TIME ZONE v_business_timezone)::date;

  -- Current checkout callers still pass CURRENT_DATE from older code; ignore that UTC-derived value.
  -- A non-current explicit date remains available for controlled backfill/repair calls.
  v_receipt_date := CASE
    WHEN p_receipt_date IS NOT NULL AND p_receipt_date <> CURRENT_DATE THEN p_receipt_date
    ELSE v_business_local_date
  END;

  INSERT INTO public.checkout_receipt_counters (business_id, receipt_date, last_sequence)
  VALUES (p_business_id, v_receipt_date, 1)
  ON CONFLICT (business_id, receipt_date)
  DO UPDATE
    SET last_sequence = public.checkout_receipt_counters.last_sequence + 1,
        updated_at = now()
  RETURNING last_sequence INTO v_next_sequence;

  RETURN 'CASA-' || to_char(v_receipt_date, 'YYYYMMDD') || '-' || lpad(v_next_sequence::text, 6, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.next_receipt_number(uuid, date) FROM PUBLIC, anon, authenticated;
