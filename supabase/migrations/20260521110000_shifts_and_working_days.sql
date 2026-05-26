-- Migration: Casa Shifts, Vacations & Active Working Days
-- Scoped to businesses with RLS and indexed on business_id.

-- 1. Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_start time,
  break_end time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Alter public.barbers to add shift_id referencing public.shifts
ALTER TABLE public.barbers
ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL;

-- 2. Vacations (leaves) Table
CREATE TABLE IF NOT EXISTS public.vacations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (barber_id, day)
);

-- 3. Business Working Days Table
CREATE TABLE IF NOT EXISTS public.business_working_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, day_of_week)
);

-- 4. Triggers for updated_at
DO $$
DECLARE
  t_name text;
BEGIN
  FOREACH t_name IN ARRAY ARRAY['shifts', 'vacations', 'business_working_days']
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

-- 5. Indices
CREATE INDEX IF NOT EXISTS idx_shifts_business ON public.shifts (business_id);
CREATE INDEX IF NOT EXISTS idx_vacations_business_barber ON public.vacations (business_id, barber_id);
CREATE INDEX IF NOT EXISTS idx_vacations_day ON public.vacations (day);
CREATE INDEX IF NOT EXISTS idx_working_days_business ON public.business_working_days (business_id);

-- 6. Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_working_days ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Shifts
DROP POLICY IF EXISTS "Staff can do all with shifts" ON public.shifts;
CREATE POLICY "Staff can do all with shifts" ON public.shifts
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view shifts" ON public.shifts;
CREATE POLICY "Anyone can view shifts" ON public.shifts
  FOR SELECT TO anon, authenticated
  USING (true);

-- Vacations
DROP POLICY IF EXISTS "Staff can do all with vacations" ON public.vacations;
CREATE POLICY "Staff can do all with vacations" ON public.vacations
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view vacations" ON public.vacations;
CREATE POLICY "Anyone can view vacations" ON public.vacations
  FOR SELECT TO anon, authenticated
  USING (true);

-- Business Working Days
DROP POLICY IF EXISTS "Staff can do all with working days" ON public.business_working_days;
CREATE POLICY "Staff can do all with working days" ON public.business_working_days
  FOR ALL TO authenticated
  USING (public.check_user_is_business_staff(business_id, auth.uid()))
  WITH CHECK (public.check_user_is_business_staff(business_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view working days" ON public.business_working_days;
CREATE POLICY "Anyone can view working days" ON public.business_working_days
  FOR SELECT TO anon, authenticated
  USING (true);

-- 8. Seed default business working days for existing businesses
INSERT INTO public.business_working_days (business_id, day_of_week, is_active)
SELECT b.id, d, true
FROM public.businesses b
CROSS JOIN (SELECT generate_series(0, 6) AS d) AS days
ON CONFLICT (business_id, day_of_week) DO NOTHING;
