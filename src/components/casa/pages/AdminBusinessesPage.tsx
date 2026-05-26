import { useRouter } from "@tanstack/react-router";
import { Building2, Eye, Pencil, Plus, Power, RefreshCw, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard } from "@/lib/auth/useRoleGuard";
import { useBusinessContext } from "@/lib/business-context";
import { getBusinessTerminology } from "@/lib/business-terminology";
import {
  createBusinessWithOwner,
  fetchAdminBusinesses,
  updateBusinessStatus,
  type AdminBusinessRow,
  type BusinessModel,
  type BusinessOnboardingPayload,
  type BusinessWithOwnerResult,
  type WorkingDayDraft,
} from "@/lib/businesses";
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
import { cn } from "@/lib/utils";

const DICT = {
  en: {
    title: "Businesses",
    eyebrow: "Platform",
    intro: "Create and manage salon, spa, barbershop, massage, and beauty businesses.",
    createBusiness: "Create Business",
    edit: "Edit",
    viewDashboard: "View Dashboard",
    activate: "Activate",
    deactivate: "Deactivate",
    businessType: "Business Type",
    basicInfo: "Basic Info",
    workingHours: "Working Hours",
    enabledModules: "Enabled Modules",
    ownerAdmin: "Owner/Admin",
    starterServices: "Starter Services",
    search: "Search businesses",
    status: "Status",
    type: "Type",
    allTypes: "All types",
    allStatuses: "All statuses",
    noBusinesses: "No businesses found.",
    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
    logo: "Logo",
    nameEn: "Name EN",
    nameAr: "Name AR",
    slug: "Slug",
    descriptionEn: "Description EN",
    descriptionAr: "Description AR",
    phone: "Phone",
    whatsapp: "WhatsApp",
    email: "Email",
    logoUrl: "Logo URL",
    coverUrl: "Cover image URL",
    country: "Country",
    city: "City",
    area: "Area",
    addressEn: "Address EN",
    addressAr: "Address AR",
    latitude: "Latitude",
    longitude: "Longitude",
    businessModel: "Business model",
    singleBranch: "Single branch",
    multiBranch: "Multi-branch brand",
    ownerName: "Owner name",
    ownerEmail: "Owner email",
    ownerPhone: "Owner phone",
    ownerHelp: "A Supabase Auth owner account will be created instantly.",
    ownerAccountCreated: "Owner account created",
    temporaryPassword: "Temporary password",
    copyCredentials: "Copy credentials",
    copied: "Credentials copied.",
    close: "Close",
    changePasswordRequired: "Owner must change this password after first sign-in.",
    createStarterServices: "Create starter services",
    skipStarterServices: "Skip starter services",
    next: "Next",
    back: "Back",
    create: "Create",
    creating: "Creating…",
    refresh: "Refresh",
    businessCreated: "Business Created",
    businessUpdated: "Business Updated",
    selectBusiness: "Select Business",
    accessDenied: "You must be an admin to manage businesses.",
    ownerAssigned: "Owner assigned as business owner.",
    ownerNotFound: "Owner email was not found. Create the user in Supabase Auth first.",
    todo: "TODO: Introduce platform_admin/super_admin later to separate platform owner from business owner.",
    starterHint:
      "Starter services create catalog rows only. No financial transactions are created.",
    terminologyPreview: "Staff will be called",
    workspacePreview: "Workspace will be called",
  },
  ar: {
    title: "المنشآت",
    eyebrow: "المنصة",
    intro: "إنشاء وإدارة الصالونات والسبا والحلاقة والمساج ومراكز التجميل.",
    createBusiness: "إنشاء منشأة",
    edit: "تعديل",
    viewDashboard: "عرض لوحة التحكم",
    activate: "تفعيل",
    deactivate: "تعطيل",
    businessType: "نوع النشاط",
    basicInfo: "المعلومات الأساسية",
    workingHours: "ساعات العمل",
    enabledModules: "الوحدات المفعلة",
    ownerAdmin: "المالك / المدير",
    starterServices: "خدمات البداية",
    search: "ابحث عن المنشآت",
    status: "الحالة",
    type: "النوع",
    allTypes: "كل الأنواع",
    allStatuses: "كل الحالات",
    noBusinesses: "لا توجد منشآت.",
    active: "نشط",
    inactive: "غير نشط",
    draft: "مسودة",
    logo: "الشعار",
    nameEn: "الاسم بالإنجليزية",
    nameAr: "الاسم بالعربية",
    slug: "الرابط المختصر",
    descriptionEn: "الوصف بالإنجليزية",
    descriptionAr: "الوصف بالعربية",
    phone: "الهاتف",
    whatsapp: "واتساب",
    email: "البريد الإلكتروني",
    logoUrl: "رابط الشعار",
    coverUrl: "رابط صورة الغلاف",
    country: "الدولة",
    city: "المدينة",
    area: "المنطقة",
    addressEn: "العنوان بالإنجليزية",
    addressAr: "العنوان بالعربية",
    latitude: "خط العرض",
    longitude: "خط الطول",
    businessModel: "نموذج النشاط",
    singleBranch: "فرع واحد",
    multiBranch: "علامة متعددة الفروع",
    ownerName: "اسم المالك",
    ownerEmail: "بريد المالك",
    ownerPhone: "هاتف المالك",
    ownerHelp: "سيتم إنشاء حساب Supabase Auth للمالك فوراً.",
    ownerAccountCreated: "تم إنشاء حساب المالك",
    temporaryPassword: "كلمة المرور المؤقتة",
    copyCredentials: "نسخ بيانات الدخول",
    copied: "تم نسخ بيانات الدخول.",
    close: "إغلاق",
    changePasswordRequired: "يجب على المالك تغيير كلمة المرور بعد أول تسجيل دخول.",
    createStarterServices: "إنشاء خدمات بداية",
    skipStarterServices: "تخطي خدمات البداية",
    next: "التالي",
    back: "رجوع",
    create: "إنشاء",
    creating: "جارٍ الإنشاء…",
    refresh: "تحديث",
    businessCreated: "تم إنشاء المنشأة",
    businessUpdated: "تم تحديث المنشأة",
    selectBusiness: "اختر منشأة",
    accessDenied: "يجب أن تكون مديراً لإدارة المنشآت.",
    ownerAssigned: "تم تعيين المالك كمالك للنشاط.",
    ownerNotFound: "لم يتم العثور على البريد. أنشئ المستخدم في Supabase Auth أولاً.",
    todo: "TODO: إضافة دور platform_admin/super_admin لاحقاً لفصل مالك المنصة عن مالك النشاط.",
    starterHint: "خدمات البداية تنشئ عناصر كتالوج فقط ولا تنشئ أي معاملات مالية.",
    terminologyPreview: "سيتم تسمية الموظفين",
    workspacePreview: "سيتم تسمية مساحة العمل",
  },
} as const;

