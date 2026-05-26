import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Section } from "@/components/casa/Section";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import {
  MODULE_KEYS,
  normalizeModules,
  type BusinessType,
  type ModuleKey,
  type ModuleMap,
} from "@/lib/business-modules";
import { useAuth } from "@/lib/auth-context";

const BUSINESS_STORAGE_KEY = "casa.selectedBusinessSlug";

export type BusinessSummary = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  business_type: BusinessType;
  status: string;
};

export type BusinessContextBusiness = BusinessSummary & {
  default_locale: string;
  timezone: string;
  currency: string;
  logo_url: string | null;
  accent_color: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_number: string | null;
  address_en: string | null;
  address_ar: string | null;
  city: string | null;
  country: string | null;
};

type BusinessContextValue = {
  business: BusinessContextBusiness | null;
  businesses: BusinessSummary[];
  modules: ModuleMap;
  currentUserRole: string | null;
  selectedBusinessSlug: string;
  loading: boolean;
  error: string | null;
  isModuleEnabled: (key: ModuleKey) => boolean;
  setSelectedBusinessSlug: (slug: string) => void;
  refresh: () => Promise<void>;
  isClosedToday: boolean;
};

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

const readInitialSlug = () => {
  if (typeof window === "undefined") return "casa";
  return window.localStorage.getItem(BUSINESS_STORAGE_KEY) || "casa";
};

export function BusinessProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [selectedBusinessSlug, setSelectedBusinessSlugState] = useState(readInitialSlug);
  const [business, setBusiness] = useState<BusinessContextBusiness | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [modules, setModules] = useState<ModuleMap>(() => normalizeModules(null));
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosedToday, setIsClosedToday] = useState(false);

  const loadBusinesses = useCallback(async () => {
    if (auth.user && !auth.isAdmin) {
      const { data: memberships, error: membershipError } = await supabase
        .from("business_memberships")
        .select("business_id, role, status")
        .eq("user_id", auth.user.id)
        .eq("status", "active");

      if (membershipError) throw membershipError;

      const businessIds = [...new Set((memberships ?? []).map((item) => item.business_id))];
      if (businessIds.length === 0) {
        setBusinesses([]);
        return [];
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("id, slug, name_en, name_ar, business_type, status")
        .eq("status", "active")
        .in("id", businessIds)
        .order("name_en");

      if (error) throw error;
      const rows = (data ?? []) as BusinessSummary[];
      setBusinesses(rows);
      return rows;
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("id, slug, name_en, name_ar, business_type, status")
      .eq("status", "active")
      .order("name_en");

    if (error) throw error;
    const rows = (data ?? []) as BusinessSummary[];
    setBusinesses(rows);
    return rows;
  }, [auth.isAdmin, auth.user]);

  const loadBusinessContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const availableBusinesses = await loadBusinesses();
      const effectiveSlug =
        availableBusinesses.length > 0 &&
        !availableBusinesses.some((item) => item.slug === selectedBusinessSlug)
          ? availableBusinesses[0].slug
          : selectedBusinessSlug;

      if (effectiveSlug !== selectedBusinessSlug) {
        setSelectedBusinessSlugState(effectiveSlug);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(BUSINESS_STORAGE_KEY, effectiveSlug);
        }
        return;
      }

      const { data, error } = await supabase.rpc("get_business_context", {
        p_slug: effectiveSlug,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        if (selectedBusinessSlug !== "casa") {
          setSelectedBusinessSlugState("casa");
          return;
        }
        throw new Error("Business context is unavailable.");
      }

      setBusiness(row as BusinessContextBusiness);
      setModules(
        normalizeModules(
          (row as { modules?: Record<string, boolean> }).modules,
          (row as { business_type?: BusinessType }).business_type ?? "barbershop",
        ),
      );
      setCurrentUserRole((row as { current_user_role?: string | null }).current_user_role ?? null);

      const todayDayOfWeek = new Date().getDay();
      const { data: workingDays } = await supabase
        .from("business_working_days")
        .select("is_active")
        .eq("business_id", row.id)
        .eq("day_of_week", todayDayOfWeek)
        .maybeSingle();

      setIsClosedToday(workingDays ? !workingDays.is_active : false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load business context.";
      setError(message);
      setBusiness(null);
      setModules(normalizeModules(null));
      setIsClosedToday(false);
    } finally {
      setLoading(false);
    }
  }, [loadBusinesses, selectedBusinessSlug]);

  useEffect(() => {
    loadBusinessContext();
  }, [loadBusinessContext, auth.user?.id, auth.isAdmin]);

  const setSelectedBusinessSlug = useCallback((slug: string) => {
    setSelectedBusinessSlugState(slug);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BUSINESS_STORAGE_KEY, slug);
    }
  }, []);

  const isModuleEnabled = useCallback((key: ModuleKey) => !!modules[key], [modules]);

  const value = useMemo(
    () => ({
      business,
      businesses,
      modules,
      currentUserRole,
      selectedBusinessSlug,
      loading,
      error,
      isModuleEnabled,
      setSelectedBusinessSlug,
      refresh: loadBusinessContext,
      isClosedToday,
    }),
    [
      business,
      businesses,
      modules,
      currentUserRole,
      selectedBusinessSlug,
      loading,
      error,
      isModuleEnabled,
      setSelectedBusinessSlug,
      loadBusinessContext,
      isClosedToday,
    ],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusinessContext must be used inside BusinessProvider");
  return ctx;
}

export function useModuleEnabled(key: ModuleKey) {
  return useBusinessContext().isModuleEnabled(key);
}

export function RequireModule({
  module,
  lang,
  children,
}: {
  module: ModuleKey;
  lang: Lang;
  children: ReactNode;
}) {
  const tt = t(lang);
  const business = useBusinessContext();

  if (business.loading) {
    return (
      <Section lang={lang}>
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          {tt.business.loading}
        </div>
      </Section>
    );
  }

  if (!MODULE_KEYS.includes(module) || business.isModuleEnabled(module)) return <>{children}</>;

  return (
    <Section
      lang={lang}
      eyebrow={tt.business.moduleDisabledEyebrow}
      title={tt.business.moduleDisabledTitle}
    >
      <Alert>
        <AlertTitle>{tt.business.moduleDisabledTitle}</AlertTitle>
        <AlertDescription>{tt.business.moduleDisabledDescription}</AlertDescription>
      </Alert>
    </Section>
  );
}
