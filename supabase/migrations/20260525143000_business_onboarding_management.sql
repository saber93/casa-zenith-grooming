-- Casa business onboarding and management foundation.
-- Adds platform-admin business creation without changing checkout or WhatsApp logic.

CREATE SCHEMA IF NOT EXISTS casa_private;
REVOKE ALL ON SCHEMA casa_private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS business_model text NOT NULL DEFAULT 'single_branch',
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS area text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'businesses_business_type_check'
      AND c.conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses DROP CONSTRAINT businesses_business_type_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'businesses_business_model_check'
      AND c.conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses DROP CONSTRAINT businesses_business_model_check;
  END IF;

  ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_business_type_check
    CHECK (
      business_type IN (
        'gents_salon',
        'ladies_salon',
        'barbershop',
        'salon',
        'spa',
        'massage',
        'beauty_salon',
        'clinic',
        'other'
      )
    );

  ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_business_model_check
    CHECK (business_model IN ('single_branch', 'multi_branch_brand'));
END $$;

ALTER TABLE public.business_working_days
  ADD COLUMN IF NOT EXISTS open_time time NOT NULL DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS close_time time NOT NULL DEFAULT '22:00';

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

  IF v_type IN ('barbershop', 'gents_salon') THEN
    v_modules := v_modules || jsonb_build_object(
      'walk_in_queue', true,
      'barber_workspace', true,
      'queue_display', true,
      'queue_analytics', true,
      'products_catalog', true,
      'products_pos', true
    );
  ELSIF v_type IN ('salon', 'ladies_salon', 'beauty_salon') THEN
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
  ELSIF v_type = 'clinic' THEN
    v_modules := v_modules || jsonb_build_object(
      'resources', true,
      'memberships', true,
      'discounts', true
    );
  END IF;

  RETURN v_modules;
END;
$$;

REVOKE EXECUTE ON FUNCTION casa_private.business_module_defaults(text) FROM PUBLIC, anon, authenticated;

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
    IF p_business_type NOT IN (
      'gents_salon',
      'ladies_salon',
      'barbershop',
      'salon',
      'spa',
      'massage',
      'beauty_salon',
      'clinic',
      'other'
    ) THEN
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

