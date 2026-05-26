-- Migration: 20260525100000_cashier_sessions.sql
-- Purpose: Cashier Sessions & Drawer Reconciliation for Casa

-- 1. Create cashier_sessions table
CREATE TABLE IF NOT EXISTS public.cashier_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT public.default_business_id() REFERENCES public.businesses(id) ON DELETE CASCADE,

  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),

  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz,

  opening_cash numeric(10,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  expected_cash numeric(10,2) NOT NULL DEFAULT 0 CHECK (expected_cash >= 0),
  actual_cash numeric(10,2) NOT NULL DEFAULT 0 CHECK (actual_cash >= 0),
  variance numeric(10,2) NOT NULL DEFAULT 0,

  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cashier_sessions_business ON public.cashier_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_cashier_sessions_status ON public.cashier_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cashier_sessions_opened_by ON public.cashier_sessions(opened_by);

-- 2. Extend checkout_transactions to link to cashier_sessions
ALTER TABLE public.checkout_transactions
  ADD COLUMN IF NOT EXISTS cashier_session_id uuid REFERENCES public.cashier_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_transactions_cashier_session ON public.checkout_transactions(cashier_session_id);

-- 3. Enable RLS and Policies for Cashier Sessions
ALTER TABLE public.cashier_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read cashier sessions" ON public.cashier_sessions;
CREATE POLICY "Staff can read cashier sessions"
  ON public.cashier_sessions FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = cashier_sessions.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff can insert cashier sessions" ON public.cashier_sessions;
CREATE POLICY "Staff can insert cashier sessions"
  ON public.cashier_sessions FOR INSERT
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

DROP POLICY IF EXISTS "Staff can update cashier sessions" ON public.cashier_sessions;
CREATE POLICY "Staff can update cashier sessions"
  ON public.cashier_sessions FOR UPDATE
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = cashier_sessions.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );
