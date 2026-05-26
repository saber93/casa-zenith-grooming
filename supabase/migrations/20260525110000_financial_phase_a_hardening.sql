-- Migration: 20260525110000_financial_phase_a_hardening.sql
-- Purpose: Phase A financial infrastructure hardening.

CREATE SCHEMA IF NOT EXISTS casa_private;

REVOKE ALL ON SCHEMA casa_private FROM PUBLIC, anon, authenticated;

-- 1. Concurrency-safe daily receipt numbering.
CREATE TABLE IF NOT EXISTS public.checkout_receipt_counters (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  receipt_date date NOT NULL,
  last_sequence integer NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, receipt_date)
);

ALTER TABLE public.checkout_receipt_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read checkout receipt counters" ON public.checkout_receipt_counters;
CREATE POLICY "Admins can read checkout receipt counters"
  ON public.checkout_receipt_counters FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION casa_private.next_receipt_number(
  p_business_id uuid,
  p_receipt_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_next_sequence integer;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'Business is required for receipt numbering.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.checkout_receipt_counters (business_id, receipt_date, last_sequence)
  VALUES (p_business_id, p_receipt_date, 1)
  ON CONFLICT (business_id, receipt_date)
  DO UPDATE
    SET last_sequence = public.checkout_receipt_counters.last_sequence + 1,
        updated_at = now()
  RETURNING last_sequence INTO v_next_sequence;

  RETURN 'CASA-' || to_char(p_receipt_date, 'YYYYMMDD') || '-' || lpad(v_next_sequence::text, 6, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.next_receipt_number(uuid, date) FROM PUBLIC, anon, authenticated;

-- 2. Minimal financial ledger foundation.
CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  checkout_transaction_id uuid REFERENCES public.checkout_transactions(id) ON DELETE SET NULL,
  entry_type text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  category text NOT NULL CHECK (
    category IN ('service', 'product', 'wallet', 'tip', 'commission', 'refund', 'tax')
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_business_created
  ON public.financial_ledger_entries(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_checkout_transaction
  ON public.financial_ledger_entries(checkout_transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_category
  ON public.financial_ledger_entries(category);

ALTER TABLE public.financial_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read financial ledger entries" ON public.financial_ledger_entries;
CREATE POLICY "Staff can read financial ledger entries"
  ON public.financial_ledger_entries FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = financial_ledger_entries.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

-- 3. Cashier session hardening and RPCs.
CREATE UNIQUE INDEX IF NOT EXISTS cashier_sessions_one_open_per_user_business
  ON public.cashier_sessions(business_id, opened_by)
  WHERE status = 'open';

CREATE OR REPLACE FUNCTION casa_private.assert_checkout_operator(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT ur.role::text
  INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = (SELECT auth.uid());

  IF v_role IN ('admin', 'reception', 'cashier') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = (SELECT auth.uid())
      AND bm.role IN ('business_owner', 'business_manager', 'staff')
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Restricted access: Reception or Cashier permissions required.'
    USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.assert_checkout_operator(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.cashier_session_expected_cash(p_session_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(cs.opening_cash, 0) + COALESCE(SUM(COALESCE((payment.value->>'amount')::numeric, 0)), 0)
  FROM public.cashier_sessions cs
  LEFT JOIN public.checkout_transactions ct
    ON ct.cashier_session_id = cs.id
   AND ct.payment_status = 'completed'
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(ct.payments, '[]'::jsonb)) AS payment(value)
    ON lower(COALESCE(payment.value->>'method', '')) = 'cash'
  WHERE cs.id = p_session_id
  GROUP BY cs.id, cs.opening_cash
$$;

REVOKE EXECUTE ON FUNCTION casa_private.cashier_session_expected_cash(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_active_cashier_session(
  p_business_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business_id uuid := COALESCE(p_business_id, public.default_business_id());
  v_session public.cashier_sessions%ROWTYPE;
  v_expected_cash numeric(10,2);
BEGIN
  PERFORM casa_private.assert_checkout_operator(v_business_id);

  SELECT *
  INTO v_session
  FROM public.cashier_sessions cs
  WHERE cs.business_id = v_business_id
    AND cs.opened_by = (SELECT auth.uid())
    AND cs.status = 'open'
  ORDER BY cs.opened_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('active', false);
  END IF;

  SELECT casa_private.cashier_session_expected_cash(v_session.id)
  INTO v_expected_cash;

  RETURN jsonb_build_object(
    'active', true,
    'id', v_session.id,
    'business_id', v_session.business_id,
    'opened_at', v_session.opened_at,
    'opening_cash', v_session.opening_cash,
    'expected_cash', COALESCE(v_expected_cash, v_session.opening_cash),
    'status', v_session.status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_cashier_session(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_cashier_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.open_cashier_session(
  p_business_id uuid DEFAULT NULL,
  p_opening_cash numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business_id uuid := COALESCE(p_business_id, public.default_business_id());
  v_existing public.cashier_sessions%ROWTYPE;
  v_inserted public.cashier_sessions%ROWTYPE;
BEGIN
  PERFORM casa_private.assert_checkout_operator(v_business_id);

  IF COALESCE(p_opening_cash, 0) < 0 THEN
    RAISE EXCEPTION 'Opening cash cannot be negative.'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.cashier_sessions cs
  WHERE cs.business_id = v_business_id
    AND cs.opened_by = (SELECT auth.uid())
    AND cs.status = 'open'
  ORDER BY cs.opened_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'active', true,
      'id', v_existing.id,
      'business_id', v_existing.business_id,
      'opened_at', v_existing.opened_at,
      'opening_cash', v_existing.opening_cash,
      'expected_cash', casa_private.cashier_session_expected_cash(v_existing.id),
      'status', v_existing.status
    );
  END IF;

  INSERT INTO public.cashier_sessions (business_id, opened_by, opening_cash, expected_cash, notes)
  VALUES (
    v_business_id,
    (SELECT auth.uid()),
    COALESCE(p_opening_cash, 0),
    COALESCE(p_opening_cash, 0),
    p_notes
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'active', true,
    'id', v_inserted.id,
    'business_id', v_inserted.business_id,
    'opened_at', v_inserted.opened_at,
    'opening_cash', v_inserted.opening_cash,
    'expected_cash', v_inserted.expected_cash,
    'status', v_inserted.status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.open_cashier_session(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_cashier_session(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_cashier_session(
  p_session_id uuid,
  p_actual_cash numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.cashier_sessions%ROWTYPE;
  v_expected_cash numeric(10,2);
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Cashier session is required.'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(p_actual_cash, 0) < 0 THEN
    RAISE EXCEPTION 'Actual cash cannot be negative.'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_session
  FROM public.cashier_sessions cs
  WHERE cs.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cashier session not found.'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM casa_private.assert_checkout_operator(v_session.business_id);

  IF v_session.status <> 'open' THEN
    RAISE EXCEPTION 'Cashier session is already closed.'
      USING ERRCODE = '22023';
  END IF;

  IF v_session.opened_by <> (SELECT auth.uid())
     AND NOT public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only the opening cashier or an admin can close this cashier session.'
      USING ERRCODE = '42501';
  END IF;

  SELECT casa_private.cashier_session_expected_cash(v_session.id)
  INTO v_expected_cash;

  UPDATE public.cashier_sessions cs
  SET
    expected_cash = COALESCE(v_expected_cash, cs.opening_cash),
    actual_cash = COALESCE(p_actual_cash, 0),
    variance = COALESCE(p_actual_cash, 0) - COALESCE(v_expected_cash, cs.opening_cash),
    closed_by = (SELECT auth.uid()),
    closed_at = now(),
    status = 'closed',
    notes = COALESCE(NULLIF(p_notes, ''), cs.notes)
  WHERE cs.id = v_session.id
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'active', false,
    'id', v_session.id,
    'business_id', v_session.business_id,
    'opened_at', v_session.opened_at,
    'closed_at', v_session.closed_at,
    'opening_cash', v_session.opening_cash,
    'expected_cash', v_session.expected_cash,
    'actual_cash', v_session.actual_cash,
    'variance', v_session.variance,
    'status', v_session.status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_cashier_session(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_cashier_session(uuid, numeric, text) TO authenticated;

-- 4. Replace checkout_transaction with cashier enforcement, receipt counter, and ledger writes.
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
  v_customer_id uuid := p_customer_id;
  v_business_id uuid;
  v_receipt_number text;
  v_transaction_id uuid;
  v_cashier_session_id uuid;
  v_package_amount numeric(10,2) := 0;
  v_payment_status text;
  v_svc_subtotal record;
  v_prod_subtotal record;
  v_prod_inv record;
  v_pkg_benefit record;
  v_svc_item record;
  v_prod_item record;
  v_subtotal numeric(10,2) := 0;
  v_total_amount numeric(10,2) := 0;
  v_payments_sum numeric(10,2) := 0;
  v_result jsonb;
BEGIN
  IF p_action NOT IN ('preview', 'create', 'complete', 'refund') THEN
    RAISE EXCEPTION 'Invalid transaction action.'
      USING ERRCODE = '22023';
  END IF;

  IF p_action = 'refund' THEN
    RAISE EXCEPTION 'Refund processing is reserved for the next financial hardening phase.'
      USING ERRCODE = '0A000';
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

    IF v_customer_id IS NULL THEN
      v_customer_id := v_booking.customer_id;
    END IF;
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

    IF v_business_id IS NULL THEN
      v_business_id := v_ticket.business_id;
    END IF;

    IF v_customer_id IS NULL THEN
      v_customer_id := v_ticket.customer_id;
    END IF;
  END IF;

  IF v_business_id IS NULL THEN
    v_business_id := public.default_business_id();
  END IF;

  PERFORM casa_private.assert_checkout_operator(v_business_id);

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'A customer profile is required to execute a checkout transaction.'
      USING ERRCODE = '22023';
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

  FOR v_svc_subtotal IN (
    SELECT *
    FROM jsonb_to_recordset(p_services) AS x(price numeric, qty int)
  ) LOOP
    v_subtotal := v_subtotal + (COALESCE(v_svc_subtotal.price, 0) * COALESCE(v_svc_subtotal.qty, 1));
  END LOOP;

  FOR v_prod_subtotal IN (
    SELECT *
    FROM jsonb_to_recordset(p_products) AS x(price numeric, qty int)
  ) LOOP
    v_subtotal := v_subtotal + (COALESCE(v_prod_subtotal.price, 0) * COALESCE(v_prod_subtotal.qty, 1));
  END LOOP;

  SELECT COALESCE(SUM(COALESCE((x.qty * s.price), 0)), 0)
  INTO v_package_amount
  FROM jsonb_to_recordset(p_package_usage) AS x(service_id uuid, qty int)
  JOIN public.services s ON s.id = x.service_id;

  v_total_amount := v_subtotal
    - COALESCE(p_discount, 0)
    - COALESCE(p_membership_discount, 0)
    - COALESCE(p_wallet_amount, 0)
    - COALESCE(v_package_amount, 0)
    + COALESCE(p_tax, 0)
    + COALESCE(p_tips, 0);

  IF v_total_amount < 0 THEN
    v_total_amount := 0;
  END IF;

  IF p_action <> 'preview' THEN
    SELECT COALESCE(SUM(COALESCE((val->>'amount')::numeric, 0)), 0)
    INTO v_payments_sum
    FROM jsonb_array_elements(p_payments) AS val;

    IF abs(v_payments_sum - v_total_amount) > 0.01 THEN
      RAISE EXCEPTION 'Total payments (%) must equal transaction total (%).', v_payments_sum, v_total_amount
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_action IN ('create', 'complete') THEN
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
      cashier_session_id
    )
    VALUES (
      v_business_id,
      p_booking_id,
      p_queue_ticket_id,
      v_customer_id,
      v_subtotal,
      COALESCE(p_discount, 0),
      COALESCE(p_wallet_amount, 0),
      COALESCE(v_package_amount, 0),
      COALESCE(p_membership_discount, 0),
      COALESCE(p_tips, 0),
      COALESCE(p_tax, 0),
      v_total_amount,
      v_receipt_number,
      'completed',
      v_payment_status,
      p_payments,
      p_notes,
      COALESCE(p_created_by, (SELECT auth.uid())),
      v_cashier_session_id
    )
    RETURNING id INTO v_transaction_id;

    FOR v_prod_inv IN (
      SELECT *
      FROM jsonb_to_recordset(p_products) AS x(product_id uuid, qty int)
    ) LOOP
      IF EXISTS (SELECT 1 FROM public.products p WHERE p.id = v_prod_inv.product_id) THEN
        UPDATE public.products p
        SET stock_quantity = p.stock_quantity - COALESCE(v_prod_inv.qty, 1)
        WHERE p.id = v_prod_inv.product_id;
      END IF;
    END LOOP;

    FOR v_pkg_benefit IN (
      SELECT *
      FROM jsonb_to_recordset(p_package_usage) AS x(benefit_id uuid, qty int)
    ) LOOP
      UPDATE public.customer_package_benefits cpb
      SET remaining_quantity = cpb.remaining_quantity - COALESCE(v_pkg_benefit.qty, 1),
          updated_at = now()
      WHERE cpb.id = v_pkg_benefit.benefit_id;
    END LOOP;

    FOR v_svc_item IN (
      SELECT *
      FROM jsonb_to_recordset(p_services) AS x(
        service_id uuid,
        name text,
        price numeric,
        qty int,
        staff_id uuid,
        discount numeric,
        resource_id uuid,
        snapshot jsonb
      )
    ) LOOP
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
        service_snapshot
      )
      VALUES (
        v_transaction_id,
        v_business_id,
        'service',
        v_svc_item.resource_id,
        v_svc_item.staff_id,
        v_svc_item.name,
        COALESCE(v_svc_item.qty, 1),
        COALESCE(v_svc_item.price, 0),
        COALESCE(v_svc_item.discount, 0),
        (COALESCE(v_svc_item.price, 0) - COALESCE(v_svc_item.discount, 0)) * COALESCE(v_svc_item.qty, 1),
        v_svc_item.snapshot
      );
    END LOOP;

    FOR v_prod_item IN (
      SELECT *
      FROM jsonb_to_recordset(p_products) AS x(
        product_id uuid,
        name text,
        price numeric,
        qty int,
        staff_id uuid,
        discount numeric,
        snapshot jsonb
      )
    ) LOOP
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
        v_prod_item.product_id,
        v_prod_item.staff_id,
        v_prod_item.name,
        COALESCE(v_prod_item.qty, 1),
        COALESCE(v_prod_item.price, 0),
        COALESCE(v_prod_item.discount, 0),
        (COALESCE(v_prod_item.price, 0) - COALESCE(v_prod_item.discount, 0)) * COALESCE(v_prod_item.qty, 1),
        v_prod_item.snapshot
      );
    END LOOP;

    IF p_tips > 0 THEN
      INSERT INTO public.checkout_transaction_items (
        transaction_id,
        business_id,
        type,
        name,
        qty,
        unit_price,
        total
      )
      VALUES (
        v_transaction_id,
        v_business_id,
        'tip',
        'Cash Tip Allocation',
        1,
        p_tips,
        p_tips
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
        ELSE cti.type
      END
    FROM public.checkout_transaction_items cti
    WHERE cti.transaction_id = v_transaction_id
      AND cti.type IN ('service', 'product', 'tip', 'tax')
      AND cti.total > 0
    GROUP BY cti.type;

    IF COALESCE(p_tax, 0) > 0 THEN
      INSERT INTO public.financial_ledger_entries (
        business_id,
        checkout_transaction_id,
        entry_type,
        amount,
        direction,
        category
      )
      VALUES (
        v_business_id,
        v_transaction_id,
        'checkout_tax',
        COALESCE(p_tax, 0),
        'credit',
        'tax'
      );
    END IF;

    IF COALESCE(p_wallet_amount, 0) > 0 THEN
      INSERT INTO public.financial_ledger_entries (
        business_id,
        checkout_transaction_id,
        entry_type,
        amount,
        direction,
        category
      )
      VALUES (
        v_business_id,
        v_transaction_id,
        'wallet_redemption',
        COALESCE(p_wallet_amount, 0),
        'debit',
        'wallet'
      );
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
        checked_out_by = COALESCE(p_created_by, (SELECT auth.uid()))
      WHERE b.id = p_booking_id;
    END IF;

    IF p_queue_ticket_id IS NOT NULL THEN
      UPDATE public.queue_tickets qt
      SET
        status = 'completed',
        checkout_completed_at = now(),
        checkout_transaction_id = v_transaction_id
      WHERE qt.id = p_queue_ticket_id;
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'action', p_action,
    'receipt_number', COALESCE(v_receipt_number, 'PREVIEW-ONLY'),
    'subtotal', v_subtotal,
    'discount_amount', COALESCE(p_discount, 0) + COALESCE(p_membership_discount, 0),
    'wallet_amount', COALESCE(p_wallet_amount, 0),
    'package_amount', COALESCE(v_package_amount, 0),
    'tax_amount', COALESCE(p_tax, 0),
    'tips_amount', COALESCE(p_tips, 0),
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
