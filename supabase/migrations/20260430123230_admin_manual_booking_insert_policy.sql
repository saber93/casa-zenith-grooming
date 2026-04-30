-- Allow admins to create manual reservations with a chosen initial status.
DROP POLICY IF EXISTS "Admins can create bookings" ON public.bookings;

CREATE POLICY "Admins can create bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND length(customer_name) BETWEEN 1 AND 200
    AND length(customer_phone) BETWEEN 1 AND 50
    AND length(booking_time::text) BETWEEN 1 AND 20
    AND (notes IS NULL OR length(notes) <= 1000)
    AND (language IS NULL OR language IN ('en', 'ar'))
    AND coalesce(status, 'pending') IN ('pending', 'confirmed', 'cancelled', 'completed')
    AND booking_date >= CURRENT_DATE
  );
