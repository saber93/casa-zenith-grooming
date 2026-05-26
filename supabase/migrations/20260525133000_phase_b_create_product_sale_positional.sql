-- Migration: 20260525133000_phase_b_create_product_sale_positional.sql
-- Purpose: Remove unused-parameter warnings from the disabled legacy product sale RPC.

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
  PERFORM casa_private.assert_checkout_operator($1);

  RAISE EXCEPTION 'Product sales must be recorded through checkout_transaction.'
    USING ERRCODE = '0A000';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) TO authenticated;
