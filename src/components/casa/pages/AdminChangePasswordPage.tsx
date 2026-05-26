import { useRouter } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Lang } from "@/lib/i18n";
import { localePath } from "@/lib/i18n";

const DICT = {
  en: {
    eyebrow: "Security",
    title: "Change your temporary password",
    description: "For your security, please create a new password before accessing your dashboard.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    button: "Update Password",
    success: "Password updated successfully.",
    mismatch: "Password confirmation does not match.",
    weak: "Password must be at least 10 characters and include uppercase, lowercase, number, and special character.",
    loading: "Checking your account…",
    signInRequired: "Please sign in before changing your password.",
  },
  ar: {
    eyebrow: "الأمان",
    title: "تغيير كلمة المرور المؤقتة",
    description: "لحماية حسابك، يرجى إنشاء كلمة مرور جديدة قبل الدخول إلى لوحة التحكم.",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    button: "تحديث كلمة المرور",
    success: "تم تحديث كلمة المرور بنجاح.",
    mismatch: "تأكيد كلمة المرور غير مطابق.",
    weak: "يجب أن تكون كلمة المرور 10 أحرف على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز خاص.",
    loading: "جارٍ التحقق من حسابك…",
    signInRequired: "يرجى تسجيل الدخول قبل تغيير كلمة المرور.",
  },
} as const;

const isStrongPassword = (value: string) =>
  value.length >= 10 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

export function AdminChangePasswordPage({ lang }: { lang: Lang }) {
  const d = DICT[lang];
  const router = useRouter();
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loginHref = useMemo(
    () =>
      `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
        localePath(lang, "/admin/change-password"),
      )}`,
    [lang],
  );

  useEffect(() => {
    if (!auth.loading && !auth.user) router.navigate({ to: loginHref });
  }, [auth.loading, auth.user, loginHref, router]);

  useEffect(() => {
    if (!auth.loading && auth.user && !auth.mustChangePassword) {
      router.navigate({ to: localePath(lang, "/admin") });
    }
  }, [auth.loading, auth.mustChangePassword, auth.user, lang, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isStrongPassword(password)) {
      toast.error(d.weak);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(d.mismatch);
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const { error: clearError } = await supabase.rpc("clear_must_change_password");
      if (clearError) throw clearError;

      await auth.refreshMustChangePassword();
      toast.success(d.success);
      router.navigate({ to: localePath(lang, "/admin") });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d.weak);
    } finally {
      setSubmitting(false);
    }
  };

  if (auth.loading) {
    return (
      <Section lang={lang}>
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          {d.loading}
        </div>
      </Section>
    );
  }

  if (!auth.user) {
    return (
      <Section lang={lang} eyebrow={d.eyebrow} title={d.title}>
        <Alert>
          <AlertTitle>{d.signInRequired}</AlertTitle>
          <AlertDescription>{d.description}</AlertDescription>
        </Alert>
      </Section>
    );
  }

  return (
    <Section lang={lang} eyebrow={d.eyebrow} title={d.title} intro={d.description}>
      <div className="mx-auto max-w-md">
        <Card className="border-border/60 bg-card shadow-elegant">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle className="font-serif text-2xl">{d.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">{d.newPassword}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{d.confirmPassword}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">{d.weak}</p>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "…" : d.button}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
