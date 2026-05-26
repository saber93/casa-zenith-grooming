-- Migration: 20260525130000_financial_phase_b_transaction_integrity.sql
-- Purpose: Phase B financial transaction integrity.

CREATE SCHEMA IF NOT EXISTS casa_private;
REVOKE ALL ON SCHEMA casa_private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.checkout_transactions
  ADD COLUMN IF NOT EXISTS original_transaction_id uuid REFERENCES public.checkout_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'sale'
    CHECK (transaction_type IN ('sale', 'refund')),
  ADD COLUMN IF NOT EXISTS customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS discount_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS refund_reason text;

ALTER TABLE public.checkout_transaction_items
  ADD COLUMN IF NOT EXISTS staff_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  ADD COLUMN IF NOT EXISTS tip_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tip_amount >= 0);

DO $$
BEGIN
  ALTER TABLE public.financial_ledger_entries DROP CONSTRAINT IF EXISTS financial_ledger_entries_category_check;

  ALTER TABLE public.financial_ledger_entries
    ADD CONSTRAINT financial_ledger_entries_category_check
    CHECK (category IN (
      'service',
      'product',
      'wallet',
      'tip',
      'commission',
      'refund',
      'tax',
      'discount',
      'package',
      'membership'
    ));
END $$;

CREATE TABLE IF NOT EXISTS public.product_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  checkout_transaction_id uuid REFERENCES public.checkout_transactions(id) ON DELETE SET NULL,
  qty_delta integer NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('sale', 'refund', 'adjustment')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_inventory_movements_business_created
  ON public.product_inventory_movements(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_inventory_movements_product
  ON public.product_inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_movements_checkout
  ON public.product_inventory_movements(checkout_transaction_id);

ALTER TABLE public.product_inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read product inventory movements" ON public.product_inventory_movements;
CREATE POLICY "Staff can read product inventory movements"
  ON public.product_inventory_movements FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = product_inventory_movements.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

CREATE OR REPLACE FUNCTION casa_private.assert_checkout_mutation_allowed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_setting('casa.checkout_mutation', true) = 'true' THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Paid financial records are immutable. Use checkout/refund RPCs.'
    USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.assert_checkout_mutation_allowed() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.prevent_paid_checkout_transaction_drift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.payment_status IN ('completed', 'refunded') THEN
    PERFORM casa_private.assert_checkout_mutation_allowed();
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.payment_status IN ('completed', 'refunded') THEN
    IF OLD.business_id IS DISTINCT FROM NEW.business_id
      OR OLD.receipt_number IS DISTINCT FROM NEW.receipt_number
      OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
      OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount
      OR OLD.wallet_amount IS DISTINCT FROM NEW.wallet_amount
      OR OLD.package_amount IS DISTINCT FROM NEW.package_amount
      OR OLD.membership_amount IS DISTINCT FROM NEW.membership_amount
      OR OLD.tips_amount IS DISTINCT FROM NEW.tips_amount
      OR OLD.tax_amount IS DISTINCT FROM NEW.tax_amount
      OR OLD.total_amount IS DISTINCT FROM NEW.total_amount
      OR OLD.payments IS DISTINCT FROM NEW.payments
      OR OLD.customer_snapshot IS DISTINCT FROM NEW.customer_snapshot
      OR OLD.payment_snapshot IS DISTINCT FROM NEW.payment_snapshot
      OR OLD.discount_snapshot IS DISTINCT FROM NEW.discount_snapshot
      OR OLD.source_snapshot IS DISTINCT FROM NEW.source_snapshot
      OR OLD.transaction_type IS DISTINCT FROM NEW.transaction_type
      OR OLD.original_transaction_id IS DISTINCT FROM NEW.original_transaction_id
    THEN
      PERFORM casa_private.assert_checkout_mutation_allowed();
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.prevent_paid_checkout_transaction_drift() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.prevent_paid_checkout_item_drift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_status text;
BEGIN
  SELECT ct.payment_status
  INTO v_payment_status
  FROM public.checkout_transactions ct
  WHERE ct.id = COALESCE(NEW.transaction_id, OLD.transaction_id);

  IF v_payment_status IN ('completed', 'refunded') THEN
    PERFORM casa_private.assert_checkout_mutation_allowed();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.prevent_paid_checkout_item_drift() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_paid_checkout_transaction_drift ON public.checkout_transactions;
CREATE TRIGGER prevent_paid_checkout_transaction_drift
  BEFORE UPDATE OR DELETE ON public.checkout_transactions
  FOR EACH ROW
  EXECUTE FUNCTION casa_private.prevent_paid_checkout_transaction_drift();

DROP TRIGGER IF EXISTS prevent_paid_checkout_item_drift ON public.checkout_transaction_items;
CREATE TRIGGER prevent_paid_checkout_item_drift
  BEFORE UPDATE OR DELETE ON public.checkout_transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION casa_private.prevent_paid_checkout_item_drift();

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
  PERFORM casa_private.assert_checkout_operator(p_business_id);

  RAISE EXCEPTION 'Product sales must be recorded through checkout_transaction.'
    USING ERRCODE = '0A000';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.checkout_transaction(
  p_action text,
  p_booking_id uuid DEFAULT NULL,
  p_queue_ticket_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_services jsonb DEFAULT '[]'::jsonb,
  p_products jsonb DEFAULT '[]'::jsonb,
  p_tips numeric DEFAULT 0,
  p_wallet_amount numeric DEFAULT 0,
  p_package_usage jsonb DEFAULT '[]'::jsonb,
  p_membership_discount numeric DEFAULT 0,
  p_discount numeric DEFAULT 0,
  p_tax numeric DEFAULT 0,
  p_payments jsonb DEFAULT '[]'::jsonb,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking record;
  v_ticket record;
  v_customer record;
  v_customer_id uuid := p_customer_id;
  v_business_id uuid;
  v_receipt_number text;
  v_transaction_id uuid;
  v_cashier_session_id uuid;
  v_payment_status text;
  v_svc_item record;
  v_prod_item record;
  v_pkg_item record;
  v_payment_item record;
  v_wallet record;
  v_user_wallet record;
  v_service record;
  v_product record;
  v_benefit record;
  v_subtotal numeric(10,2) := 0;
  v_service_subtotal numeric(10,2) := 0;
  v_product_subtotal numeric(10,2) := 0;
  v_total_amount numeric(10,2) := 0;
  v_payments_sum numeric(10,2) := 0;
  v_package_amount numeric(10,2) := 0;
  v_discount_amount numeric(10,2) := GREATEST(COALESCE(p_discount, 0), 0);
  v_membership_amount numeric(10,2) := GREATEST(COALESCE(p_membership_discount, 0), 0);
  v_wallet_amount numeric(10,2) := GREATEST(COALESCE(p_wallet_amount, 0), 0);
  v_tips numeric(10,2) := GREATEST(COALESCE(p_tips, 0), 0);
  v_tax numeric(10,2) := GREATEST(COALESCE(p_tax, 0), 0);
  v_wallet_id uuid;
  v_wallet_code text;
  v_commission_amount numeric(10,2) := 0;
  v_customer_snapshot jsonb := '{}'::jsonb;
  v_payment_snapshot jsonb := '{}'::jsonb;
  v_discount_snapshot jsonb := '{}'::jsonb;
  v_source_snapshot jsonb := '{}'::jsonb;
  v_staff_snapshot jsonb;
  v_result jsonb;
BEGIN
  IF p_action NOT IN ('preview', 'create', 'complete') THEN
    RAISE EXCEPTION 'Invalid transaction action.'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_services, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(COALESCE(p_products, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(COALESCE(p_package_usage, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(COALESCE(p_payments, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Checkout payload arrays are malformed.'
      USING ERRCODE = '22023';
  END IF;

  IF p_booking_id IS NOT NULL THEN
    SELECT *
    INTO v_booking
    FROM public.bookings b
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found'
        USING ERRCODE = 'P0002';
    END IF;

    v_business_id := v_booking.business_id;
    v_customer_id := COALESCE(v_customer_id, v_booking.customer_id);
  END IF;

  IF p_queue_ticket_id IS NOT NULL THEN
    SELECT *
    INTO v_ticket
    FROM public.queue_tickets qt
    WHERE qt.id = p_queue_ticket_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Queue ticket not found'
        USING ERRCODE = 'P0002';
    END IF;

    v_business_id := COALESCE(v_business_id, v_ticket.business_id);
    v_customer_id := COALESCE(v_customer_id, v_ticket.customer_id);
  END IF;

  IF v_business_id IS NULL THEN
    v_business_id := public.default_business_id();
  END IF;

  PERFORM casa_private.assert_checkout_operator(v_business_id);

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'A customer profile is required to execute a checkout transaction.'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_customer
  FROM public.customers c
  WHERE c.id = v_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_action <> 'preview' THEN
    IF p_booking_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = p_booking_id
        AND b.checkout_status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Booking is already completed and checked out.'
        USING ERRCODE = '22023';
    END IF;

    IF p_queue_ticket_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.queue_tickets qt
      WHERE qt.id = p_queue_ticket_id
        AND qt.status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Queue ticket is already completed and checked out.'
        USING ERRCODE = '22023';
    END IF;

    SELECT cs.id
    INTO v_cashier_session_id
    FROM public.cashier_sessions cs
    WHERE cs.business_id = v_business_id
      AND cs.opened_by = (SELECT auth.uid())
      AND cs.status = 'open'
    ORDER BY cs.opened_at DESC
    LIMIT 1;

    IF v_cashier_session_id IS NULL THEN
      RAISE EXCEPTION 'No active cashier session. Open a cashier session before checkout.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  FOR v_svc_item IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_services, '[]'::jsonb)) AS x(
      service_id uuid,
      name text,
      price numeric,
      qty int,
      staff_id uuid,
      discount numeric,
      resource_id uuid,
      snapshot jsonb
    )
  LOOP
    v_service := NULL;
    IF v_svc_item.service_id IS NOT NULL THEN
      SELECT s.*
      INTO v_service
      FROM public.services s
      WHERE s.id = v_svc_item.service_id
        AND s.business_id = v_business_id
        AND s.is_active IS TRUE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Choose active services only.'
          USING ERRCODE = '22023';
      END IF;
    END IF;

    v_service_subtotal := v_service_subtotal
      + (
        COALESCE(v_service.price, COALESCE(v_svc_item.price, 0))
        * GREATEST(COALESCE(v_svc_item.qty, 1), 1)
      );
  END LOOP;

  FOR v_prod_item IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_products, '[]'::jsonb)) AS x(
      product_id uuid,
      name text,
      price numeric,
      qty int,
      staff_id uuid,
      discount numeric,
      snapshot jsonb
    )
  LOOP
    IF p_action = 'preview' THEN
      SELECT p.*
      INTO v_product
      FROM public.products p
      WHERE p.id = v_prod_item.product_id
        AND p.business_id = v_business_id
        AND p.is_active IS TRUE;
    ELSE
      SELECT p.*
      INTO v_product
      FROM public.products p
      WHERE p.id = v_prod_item.product_id
        AND p.business_id = v_business_id
        AND p.is_active IS TRUE
      FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Choose active products only.'
        USING ERRCODE = '22023';
    END IF;

    IF p_action <> 'preview'
      AND COALESCE(v_product.stock_quantity, 0) < GREATEST(COALESCE(v_prod_item.qty, 1), 1) THEN
      RAISE EXCEPTION 'Insufficient stock for %. Available: %, requested: %.',
        COALESCE(v_product.name_en, 'product'),
        COALESCE(v_product.stock_quantity, 0),
        GREATEST(COALESCE(v_prod_item.qty, 1), 1)
        USING ERRCODE = '22023';
    END IF;

    v_product_subtotal := v_product_subtotal
      + (COALESCE(v_product.price, 0) * GREATEST(COALESCE(v_prod_item.qty, 1), 1));
  END LOOP;

  v_subtotal := v_service_subtotal + v_product_subtotal;

  FOR v_pkg_item IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_package_usage, '[]'::jsonb)) AS x(
      benefit_id uuid,
      service_id uuid,
      qty int
    )
  LOOP
    IF p_action = 'preview' THEN
      SELECT cpb.*, cp.business_id, cp.status AS package_status, s.price AS service_price
      INTO v_benefit
      FROM public.customer_package_benefits cpb
      JOIN public.customer_packages cp ON cp.id = cpb.customer_package_id
      LEFT JOIN public.services s ON s.id = COALESCE(v_pkg_item.service_id, cpb.service_id)
      WHERE cpb.id = v_pkg_item.benefit_id
        AND cp.business_id = v_business_id;
    ELSE
      SELECT cpb.*, cp.business_id, cp.status AS package_status, s.price AS service_price
      INTO v_benefit
      FROM public.customer_package_benefits cpb
      JOIN public.customer_packages cp ON cp.id = cpb.customer_package_id
      LEFT JOIN public.services s ON s.id = COALESCE(v_pkg_item.service_id, cpb.service_id)
      WHERE cpb.id = v_pkg_item.benefit_id
        AND cp.business_id = v_business_id
      FOR UPDATE OF cpb;
    END IF;

    IF NOT FOUND OR v_benefit.package_status <> 'active' THEN
      RAISE EXCEPTION 'Package benefit is not active.'
        USING ERRCODE = '22023';
    END IF;

    IF COALESCE(v_benefit.remaining_quantity, 0) < GREATEST(COALESCE(v_pkg_item.qty, 1), 1) THEN
      RAISE EXCEPTION 'Package benefit has insufficient remaining sessions.'
        USING ERRCODE = '22023';
    END IF;

    v_package_amount := v_package_amount
      + (COALESCE(v_benefit.service_price, 0) * GREATEST(COALESCE(v_pkg_item.qty, 1), 1));
  END LOOP;

  v_discount_amount := LEAST(v_discount_amount, GREATEST(v_subtotal - v_package_amount, 0));
  v_membership_amount := LEAST(v_membership_amount, GREATEST(v_subtotal - v_package_amount - v_discount_amount, 0));

  FOR v_payment_item IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb)) AS payment(value)
  LOOP
    IF (v_payment_item.value ? 'wallet_id') THEN
      v_wallet_id := (v_payment_item.value->>'wallet_id')::uuid;
    END IF;
    IF (v_payment_item.value ? 'wallet_code') THEN
      v_wallet_code := v_payment_item.value->>'wallet_code';
    END IF;
  END LOOP;

  IF v_wallet_amount > 0 THEN
    IF v_wallet_id IS NULL AND NULLIF(v_wallet_code, '') IS NULL THEN
      RAISE EXCEPTION 'Wallet checkout requires a wallet reference.'
        USING ERRCODE = '22023';
    END IF;

    IF p_action = 'preview' THEN
      SELECT w.*
      INTO v_wallet
      FROM public.wallets w
      WHERE w.business_id = v_business_id
        AND (w.id = v_wallet_id OR lower(w.code) = lower(v_wallet_code))
        AND w.status = 'active'
        AND CURRENT_DATE BETWEEN w.starts_at AND w.ends_at
      LIMIT 1;
    ELSE
      SELECT w.*
      INTO v_wallet
      FROM public.wallets w
      WHERE w.business_id = v_business_id
        AND (w.id = v_wallet_id OR lower(w.code) = lower(v_wallet_code))
        AND w.status = 'active'
        AND CURRENT_DATE BETWEEN w.starts_at AND w.ends_at
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Wallet voucher not found or inactive.'
        USING ERRCODE = '22023';
    END IF;

    IF COALESCE(v_wallet.amount, 0) < v_wallet_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance.'
        USING ERRCODE = '22023';
    END IF;

    SELECT uw.*
    INTO v_user_wallet
    FROM public.user_wallets uw
    WHERE uw.wallet_id = v_wallet.id
    ORDER BY uw.created_at DESC
    LIMIT 1;

    IF FOUND AND COALESCE(v_user_wallet.commission_percent, 0) > 0 THEN
      v_commission_amount := ROUND(v_wallet_amount * COALESCE(v_user_wallet.commission_percent, 0) / 100, 2);
    END IF;
  END IF;

  v_wallet_amount := LEAST(v_wallet_amount, GREATEST(v_subtotal - v_package_amount - v_discount_amount - v_membership_amount, 0));
  v_total_amount := v_subtotal
    - v_package_amount
    - v_discount_amount
    - v_membership_amount
    - v_wallet_amount
    + v_tax
    + v_tips;

  IF v_total_amount < 0 THEN
    v_total_amount := 0;
  END IF;

  IF p_action <> 'preview' THEN
    SELECT COALESCE(SUM(COALESCE((val->>'amount')::numeric, 0)), 0)
    INTO v_payments_sum
    FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb)) AS val
    WHERE lower(COALESCE(val->>'method', '')) <> 'wallet_reference';

    IF abs(v_payments_sum - v_total_amount) > 0.01 THEN
      RAISE EXCEPTION 'Total payments (%) must equal transaction total (%).', v_payments_sum, v_total_amount
        USING ERRCODE = '22023';
    END IF;
  END IF;

  v_customer_snapshot := jsonb_build_object(
    'customer_id', v_customer.id,
    'name', COALESCE(v_customer.full_name, ''),
    'phone', COALESCE(v_customer.phone, ''),
    'whatsapp_phone', COALESCE(v_customer.whatsapp_phone, '')
  );

  v_payment_snapshot := jsonb_build_object(
    'payments', COALESCE(p_payments, '[]'::jsonb),
    'total', v_total_amount,
    'wallet_amount', v_wallet_amount,
    'tips_amount', v_tips
  );

  v_discount_snapshot := jsonb_build_object(
    'discount_amount', v_discount_amount,
    'membership_amount', v_membership_amount,
    'package_amount', v_package_amount,
    'wallet_amount', v_wallet_amount,
    'source', 'server_capped_amounts'
  );

  v_source_snapshot := jsonb_build_object(
    'booking_id', p_booking_id,
    'queue_ticket_id', p_queue_ticket_id,
    'booking_status', CASE WHEN p_booking_id IS NULL THEN NULL ELSE v_booking.status END,
    'queue_status', CASE WHEN p_queue_ticket_id IS NULL THEN NULL ELSE v_ticket.status END
  );

  IF p_action IN ('create', 'complete') THEN
    PERFORM set_config('casa.checkout_mutation', 'true', true);

    v_receipt_number := casa_private.next_receipt_number(v_business_id, CURRENT_DATE);
    v_payment_status := 'completed';

    INSERT INTO public.checkout_transactions (
      business_id,
      booking_id,
      queue_ticket_id,
      customer_id,
      subtotal,
      discount_amount,
      wallet_amount,
      package_amount,
      membership_amount,
      tips_amount,
      tax_amount,
      total_amount,
      receipt_number,
      service_status,
      payment_status,
      payments,
      notes,
      created_by,
      cashier_session_id,
      transaction_type,
      customer_snapshot,
      payment_snapshot,
      discount_snapshot,
      source_snapshot
    )
    VALUES (
      v_business_id,
      p_booking_id,
      p_queue_ticket_id,
      v_customer_id,
      v_subtotal,
      v_discount_amount,
      v_wallet_amount,
      v_package_amount,
      v_membership_amount,
      v_tips,
      v_tax,
      v_total_amount,
      v_receipt_number,
      'completed',
      v_payment_status,
      COALESCE(p_payments, '[]'::jsonb),
      p_notes,
      COALESCE(p_created_by, (SELECT auth.uid())),
      v_cashier_session_id,
      'sale',
      v_customer_snapshot,
      v_payment_snapshot,
      v_discount_snapshot,
      v_source_snapshot
    )
    RETURNING id INTO v_transaction_id;

    FOR v_svc_item IN
      SELECT *
      FROM jsonb_to_recordset(COALESCE(p_services, '[]'::jsonb)) AS x(
        service_id uuid,
        name text,
        price numeric,
        qty int,
        staff_id uuid,
        discount numeric,
        resource_id uuid,
        snapshot jsonb
      )
    LOOP
      v_service := NULL;
      IF v_svc_item.service_id IS NOT NULL THEN
        SELECT s.*
        INTO v_service
        FROM public.services s
        WHERE s.id = v_svc_item.service_id
          AND s.business_id = v_business_id;
      END IF;

      SELECT jsonb_build_object(
        'barber_id', b.id,
        'name', COALESCE(b.name_en, ''),
        'name_ar', COALESCE(b.name_ar, ''),
        'role', 'professional'
      )
      INTO v_staff_snapshot
      FROM public.barbers b
      WHERE b.id = v_svc_item.staff_id;

      INSERT INTO public.checkout_transaction_items (
        transaction_id,
        business_id,
        type,
        resource_id,
        staff_id,
        name,
        qty,
        unit_price,
        discount,
        total,
        service_snapshot,
        staff_snapshot
      )
      VALUES (
        v_transaction_id,
        v_business_id,
        'service',
        v_svc_item.resource_id,
        v_svc_item.staff_id,
        COALESCE(v_service.title_en, v_svc_item.name, 'Service'),
        GREATEST(COALESCE(v_svc_item.qty, 1), 1),
        COALESCE(v_service.price, COALESCE(v_svc_item.price, 0)),
        GREATEST(COALESCE(v_svc_item.discount, 0), 0),
        GREATEST((COALESCE(v_service.price, COALESCE(v_svc_item.price, 0)) - GREATEST(COALESCE(v_svc_item.discount, 0), 0)), 0)
          * GREATEST(COALESCE(v_svc_item.qty, 1), 1),
        COALESCE(v_svc_item.snapshot, '{}'::jsonb)
          || jsonb_build_object(
            'service_id', v_svc_item.service_id,
            'name_en', COALESCE(v_service.title_en, v_svc_item.name, ''),
            'name_ar', COALESCE(v_service.title_ar, ''),
            'price', COALESCE(v_service.price, COALESCE(v_svc_item.price, 0)),
            'duration_minutes', COALESCE(v_service.duration_minutes, NULL)
          ),
        COALESCE(v_staff_snapshot, '{}'::jsonb)
      );
    END LOOP;

    FOR v_prod_item IN
      SELECT *
      FROM jsonb_to_recordset(COALESCE(p_products, '[]'::jsonb)) AS x(
        product_id uuid,
        name text,
        price numeric,
        qty int,
        staff_id uuid,
        discount numeric,
        snapshot jsonb
      )
    LOOP
      SELECT p.*
      INTO v_product
      FROM public.products p
      WHERE p.id = v_prod_item.product_id
        AND p.business_id = v_business_id
      FOR UPDATE;

      UPDATE public.products p
      SET stock_quantity = p.stock_quantity - GREATEST(COALESCE(v_prod_item.qty, 1), 1)
      WHERE p.id = v_product.id;

      INSERT INTO public.product_inventory_movements (
        business_id,
        product_id,
        checkout_transaction_id,
        qty_delta,
        movement_type,
        created_by
      )
      VALUES (
        v_business_id,
        v_product.id,
        v_transaction_id,
        -GREATEST(COALESCE(v_prod_item.qty, 1), 1),
        'sale',
        COALESCE(p_created_by, (SELECT auth.uid()))
      );

      INSERT INTO public.checkout_transaction_items (
        transaction_id,
        business_id,
        type,
        resource_id,
        staff_id,
        name,
        qty,
        unit_price,
        discount,
        total,
        product_snapshot
      )
      VALUES (
        v_transaction_id,
        v_business_id,
        'product',
        v_product.id,
        v_prod_item.staff_id,
        COALESCE(v_product.name_en, v_prod_item.name, 'Product'),
        GREATEST(COALESCE(v_prod_item.qty, 1), 1),
        COALESCE(v_product.price, 0),
        GREATEST(COALESCE(v_prod_item.discount, 0), 0),
        GREATEST((COALESCE(v_product.price, 0) - GREATEST(COALESCE(v_prod_item.discount, 0), 0)), 0)
          * GREATEST(COALESCE(v_prod_item.qty, 1), 1),
        COALESCE(v_prod_item.snapshot, '{}'::jsonb)
          || jsonb_build_object(
          'product_id', v_product.id,
          'name_en', COALESCE(v_product.name_en, ''),
          'name_ar', COALESCE(v_product.name_ar, ''),
          'price', COALESCE(v_product.price, 0)
        )
      );
    END LOOP;

    FOR v_pkg_item IN
      SELECT *
      FROM jsonb_to_recordset(COALESCE(p_package_usage, '[]'::jsonb)) AS x(
        benefit_id uuid,
        service_id uuid,
        qty int
      )
    LOOP
      SELECT cpb.*, cp.business_id, cp.id AS package_id, cp.status AS package_status, s.price AS service_price
      INTO v_benefit
      FROM public.customer_package_benefits cpb
      JOIN public.customer_packages cp ON cp.id = cpb.customer_package_id
      LEFT JOIN public.services s ON s.id = COALESCE(v_pkg_item.service_id, cpb.service_id)
      WHERE cpb.id = v_pkg_item.benefit_id
        AND cp.business_id = v_business_id
      FOR UPDATE OF cpb;

      UPDATE public.customer_package_benefits cpb
      SET remaining_quantity = cpb.remaining_quantity - GREATEST(COALESCE(v_pkg_item.qty, 1), 1),
          updated_at = now()
      WHERE cpb.id = v_benefit.id;

      IF NOT EXISTS (
        SELECT 1
        FROM public.customer_package_benefits cpb
        WHERE cpb.customer_package_id = v_benefit.customer_package_id
          AND cpb.id <> v_benefit.id
          AND cpb.remaining_quantity > 0
      )
      AND (v_benefit.remaining_quantity - GREATEST(COALESCE(v_pkg_item.qty, 1), 1)) <= 0 THEN
        UPDATE public.customer_packages cp
        SET status = 'completed'
        WHERE cp.id = v_benefit.customer_package_id;
      END IF;

      INSERT INTO public.checkout_transaction_items (
        transaction_id,
        business_id,
        type,
        resource_id,
        name,
        qty,
        unit_price,
        discount,
        total,
        service_snapshot
      )
      VALUES (
        v_transaction_id,
        v_business_id,
        'package',
        v_benefit.id,
        'Package usage',
        GREATEST(COALESCE(v_pkg_item.qty, 1), 1),
        COALESCE(v_benefit.service_price, 0),
        0,
        COALESCE(v_benefit.service_price, 0) * GREATEST(COALESCE(v_pkg_item.qty, 1), 1),
        jsonb_build_object(
          'benefit_id', v_benefit.id,
          'customer_package_id', v_benefit.customer_package_id,
          'service_id', v_benefit.service_id,
          'remaining_before', v_benefit.remaining_quantity,
          'used_quantity', GREATEST(COALESCE(v_pkg_item.qty, 1), 1)
        )
      );
    END LOOP;

    IF v_wallet_amount > 0 THEN
      UPDATE public.wallets w
      SET amount = w.amount - v_wallet_amount,
          status = CASE WHEN (w.amount - v_wallet_amount) <= 0 THEN 'depleted' ELSE w.status END,
          updated_at = now()
      WHERE w.id = v_wallet.id;
    END IF;

    IF v_tips > 0 THEN
      INSERT INTO public.checkout_transaction_items (
        transaction_id,
        business_id,
        type,
        name,
        qty,
        unit_price,
        total,
        tip_amount
      )
      VALUES (
        v_transaction_id,
        v_business_id,
        'tip',
        'Tip allocation',
        1,
        v_tips,
        v_tips,
        v_tips
      );
    END IF;

    INSERT INTO public.financial_ledger_entries (
      business_id,
      checkout_transaction_id,
      entry_type,
      amount,
      direction,
      category
    )
    SELECT
      v_business_id,
      v_transaction_id,
      'checkout_' || cti.type,
      SUM(cti.total),
      'credit',
      CASE cti.type
        WHEN 'service' THEN 'service'
        WHEN 'product' THEN 'product'
        WHEN 'tip' THEN 'tip'
        WHEN 'tax' THEN 'tax'
        WHEN 'package' THEN 'package'
        ELSE cti.type
      END
    FROM public.checkout_transaction_items cti
    WHERE cti.transaction_id = v_transaction_id
      AND cti.type IN ('service', 'product', 'tip', 'tax', 'package')
      AND cti.total > 0
    GROUP BY cti.type;

    IF v_discount_amount > 0 THEN
      INSERT INTO public.financial_ledger_entries (business_id, checkout_transaction_id, entry_type, amount, direction, category)
      VALUES (v_business_id, v_transaction_id, 'checkout_discount', v_discount_amount, 'debit', 'discount');
    END IF;

    IF v_membership_amount > 0 THEN
      INSERT INTO public.financial_ledger_entries (business_id, checkout_transaction_id, entry_type, amount, direction, category)
      VALUES (v_business_id, v_transaction_id, 'membership_discount', v_membership_amount, 'debit', 'membership');
    END IF;

    IF v_wallet_amount > 0 THEN
      INSERT INTO public.financial_ledger_entries (business_id, checkout_transaction_id, entry_type, amount, direction, category)
      VALUES (v_business_id, v_transaction_id, 'wallet_redemption', v_wallet_amount, 'debit', 'wallet');
    END IF;

    IF v_commission_amount > 0 THEN
      INSERT INTO public.financial_ledger_entries (business_id, checkout_transaction_id, entry_type, amount, direction, category)
      VALUES (v_business_id, v_transaction_id, 'wallet_commission', v_commission_amount, 'debit', 'commission');
    END IF;

    IF v_tax > 0 THEN
      INSERT INTO public.financial_ledger_entries (business_id, checkout_transaction_id, entry_type, amount, direction, category)
      VALUES (v_business_id, v_transaction_id, 'checkout_tax', v_tax, 'credit', 'tax');
    END IF;

    UPDATE public.cashier_sessions cs
    SET expected_cash = casa_private.cashier_session_expected_cash(cs.id)
    WHERE cs.id = v_cashier_session_id;

    IF p_booking_id IS NOT NULL THEN
      UPDATE public.bookings b
      SET
        checkout_status = 'completed',
        checkout_transaction_id = v_transaction_id,
        checked_out_at = now(),
        checked_out_by = COALESCE(p_created_by, (SELECT auth.uid())),
        status = 'completed'
      WHERE b.id = p_booking_id;
    END IF;

    IF p_queue_ticket_id IS NOT NULL THEN
      UPDATE public.queue_tickets qt
      SET
        status = 'completed',
        completed_at = now(),
        checkout_completed_at = now(),
        checkout_transaction_id = v_transaction_id
      WHERE qt.id = p_queue_ticket_id;
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'action', p_action,
    'receipt_number', COALESCE(v_receipt_number, 'PREVIEW-ONLY'),
    'subtotal', v_subtotal,
    'discount_amount', v_discount_amount + v_membership_amount,
    'wallet_amount', v_wallet_amount,
    'package_amount', v_package_amount,
    'tax_amount', v_tax,
    'tips_amount', v_tips,
    'total_amount', v_total_amount,
    'transaction_id', v_transaction_id,
    'cashier_session_id', v_cashier_session_id
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.checkout_transaction(text, uuid, uuid, uuid, jsonb, jsonb, numeric, numeric, jsonb, numeric, numeric, numeric, jsonb, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_transaction(text, uuid, uuid, uuid, jsonb, jsonb, numeric, numeric, jsonb, numeric, numeric, numeric, jsonb, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.refund_checkout_transaction(
  p_original_transaction_id uuid,
  p_refund_amount numeric DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_refund_products jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_original public.checkout_transactions%ROWTYPE;
  v_refund_amount numeric(10,2);
  v_new_refunded numeric(10,2);
  v_refund_transaction_id uuid;
  v_receipt_number text;
  v_cashier_session_id uuid;
  v_item record;
  v_product public.products%ROWTYPE;
BEGIN
  SELECT *
  INTO v_original
  FROM public.checkout_transactions ct
  WHERE ct.id = p_original_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout transaction not found.'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM casa_private.assert_checkout_operator(v_original.business_id);

  IF v_original.transaction_type <> 'sale' OR v_original.payment_status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed sale transactions can be refunded.'
      USING ERRCODE = '22023';
  END IF;

  IF v_original.refund_status = 'full' THEN
    RAISE EXCEPTION 'Transaction is already fully refunded.'
      USING ERRCODE = '22023';
  END IF;

  v_refund_amount := COALESCE(p_refund_amount, v_original.total_amount - v_original.refunded_amount);

  IF v_refund_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive.'
      USING ERRCODE = '22023';
  END IF;

  IF v_refund_amount > (v_original.total_amount - v_original.refunded_amount) THEN
    RAISE EXCEPTION 'Refund cannot exceed remaining paid amount.'
      USING ERRCODE = '22023';
  END IF;

  SELECT cs.id
  INTO v_cashier_session_id
  FROM public.cashier_sessions cs
  WHERE cs.business_id = v_original.business_id
    AND cs.opened_by = (SELECT auth.uid())
    AND cs.status = 'open'
  ORDER BY cs.opened_at DESC
  LIMIT 1;

  IF v_cashier_session_id IS NULL THEN
    RAISE EXCEPTION 'No active cashier session. Open a cashier session before refund.'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('casa.checkout_mutation', 'true', true);

  v_receipt_number := casa_private.next_receipt_number(v_original.business_id, CURRENT_DATE);

  INSERT INTO public.checkout_transactions (
    business_id,
    booking_id,
    queue_ticket_id,
    customer_id,
    subtotal,
    discount_amount,
    wallet_amount,
    package_amount,
    membership_amount,
    tips_amount,
    tax_amount,
    total_amount,
    receipt_number,
    service_status,
    payment_status,
    payments,
    notes,
    created_by,
    cashier_session_id,
    original_transaction_id,
    transaction_type,
    customer_snapshot,
    payment_snapshot,
    discount_snapshot,
    source_snapshot,
    refund_reason
  )
  VALUES (
    v_original.business_id,
    v_original.booking_id,
    v_original.queue_ticket_id,
    v_original.customer_id,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    v_refund_amount,
    v_receipt_number,
    'refunded',
    'refunded',
    jsonb_build_array(jsonb_build_object('method', 'refund', 'amount', v_refund_amount)),
    p_reason,
    (SELECT auth.uid()),
    v_cashier_session_id,
    v_original.id,
    'refund',
    v_original.customer_snapshot,
    jsonb_build_object('refund_amount', v_refund_amount, 'original_receipt_number', v_original.receipt_number),
    v_original.discount_snapshot,
    jsonb_build_object('original_transaction_id', v_original.id, 'original_receipt_number', v_original.receipt_number),
    p_reason
  )
  RETURNING id INTO v_refund_transaction_id;

  INSERT INTO public.financial_ledger_entries (business_id, checkout_transaction_id, entry_type, amount, direction, category)
  VALUES (v_original.business_id, v_refund_transaction_id, 'refund_reversal', v_refund_amount, 'debit', 'refund');

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_refund_products, '[]'::jsonb)) AS x(product_id uuid, qty int)
  LOOP
    SELECT *
    INTO v_product
    FROM public.products p
    WHERE p.id = v_item.product_id
      AND p.business_id = v_original.business_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Refund product not found.'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.products p
    SET stock_quantity = p.stock_quantity + GREATEST(COALESCE(v_item.qty, 1), 1)
    WHERE p.id = v_product.id;

    INSERT INTO public.product_inventory_movements (
      business_id,
      product_id,
      checkout_transaction_id,
      qty_delta,
      movement_type,
      created_by
    )
    VALUES (
      v_original.business_id,
      v_product.id,
      v_refund_transaction_id,
      GREATEST(COALESCE(v_item.qty, 1), 1),
      'refund',
      (SELECT auth.uid())
    );
  END LOOP;

  v_new_refunded := v_original.refunded_amount + v_refund_amount;

  UPDATE public.checkout_transactions ct
  SET refunded_amount = v_new_refunded,
      refund_status = CASE
        WHEN v_new_refunded >= v_original.total_amount THEN 'full'
        ELSE 'partial'
      END
  WHERE ct.id = v_original.id;

  UPDATE public.cashier_sessions cs
  SET expected_cash = casa_private.cashier_session_expected_cash(cs.id)
  WHERE cs.id = v_cashier_session_id;

  RETURN jsonb_build_object(
    'refund_transaction_id', v_refund_transaction_id,
    'original_transaction_id', v_original.id,
    'refund_receipt_number', v_receipt_number,
    'refund_amount', v_refund_amount,
    'refund_status', CASE WHEN v_new_refunded >= v_original.total_amount THEN 'full' ELSE 'partial' END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_checkout_transaction(uuid, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_checkout_transaction(uuid, numeric, text, jsonb) TO authenticated;
