-- Public catalog reads should work with the publishable key.
-- Public pages no longer require the service-role key for services, products, or barbers.

DROP POLICY IF EXISTS "Public can read active services" ON public.services;
CREATE POLICY "Public can read active services"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (is_active IS TRUE);

DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_active IS TRUE);

DROP POLICY IF EXISTS "Public can read active barbers" ON public.barbers;
CREATE POLICY "Public can read active barbers"
  ON public.barbers FOR SELECT
  TO anon, authenticated
  USING (is_active IS TRUE);
