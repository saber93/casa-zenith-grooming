
-- Lock down SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Replace `WITH CHECK (true)` insert policies with input-length guards
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;
CREATE POLICY "Public can create bookings"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(customer_name) BETWEEN 1 AND 200
    AND length(customer_phone) BETWEEN 1 AND 50
    AND (notes IS NULL OR length(notes) <= 1000)
    AND status = 'pending'
    AND booking_date >= CURRENT_DATE
  );

DROP POLICY IF EXISTS "Public can insert customers" ON public.customers;
CREATE POLICY "Public can insert customers"
  ON public.customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(full_name) BETWEEN 1 AND 200
    AND length(phone) BETWEEN 1 AND 50
    AND (email IS NULL OR length(email) <= 320)
  );
