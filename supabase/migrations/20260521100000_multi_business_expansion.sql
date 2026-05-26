-- Migration: Casa Multi-Business Module Expansion
-- Adds support for: Suppliers & Expenses, Loyalty & Memberships, Discounts & Promos, Prepaid Vouchers & Wallets.
-- All tables are securely scoped to businesses with RLS and indexed on business_id.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Suppliers & Expenses Table definitions
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  logo_url text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  expense_name text NOT NULL,
  payee text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  payment_type text NOT NULL CHECK (payment_type IN ('weekly', 'monthly', 'yearly', 'one_time')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  receipt_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Loyalty & Memberships
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_no text NOT NULL,
  discount_percent numeric(5,2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ends_at date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, membership_no)
);

-- 3. Discounts & Promotions
CREATE TABLE IF NOT EXISTS public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed')),
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ends_at date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  using_type text NOT NULL DEFAULT 'unlimited' CHECK (using_type IN ('unlimited', 'once_per_user', 'limited_quantity')),
  benefit_numbers integer DEFAULT 0 CHECK (benefit_numbers >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, code)
);

-- 4. Vouchers & Vouchers-Wallets (Draw-down Voucher V1 System)
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0), -- Dynamic balance remaining
  invoiced_amount numeric(10,2) NOT NULL CHECK (invoiced_amount >= 0), -- Paid amount
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'depleted', 'expired')),
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  ends_at date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, code)
);

CREATE TABLE IF NOT EXISTS public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL, -- Attributing professional who sold the voucher
  amount numeric(10,2) NOT NULL CHECK (amount >= 0), -- Initial voucher value
  invoiced_amount numeric(10,2) NOT NULL CHECK (invoiced_amount >= 0), -- Paid value
  commission_percent numeric(5,2) DEFAULT 0 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  created_at timestamptz DEFAULT now()
);

-- 5. Timestamps and Auto-Update triggers
DO $$
DECLARE
  t_name text;
BEGIN
  FOREACH t_name IN ARRAY ARRAY['suppliers', 'expenses', 'memberships', 'discounts', 'wallets']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger trg
      JOIN pg_catalog.pg_class cls ON cls.oid = trg.tgrelid
      JOIN pg_catalog.pg_namespace nsp ON nsp.oid = cls.relnamespace
      WHERE trg.tgname = format('update_%s_updated_at', t_name)
        AND nsp.nspname = 'public'
        AND cls.relname = t_name
        AND NOT trg.tgisinternal
    ) THEN
      EXECUTE format('
        CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
      ', t_name, t_name);
    END IF;
  END LOOP;
END $$;

-- 6. Indices for business scaling and high-performance search queries
CREATE INDEX IF NOT EXISTS idx_suppliers_business ON public.suppliers (business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON public.expenses (business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_business_user ON public.memberships (business_id, user_id);
CREATE INDEX IF NOT EXISTS idx_discounts_business_code ON public.discounts (business_id, code);
CREATE INDEX IF NOT EXISTS idx_wallets_business_code ON public.wallets (business_id, code);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON public.user_wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_business ON public.user_wallets (business_id);

-- 7. Secure Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Create policies for multi-tenant business isolation.
-- We reuse the business owner/manager permission checks defined in the DB.
CREATE OR REPLACE FUNCTION public.check_user_is_business_staff(p_business_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.business_memberships bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = p_user_id
      AND bm.role IN ('business_owner', 'business_manager', 'staff')
  ) OR public.has_role(p_user_id, 'admin'::public.app_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Suppliers Policies
DROP POLICY IF EXISTS "Staff can do all with suppliers" ON public.suppliers;
CREATE POLICY "Staff can do all with suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

-- Expenses Policies
DROP POLICY IF EXISTS "Staff can do all with expenses" ON public.expenses;
CREATE POLICY "Staff can do all with expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

-- Memberships Policies
DROP POLICY IF EXISTS "Staff can do all with memberships" ON public.memberships;
CREATE POLICY "Staff can do all with memberships" ON public.memberships
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

DROP POLICY IF EXISTS "Customers can view their memberships" ON public.memberships;
CREATE POLICY "Customers can view their memberships" ON public.memberships
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Discounts Policies
DROP POLICY IF EXISTS "Staff can do all with discounts" ON public.discounts;
CREATE POLICY "Staff can do all with discounts" ON public.discounts
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active discounts" ON public.discounts;
CREATE POLICY "Anyone can view active discounts" ON public.discounts
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND starts_at <= CURRENT_DATE AND ends_at >= CURRENT_DATE);

-- Wallets Policies
DROP POLICY IF EXISTS "Staff can do all with wallets" ON public.wallets;
CREATE POLICY "Staff can do all with wallets" ON public.wallets
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can look up active wallet code" ON public.wallets;
CREATE POLICY "Anyone can look up active wallet code" ON public.wallets
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- User Wallets Policies
DROP POLICY IF EXISTS "Staff can do all with user wallets" ON public.user_wallets;
CREATE POLICY "Staff can do all with user wallets" ON public.user_wallets
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

DROP POLICY IF EXISTS "Customers can view their user wallets" ON public.user_wallets;
CREATE POLICY "Customers can view their user wallets" ON public.user_wallets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
