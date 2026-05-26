import type { Lang } from "@/lib/i18n";

export const BUSINESS_TYPES = [
  "gents_salon",
  "ladies_salon",
  "barbershop",
  "salon",
  "spa",
  "massage",
  "beauty_salon",
  "clinic",
  "other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const MODULE_KEYS = [
  "reservations",
  "walk_in_queue",
  "barber_workspace",
  "queue_display",
  "queue_analytics",
  "products_catalog",
  "products_pos",
  "staff",
  "resources",
  "memberships",
  "discounts",
  "wallets",
  "suppliers_expenses",
  "reports",
  "public_directory",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type ModuleMap = Record<ModuleKey, boolean>;

export const DEFAULT_MODULES: ModuleMap = {
  reservations: true,
  walk_in_queue: false,
  barber_workspace: false,
  queue_display: false,
  queue_analytics: false,
  products_catalog: false,
  products_pos: false,
  staff: true,
  resources: false,
  memberships: false,
  discounts: false,
  wallets: false,
  suppliers_expenses: false,
  reports: true,
  public_directory: false,
};

export const MODULE_PRESETS: Record<BusinessType, ModuleMap> = {
  gents_salon: {
    ...DEFAULT_MODULES,
    walk_in_queue: true,
    barber_workspace: true,
    queue_display: true,
    queue_analytics: true,
    products_catalog: true,
    products_pos: true,
  },
  ladies_salon: {
    ...DEFAULT_MODULES,
    walk_in_queue: true,
    barber_workspace: true,
    queue_display: true,
    queue_analytics: true,
    products_catalog: true,
    products_pos: true,
    resources: true,
  },
  barbershop: {
    ...DEFAULT_MODULES,
    walk_in_queue: true,
    barber_workspace: true,
    queue_display: true,
    queue_analytics: true,
    products_catalog: true,
    products_pos: true,
  },
  salon: {
    ...DEFAULT_MODULES,
    walk_in_queue: true,
    barber_workspace: true,
    queue_display: true,
    queue_analytics: true,
    products_catalog: true,
    products_pos: true,
    resources: true,
  },
  spa: {
    ...DEFAULT_MODULES,
    resources: true,
    memberships: true,
    discounts: true,
  },
  massage: {
    ...DEFAULT_MODULES,
    resources: true,
  },
  beauty_salon: {
    ...DEFAULT_MODULES,
    walk_in_queue: true,
    barber_workspace: true,
    queue_display: true,
    queue_analytics: true,
    products_catalog: true,
    products_pos: true,
    resources: true,
  },
  clinic: {
    ...DEFAULT_MODULES,
    resources: true,
    memberships: true,
    discounts: true,
  },
  other: {
    ...DEFAULT_MODULES,
  },
};

export const MODULE_LABELS: Record<ModuleKey, { en: string; ar: string }> = {
  reservations: { en: "Reservations", ar: "الحجوزات" },
  walk_in_queue: { en: "Walk-in Queue", ar: "قائمة الانتظار" },
  barber_workspace: { en: "Staff Workspace", ar: "مساحة عمل الموظفين" },
  queue_display: { en: "Queue Display", ar: "شاشة قائمة الانتظار" },
  queue_analytics: { en: "Queue Analytics", ar: "تحليلات قائمة الانتظار" },
  products_catalog: { en: "Product Catalog", ar: "كتالوج المنتجات" },
  products_pos: { en: "Product Sales", ar: "مبيعات المنتجات" },
  staff: { en: "Staff", ar: "الفريق" },
  resources: { en: "Rooms & Chairs", ar: "الغرف والكراسي" },
  memberships: { en: "Memberships", ar: "العضويات" },
  discounts: { en: "Discounts", ar: "الخصومات" },
  wallets: { en: "Wallets", ar: "المحافظ" },
  suppliers_expenses: { en: "Suppliers & Expenses", ar: "الموردون والمصاريف" },
  reports: { en: "Reports", ar: "التقارير" },
  public_directory: { en: "Public Directory", ar: "الدليل العام" },
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, { en: string; ar: string }> = {
  gents_salon: { en: "Gents Salon", ar: "صالون رجالي" },
  ladies_salon: { en: "Ladies Salon", ar: "صالون نسائي" },
  barbershop: { en: "Barbershop", ar: "صالون حلاقة" },
  salon: { en: "Salon", ar: "صالون" },
  spa: { en: "Spa", ar: "سبا" },
  massage: { en: "Massage Center", ar: "مركز مساج" },
  beauty_salon: { en: "Beauty Salon", ar: "صالون تجميل" },
  clinic: { en: "Clinic", ar: "عيادة" },
  other: { en: "Other", ar: "أخرى" },
};

export type BusinessLabelKind =
  | "staffSingular"
  | "staffPlural"
  | "resourceSingular"
  | "resourcePlural";

export function normalizeModules(
  modules: Partial<Record<string, boolean>> | null | undefined,
  type: BusinessType = "barbershop",
): ModuleMap {
  const normalized = { ...MODULE_PRESETS[type] };
  for (const key of MODULE_KEYS) {
    if (typeof modules?.[key] === "boolean") normalized[key] = modules[key] as boolean;
  }
  return normalized;
}

export function businessLabel(kind: BusinessLabelKind, type: BusinessType, lang: Lang) {
  const labels: Record<BusinessType, Record<BusinessLabelKind, { en: string; ar: string }>> = {
    gents_salon: {
      staffSingular: { en: "Barber", ar: "الحلاق" },
      staffPlural: { en: "Barbers", ar: "الحلاقون" },
      resourceSingular: { en: "Chair", ar: "الكرسي" },
      resourcePlural: { en: "Chairs", ar: "الكراسي" },
    },
    ladies_salon: {
      staffSingular: { en: "Stylist", ar: "المصففة" },
      staffPlural: { en: "Stylists", ar: "المصففات" },
      resourceSingular: { en: "Chair", ar: "الكرسي" },
      resourcePlural: { en: "Chairs", ar: "الكراسي" },
    },
    barbershop: {
      staffSingular: { en: "Barber", ar: "الحلاق" },
      staffPlural: { en: "Barbers", ar: "الحلاقون" },
      resourceSingular: { en: "Chair", ar: "الكرسي" },
      resourcePlural: { en: "Chairs", ar: "الكراسي" },
    },
    salon: {
      staffSingular: { en: "Stylist", ar: "المصفف" },
      staffPlural: { en: "Stylists", ar: "المصففون" },
      resourceSingular: { en: "Chair", ar: "الكرسي" },
      resourcePlural: { en: "Chairs", ar: "الكراسي" },
    },
    spa: {
      staffSingular: { en: "Therapist", ar: "المعالج" },
      staffPlural: { en: "Therapists", ar: "المعالجون" },
      resourceSingular: { en: "Treatment Room", ar: "غرفة العلاج" },
      resourcePlural: { en: "Treatment Rooms", ar: "غرف العلاج" },
    },
    massage: {
      staffSingular: { en: "Massage Therapist", ar: "معالج مساج" },
      staffPlural: { en: "Massage Therapists", ar: "معالجو المساج" },
      resourceSingular: { en: "Massage Room", ar: "غرفة المساج" },
      resourcePlural: { en: "Massage Rooms", ar: "غرف المساج" },
    },
    beauty_salon: {
      staffSingular: { en: "Specialist", ar: "الأخصائي" },
      staffPlural: { en: "Specialists", ar: "الأخصائيون" },
      resourceSingular: { en: "Chair", ar: "الكرسي" },
      resourcePlural: { en: "Chairs", ar: "الكراسي" },
    },
    clinic: {
      staffSingular: { en: "Practitioner", ar: "الممارس" },
      staffPlural: { en: "Practitioners", ar: "الممارسون" },
      resourceSingular: { en: "Treatment Room", ar: "غرفة العلاج" },
      resourcePlural: { en: "Treatment Rooms", ar: "غرف العلاج" },
    },
    other: {
      staffSingular: { en: "Staff Member", ar: "الموظف" },
      staffPlural: { en: "Staff", ar: "الموظفون" },
      resourceSingular: { en: "Resource", ar: "المورد" },
      resourcePlural: { en: "Resources", ar: "الموارد" },
    },
  };

  return labels[type][kind][lang];
}
