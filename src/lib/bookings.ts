import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

export const isBookingConflictError = (error: unknown) => {
  const maybeError = error as { code?: string; message?: string; details?: string } | null;
  const text = `${maybeError?.code ?? ""} ${maybeError?.message ?? ""} ${
    maybeError?.details ?? ""
  }`.toLowerCase();

  return (
    maybeError?.code === "23505" ||
    text.includes("bookings_unique_active_barber_slot") ||
    text.includes("duplicate key value violates unique constraint")
  );
};

export const bookingConflictMessage = (lang: Lang) => t(lang).reservation.barberAlreadyBooked;

export async function createAdminBooking(payload: BookingInsert) {
  return supabase.from("bookings").insert(payload).select("*").single();
}
