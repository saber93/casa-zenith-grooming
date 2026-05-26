-- Create packages table
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  description_en text,
  description_ar text,
  price numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create package_services junction table
CREATE TABLE IF NOT EXISTS public.package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (package_id, service_id)
);

-- Create customer_packages (sales) table
CREATE TABLE IF NOT EXISTS public.customer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  price_paid numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_paid >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create customer_package_benefits table
CREATE TABLE IF NOT EXISTS public.customer_package_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  total_quantity integer NOT NULL CHECK (total_quantity > 0),
  remaining_quantity integer NOT NULL CHECK (remaining_quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (customer_package_id, service_id)
);

-- Enable RLS for these new tables
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_benefits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can read active packages" ON public.packages;
DROP POLICY IF EXISTS "Business admins can manage packages" ON public.packages;
DROP POLICY IF EXISTS "Public can read active package services" ON public.package_services;
DROP POLICY IF EXISTS "Business admins can manage package services" ON public.package_services;
DROP POLICY IF EXISTS "Business admins can manage customer packages" ON public.customer_packages;
DROP POLICY IF EXISTS "Business admins can manage customer package benefits" ON public.customer_package_benefits;

-- RLS policies for packages
CREATE POLICY "Public can read active packages" ON public.packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Business admins can manage packages" ON public.packages
  FOR ALL TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = packages.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = packages.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

-- RLS policies for package_services
CREATE POLICY "Public can read active package services" ON public.package_services
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_services.package_id AND p.is_active = true)
  );

CREATE POLICY "Business admins can manage package services" ON public.package_services
  FOR ALL TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.packages p
      JOIN public.business_memberships bm ON bm.business_id = p.business_id
      WHERE p.id = package_services.package_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.packages p
      JOIN public.business_memberships bm ON bm.business_id = p.business_id
      WHERE p.id = package_services.package_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

-- RLS policies for customer_packages
CREATE POLICY "Business admins can manage customer packages" ON public.customer_packages
  FOR ALL TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = customer_packages.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = customer_packages.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

-- RLS policies for customer_package_benefits
CREATE POLICY "Business admins can manage customer package benefits" ON public.customer_package_benefits
  FOR ALL TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.customer_packages cp
      JOIN public.business_memberships bm ON bm.business_id = cp.business_id
      WHERE cp.id = customer_package_benefits.customer_package_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.customer_packages cp
      JOIN public.business_memberships bm ON bm.business_id = cp.business_id
      WHERE cp.id = customer_package_benefits.customer_package_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );
