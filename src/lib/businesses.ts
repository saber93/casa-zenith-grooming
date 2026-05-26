import { supabase } from "@/integrations/supabase/client";
import type { BusinessType, ModuleMap } from "@/lib/business-modules";

export type BusinessModel = "single_branch" | "multi_branch_brand";

export type WorkingDayDraft = {
  day_of_week: number;
  is_active: boolean;
  open_time: string;
  close_time: string;
};

export type BusinessOnboardingPayload = {
  business_type: BusinessType;
  business_model: BusinessModel;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en?: string;
  description_ar?: string;
  phone?: string;
  whatsapp_phone?: string;
  email?: string;
  logo_url?: string;
  cover_image_url?: string;
  country?: string;
  city?: string;
  area?: string;
  address_en?: string;
  address_ar?: string;
  latitude?: string;
  longitude?: string;
  currency: string;
  timezone: string;
  default_locale: string;
  modules: ModuleMap;
  working_days: WorkingDayDraft[];
  owner_email?: string;
  owner_name?: string;
  owner_phone?: string;
  seed_services: boolean;
};

export type BusinessOnboardingResult = {
  business_id: string;
  slug: string;
  owner_assignment: "assigned_business_owner" | "user_not_found" | "skipped" | string;
};

export type BusinessWithOwnerResult = {
  business_id: string;
  slug: string;
  owner: {
    user_id: string;
    name: string;
    email: string;
    phone: string | null;
    must_change_password: boolean;
    temporary_password: string;
  };
};

export type AdminBusinessRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  business_type: BusinessType;
  business_model: BusinessModel;
  status: "active" | "inactive" | "draft" | string;
  city: string | null;
  area: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  created_at: string | null;
};

export async function fetchAdminBusinesses() {
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, slug, name_en, name_ar, business_type, business_model, status, city, area, phone, email, logo_url, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdminBusinessRow[];
}

export async function createBusinessOnboarding(payload: BusinessOnboardingPayload) {
  const { data, error } = await supabase.rpc("create_business_onboarding", {
    p_payload: payload,
  });
  if (error) throw error;
  return data as BusinessOnboardingResult;
}

export async function createBusinessWithOwner(payload: BusinessOnboardingPayload) {
  const { data, error } = await supabase.functions.invoke("create-business-with-owner", {
    body: payload,
  });
  if (error) throw error;
  return data as BusinessWithOwnerResult;
}

export async function updateBusinessStatus(businessId: string, status: "active" | "inactive") {
  const { error } = await supabase
    .from("businesses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", businessId);
  if (error) throw error;
}
