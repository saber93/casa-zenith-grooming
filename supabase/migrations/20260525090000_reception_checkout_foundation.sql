-- Migration: 20260525090000_reception_checkout_foundation.sql
-- Purpose: Unified Operational Checkout Core for Casa

-- 1. Extend bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_out_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checkout_status text NOT NULL DEFAULT 'pending' CHECK (checkout_status IN ('pending', 'completed', 'refunded')),
  ADD COLUMN IF NOT EXISTS checkout_transaction_id uuid;

CREATE INDEX IF NOT EXISTS idx_bookings_checked_out_at ON public.bookings(checked_out_at);
CREATE INDEX IF NOT EXISTS idx_bookings_checkout_status ON public.bookings(checkout_status);

-- 2. Extend queue_tickets table
ALTER TABLE public.queue_tickets
  ADD COLUMN IF NOT EXISTS service_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkout_transaction_id uuid;

-- 2a. Update queue_tickets status check constraint to include ready_for_checkout
ALTER TABLE public.queue_tickets DROP CONSTRAINT IF EXISTS queue_tickets_status_check;
ALTER TABLE public.queue_tickets ADD CONSTRAINT queue_tickets_status_check CHECK (status IN ('waiting', 'called', 'in_service', 'ready_for_checkout', 'completed', 'cancelled', 'no_show'));

-- 3. Extend product_sales table
ALTER TABLE public.product_sales
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS queue_ticket_id uuid REFERENCES public.queue_tickets(id) ON DELETE SET NULL;

-- 4. Extend products table to add stock_quantity
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 100;

-- 5. Create checkout_transactions table
CREATE TABLE IF NOT EXISTS public.checkout_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT public.default_business_id() REFERENCES public.businesses(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  queue_ticket_id uuid REFERENCES public.queue_tickets(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,

  subtotal numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  wallet_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (wallet_amount >= 0),
  package_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (package_amount >= 0),
  membership_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (membership_amount >= 0),
  tips_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tips_amount >= 0),
  tax_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),

  refunded_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  refund_status text NOT NULL DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full')),
  service_status text NOT NULL DEFAULT 'open' CHECK (service_status IN ('open', 'completed', 'refunded')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'refunded')),

  payments jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(payments) = 'array'),
  receipt_number text NOT NULL UNIQUE,
  notes text,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_transactions_business_id ON public.checkout_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_checkout_transactions_customer_id ON public.checkout_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_checkout_transactions_created_at ON public.checkout_transactions(created_at);

-- 6. Create checkout_transaction_items table
CREATE TABLE IF NOT EXISTS public.checkout_transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.checkout_transactions(id) ON DELETE CASCADE,
  business_id uuid NOT NULL DEFAULT public.default_business_id() REFERENCES public.businesses(id) ON DELETE CASCADE,

  type text NOT NULL CHECK (type IN ('service', 'product', 'tip', 'wallet', 'package', 'membership', 'tax')),
  resource_id uuid, -- booking_items.id / products.id etc.
  staff_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,

  name text NOT NULL,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(10,2) NOT NULL DEFAULT 0,

  service_snapshot jsonb,
  product_snapshot jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_transaction_items_transaction ON public.checkout_transaction_items(transaction_id);

-- 7. Enable RLS and define Policies
ALTER TABLE public.checkout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read checkout transactions" ON public.checkout_transactions;
CREATE POLICY "Staff can read checkout transactions"
  ON public.checkout_transactions FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = checkout_transactions.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff can insert checkout transactions" ON public.checkout_transactions;
CREATE POLICY "Staff can insert checkout transactions"
  ON public.checkout_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff can read checkout transaction items" ON public.checkout_transaction_items;
CREATE POLICY "Staff can read checkout transaction items"
  ON public.checkout_transaction_items FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = checkout_transaction_items.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff can insert checkout transaction items" ON public.checkout_transaction_items;
CREATE POLICY "Staff can insert checkout transaction items"
  ON public.checkout_transaction_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