const STEPS = [
  "businessType",
  "basicInfo",
  "workingHours",
  "enabledModules",
  "ownerAdmin",
  "starterServices",
] as const;

const DAY_LABELS = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

const defaultWorkingDays = (): WorkingDayDraft[] =>
  Array.from({ length: 7 }, (_, day) => ({
    day_of_week: day,
    is_active: day !== 5,
    open_time: "10:00",
    close_time: "22:00",
  }));

const initialPayload = (): BusinessOnboardingPayload => ({
  business_type: "gents_salon",
  business_model: "single_branch",
  name_en: "",
  name_ar: "",
  slug: "",
  description_en: "",
  description_ar: "",
  phone: "",
  whatsapp_phone: "",
  email: "",
  logo_url: "",
  cover_image_url: "",
  country: "UAE",
  city: "",
  area: "",
  address_en: "",
  address_ar: "",
  latitude: "",
  longitude: "",
  currency: "AED",
  timezone: "Asia/Dubai",
  default_locale: "en",
  modules: MODULE_PRESETS.gents_salon,
  working_days: defaultWorkingDays(),
  owner_email: "",
  owner_name: "",
  owner_phone: "",
  seed_services: true,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function AdminBusinessesPage({ lang }: { lang: Lang }) {
  const d = DICT[lang];
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const { role: staffRole, loading: roleLoading } = useRoleGuard();
  const businessContext = useBusinessContext();
  const [businesses, setBusinesses] = useState<AdminBusinessRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<BusinessOnboardingPayload>(initialPayload);
  const [ownerCredentials, setOwnerCredentials] = useState<BusinessWithOwnerResult | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<BusinessType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const draftTerminology = getBusinessTerminology(draft.business_type, lang);

  const isAdmin = auth.isAdmin || staffRole === "admin";
  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/businesses"),
  )}`;

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      setBusinesses(await fetchAdminBusinesses());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tt.common.error);
    } finally {
      setLoading(false);
    }
  }, [tt.common.error]);

  useEffect(() => {
    if (!auth.loading && !auth.user) router.navigate({ to: loginHref });
  }, [auth.loading, auth.user, loginHref, router]);

  useEffect(() => {
    if (!auth.loading && !roleLoading && auth.user && isAdmin) {
      void loadBusinesses();
    }
  }, [auth.loading, roleLoading, auth.user, isAdmin, loadBusinesses]);

  const filteredBusinesses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return businesses.filter((business) => {
      const matchesQuery =
        !needle ||
        business.name_en.toLowerCase().includes(needle) ||
        business.name_ar.toLowerCase().includes(needle) ||
        business.slug.toLowerCase().includes(needle) ||
        (business.city ?? "").toLowerCase().includes(needle);
      const matchesType = typeFilter === "all" || business.business_type === typeFilter;
      const matchesStatus = statusFilter === "all" || business.status === statusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [businesses, query, statusFilter, typeFilter]);

  const updateDraft = <K extends keyof BusinessOnboardingPayload>(
    key: K,
    value: BusinessOnboardingPayload[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const applyType = (businessType: BusinessType) => {
    setDraft((current) => ({
      ...current,
      business_type: businessType,
      modules: MODULE_PRESETS[businessType],
    }));
  };

  const submitBusiness = async () => {
    if (!draft.name_en.trim() || !draft.slug.trim()) {
      toast.error(lang === "ar" ? "الاسم والرابط المختصر مطلوبان." : "Name and slug are required.");
      return;
    }
    if (!draft.owner_name?.trim() || !draft.owner_email?.trim()) {
      toast.error(
        lang === "ar"
          ? "اسم المالك وبريده الإلكتروني مطلوبان."
          : "Owner name and email are required.",
      );
      return;
    }

    setSaving(true);
    try {
      const result = await createBusinessWithOwner(draft);
      toast.success(d.businessCreated);
      toast.success(d.ownerAccountCreated);
      setOwnerCredentials(result);
      await loadBusinesses();
      await businessContext.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tt.common.error);
    } finally {
      setSaving(false);
    }
  };

  const resetDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setStep(0);
      setDraft(initialPayload());
      setOwnerCredentials(null);
    }
  };

  const copyOwnerCredentials = async () => {
    if (!ownerCredentials) return;
    const credentials = [
      d.businessCreated,
      `${d.ownerName}: ${ownerCredentials.owner.name}`,
      `${d.ownerEmail}: ${ownerCredentials.owner.email}`,
      `${d.temporaryPassword}: ${ownerCredentials.owner.temporary_password}`,
      d.changePasswordRequired,
    ].join("\n");
    await navigator.clipboard.writeText(credentials);
    toast.success(d.copied);
  };

  const toggleBusinessStatus = async (business: AdminBusinessRow) => {
    const nextStatus = business.status === "active" ? "inactive" : "active";
    try {
      await updateBusinessStatus(business.id, nextStatus);
      toast.success(d.businessUpdated);
      await loadBusinesses();
      await businessContext.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tt.common.error);
    }
  };

  const viewDashboard = (business: AdminBusinessRow) => {
    businessContext.setSelectedBusinessSlug(business.slug);
    router.navigate({ to: localePath(lang, "/admin") });
  };

  if (auth.loading || roleLoading) {
    return (
      <Section lang={lang}>
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          {tt.common.loading}
        </div>
      </Section>
    );
  }

  if (!auth.user) return null;

  if (!isAdmin) {
    return (
      <Section lang={lang} eyebrow={d.eyebrow} title={d.title}>
        <Alert>
          <AlertTitle>{tt.admin.notAdmin}</AlertTitle>
          <AlertDescription>{d.accessDenied}</AlertDescription>
        </Alert>
      </Section>
    );
  }

  return (
    <Section lang={lang} eyebrow={d.eyebrow} title={d.title}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="max-w-3xl text-sm text-muted-foreground">{d.intro}</p>
            <p className="mt-2 text-xs text-muted-foreground">{d.todo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadBusinesses} disabled={loading}>
              <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin")} />
              {d.refresh}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={resetDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="me-2 h-4 w-4" />
                  {d.createBusiness}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-border/60 bg-card">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">{d.createBusiness}</DialogTitle>
                  <DialogDescription>{d.intro}</DialogDescription>
                </DialogHeader>

                {ownerCredentials ? (
                  <div className="space-y-4 rounded-lg border border-primary/40 bg-background/40 p-5">
                    <div>
                      <h3 className="font-serif text-2xl text-primary">{d.ownerAccountCreated}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {d.changePasswordRequired}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Meta label={d.ownerName} value={ownerCredentials.owner.name} />
                      <Meta label={d.ownerEmail} value={ownerCredentials.owner.email} />
                      <Meta
                        label={d.temporaryPassword}
                        value={ownerCredentials.owner.temporary_password}
                      />
                      <Meta label={d.slug} value={ownerCredentials.slug} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={copyOwnerCredentials}>{d.copyCredentials}</Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetDialog(false);
                        }}
                      >
                        {d.close}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      {STEPS.map((stepKey, index) => (
                        <button
                          key={stepKey}
                          type="button"
                          onClick={() => setStep(index)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition",
                            step === index
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {d[stepKey]}
                        </button>
                      ))}
                    </div>

                    <div className="min-h-[360px] rounded-lg border border-border/60 bg-background/40 p-4">
                      {step === 0 && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{d.businessType}</Label>
                            <Select
                              value={draft.business_type}
                              onValueChange={(v) => applyType(v as BusinessType)}
                            >
                              <SelectTrigger>
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
                          <div className="space-y-2">
                            <Label>{d.businessModel}</Label>
                            <Select
                              value={draft.business_model}
                              onValueChange={(v) =>
                                updateDraft("business_model", v as BusinessModel)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single_branch">{d.singleBranch}</SelectItem>
                                <SelectItem value="multi_branch_brand">{d.multiBranch}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="rounded-lg border border-primary/25 bg-primary/10 p-4 text-sm md:col-span-2">
                            <div className="font-medium text-primary">
                              {d.terminologyPreview}: {draftTerminology.staffPlural}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              {d.workspacePreview}: {draftTerminology.staffWorkspace}
                            </div>
                          </div>
                        </div>
                      )}

                      {step === 1 && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label={d.nameEn}>
                            <Input
                              value={draft.name_en}
                              onChange={(event) => {
                                const value = event.target.value;
                                setDraft((current) => ({
                                  ...current,
                                  name_en: value,
                                  slug: current.slug ? current.slug : slugify(value),
                                }));
                              }}
                            />
                          </Field>
                          <Field label={d.nameAr}>
                            <Input
                              value={draft.name_ar}
                              onChange={(event) => updateDraft("name_ar", event.target.value)}
                            />
                          </Field>
                          <Field label={d.slug}>
                            <Input
                              value={draft.slug}
                              onChange={(event) => updateDraft("slug", slugify(event.target.value))}
                            />
                          </Field>
                          <Field label={d.email}>
                            <Input
                              value={draft.email}
                              onChange={(event) => updateDraft("email", event.target.value)}
                            />
                          </Field>
                          <Field label={d.phone}>
                            <Input
                              value={draft.phone}
                              onChange={(event) => updateDraft("phone", event.target.value)}
                            />
                          </Field>
                          <Field label={d.whatsapp}>
                            <Input
                              value={draft.whatsapp_phone}
                              onChange={(event) =>
                                updateDraft("whatsapp_phone", event.target.value)
                              }
                            />
                          </Field>
                          <Field label={d.logoUrl}>
                            <Input
                              value={draft.logo_url}
                              onChange={(event) => updateDraft("logo_url", event.target.value)}
                            />
                          </Field>
                          <Field label={d.coverUrl}>
                            <Input
                              value={draft.cover_image_url}
                              onChange={(event) =>
                                updateDraft("cover_image_url", event.target.value)
                              }
                            />
                          </Field>
                          <Field label={d.country}>
                            <Input
                              value={draft.country}
                              onChange={(event) => updateDraft("country", event.target.value)}
                            />
                          </Field>
                          <Field label={d.city}>
                            <Input
                              value={draft.city}
                              onChange={(event) => updateDraft("city", event.target.value)}
                            />
                          </Field>
                          <Field label={d.area}>
                            <Input
                              value={draft.area}
                              onChange={(event) => updateDraft("area", event.target.value)}
                            />
                          </Field>
                          <Field label={d.latitude}>
                            <Input
                              value={draft.latitude}
                              onChange={(event) => updateDraft("latitude", event.target.value)}
                            />
                          </Field>
                          <Field label={d.longitude}>
                            <Input
                              value={draft.longitude}
                              onChange={(event) => updateDraft("longitude", event.target.value)}
                            />
                          </Field>
                          <Field label={d.addressEn} className="md:col-span-2">
                            <Textarea
                              value={draft.address_en}
                              onChange={(event) => updateDraft("address_en", event.target.value)}
                            />
                          </Field>
                          <Field label={d.addressAr} className="md:col-span-2">
                            <Textarea
                              value={draft.address_ar}
                              onChange={(event) => updateDraft("address_ar", event.target.value)}
                            />
                          </Field>
                          <Field label={d.descriptionEn} className="md:col-span-2">
                            <Textarea
                              value={draft.description_en}
                              onChange={(event) =>
                                updateDraft("description_en", event.target.value)
                              }
                            />
                          </Field>
                          <Field label={d.descriptionAr} className="md:col-span-2">
                            <Textarea
                              value={draft.description_ar}
                              onChange={(event) =>
                                updateDraft("description_ar", event.target.value)
                              }
                            />
                          </Field>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="grid gap-3">
                          {draft.working_days.map((day) => (
                            <div
                              key={day.day_of_week}
                              className="grid gap-3 rounded-lg border border-border/60 bg-card/60 p-3 sm:grid-cols-[1fr_auto_auto_auto]"
                            >
                              <label className="flex items-center gap-3 text-sm font-medium">
                                <Switch
                                  checked={day.is_active}
                                  onCheckedChange={(checked) =>
                                    updateDraft(
                                      "working_days",
                                      draft.working_days.map((item) =>
                                        item.day_of_week === day.day_of_week
                                          ? { ...item, is_active: checked }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                                {DAY_LABELS[lang][day.day_of_week]}
                              </label>
                              <Input
                                type="time"
                                value={day.open_time}
                                disabled={!day.is_active}
                                onChange={(event) =>
                                  updateDraft(
                                    "working_days",
                                    draft.working_days.map((item) =>
                                      item.day_of_week === day.day_of_week
                                        ? { ...item, open_time: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <Input
                                type="time"
                                value={day.close_time}
                                disabled={!day.is_active}
                                onChange={(event) =>
                                  updateDraft(
                                    "working_days",
                                    draft.working_days.map((item) =>
                                      item.day_of_week === day.day_of_week
                                        ? { ...item, close_time: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {step === 3 && (
                        <div className="grid gap-3 md:grid-cols-2">
                          {MODULE_KEYS.map((moduleKey) => (
                            <label
                              key={moduleKey}
                              className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/60 px-4 py-3"
                            >
                              <span className="text-sm font-medium">
                                {MODULE_LABELS[moduleKey][lang]}
                              </span>
                              <Switch
                                checked={draft.modules[moduleKey]}
                                onCheckedChange={(checked) =>
                                  updateDraft("modules", {
                                    ...draft.modules,
                                    [moduleKey]: checked,
                                  } as ModuleMap)
                                }
                              />
                            </label>
                          ))}
                        </div>
                      )}

                      {step === 4 && (
                        <div className="max-w-xl space-y-3">
                          <Field label={d.ownerName}>
                            <Input
                              value={draft.owner_name}
                              onChange={(event) => updateDraft("owner_name", event.target.value)}
                            />
                          </Field>
                          <Field label={d.ownerEmail}>
                            <Input
                              type="email"
                              value={draft.owner_email}
                              onChange={(event) => updateDraft("owner_email", event.target.value)}
                            />
                          </Field>
                          <Field label={d.ownerPhone}>
                            <Input
                              value={draft.owner_phone}
                              onChange={(event) => updateDraft("owner_phone", event.target.value)}
                            />
                          </Field>
                          <p className="text-xs text-muted-foreground">{d.ownerHelp}</p>
                        </div>
                      )}

                      {step === 5 && (
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 p-4">
                            <Checkbox
                              checked={draft.seed_services}
                              onCheckedChange={(checked) =>
                                updateDraft("seed_services", checked === true)
                              }
                            />
                            <span className="text-sm font-medium">
                              {draft.seed_services
                                ? d.createStarterServices
                                : d.skipStarterServices}
                            </span>
                          </label>
                          <p className="text-xs text-muted-foreground">{d.starterHint}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setStep((current) => Math.max(0, current - 1))}
                        disabled={step === 0}
                      >
                        {d.back}
                      </Button>
                      {step < STEPS.length - 1 ? (
                        <Button
                          onClick={() =>
                            setStep((current) => Math.min(STEPS.length - 1, current + 1))
                          }
                        >
                          {d.next}
                        </Button>
                      ) : (
                        <Button onClick={submitBusiness} disabled={saving}>
                          <Sparkles className="me-2 h-4 w-4" />
                          {saving ? d.creating : d.create}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-border/60 bg-card">
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={d.search}
                className="ps-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as BusinessType | "all")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{d.allTypes}</SelectItem>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {BUSINESS_TYPE_LABELS[type][lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{d.allStatuses}</SelectItem>
                <SelectItem value="active">{d.active}</SelectItem>
                <SelectItem value="inactive">{d.inactive}</SelectItem>
                <SelectItem value="draft">{d.draft}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {filteredBusinesses.length === 0 ? (
          <Card className="border-border/60 bg-card">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {loading ? tt.common.loading : d.noBusinesses}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredBusinesses.map((business) => (
              <Card key={business.id} className="border-border/60 bg-card">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                      {business.logo_url ? (
                        <img
                          src={business.logo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate font-serif text-xl">
                        {lang === "ar" ? business.name_ar : business.name_en}
                      </CardTitle>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        /{business.slug}
                      </p>
                    </div>
                  </div>
                  <Badge variant={business.status === "active" ? "default" : "secondary"}>
                    {business.status === "active"
                      ? d.active
                      : business.status === "inactive"
                        ? d.inactive
                        : d.draft}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <Meta
                      label={d.type}
                      value={
                        BUSINESS_TYPE_LABELS[business.business_type]?.[lang] ??
                        business.business_type
                      }
                    />
                    <Meta
                      label={d.businessModel}
                      value={
                        business.business_model === "multi_branch_brand"
                          ? d.multiBranch
                          : d.singleBranch
                      }
                    />
                    <Meta
                      label={d.city}
                      value={[business.city, business.area].filter(Boolean).join(" / ") || "—"}
                    />
                    <Meta label={d.phone} value={business.phone ?? "—"} />
                    <Meta label={d.email} value={business.email ?? "—"} />
                    <Meta label={d.status} value={business.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => viewDashboard(business)}>
                      <Eye className="me-2 h-4 w-4" />
                      {d.viewDashboard}
                    </Button>
                    <Button size="sm" variant="outline" disabled>
                      <Pencil className="me-2 h-4 w-4" />
                      {d.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleBusinessStatus(business)}
                    >
                      <Power className="me-2 h-4 w-4" />
                      {business.status === "active" ? d.deactivate : d.activate}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}
