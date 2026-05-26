-- Migration: 20260525113000_url_encode_lint_cleanup.sql
-- Purpose: Remove remaining schema lint warnings from the WhatsApp preview URL helper.

CREATE OR REPLACE FUNCTION casa_private.url_encode_text(p_text text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_bytes bytea := convert_to(COALESCE(p_text, ''), 'UTF8');
  v_result text := '';
  v_byte integer;
BEGIN
  IF length(v_bytes) IS NULL THEN
    RETURN '';
  END IF;

  FOR v_loop_index IN 0..length(v_bytes) - 1 LOOP
    v_byte := get_byte(v_bytes, v_loop_index);

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