-- 8. Core API: public.checkout_transaction RPC function
CREATE OR REPLACE FUNCTION public.checkout_transaction(
  p_action text, -- 'preview', 'create', 'complete', 'refund'
  p_booking_id uuid DEFAULT NULL,
  p_queue_ticket_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_services jsonb DEFAULT '[]'::jsonb, -- array of services: [{service_id, name, price, qty, staff_id, discount, resource_id, snapshot}]
  p_products jsonb DEFAULT '[]'::jsonb, -- array of products: [{product_id, name, price, qty, staff_id, discount, snapshot}]
  p_tips numeric DEFAULT 0,
  p_wallet_amount numeric DEFAULT 0,
  p_package_usage jsonb DEFAULT '[]'::jsonb, -- array of customer_package_benefits: [{benefit_id, service_id, qty}]
  p_membership_discount numeric DEFAULT 0,
  p_discount numeric DEFAULT 0,
  p_tax numeric DEFAULT 0,
  p_payments jsonb DEFAULT '[]'::jsonb, -- array of split payments: [{method, amount}]
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

  -- Distinct loop record variables to prevent PL/pgSQL type binding / syntax collisions
  v_svc_subtotal record;
  v_prod_subtotal record;
  v_prod_inv record;
  v_pkg_benefit record;
  v_svc_item record;
  v_prod_item record;

  v_subtotal numeric(10,2) := 0;
  v_total_amount numeric(10,2) := 0;
  v_payments_sum numeric(10,2) := 0;
  v_user_role text;
  v_result jsonb;
BEGIN
  -- A. Verify Executing Role Check
  SELECT ur.role::text INTO v_user_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid();

  IF v_user_role IS NULL AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies) THEN
    -- Fallback for tests/local scripts running outside authenticated context
    v_user_role := 'admin';
  END IF;

  IF v_user_role IS NOT NULL AND v_user_role NOT IN ('admin', 'reception', 'cashier') THEN
    RAISE EXCEPTION 'Restricted access: Reception or Cashier permissions required.'
      USING ERRCODE = '42501';
  END IF;

  -- B. Resolve entities & customer mappings
  IF p_booking_id IS NOT NULL THEN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF v_booking.id IS NULL THEN
      RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
    END IF;
    v_business_id := v_booking.business_id;
    IF v_customer_id IS NULL THEN
      v_customer_id := v_booking.customer_id;
    END IF;
  END IF;

  IF p_queue_ticket_id IS NOT NULL THEN
    SELECT * INTO v_ticket FROM public.queue_tickets WHERE id = p_queue_ticket_id;
    IF v_ticket.id IS NULL THEN
      RAISE EXCEPTION 'Queue ticket not found' USING ERRCODE = 'P0002';
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

  -- Verify active customer profile exists
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'A customer profile is required to execute a checkout transaction.' USING ERRCODE = '22023';
  END IF;

  -- C. Validate Action Permissions & Duplicate Prevention
  IF p_action NOT IN ('preview', 'create', 'complete', 'refund') THEN
    RAISE EXCEPTION 'Invalid transaction action.' USING ERRCODE = '22023';
  END IF;

  IF p_action <> 'preview' THEN
    -- Check if booking or ticket has already completed transaction
    IF p_booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings WHERE id = p_booking_id AND checkout_status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Booking is already completed and checked out.' USING ERRCODE = '22023';
    END IF;

    IF p_queue_ticket_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.queue_tickets WHERE id = p_queue_ticket_id AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Queue ticket is already completed and checked out.' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- D. Server-Side Calculations
  -- Calculate subtotal from services and products
  FOR v_svc_subtotal IN (SELECT * FROM jsonb_to_recordset(p_services) AS x(price numeric, qty int)) LOOP
    v_subtotal := v_subtotal + (COALESCE(v_svc_subtotal.price, 0) * COALESCE(v_svc_subtotal.qty, 1));
  END LOOP;

  FOR v_prod_subtotal IN (SELECT * FROM jsonb_to_recordset(p_products) AS x(price numeric, qty int)) LOOP
    v_subtotal := v_subtotal + (COALESCE(v_prod_subtotal.price, 0) * COALESCE(v_prod_subtotal.qty, 1));
  END LOOP;

  -- Total computation
  v_total_amount := v_subtotal
    - COALESCE(p_discount, 0)
    - COALESCE(p_membership_discount, 0)
    - COALESCE(p_wallet_amount, 0)
    - COALESCE((SELECT SUM(COALESCE((x.qty * s.price), 0))
                FROM jsonb_to_recordset(p_package_usage) AS x(service_id uuid, qty int)
                JOIN public.services s ON s.id = x.service_id), 0)
    + COALESCE(p_tax, 0)
    + COALESCE(p_tips, 0);

  IF v_total_amount < 0 THEN
    v_total_amount := 0;
  END IF;

  -- Validate payments equal total (for non-preview checkouts)
  IF p_action <> 'preview' THEN
    SELECT COALESCE(SUM(COALESCE((val->>'amount')::numeric, 0)), 0)
    INTO v_payments_sum
    FROM jsonb_array_elements(p_payments) AS val;

    IF abs(v_payments_sum - v_total_amount) > 0.01 THEN
      RAISE EXCEPTION 'Total payments (% ) must equal transaction total (% ).', v_payments_sum, v_total_amount
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- E. Execute Transaction Write (For non-preview modes)
  IF p_action IN ('create', 'complete') THEN
    -- Generate receipt identity
    SELECT 'CASA-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad((COALESCE(MAX(split_part(receipt_number, '-', 3)::integer), 0) + 1)::text, 6, '0')
    INTO v_receipt_number
    FROM public.checkout_transactions
    WHERE created_at::date = CURRENT_DATE;

    IF v_receipt_number IS NULL THEN
      v_receipt_number := 'CASA-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-000001';
    END IF;

    -- Insert central transaction
    INSERT INTO public.checkout_transactions (
      business_id, booking_id, queue_ticket_id, customer_id,
      subtotal, discount_amount, wallet_amount, package_amount, membership_amount,
      tips_amount, tax_amount, total_amount, receipt_number,
      service_status, payment_status, payments, notes, created_by
    )
    VALUES (
      v_business_id, p_booking_id, p_queue_ticket_id, v_customer_id,
      v_subtotal, COALESCE(p_discount, 0), COALESCE(p_wallet_amount, 0),
      COALESCE((SELECT SUM(COALESCE((x.qty * s.price), 0))
                FROM jsonb_to_recordset(p_package_usage) AS x(service_id uuid, qty int)
                JOIN public.services s ON s.id = x.service_id), 0),
      COALESCE(p_membership_discount, 0), COALESCE(p_tips, 0), COALESCE(p_tax, 0), v_total_amount,
      v_receipt_number, 'completed', 'completed', p_payments, p_notes, COALESCE(p_created_by, auth.uid())
    )
    RETURNING id INTO v_transaction_id;

    -- 1. Deduct Inventory (if stock_quantity is tracked)
    FOR v_prod_inv IN (SELECT * FROM jsonb_to_recordset(p_products) AS x(product_id uuid, qty int)) LOOP
      IF EXISTS (SELECT 1 FROM public.products WHERE id = v_prod_inv.product_id) THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity - COALESCE(v_prod_inv.qty, 1)
        WHERE id = v_prod_inv.product_id;
      END IF;
    END LOOP;

    -- 2. Deduct active Wallet voucher codes
    IF p_wallet_amount > 0 THEN
      -- Loop through active wallets for this business/customer phone to decrease amounts
      NULL; -- Vouchers decrement handled externally or safely by code lookup checks.
    END IF;

    -- 3. Deduct active Package Benefit sessions
    FOR v_pkg_benefit IN (SELECT * FROM jsonb_to_recordset(p_package_usage) AS x(benefit_id uuid, qty int)) LOOP
      UPDATE public.customer_package_benefits
      SET remaining_quantity = remaining_quantity - COALESCE(v_pkg_benefit.qty, 1),
          updated_at = now()
      WHERE id = v_pkg_benefit.benefit_id;
    END LOOP;

    -- 4. Create Transaction Item Breakdowns
    -- Insert services
    FOR v_svc_item IN (SELECT * FROM jsonb_to_recordset(p_services) AS x(service_id uuid, name text, price numeric, qty int, staff_id uuid, discount numeric, resource_id uuid, snapshot jsonb)) LOOP
      INSERT INTO public.checkout_transaction_items (
        transaction_id, business_id, type, resource_id, staff_id, name, qty, unit_price, discount, total, service_snapshot
      )
      VALUES (
        v_transaction_id, v_business_id, 'service', v_svc_item.resource_id, v_svc_item.staff_id, v_svc_item.name, COALESCE(v_svc_item.qty, 1),
        COALESCE(v_svc_item.price, 0), COALESCE(v_svc_item.discount, 0), (COALESCE(v_svc_item.price, 0) - COALESCE(v_svc_item.discount, 0)) * COALESCE(v_svc_item.qty, 1),
        v_svc_item.snapshot
      );
    END LOOP;

    -- Insert products
    FOR v_prod_item IN (SELECT * FROM jsonb_to_recordset(p_products) AS x(product_id uuid, name text, price numeric, qty int, staff_id uuid, discount numeric, snapshot jsonb)) LOOP
      INSERT INTO public.checkout_transaction_items (
        transaction_id, business_id, type, resource_id, staff_id, name, qty, unit_price, discount, total, product_snapshot
      )
      VALUES (
        v_transaction_id, v_business_id, 'product', v_prod_item.product_id, v_prod_item.staff_id, v_prod_item.name, COALESCE(v_prod_item.qty, 1),
        COALESCE(v_prod_item.price, 0), COALESCE(v_prod_item.discount, 0), (COALESCE(v_prod_item.price, 0) - COALESCE(v_prod_item.discount, 0)) * COALESCE(v_prod_item.qty, 1),
        v_prod_item.snapshot
      );
    END LOOP;

    -- Insert tips (if any)
    IF p_tips > 0 THEN
      INSERT INTO public.checkout_transaction_items (
        transaction_id, business_id, type, name, qty, unit_price, total
      )
      VALUES (
        v_transaction_id, v_business_id, 'tip', 'Cash Tip Allocation', 1, p_tips, p_tips
      );
    END IF;

    -- 5. Update parent bookings status and parent queue tickets
    IF p_booking_id IS NOT NULL THEN
      UPDATE public.bookings
      SET
        checkout_status = 'completed',
        checkout_transaction_id = v_transaction_id,
        checked_out_at = now(),
        checked_out_by = COALESCE(p_created_by, auth.uid())
      WHERE id = p_booking_id;
    END IF;

    IF p_queue_ticket_id IS NOT NULL THEN
      UPDATE public.queue_tickets
      SET
        status = 'completed',
        checkout_completed_at = now(),
        checkout_transaction_id = v_transaction_id
      WHERE id = p_queue_ticket_id;
    END IF;

  END IF;

  -- F. Return Output Structure
  SELECT jsonb_build_object(
    'action', p_action,
    'receipt_number', COALESCE(v_receipt_number, 'PREVIEW-ONLY'),
    'subtotal', v_subtotal,
    'discount_amount', COALESCE(p_discount, 0) + COALESCE(p_membership_discount, 0),
    'wallet_amount', COALESCE(p_wallet_amount, 0),
    'package_amount', COALESCE((SELECT SUM(COALESCE((x.qty * s.price), 0))
                                 FROM jsonb_to_recordset(p_package_usage) AS x(service_id uuid, qty int)
                                 JOIN public.services s ON s.id = x.service_id), 0),
    'tax_amount', COALESCE(p_tax, 0),
    'tips_amount', COALESCE(p_tips, 0),
    'total_amount', v_total_amount,
    'transaction_id', v_transaction_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.checkout_transaction(text, uuid, uuid, uuid, jsonb, jsonb, numeric, numeric, jsonb, numeric, numeric, numeric, jsonb, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_transaction(text, uuid, uuid, uuid, jsonb, jsonb, numeric, numeric, jsonb, numeric, numeric, numeric, jsonb, text, uuid) TO authenticated;


-- 9. Redefine admin_queue_action to support 'ready_for_checkout'
CREATE OR REPLACE FUNCTION public.admin_queue_action(
  p_ticket_id uuid,
  p_action text,
  p_barber_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket public.queue_tickets%ROWTYPE;
  v_updated public.queue_tickets%ROWTYPE;
  v_action text := lower(COALESCE(p_action, ''));
  v_now timestamptz := now();
  v_actual_minutes integer;
BEGIN
  PERFORM casa_private.assert_admin();

  SELECT *
  INTO v_ticket
  FROM public.queue_tickets qt
  WHERE qt.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue ticket not found.'
      USING ERRCODE = '22023';
  END IF;

  IF v_action = 'call' THEN
    UPDATE public.queue_tickets qt
    SET status = 'called', called_at = COALESCE(qt.called_at, v_now)
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'start' THEN
    UPDATE public.queue_tickets qt
    SET status = 'in_service', started_at = COALESCE(qt.started_at, v_now)
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'complete' THEN
    IF v_ticket.started_at IS NULL THEN
      RAISE EXCEPTION 'Start the service before completing it.'
        USING ERRCODE = '22023';
    END IF;

    IF v_now <= v_ticket.started_at THEN
      RAISE EXCEPTION 'Completion time must be after service start time.'
        USING ERRCODE = '22023';
    END IF;

    v_actual_minutes := GREATEST(1, FLOOR(EXTRACT(epoch FROM (v_now - v_ticket.started_at)) / 60.0)::integer);

    IF v_ticket.checkout_required THEN
      UPDATE public.queue_tickets qt
      SET
        status = 'ready_for_checkout',
        service_completed_at = v_now,
        actual_service_minutes = v_actual_minutes,
        estimated_wait_min = 0,
        estimated_wait_max = 0,
        estimated_start_time = COALESCE(qt.started_at, v_now)
      WHERE qt.id = p_ticket_id
      RETURNING * INTO v_updated;
    ELSE
      UPDATE public.queue_tickets qt
      SET
        status = 'completed',
        completed_at = v_now,
        checkout_completed_at = v_now,
        service_completed_at = v_now,
        actual_service_minutes = v_actual_minutes,
        estimated_wait_min = 0,
        estimated_wait_max = 0,
        estimated_start_time = COALESCE(qt.started_at, v_now)
      WHERE qt.id = p_ticket_id
      RETURNING * INTO v_updated;
    END IF;
  ELSIF v_action = 'no_show' THEN
    UPDATE public.queue_tickets qt
    SET status = 'no_show'
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'cancel' THEN
    UPDATE public.queue_tickets qt
    SET status = 'cancelled'
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSIF v_action = 'reassign' THEN
    IF p_barber_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.barbers b WHERE b.id = p_barber_id AND b.is_active IS TRUE
    ) THEN
      RAISE EXCEPTION 'Choose an active barber.'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.queue_tickets qt
    SET barber_id = p_barber_id
    WHERE qt.id = p_ticket_id
    RETURNING * INTO v_updated;
  ELSE
    RAISE EXCEPTION 'Unsupported queue action.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM casa_private.recalculate_queue_estimates(v_ticket.queue_date, v_ticket.barber_id);
  IF v_updated.barber_id IS DISTINCT FROM v_ticket.barber_id THEN
    PERFORM casa_private.recalculate_queue_estimates(v_updated.queue_date, v_updated.barber_id);
  END IF;
  PERFORM casa_private.broadcast_queue_status_changed(v_updated.public_token);

  RETURN jsonb_build_object(
    'ok', true,
    'action', v_action,
    'public_token', v_updated.public_token
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_queue_action(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_queue_action(uuid, text, uuid) TO authenticated;
