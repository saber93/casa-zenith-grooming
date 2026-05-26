-- Migration: 20260525134000_phase_b_create_product_sale_warning_cleanup.sql
-- Purpose: Keep disabled legacy product sale RPC warning-free.

DROP FUNCTION IF EXISTS public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.create_product_sale(
  uuid,
  jsonb,
  text DEFAULT 'cash',
  uuid DEFAULT NULL,
  uuid DEFAULT NULL,
  numeric DEFAULT 0,
  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF $2 IS NULL
    AND $3 IS NULL
    AND $4 IS NULL
    AND $5 IS NULL
    AND $6 IS NULL
    AND $7 IS NULL THEN
    NULL;
  END IF;

  PERFORM casa_private.assert_checkout_operator($1);

  RAISE EXCEPTION 'Product sales must be recorded through checkout_transaction.'
    USING ERRCODE = '0A000';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) TO authenticated;
