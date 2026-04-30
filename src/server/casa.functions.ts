import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseServer } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ===== Public reads =====

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseServer
    .from("services")
    .select(
      "id, slug_en, slug_ar, title_en, title_ar, short_description_en, short_description_ar, description_en, description_ar, price, duration_minutes, image_url",
    )
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getServiceBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string(), lang: z.enum(["en", "ar"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const col = data.lang === "ar" ? "slug_ar" : "slug_en";
    const { data: row, error } = await supabaseServer
      .from("services")
      .select("*")
      .eq(col, data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseServer
    .from("products")
    .select(
      "id, slug_en, slug_ar, name_en, name_ar, description_en, description_ar, price, image_url, whatsapp_order_text_en, whatsapp_order_text_ar",
    )
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listBarbers = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseServer
    .from("barbers")
    .select("id, name_en, name_ar, bio_en, bio_ar, photo_url")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ===== Public booking creation =====

const createBookingInput = z.object({
  service_id: z.string().uuid(),
  barber_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(1).max(50),
  booking_date: z.string(),
  booking_time: z.string(),
  notes: z.string().max(1000).optional().nullable(),
  language: z.enum(["en", "ar"]).default("en"),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createBookingInput.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseServer.from("bookings").insert({
      service_id: data.service_id,
      barber_id: data.barber_id ?? null,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      booking_date: data.booking_date,
      booking_time: data.booking_time,
      notes: data.notes ?? null,
      language: data.language,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Admin =====

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) return { isAdmin: false };
    return { isAdmin: !!data };
  });

export const listBookingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    // Hydrate service names server-side using public data.
    const { data: services } = await supabaseServer
      .from("services")
      .select("id, title_en, title_ar");
    const map = new Map((services ?? []).map((s) => [s.id, s]));
    return (data ?? []).map((b) => ({
      ...b,
      service_title_en: b.service_id ? (map.get(b.service_id)?.title_en ?? null) : null,
      service_title_ar: b.service_id ? (map.get(b.service_id)?.title_ar ?? null) : null,
    }));
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Sitemap data =====
export const getSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const { data: services } = await supabaseServer
    .from("services")
    .select("slug_en, slug_ar")
    .eq("is_active", true);
  return { services: services ?? [] };
});
