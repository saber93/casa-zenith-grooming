import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { AlertCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasSupabaseClientEnv, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";

type Mode = "signin" | "signup";

const safeRedirect = (lang: Lang, redirect: string) => {
  const fallback = localePath(lang, "/admin/bookings");
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) return fallback;
  return redirect;
};

export function LoginPage({ lang, redirect }: { lang: Lang; redirect: string }) {
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = useMemo(() => safeRedirect(lang, redirect), [lang, redirect]);
  const authConfigured = hasSupabaseClientEnv();

  useEffect(() => {
    if (!auth.loading && auth.user && auth.isAdmin) {
      router.navigate({ to: redirectTo });
    }
  }, [auth.loading, auth.user, auth.isAdmin, redirectTo, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authConfigured) {
      toast.error(tt.login.authUnavailable);
      return;
    }
    if (!email.trim() || !password) {
      toast.error(tt.login.missingFields);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success(tt.login.created);
        setMode("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      await auth.refreshAdmin();
      toast.success(tt.login.success);
      router.navigate({ to: redirectTo });
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.common.error;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section lang={lang} eyebrow={tt.login.eyebrow} title={tt.login.title} intro={tt.login.intro}>
      <div className="mx-auto max-w-md">
        <div className="rounded-lg border border-border/60 bg-card p-6 shadow-elegant">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>

          {!authConfigured && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tt.common.error}</AlertTitle>
              <AlertDescription>{tt.login.authUnavailable}</AlertDescription>
            </Alert>
          )}

          {auth.loading ? (
            <p className="text-sm text-muted-foreground">{tt.login.checking}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-email">{tt.login.email}</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">{tt.login.password}</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !authConfigured}>
                {submitting ? "…" : mode === "signin" ? tt.login.submit : tt.login.signup}
              </Button>
            </form>
          )}

          <button
            type="button"
            className="mt-5 text-sm text-primary hover:underline"
            onClick={() => setMode((current) => (current === "signin" ? "signup" : "signin"))}
          >
            {mode === "signin" ? tt.login.switchSignup : tt.login.switchLogin}
          </button>
        </div>
      </div>
    </Section>
  );
}
