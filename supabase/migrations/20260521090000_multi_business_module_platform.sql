-- Casa multi-business module platform foundation.
-- Keeps the existing Casa tenant as the default business while adding module-aware,
-- duration-aware operations for salon, spa, and massage centers.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS casa_private;
REVOKE ALL ON SCHEMA casa_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  business_type text NOT NULL DEFAULT 'barbershop'
    CHECK (business_type IN ('barbershop', 'salon', 'spa', 'massage')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'draft')),
  default_locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'Asia/Dubai',
  currency text NOT NULL DEFAULT 'AED',
  logo_url text,
  accent_color text DEFAULT '#fe0a00',
  phone text,
  email text,
  whatsapp_number text,
  address_en text,
  address_ar text,
  city text,
  country text DEFAULT 'United Arab Emirates',
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_modules (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  module_key text NOT NULL CHECK (
    module_key IN (
      'reservations',
      'walk_in_queue',
      'barber_workspace',
      'queue_display',
      'queue_analytics',
      'products_catalog',
      'products_pos',
      'staff',
      'resources',
      'memberships',
      'discounts',
      'wallets',
      'suppliers_expenses',
      'reports',
      'public_directory'
    )
  ),
  enabled boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (business_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.business_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (
    role IN ('business_owner', 'business_manager', 'staff', 'customer')
  ),
  created_at timestamptz DEFAULT now(),
  UNIQUE (business_id, user_id, role)
);

INSERT INTO public.businesses (
  slug,
  name_en,
  name_ar,
  business_type,
  status,
  default_locale,
  timezone,
  currency,
  logo_url,
  accent_color,
  phone,
  email,
  whatsapp_number,
  address_en,
  address_ar,
  city
)
VALUES (
  'casa',
  'Casa Gents Grooming',
  'كازا للعناية بالرجال',
  'barbershop',
  'active',
  'en',
  'Asia/Dubai',
  'AED',
  '/casa-logo.jpeg',
  '#fe0a00',
  '+971 544767690',
  'hello@casa-grooming.com',
  '971544767690',
  'Ajman, United Arab Emirates',
  'عجمان، الإمارات العربية المتحدة',
  'Ajman'
)
ON CONFLICT (slug) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  business_type = COALESCE(public.businesses.business_type, EXCLUDED.business_type),
  status = 'active',
  logo_url = COALESCE(public.businesses.logo_url, EXCLUDED.logo_url),
  accent_color = COALESCE(public.businesses.accent_color, EXCLUDED.accent_color),
  updated_at = now();

CREATE OR REPLACE FUNCTION casa_private.default_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.id
  FROM public.businesses b
  WHERE b.slug = 'casa'
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION casa_private.default_business_id() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.default_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.id
  FROM public.businesses b
  WHERE b.slug = 'casa'
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.default_business_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.default_business_id() TO anon, authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'services',
    'products',
    'barbers',
    'bookings',
    'customers',
    'queue_tickets'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE',
      table_name
    );
    EXECUTE format(
      'UPDATE public.%I SET business_id = public.default_business_id() WHERE business_id IS NULL',
      table_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN business_id SET DEFAULT public.default_business_id()',
      table_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN business_id SET NOT NULL',
      table_name
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (business_id)',
      'idx_' || table_name || '_business_id',
      table_name
    );
  END LOOP;

  IF to_regclass('public.whatsapp_inbound_messages') IS NOT NULL THEN
    ALTER TABLE public.whatsapp_inbound_messages
      ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
    UPDATE public.whatsapp_inbound_messages
    SET business_id = public.default_business_id()
    WHERE business_id IS NULL;
    ALTER TABLE public.whatsapp_inbound_messages
      ALTER COLUMN business_id SET DEFAULT public.default_business_id(),
      ALTER COLUMN business_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_messages_business_id
      ON public.whatsapp_inbound_messages (business_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_modules_business_enabled
  ON public.business_modules (business_id, enabled);

CREATE INDEX IF NOT EXISTS idx_business_memberships_user
  ON public.business_memberships (user_id);

CREATE OR REPLACE FUNCTION casa_private.business_module_defaults(p_business_type text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_type text := COALESCE(NULLIF(p_business_type, ''), 'barbershop');
  v_modules jsonb;
BEGIN
  v_modules := jsonb_build_object(
    'reservations', true,
    'walk_in_queue', false,
    'barber_workspace', false,
    'queue_display', false,
    'queue_analytics', false,
    'products_catalog', false,
    'products_pos', false,
    'staff', true,
    'resources', false,
    'memberships', false,
    'discounts', false,
    'wallets', false,
    'suppliers_expenses', false,
    'reports', true,
    'public_directory', false
  );

  IF v_type = 'barbershop' THEN
    v_modules := v_modules || jsonb_build_object(
      'walk_in_queue', true,
      'barber_workspace', true,
      'queue_display', true,
      'queue_analytics', true,
      'products_catalog', true,
      'products_pos', true
    );
  ELSIF v_type = 'salon' THEN
    v_modules := v_modules || jsonb_build_object(
      'walk_in_queue', true,
      'barber_workspace', true,
      'queue_display', true,
      'queue_analytics', true,
      'products_catalog', true,
      'products_pos', true,
      'resources', true
    );
  ELSIF v_type = 'spa' THEN
    v_modules := v_modules || jsonb_build_object(
      'resources', true,
      'memberships', true,
      'discounts', true
    );
  ELSIF v_type = 'massage' THEN
    v_modules := v_modules || jsonb_build_object(
      'resources', true
    );
  END IF;

  RETURN v_modules;
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.business_module_defaults(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION casa_private.assert_business_admin(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = (SELECT auth.uid())
      AND bm.role IN ('business_owner', 'business_manager')
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'You do not have permission to manage this business.'
    USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.assert_business_admin(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_enabled_modules(p_business_id uuid)
RETURNS TABLE (
  module_key text,
  enabled boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business public.businesses%ROWTYPE;
  v_defaults jsonb;
BEGIN
  SELECT *
  INTO v_business
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.status = 'active';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_defaults := casa_private.business_module_defaults(v_business.business_type);

  RETURN QUERY
  SELECT
    item.key AS module_key,
    COALESCE(bm.enabled, (item.value #>> '{}')::boolean) AS enabled
  FROM jsonb_each(v_defaults) AS item(key, value)
  LEFT JOIN public.business_modules bm
    ON bm.business_id = v_business.id
   AND bm.module_key = item.key
  ORDER BY item.key;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_enabled_modules(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_enabled_modules(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_business_context(p_slug text DEFAULT 'casa')
RETURNS TABLE (
  id uuid,
  slug text,
  name_en text,
  name_ar text,
  business_type text,
  status text,
  default_locale text,
  timezone text,
  currency text,
  logo_url text,
  accent_color text,
  phone text,
  email text,
  whatsapp_number text,
  address_en text,
  address_ar text,
  city text,
  country text,
  modules jsonb,
  current_user_role text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business public.businesses%ROWTYPE;
  v_modules jsonb;
  v_role text;
BEGIN
  SELECT *
  INTO v_business
  FROM public.businesses b
  WHERE b.slug = COALESCE(NULLIF(p_slug, ''), 'casa')
    AND b.status = 'active';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT jsonb_object_agg(g.module_key, g.enabled)
  INTO v_modules
  FROM public.get_enabled_modules(v_business.id) g;

  IF (SELECT auth.uid()) IS NOT NULL AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN
    v_role := 'platform_admin';
  ELSE
    SELECT bm.role
    INTO v_role
    FROM public.business_memberships bm
    WHERE bm.business_id = v_business.id
      AND bm.user_id = (SELECT auth.uid())
    ORDER BY
      CASE bm.role
        WHEN 'business_owner' THEN 1
        WHEN 'business_manager' THEN 2
        WHEN 'staff' THEN 3
        ELSE 4
      END
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT
    v_business.id,
    v_business.slug,
    v_business.name_en,
    v_business.name_ar,
    v_business.business_type,
    v_business.status,
    v_business.default_locale,
    v_business.timezone,
    v_business.currency,
    v_business.logo_url,
    v_business.accent_color,
    v_business.phone,
    v_business.email,
    v_business.whatsapp_number,
    v_business.address_en,
    v_business.address_ar,
    v_business.city,
    v_business.country,
    COALESCE(v_modules, '{}'::jsonb),
    v_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_business_context(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_context(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_business_modules(
  p_business_id uuid,
  p_modules jsonb,
  p_business_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item record;
  v_allowed_modules text[] := ARRAY[
    'reservations',
    'walk_in_queue',
    'barber_workspace',
    'queue_display',
    'queue_analytics',
    'products_catalog',
    'products_pos',
    'staff',
    'resources',
    'memberships',
    'discounts',
    'wallets',
    'suppliers_expenses',
    'reports',
    'public_directory'
  ];
BEGIN
  PERFORM casa_private.assert_business_admin(p_business_id);

  IF p_business_type IS NOT NULL THEN
    IF p_business_type NOT IN ('barbershop', 'salon', 'spa', 'massage') THEN
      RAISE EXCEPTION 'Unsupported business type.'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.businesses b
    SET business_type = p_business_type,
        updated_at = now()
    WHERE b.id = p_business_id;
  END IF;

  FOR v_item IN
    SELECT key, value
    FROM jsonb_each(COALESCE(p_modules, '{}'::jsonb))
  LOOP
    IF v_item.key = ANY(v_allowed_modules) THEN
      INSERT INTO public.business_modules (business_id, module_key, enabled, updated_at)
      VALUES (p_business_id, v_item.key, (v_item.value #>> '{}')::boolean, now())
      ON CONFLICT (business_id, module_key)
      DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_business_modules(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_business_modules(uuid, jsonb, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT public.default_business_id()
    REFERENCES public.businesses(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  resource_type text NOT NULL DEFAULT 'chair'
    CHECK (resource_type IN ('chair', 'room', 'massage_room', 'treatment_room', 'bed', 'other')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'maintenance')),
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, name_en)
);

INSERT INTO public.resources (business_id, name_en, name_ar, resource_type, sort_order)
SELECT public.default_business_id(), v.name_en, v.name_ar, 'chair', v.sort_order
FROM (
  VALUES
    ('Chair 1', 'الكرسي 1', 1),
    ('Chair 2', 'الكرسي 2', 2),
    ('Chair 3', 'الكرسي 3', 3)
) AS v(name_en, name_ar, sort_order)
ON CONFLICT (business_id, name_en) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT public.default_business_id()
    REFERENCES public.businesses(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'in_service', 'completed', 'cancelled', 'no_show')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer,
  commission_amount numeric(10,2),
  tip_amount numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_booking_items_business_start
  ON public.booking_items (business_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking
  ON public.booking_items (booking_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_items_staff_no_overlap'
      AND conrelid = 'public.booking_items'::regclass
  ) THEN
    ALTER TABLE public.booking_items
      ADD CONSTRAINT booking_items_staff_no_overlap
      EXCLUDE USING gist (
        business_id WITH =,
        barber_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
      )
      WHERE (
        barber_id IS NOT NULL
        AND status IN ('pending', 'confirmed', 'in_service')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_items_resource_no_overlap'
      AND conrelid = 'public.booking_items'::regclass
  ) THEN
    ALTER TABLE public.booking_items
      ADD CONSTRAINT booking_items_resource_no_overlap
      EXCLUDE USING gist (
        business_id WITH =,
        resource_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
      )
      WHERE (
        resource_id IS NOT NULL
        AND status IN ('pending', 'confirmed', 'in_service')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.product_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL DEFAULT public.default_business_id()
    REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  payment_type text NOT NULL DEFAULT 'cash'
    CHECK (payment_type IN ('cash', 'card', 'wallet', 'online', 'other')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('draft', 'completed', 'cancelled', 'refunded')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.product_sales(id) ON DELETE CASCADE,
  business_id uuid NOT NULL DEFAULT public.default_business_id()
    REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  line_total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_sales_business_created
  ON public.product_sales (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_sale_items_sale
  ON public.product_sale_items (sale_id);

CREATE OR REPLACE FUNCTION public.get_unavailable_booking_ranges(
  p_business_id uuid,
  p_booking_date date,
  p_staff_id uuid DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS TABLE (
  starts_at timestamptz,
  ends_at timestamptz,
  barber_id uuid,
  resource_id uuid,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT bi.starts_at, bi.ends_at, bi.barber_id, bi.resource_id, bi.status
  FROM public.booking_items bi
  WHERE bi.business_id = p_business_id
    AND bi.status IN ('pending', 'confirmed', 'in_service')
    AND bi.starts_at::date = p_booking_date
    AND (
      (p_staff_id IS NOT NULL AND bi.barber_id = p_staff_id)
      OR (p_resource_id IS NOT NULL AND bi.resource_id = p_resource_id)
    )
  ORDER BY bi.starts_at;
$$;

REVOKE EXECUTE ON FUNCTION public.get_unavailable_booking_ranges(uuid, date, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unavailable_booking_ranges(uuid, date, uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_duration_booking(
  p_business_id uuid,
  p_service_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_staff_id uuid DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_language text DEFAULT 'en',
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  booking_id uuid,
  booking_item_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_booking_id uuid;
  v_item_id uuid;
  v_service record;
BEGIN
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'End time must be after start time.'
      USING ERRCODE = '22023';
  END IF;

  SELECT s.id, s.price, s.duration_minutes
  INTO v_service
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.business_id = p_business_id
    AND s.is_active IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Choose an active service.'
      USING ERRCODE = '22023';
  END IF;

  SELECT c.id
  INTO v_customer_id
  FROM public.customers c
  WHERE c.business_id = p_business_id
    AND c.phone = trim(p_customer_phone)
  ORDER BY c.created_at NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (business_id, full_name, phone, preferred_language, updated_at)
    VALUES (
      p_business_id,
      trim(p_customer_name),
      trim(p_customer_phone),
      COALESCE(NULLIF(p_language, ''), 'en'),
      now()
    )
    RETURNING id INTO v_customer_id;
  END IF;

  INSERT INTO public.bookings (
    business_id,
    customer_id,
    service_id,
    barber_id,
    customer_name,
    customer_phone,
    booking_date,
    booking_time,
    status,
    language,
    notes
  )
  VALUES (
    p_business_id,
    v_customer_id,
    p_service_id,
    p_staff_id,
    trim(p_customer_name),
    trim(p_customer_phone),
    p_starts_at::date,
    to_char(p_starts_at, 'HH24:MI'),
    'pending',
    COALESCE(NULLIF(p_language, ''), 'en'),
    p_notes
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (
    business_id,
    booking_id,
    service_id,
    barber_id,
    resource_id,
    starts_at,
    ends_at,
    status,
    price,
    duration_minutes,
    notes
  )
  VALUES (
    p_business_id,
    v_booking_id,
    p_service_id,
    p_staff_id,
    p_resource_id,
    p_starts_at,
    p_ends_at,
    'pending',
    v_service.price,
    COALESCE(v_service.duration_minutes, CEIL(EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 60)::integer),
    p_notes
  )
  RETURNING id INTO v_item_id;

  RETURN QUERY SELECT v_booking_id, v_item_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_duration_booking(uuid, uuid, text, text, timestamptz, timestamptz, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_duration_booking(uuid, uuid, text, text, timestamptz, timestamptz, uuid, uuid, text, text) TO anon, authenticated;

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
DECLARE
  v_sale_id uuid;
  v_item record;
  v_product record;
  v_quantity integer;
  v_unit_price numeric(10,2);
  v_line_total numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2);
BEGIN
  PERFORM casa_private.assert_business_admin(p_business_id);

  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Add at least one product.'
      USING ERRCODE = '22023';
  END IF;

  IF p_payment_type NOT IN ('cash', 'card', 'wallet', 'online', 'other') THEN
    RAISE EXCEPTION 'Unsupported payment type.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.product_sales (
    business_id,
    customer_id,
    staff_id,
    payment_type,
    discount_amount,
    notes,
    status
  )
  VALUES (
    p_business_id,
    p_customer_id,
    p_staff_id,
    p_payment_type,
    GREATEST(COALESCE(p_discount_amount, 0), 0),
    p_notes,
    'completed'
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN
    SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT p.id, p.price
    INTO v_product
    FROM public.products p
    WHERE p.id = (v_item.value ->> 'product_id')::uuid
      AND p.business_id = p_business_id
      AND p.is_active IS TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Choose active products only.'
        USING ERRCODE = '22023';
    END IF;

    v_quantity := GREATEST(COALESCE((v_item.value ->> 'quantity')::integer, 1), 1);
    v_unit_price := COALESCE(NULLIF(v_item.value ->> 'unit_price', '')::numeric, v_product.price);
    v_line_total := v_quantity * v_unit_price;
    v_subtotal := v_subtotal + v_line_total;

    INSERT INTO public.product_sale_items (
      sale_id,
      business_id,
      product_id,
      quantity,
      unit_price,
      line_total
    )
    VALUES (
      v_sale_id,
      p_business_id,
      v_product.id,
      v_quantity,
      v_unit_price,
      v_line_total
    );
  END LOOP;

  v_total := GREATEST(v_subtotal - GREATEST(COALESCE(p_discount_amount, 0), 0), 0);

  UPDATE public.product_sales ps
  SET subtotal = v_subtotal,
      total = v_total,
      updated_at = now()
  WHERE ps.id = v_sale_id;

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'subtotal', v_subtotal,
    'discount_amount', GREATEST(COALESCE(p_discount_amount, 0), 0),
    'total', v_total
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_sale(uuid, jsonb, text, uuid, uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION casa_private.assign_any_available_barber(
  p_service_id uuid,
  p_queue_date date
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_barber_id uuid;
  v_business_id uuid;
BEGIN
  SELECT s.business_id
  INTO v_business_id
  FROM public.services s
  WHERE s.id = p_service_id;

  SELECT b.id
  INTO v_barber_id
  FROM public.barbers b
  WHERE b.is_active IS TRUE
    AND b.business_id = v_business_id
  ORDER BY casa_private.calculate_barber_workload(b.id, p_service_id, p_queue_date), b.created_at, b.id
  LIMIT 1;

  IF v_barber_id IS NULL THEN
    RAISE EXCEPTION 'No active professionals are available.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_barber_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.assign_any_available_barber(uuid, date) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active businesses" ON public.businesses;
CREATE POLICY "Public can read active businesses"
  ON public.businesses FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Platform admins can manage businesses" ON public.businesses;
CREATE POLICY "Platform admins can manage businesses"
  ON public.businesses FOR ALL
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Business admins can read their modules" ON public.business_modules;
CREATE POLICY "Business admins can read their modules"
  ON public.business_modules FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = business_modules.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Business admins can manage modules" ON public.business_modules;
CREATE POLICY "Business admins can manage modules"
  ON public.business_modules FOR ALL
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = business_modules.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = business_modules.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Users can read own business memberships" ON public.business_memberships;
CREATE POLICY "Users can read own business memberships"
  ON public.business_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Platform admins can manage business memberships" ON public.business_memberships;
CREATE POLICY "Platform admins can manage business memberships"
  ON public.business_memberships FOR ALL
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public can read active resources" ON public.resources;
CREATE POLICY "Public can read active resources"
  ON public.resources FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Business admins can manage resources" ON public.resources;
CREATE POLICY "Business admins can manage resources"
  ON public.resources FOR ALL
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = resources.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = resources.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Business admins can read booking items" ON public.booking_items;
CREATE POLICY "Business admins can read booking items"
  ON public.booking_items FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = booking_items.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Business admins can read bookings" ON public.bookings;
CREATE POLICY "Business admins can read bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = bookings.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Business admins can update bookings" ON public.bookings;
CREATE POLICY "Business admins can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = bookings.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = bookings.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Business admins can read customers" ON public.customers;
CREATE POLICY "Business admins can read customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = customers.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Business admins can read queue tickets" ON public.queue_tickets;
CREATE POLICY "Business admins can read queue tickets"
  ON public.queue_tickets FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = queue_tickets.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Business admins can update queue tickets" ON public.queue_tickets;
CREATE POLICY "Business admins can update queue tickets"
  ON public.queue_tickets FOR UPDATE
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = queue_tickets.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = queue_tickets.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Business admins can read product sales" ON public.product_sales;
CREATE POLICY "Business admins can read product sales"
  ON public.product_sales FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = product_sales.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Business admins can read product sale items" ON public.product_sale_items;
CREATE POLICY "Business admins can read product sale items"
  ON public.product_sale_items FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = product_sale_items.business_id
        AND bm.user_id = (SELECT auth.uid())
        AND bm.role IN ('business_owner', 'business_manager')
    )
  );

DROP POLICY IF EXISTS "Public can read active services" ON public.services;
CREATE POLICY "Public can read active services"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (is_active IS TRUE AND business_id = public.default_business_id());

DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_active IS TRUE AND business_id = public.default_business_id());

DROP POLICY IF EXISTS "Public can read active barbers" ON public.barbers;
CREATE POLICY "Public can read active barbers"
  ON public.barbers FOR SELECT
  TO anon, authenticated
  USING (is_active IS TRUE AND business_id = public.default_business_id());

DROP POLICY IF EXISTS "Business members can read services" ON public.services;
CREATE POLICY "Business members can read services"
  ON public.services FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = services.business_id
        AND bm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Business members can read products" ON public.products;
CREATE POLICY "Business members can read products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = products.business_id
        AND bm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Business members can read barbers" ON public.barbers;
CREATE POLICY "Business members can read barbers"
  ON public.barbers FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.business_memberships bm
      WHERE bm.business_id = barbers.business_id
        AND bm.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.businesses TO anon, authenticated;
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT SELECT ON public.business_modules, public.business_memberships TO authenticated;
GRANT SELECT ON public.booking_items, public.product_sales, public.product_sale_items TO authenticated;
