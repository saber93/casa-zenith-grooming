-- Migration: 20260525131000_phase_b_lint_cleanup.sql
-- Purpose: Keep the disabled legacy product sale wrapper lint-clean while preserving its signature.

CREATE OR REPLACE FUNCTION public.create_product_sale(
  p_business_id uuid,
  p_items jsonb,
  p_payment_type text DEFAULT 'cash',
  p_staff_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM p_items, p_payment_type, p_staff_id, p_customer_id, p_discount_amount, p_notes;
  PERFORM casa_private.assert_checkout_operator(p_business_id);

  RAISE EXCEPTION 'Product sales must be recorded through checkout_transaction.'
    USING ERRCODE = '0A000';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) TO authenticated;
