import { useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPES,
  MODULE_KEYS,
  MODULE_LABELS,
  MODULE_PRESETS,
  type BusinessType,
  type ModuleMap,
} from "@/lib/business-modules";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";

const canManageBusiness = (isAdmin: boolean, role: string | null) =>
  isAdmin || role === "business_owner" || role === "business_admin" || role === "business_manager";

export function AdminBusinessSettingsPage({ lang }: { lang: Lang }) {
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const [businessType, setBusinessType] = useState<BusinessType>("barbershop");
  const [moduleDraft, setModuleDraft] = useState<ModuleMap>(MODULE_PRESETS.barbershop);
  const [saving, setSaving] = useState(false);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/business-settings"),
  )}`;

  const business = businessContext.business;
  const allowed = canManageBusiness(auth.isAdmin, businessContext.currentUserRole);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.navigate({ to: loginHref });
    }
  }, [auth.loading, auth.user, loginHref, router]);

  useEffect(() => {
    if (!business) return;
    setBusinessType(business.business_type);
    setModuleDraft(businessContext.modules);
  }, [business, businessContext.modules]);

  const businessName = useMemo(() => {
    if (!business) return "";
    return lang === "ar" ? business.name_ar : business.name_en;
  }, [business, lang]);

  const applyPreset = (nextType: BusinessType) => {
    setBusinessType(nextType);
    setModuleDraft(MODULE_PRESETS[nextType]);
  };

  const saveSettings = async () => {
    if (!business) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_update_business_modules", {
        p_business_id: business.id,
        p_business_type: businessType,
        p_modules: moduleDraft,
      });
      if (error) throw error;
      toast.success(tt.business.settingsSaved);
      await businessContext.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.business.settingsError;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (auth.loading || businessContext.loading) {
    return (
      <Section lang={lang}>
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          {tt.business.loading}
        </div>
      </Section>
    );
  }

  if (!auth.user) return null;

  if (!allowed) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.admin.title}>
        <Alert>
          <AlertTitle>{tt.admin.notAdmin}</AlertTitle>
          <AlertDescription>{tt.admin.notAdmin}</AlertDescription>
        </Alert>
      </Section>
    );
  }

  if (!business) {
    return (
      <Section lang={lang} eyebrow={tt.business.platform} title={tt.business.settingsTitle}>
        <Alert>
          <AlertTitle>{tt.business.noBusinesses}</AlertTitle>
          <AlertDescription>{businessContext.error ?? tt.business.noBusinesses}</AlertDescription>
        </Alert>
      </Section>
    );
  }

  return (
    <Section lang={lang} eyebrow={tt.business.platform} title={tt.business.settingsTitle}>
      <div className="space-y-6">
        <p className="max-w-3xl text-sm text-muted-foreground">{tt.business.settingsIntro}</p>

        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">{tt.business.currentBusiness}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm text-muted-foreground">
                {tt.business.currentBusiness}
              </div>
              {businessContext.businesses.length > 1 ? (
                <Select
                  value={businessContext.selectedBusinessSlug}
                  onValueChange={businessContext.setSelectedBusinessSlug}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businessContext.businesses.map((item) => (
                      <SelectItem key={item.id} value={item.slug}>
                        {lang === "ar" ? item.name_ar : item.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                  {businessName}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-sm text-muted-foreground">{tt.business.businessType}</div>
              <Select
                value={businessType}
                onValueChange={(value) => applyPreset(value as BusinessType)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {BUSINESS_TYPE_LABELS[type][lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">{tt.business.modules}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {MODULE_KEYS.map((moduleKey) => (
              <label
                key={moduleKey}
                className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/60 px-4 py-3"
              >
                <span className="text-sm font-medium">{MODULE_LABELS[moduleKey][lang]}</span>
                <Switch
                  checked={moduleDraft[moduleKey]}
                  onCheckedChange={(checked) =>
                    setModuleDraft((current) => ({ ...current, [moduleKey]: checked }))
                  }
                />
              </label>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? tt.common.loading : tt.business.saveSettings}
          </Button>
        </div>
      </div>
    </Section>
  );
}
