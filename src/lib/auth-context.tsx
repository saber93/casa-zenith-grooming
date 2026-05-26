import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { hasSupabaseClientEnv, supabase } from "@/integrations/supabase/client";

export type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  mustChangePassword: boolean;
  refreshAdmin: () => Promise<void>;
  refreshMustChangePassword: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const checkAdmin = async (uid: string | undefined) => {
    if (!uid) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", ["admin", "platform_admin"])
        .maybeSingle();
      setIsAdmin(!!data);
    } catch (error) {
      console.error("[Auth] Unable to check admin role.", error);
      setIsAdmin(false);
    }
  };

  const checkMustChangePassword = async (uid: string | undefined) => {
    if (!uid) {
      setMustChangePassword(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc("get_must_change_password");
      if (error) throw error;
      setMustChangePassword(data === true);
    } catch (error) {
      console.warn("[Auth] Unable to check password-change flag.", error);
      setMustChangePassword(false);
    }
  };

  useEffect(() => {
    if (!hasSupabaseClientEnv()) {
      console.warn("[Auth] Supabase browser env is missing; admin auth is disabled.");
      setLoading(false);
      setIsAdmin(false);
      return;
    }

    // Set up listener BEFORE getSession (per Supabase guidance).
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        // Defer admin check to avoid recursion inside auth callback.
        setTimeout(() => {
          void checkAdmin(s?.user?.id);
          void checkMustChangePassword(s?.user?.id);
        }, 0);
      });

      supabase.auth
        .getSession()
        .then(({ data: { session: s } }) => {
          setSession(s);
          Promise.all([checkAdmin(s?.user?.id), checkMustChangePassword(s?.user?.id)]).finally(() =>
            setLoading(false),
          );
        })
        .catch((error) => {
          console.error("[Auth] Unable to load session.", error);
          setLoading(false);
        });

      return () => sub.subscription.unsubscribe();
    } catch (error) {
      console.error("[Auth] Supabase auth initialization failed.", error);
      setLoading(false);
      return;
    }
  }, []);

  const refreshAdmin = async () => {
    if (!hasSupabaseClientEnv()) return;
    await checkAdmin(session?.user?.id);
  };
  const refreshMustChangePassword = async () => {
    if (!hasSupabaseClientEnv()) return;
    await checkMustChangePassword(session?.user?.id);
  };
  const signOut = async () => {
    if (!hasSupabaseClientEnv()) return;
    await supabase.auth.signOut();
    setMustChangePassword(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isAdmin,
        mustChangePassword,
        refreshAdmin,
        refreshMustChangePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
