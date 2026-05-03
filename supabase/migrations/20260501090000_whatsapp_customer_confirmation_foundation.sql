-- Casa WhatsApp customer confirmation foundation.
-- This prepares manual customer confirmation via WhatsApp inbound messages.
-- TODO: A future WhatsApp Cloud API Edge Function should call
-- casa_private.process_whatsapp_inbound with service-role credentials.
-- TODO: Future Email Magic Link work should link auth.users.id to
-- public.customers.auth_user_id. Do not implement Magic Link or WhatsApp OTP here.

-- ============ CUSTOMER WHATSAPP FIELDS ============
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_last_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_wa_id text,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS customers_whatsapp_phone_idx
  ON public.customers (whatsapp_phone);

CREATE INDEX IF NOT EXISTS customers_auth_user_id_idx
  ON public.customers (auth_user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'customers_unique_verified_whatsapp_phone'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.whatsapp_phone IS NOT NULL
        AND c.whatsapp_verified_at IS NOT NULL
      GROUP BY c.whatsapp_phone
      HAVING COUNT(*) > 1
    ) THEN
      RAISE WARNING 'Skipped customers_unique_verified_whatsapp_phone: duplicate verified whatsapp_phone values exist.';
    ELSE
      CREATE UNIQUE INDEX customers_unique_verified_whatsapp_phone
        ON public.customers (whatsapp_phone)
        WHERE whatsapp_phone IS NOT NULL
          AND whatsapp_verified_at IS NOT NULL;
    END IF;
  END IF;
END $$;

-- ============ WHATSAPP INBOUND LOG ============
CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id text,
  phone text,
  normalized_phone text,
  message_text text,
  matched_public_token uuid,
  matched_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  matched_queue_ticket_id uuid REFERENCES public.queue_tickets(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('matched', 'unmatched', 'invalid_token', 'already_verified', 'error')),
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read WhatsApp inbound messages" ON public.whatsapp_inbound_messages;
CREATE POLICY "Admins can read WhatsApp inbound messages"
  ON public.whatsapp_inbound_messages FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

REVOKE ALL ON public.whatsapp_inbound_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.whatsapp_inbound_messages TO authenticated;

COMMENT ON TABLE public.whatsapp_inbound_messages IS
  'Audit log for future WhatsApp Cloud API inbound queue confirmations. Public access is intentionally blocked.';