CREATE OR REPLACE FUNCTION public.create_business_onboarding(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_business_id uuid;
  v_slug text := lower(regexp_replace(COALESCE(NULLIF(p_payload->>'slug', ''), p_payload->>'name_en'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_type text := COALESCE(NULLIF(p_payload->>'business_type', ''), 'gents_salon');
  v_model text := COALESCE(NULLIF(p_payload->>'business_model', ''), 'single_branch');
  v_modules jsonb := COALESCE(p_payload->'modules', casa_private.business_module_defaults(v_type));
  v_working_days jsonb := COALESCE(p_payload->'working_days', '[]'::jsonb);
  v_owner_email text := NULLIF(lower(trim(COALESCE(p_payload->>'owner_email', ''))), '');
  v_owner_id uuid;
  v_day record;
  v_module record;
  v_service record;
  v_seed_services boolean := COALESCE((p_payload->>'seed_services')::boolean, false);
  v_seed jsonb := '[]'::jsonb;
  v_owner_status text := 'skipped';
BEGIN
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'You do not have permission to create businesses.'
      USING ERRCODE = '42501';
  END IF;

  IF v_slug IS NULL OR length(trim(v_slug, '-')) < 2 THEN
    RAISE EXCEPTION 'A valid business slug is required.'
      USING ERRCODE = '22023';
  END IF;

  v_slug := trim(both '-' FROM v_slug);

  IF v_type NOT IN (
    'gents_salon',
    'ladies_salon',
    'barbershop',
    'salon',
    'spa',
    'massage',
    'beauty_salon',
    'clinic',
    'other'
  ) THEN
    RAISE EXCEPTION 'Unsupported business type.'
      USING ERRCODE = '22023';
  END IF;

  IF v_model NOT IN ('single_branch', 'multi_branch_brand') THEN
    RAISE EXCEPTION 'Unsupported business model.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.businesses (
    slug,
    name_en,
    name_ar,
    business_type,
    business_model,
    status,
    default_locale,
    timezone,
    currency,
    description_en,
    description_ar,
    phone,
    whatsapp_number,
    email,
    logo_url,
    cover_image_url,
    country,
    city,
    area,
    address_en,
    address_ar,
    latitude,
    longitude,
    updated_at
  )
  VALUES (
    v_slug,
    COALESCE(NULLIF(p_payload->>'name_en', ''), 'New Business'),
    COALESCE(NULLIF(p_payload->>'name_ar', ''), COALESCE(NULLIF(p_payload->>'name_en', ''), 'منشأة جديدة')),
    v_type,
    v_model,
    COALESCE(NULLIF(p_payload->>'status', ''), 'active'),
    COALESCE(NULLIF(p_payload->>'default_locale', ''), 'en'),
    COALESCE(NULLIF(p_payload->>'timezone', ''), 'Asia/Dubai'),
    COALESCE(NULLIF(p_payload->>'currency', ''), 'AED'),
    NULLIF(p_payload->>'description_en', ''),
    NULLIF(p_payload->>'description_ar', ''),
    NULLIF(p_payload->>'phone', ''),
    NULLIF(p_payload->>'whatsapp_phone', ''),
    NULLIF(p_payload->>'email', ''),
    NULLIF(p_payload->>'logo_url', ''),
    NULLIF(p_payload->>'cover_image_url', ''),
    COALESCE(NULLIF(p_payload->>'country', ''), 'UAE'),
    NULLIF(p_payload->>'city', ''),
    NULLIF(p_payload->>'area', ''),
    NULLIF(p_payload->>'address_en', ''),
    NULLIF(p_payload->>'address_ar', ''),
    NULLIF(p_payload->>'latitude', '')::numeric,
    NULLIF(p_payload->>'longitude', '')::numeric,
    now()
  )
  RETURNING id INTO v_business_id;

  IF jsonb_array_length(v_working_days) = 0 THEN
    v_working_days := jsonb_build_array(
      jsonb_build_object('day_of_week', 0, 'is_active', true, 'open_time', '10:00', 'close_time', '22:00'),
      jsonb_build_object('day_of_week', 1, 'is_active', true, 'open_time', '10:00', 'close_time', '22:00'),
      jsonb_build_object('day_of_week', 2, 'is_active', true, 'open_time', '10:00', 'close_time', '22:00'),
      jsonb_build_object('day_of_week', 3, 'is_active', true, 'open_time', '10:00', 'close_time', '22:00'),
      jsonb_build_object('day_of_week', 4, 'is_active', true, 'open_time', '10:00', 'close_time', '22:00'),
      jsonb_build_object('day_of_week', 5, 'is_active', false, 'open_time', '10:00', 'close_time', '22:00'),
      jsonb_build_object('day_of_week', 6, 'is_active', true, 'open_time', '10:00', 'close_time', '22:00')
    );
  END IF;

  FOR v_day IN
    SELECT *
    FROM jsonb_to_recordset(v_working_days) AS x(
      day_of_week integer,
      is_active boolean,
      open_time text,
      close_time text
    )
  LOOP
    INSERT INTO public.business_working_days (
      business_id,
      day_of_week,
      is_active,
      open_time,
      close_time,
      updated_at
    )
    VALUES (
      v_business_id,
      v_day.day_of_week,
      COALESCE(v_day.is_active, true),
      COALESCE(NULLIF(v_day.open_time, ''), '10:00')::time,
      COALESCE(NULLIF(v_day.close_time, ''), '22:00')::time,
      now()
    )
    ON CONFLICT (business_id, day_of_week)
    DO UPDATE SET
      is_active = EXCLUDED.is_active,
      open_time = EXCLUDED.open_time,
      close_time = EXCLUDED.close_time,
      updated_at = now();
  END LOOP;

  FOR v_module IN
    SELECT key, value
    FROM jsonb_each(COALESCE(v_modules, '{}'::jsonb))
  LOOP
    INSERT INTO public.business_modules (business_id, module_key, enabled, updated_at)
    VALUES (v_business_id, v_module.key, (v_module.value #>> '{}')::boolean, now())
    ON CONFLICT (business_id, module_key)
    DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();
  END LOOP;

  IF v_owner_email IS NOT NULL THEN
    SELECT u.id
    INTO v_owner_id
    FROM auth.users u
    WHERE lower(u.email) = v_owner_email
    LIMIT 1;

    IF v_owner_id IS NULL THEN
      v_owner_status := 'user_not_found';
    ELSE
      INSERT INTO public.business_memberships (business_id, user_id, role)
      VALUES (v_business_id, v_owner_id, 'business_owner')
      ON CONFLICT (business_id, user_id, role) DO NOTHING;
      v_owner_status := 'assigned_business_owner';
    END IF;
  END IF;

  IF v_seed_services THEN
    IF v_type IN ('gents_salon', 'barbershop') THEN
      v_seed := jsonb_build_array(
        jsonb_build_object('title_en', 'Classic Haircut', 'title_ar', 'قص الشعر الكلاسيكي', 'slug', 'classic-haircut', 'price', 150, 'duration', 45),
        jsonb_build_object('title_en', 'Beard Trim', 'title_ar', 'تهذيب اللحية', 'slug', 'beard-trim', 'price', 100, 'duration', 30),
        jsonb_build_object('title_en', 'Haircut + Beard', 'title_ar', 'قص الشعر واللحية', 'slug', 'haircut-beard', 'price', 220, 'duration', 75),
        jsonb_build_object('title_en', 'Facial Care', 'title_ar', 'العناية بالوجه', 'slug', 'facial-care', 'price', 180, 'duration', 45)
      );
    ELSIF v_type = 'spa' THEN
      v_seed := jsonb_build_array(
        jsonb_build_object('title_en', 'Massage Session', 'title_ar', 'جلسة مساج', 'slug', 'massage-session', 'price', 250, 'duration', 60),
        jsonb_build_object('title_en', 'Facial Treatment', 'title_ar', 'علاج الوجه', 'slug', 'facial-treatment', 'price', 220, 'duration', 60),
        jsonb_build_object('title_en', 'Body Scrub', 'title_ar', 'تقشير الجسم', 'slug', 'body-scrub', 'price', 300, 'duration', 75),
        jsonb_build_object('title_en', 'Relaxation Package', 'title_ar', 'باقة الاسترخاء', 'slug', 'relaxation-package', 'price', 450, 'duration', 120)
      );
    ELSE
      v_seed := jsonb_build_array(
        jsonb_build_object('title_en', 'Hair Styling', 'title_ar', 'تصفيف الشعر', 'slug', 'hair-styling', 'price', 180, 'duration', 45),
        jsonb_build_object('title_en', 'Coloring', 'title_ar', 'صبغ الشعر', 'slug', 'coloring', 'price', 300, 'duration', 90),
        jsonb_build_object('title_en', 'Facial', 'title_ar', 'عناية الوجه', 'slug', 'facial', 'price', 220, 'duration', 60),
        jsonb_build_object('title_en', 'Manicure', 'title_ar', 'مانيكير', 'slug', 'manicure', 'price', 120, 'duration', 45)
      );
    END IF;

    FOR v_service IN
      SELECT *
      FROM jsonb_to_recordset(v_seed) AS x(
        title_en text,
        title_ar text,
        slug text,
        price numeric,
        duration integer
      )
    LOOP
      INSERT INTO public.services (
        business_id,
        title_en,
        title_ar,
        slug_en,
        slug_ar,
        short_description_en,
        short_description_ar,
        description_en,
        description_ar,
        price,
        duration_minutes,
        default_duration_min,
        default_duration_max,
        buffer_minutes,
        is_active
      )
      SELECT
        v_business_id,
        v_service.title_en,
        v_service.title_ar,
        v_slug || '-' || v_service.slug,
        v_slug || '-' || v_service.slug,
        v_service.title_en,
        v_service.title_ar,
        v_service.title_en,
        v_service.title_ar,
        v_service.price,
        v_service.duration,
        greatest(5, v_service.duration - 10),
        v_service.duration + 10,
        5,
        true

      WHERE NOT EXISTS (
        SELECT 1
        FROM public.services existing
        WHERE existing.business_id = v_business_id
          AND existing.slug_en = v_slug || '-' || v_service.slug
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'business_id', v_business_id,
    'slug', v_slug,
    'owner_assignment', v_owner_status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_business_onboarding(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_onboarding(jsonb) TO authenticated;
