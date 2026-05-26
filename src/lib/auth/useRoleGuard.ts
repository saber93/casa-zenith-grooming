import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useBusinessContext } from "@/lib/business-context";

export type StaffRole =
  | "admin"
  | "platform_admin"
  | "business_owner"
  | "business_admin"
  | "business_manager"
  | "reception"
  | "barber"
  | "viewer"
  | "cashier"
  | "staff";

export type RoleGuardState = {
  role: StaffRole | null;
  globalRole: StaffRole | null;
  businessRole: StaffRole | null;
  activeBusinessId: string | null;
  assignedBarberId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  isBusinessOwner: boolean;
  isBusinessAdmin: boolean;
  isReception: boolean;
  isBarber: boolean;
  isViewer: boolean;
  isCashier: boolean;
  can: (action: string) => boolean;
};

export function useRoleGuard(): RoleGuardState {
  const { user, isAdmin: legacyAdmin, loading: authLoading } = useAuth();
  const businessContext = useBusinessContext();
  const [globalRole, setGlobalRole] = useState<StaffRole | null>(null);
  const [globalBarberId, setGlobalBarberId] = useState<string | null>(null);
  const [businessRole, setBusinessRole] = useState<StaffRole | null>(null);
  const [businessBarberId, setBusinessBarberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setGlobalRole(null);
      setGlobalBarberId(null);
      setBusinessRole(null);
      setBusinessBarberId(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role, barber_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          if (data) {
            setGlobalRole(data.role as StaffRole);
            setGlobalBarberId(data.barber_id);
          } else {
            setGlobalRole(null);
            setGlobalBarberId(null);
          }
        }
      } catch (err) {
        console.error("[useRoleGuard] Error fetching user role:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || businessContext.loading) return;
    if (!user || !businessContext.business?.id) {
      setBusinessRole(null);
      setBusinessBarberId(null);
      setMembershipLoading(false);
      return;
    }

    let isMounted = true;
    setMembershipLoading(true);

    const fetchMembership = async () => {
      try {
        const { data, error } = await supabase
          .from("business_memberships")
          .select("role, barber_id")
          .eq("user_id", user.id)
          .eq("business_id", businessContext.business!.id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          setBusinessRole((data?.role as StaffRole | undefined) ?? null);
          setBusinessBarberId(data?.barber_id ?? null);
        }
      } catch (err) {
        console.error("[useRoleGuard] Error fetching business membership:", err);
        if (isMounted) {
          setBusinessRole((businessContext.currentUserRole as StaffRole | null) ?? null);
          setBusinessBarberId(null);
        }
      } finally {
        if (isMounted) setMembershipLoading(false);
      }
    };

    void fetchMembership();

    return () => {
      isMounted = false;
    };
  }, [
    authLoading,
    businessContext.business,
    businessContext.currentUserRole,
    businessContext.loading,
    user,
  ]);

  const effectiveBusinessRole =
    businessRole ?? ((businessContext.currentUserRole as StaffRole | null) || null);
  const isPlatformAdmin = legacyAdmin || globalRole === "admin" || globalRole === "platform_admin";
  const role: StaffRole | null = isPlatformAdmin ? "admin" : (effectiveBusinessRole ?? globalRole);
  const activeBusinessId = businessContext.business?.id ?? null;
  const assignedBarberId = businessBarberId ?? globalBarberId;
  const isBusinessOwner = effectiveBusinessRole === "business_owner";
  const isBusinessAdmin =
    effectiveBusinessRole === "business_admin" || effectiveBusinessRole === "business_manager";
  const isReception = role === "reception";
  const isBarber = role === "barber";
  const isViewer = role === "viewer";
  const isCashier = role === "cashier";
  const isAdmin = isPlatformAdmin;

  const can = (action: string): boolean => {
    if (isAdmin) return true;
    if (isBusinessOwner || isBusinessAdmin) return true;
    if (isViewer) {
      return ["view_dashboard", "view_queue_display"].includes(action);
    }
    if (isReception) {
      return [
        "view_dashboard",
        "view_bookings",
        "view_queue",
        "view_queue_display",
        "view_customers",
        "operate_bookings",
        "operate_queue",
      ].includes(action);
    }
    if (isCashier) {
      return [
        "view_dashboard",
        "view_bookings",
        "view_queue",
        "view_queue_display",
        "view_customers",
        "operate_bookings",
        "operate_queue",
        "operate_payments",
        "operate_invoices",
      ].includes(action);
    }
    if (isBarber) {
      return ["view_barber_workspace", "operate_own_queue", "view_queue_display"].includes(action);
    }
    return false;
  };

  return {
    role,
    globalRole,
    businessRole: effectiveBusinessRole,
    activeBusinessId,
    assignedBarberId,
    loading: authLoading || loading || membershipLoading || businessContext.loading,
    isAdmin,
    isPlatformAdmin,
    isBusinessOwner,
    isBusinessAdmin,
    isReception,
    isBarber,
    isViewer,
    isCashier,
    can,
  };
}