-- ============ PRIVATE HELPERS ============
CREATE SCHEMA IF NOT EXISTS casa_private;
REVOKE ALL ON SCHEMA casa_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.normalize_whatsapp_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_digits text;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  IF v_digits = '' THEN
    RETURN NULL;
  END IF;

  IF left(v_digits, 2) = '00' THEN
    v_digits := substring(v_digits FROM 3);
  END IF;

  IF left(v_digits, 3) = '971' THEN
    RETURN v_digits;
  END IF;

  IF left(v_digits, 1) = '0' AND length(v_digits) = 10 THEN
    RETURN '971' || substring(v_digits FROM 2);
  END IF;

  IF left(v_digits, 1) = '5' AND length(v_digits) = 9 THEN
    RETURN '971' || v_digits;
  END IF;

  RETURN v_digits;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.normalize_whatsapp_phone(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.extract_queue_public_token(p_message_text text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_text text := COALESCE(p_message_text, '');
  v_match text[];
  v_has_confirm_phrase boolean;
BEGIN
  v_has_confirm_phrase :=
    lower(v_text) ~ 'confirm[[:space:]]+casa[[:space:]]+queue'
    OR (
      position('تأكيد' IN v_text) > 0
      AND position('دور' IN v_text) > 0
      AND position('كازا' IN v_text) > 0
    );

  IF NOT v_has_confirm_phrase THEN
    RETURN NULL;
  END IF;

  v_match := regexp_match(
    v_text,
    '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'
  );

  IF v_match IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_match[1]::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.extract_queue_public_token(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.url_encode_text(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_bytes bytea := convert_to(COALESCE(p_text, ''), 'UTF8');
  v_result text := '';
  v_index integer;
  v_byte integer;
BEGIN
  IF length(v_bytes) IS NULL THEN
    RETURN '';
  END IF;

  FOR v_index IN 0..length(v_bytes) - 1 LOOP
    v_byte := get_byte(v_bytes, v_index);

    IF (v_byte BETWEEN 48 AND 57)
      OR (v_byte BETWEEN 65 AND 90)
      OR (v_byte BETWEEN 97 AND 122)
      OR v_byte IN (45, 46, 95, 126) THEN
      v_result := v_result || chr(v_byte);
    ELSIF v_byte = 32 THEN
      v_result := v_result || '%20';
    ELSE
      v_result := v_result || '%' || upper(lpad(to_hex(v_byte), 2, '0'));
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.url_encode_text(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.process_whatsapp_inbound(
  p_wa_id text,
  p_phone text,
  p_message_text text,
  p_raw_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_normalized_phone text;
  v_public_token uuid;
  v_log_id uuid;
  v_ticket record;
  v_customer_id uuid;
  v_existing_customer record;
  v_verified_owner uuid;
  v_now timestamptz := now();
BEGIN
  v_normalized_phone := casa_private.normalize_whatsapp_phone(p_phone);
  v_public_token := casa_private.extract_queue_public_token(p_message_text);

  INSERT INTO public.whatsapp_inbound_messages (
    wa_id,
    phone,
    normalized_phone,
    message_text,
    matched_public_token,
    match_status,
    raw_payload
  )
  VALUES (
    NULLIF(trim(COALESCE(p_wa_id, '')), ''),
    p_phone,
    v_normalized_phone,
    p_message_text,
    v_public_token,
    CASE WHEN v_public_token IS NULL THEN 'unmatched' ELSE 'unmatched' END,
    COALESCE(p_raw_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  IF v_public_token IS NULL THEN
    RETURN jsonb_build_object(
      'matched', false,
      'status', 'unmatched',
      'match_status', 'unmatched'
    );
  END IF;

  SELECT qt.id, qt.public_token, qt.customer_id, qt.customer_name, qt.customer_phone, qt.language
  INTO v_ticket
  FROM public.queue_tickets qt
  WHERE qt.public_token = v_public_token
  LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.whatsapp_inbound_messages wim
    SET match_status = 'invalid_token'
    WHERE wim.id = v_log_id;

    RETURN jsonb_build_object(
      'matched', false,
      'status', 'invalid_token',
      'match_status', 'invalid_token',
      'public_token', v_public_token
    );
  END IF;

  IF v_normalized_phone IS NULL THEN
    UPDATE public.whatsapp_inbound_messages wim
    SET
      matched_public_token = v_public_token,
      matched_queue_ticket_id = v_ticket.id,
      match_status = 'error'
    WHERE wim.id = v_log_id;

    RETURN jsonb_build_object(
      'matched', false,
      'status', 'error',
      'match_status', 'error',
      'public_token', v_public_token
    );
  END IF;

  v_customer_id := v_ticket.customer_id;

  IF v_customer_id IS NULL THEN
    SELECT c.id
    INTO v_customer_id
    FROM public.customers c
    WHERE c.whatsapp_phone = v_normalized_phone
      OR casa_private.normalize_whatsapp_phone(c.phone) = v_normalized_phone
    ORDER BY
      CASE WHEN c.whatsapp_phone = v_normalized_phone THEN 0 ELSE 1 END,
      c.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (full_name, phone, preferred_language, updated_at)
    VALUES (
      COALESCE(NULLIF(trim(COALESCE(v_ticket.customer_name, '')), ''), 'WhatsApp Customer'),
      v_normalized_phone,
      CASE WHEN v_ticket.language = 'ar' THEN 'ar' ELSE 'en' END,
      v_now
    )
    ON CONFLICT (phone) DO UPDATE
    SET updated_at = public.customers.updated_at
    RETURNING id INTO v_customer_id;
  END IF;

  SELECT c.id, c.whatsapp_phone, c.whatsapp_verified_at
  INTO v_existing_customer
  FROM public.customers c
  WHERE c.id = v_customer_id;

  IF v_existing_customer.whatsapp_verified_at IS NOT NULL
    AND v_existing_customer.whatsapp_phone IS NOT NULL
    AND v_existing_customer.whatsapp_phone <> v_normalized_phone THEN
    UPDATE public.whatsapp_inbound_messages wim
    SET
      matched_public_token = v_public_token,
      matched_customer_id = v_customer_id,
      matched_queue_ticket_id = v_ticket.id,
      match_status = 'already_verified'
    WHERE wim.id = v_log_id;

    RETURN jsonb_build_object(
      'matched', false,
      'status', 'already_verified',
      'match_status', 'already_verified',
      'public_token', v_public_token
    );
  END IF;

  SELECT c.id
  INTO v_verified_owner
  FROM public.customers c
  WHERE c.whatsapp_phone = v_normalized_phone
    AND c.whatsapp_verified_at IS NOT NULL
    AND c.id <> v_customer_id
  LIMIT 1;

  IF v_verified_owner IS NOT NULL THEN
    UPDATE public.whatsapp_inbound_messages wim
    SET
      matched_public_token = v_public_token,
      matched_customer_id = v_customer_id,
      matched_queue_ticket_id = v_ticket.id,
      match_status = 'already_verified'
    WHERE wim.id = v_log_id;

    RETURN jsonb_build_object(
      'matched', false,
      'status', 'already_verified',
      'match_status', 'already_verified',
      'public_token', v_public_token
    );
  END IF;

  UPDATE public.customers c
  SET
    whatsapp_phone = v_normalized_phone,
    whatsapp_wa_id = COALESCE(NULLIF(trim(COALESCE(p_wa_id, '')), ''), c.whatsapp_wa_id),
    whatsapp_verified_at = COALESCE(c.whatsapp_verified_at, v_now),
    whatsapp_opt_in_at = COALESCE(c.whatsapp_opt_in_at, v_now),
    whatsapp_last_inbound_at = v_now,
    updated_at = v_now
  WHERE c.id = v_customer_id;

  UPDATE public.queue_tickets qt
  SET customer_id = COALESCE(qt.customer_id, v_customer_id)
  WHERE qt.id = v_ticket.id;

  UPDATE public.whatsapp_inbound_messages wim
  SET
    matched_public_token = v_public_token,
    matched_customer_id = v_customer_id,
    matched_queue_ticket_id = v_ticket.id,
    match_status = 'matched'
  WHERE wim.id = v_log_id;

  RETURN jsonb_build_object(
    'matched', true,
    'status', 'matched',
    'match_status', 'matched',
    'public_token', v_public_token,
    'customer_id', v_customer_id
  );
EXCEPTION
  WHEN others THEN
    IF v_log_id IS NOT NULL THEN
      UPDATE public.whatsapp_inbound_messages wim
      SET match_status = 'error'
      WHERE wim.id = v_log_id;
    END IF;

    RETURN jsonb_build_object(
      'matched', false,
      'status', 'error',
      'match_status', 'error'
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION casa_private.process_whatsapp_inbound(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION casa_private.process_whatsapp_inbound(text, text, text, jsonb) IS
  'Future WhatsApp Cloud API webhook processor. Use service-role credentials from an Edge Function; do not expose publicly.';

-- ============ PUBLIC RPC WRAPPERS ============
CREATE OR REPLACE FUNCTION public.preview_whatsapp_confirm_message(
  p_public_token uuid,
  p_language text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_language text := CASE WHEN p_language = 'ar' THEN 'ar' ELSE 'en' END;
  v_message text;
BEGIN
  IF p_public_token IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.queue_tickets qt
    WHERE qt.public_token = p_public_token
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid_token',
      'public_token', p_public_token
    );
  END IF;

  v_message := CASE
    WHEN v_language = 'ar' THEN 'تأكيد دور كازا ' || p_public_token::text
    ELSE 'CONFIRM CASA QUEUE ' || p_public_token::text
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'public_token', p_public_token,
    'language', v_language,
    'message_text', v_message,
    'local_display', '0544767690',
    'international_display', '+971 544767690',
    'wa_me_number', '971544767690',
    'wa_me_url', 'https://wa.me/971544767690?text=' || casa_private.url_encode_text(v_message)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.preview_whatsapp_confirm_message(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_whatsapp_confirm_message(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_process_whatsapp_inbound_test(
  p_wa_id text,
  p_phone text,
  p_message_text text,
  p_raw_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM casa_private.assert_admin();
  RETURN casa_private.process_whatsapp_inbound(p_wa_id, p_phone, p_message_text, p_raw_payload);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_process_whatsapp_inbound_test(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_whatsapp_inbound_test(text, text, text, jsonb) TO authenticated;
