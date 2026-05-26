import { useMemo } from "react";

import { useBusinessContext } from "@/lib/business-context";
import type { BusinessType } from "@/lib/business-modules";
import type { Lang } from "@/lib/i18n";

export type BusinessTerminology = {
  staffSingular: string;
  staffPlural: string;
  staffWorkspace: string;
  selectStaff: string;
  assignedStaff: string;
  anyAvailableStaff: string;
  specificStaff: string;
  staffPerformance: string;
  serviceProvider: string;
};

const TERMINOLOGY: Record<BusinessType | "unknown", Record<Lang, BusinessTerminology>> = {
  gents_salon: {
    en: {
      staffSingular: "Barber",
      staffPlural: "Barbers",
      staffWorkspace: "Barber Workspace",
      selectStaff: "Select Barber",
      assignedStaff: "Assigned Barber",
      anyAvailableStaff: "Any available barber",
      specificStaff: "Specific barber",
      staffPerformance: "Barber Performance",
      serviceProvider: "Barber",
    },
    ar: {
      staffSingular: "حلاق",
      staffPlural: "الحلاقون",
      staffWorkspace: "مساحة الحلاق",
      selectStaff: "اختر الحلاق",
      assignedStaff: "الحلاق المعين",
      anyAvailableStaff: "أي حلاق متاح",
      specificStaff: "حلاق محدد",
      staffPerformance: "أداء الحلاقين",
      serviceProvider: "الحلاق",
    },
  },
  barbershop: {
    en: {
      staffSingular: "Barber",
      staffPlural: "Barbers",
      staffWorkspace: "Barber Workspace",
      selectStaff: "Select Barber",
      assignedStaff: "Assigned Barber",
      anyAvailableStaff: "Any available barber",
      specificStaff: "Specific barber",
      staffPerformance: "Barber Performance",
      serviceProvider: "Barber",
    },
    ar: {
      staffSingular: "حلاق",
      staffPlural: "الحلاقون",
      staffWorkspace: "مساحة الحلاق",
      selectStaff: "اختر الحلاق",
      assignedStaff: "الحلاق المعين",
      anyAvailableStaff: "أي حلاق متاح",
      specificStaff: "حلاق محدد",
      staffPerformance: "أداء الحلاقين",
      serviceProvider: "الحلاق",
    },
  },
  ladies_salon: {
    en: {
      staffSingular: "Stylist",
      staffPlural: "Stylists",
      staffWorkspace: "Stylist Workspace",
      selectStaff: "Select Stylist",
      assignedStaff: "Assigned Stylist",
      anyAvailableStaff: "Any available stylist",
      specificStaff: "Specific stylist",
      staffPerformance: "Stylist Performance",
      serviceProvider: "Stylist",
    },
    ar: {
      staffSingular: "مصففة",
      staffPlural: "المصففات",
      staffWorkspace: "مساحة المصففة",
      selectStaff: "اختر المصففة",
      assignedStaff: "المصففة المعينة",
      anyAvailableStaff: "أي مصففة متاحة",
      specificStaff: "مصففة محددة",
      staffPerformance: "أداء المصففات",
      serviceProvider: "المصففة",
    },
  },
  salon: {
    en: {
      staffSingular: "Stylist",
      staffPlural: "Stylists",
      staffWorkspace: "Stylist Workspace",
      selectStaff: "Select Stylist",
      assignedStaff: "Assigned Stylist",
      anyAvailableStaff: "Any available stylist",
      specificStaff: "Specific stylist",
      staffPerformance: "Stylist Performance",
      serviceProvider: "Stylist",
    },
    ar: {
      staffSingular: "مصففة",
      staffPlural: "المصففات",
      staffWorkspace: "مساحة المصففة",
      selectStaff: "اختر المصففة",
      assignedStaff: "المصففة المعينة",
      anyAvailableStaff: "أي مصففة متاحة",
      specificStaff: "مصففة محددة",
      staffPerformance: "أداء المصففات",
      serviceProvider: "المصففة",
    },
  },
  spa: {
    en: {
      staffSingular: "Therapist",
      staffPlural: "Therapists",
      staffWorkspace: "Therapist Workspace",
      selectStaff: "Select Therapist",
      assignedStaff: "Assigned Therapist",
      anyAvailableStaff: "Any available therapist",
      specificStaff: "Specific therapist",
      staffPerformance: "Therapist Performance",
      serviceProvider: "Therapist",
    },
    ar: {
      staffSingular: "معالج",
      staffPlural: "المعالجون",
      staffWorkspace: "مساحة المعالج",
      selectStaff: "اختر المعالج",
      assignedStaff: "المعالج المعين",
      anyAvailableStaff: "أي معالج متاح",
      specificStaff: "معالج محدد",
      staffPerformance: "أداء المعالجين",
      serviceProvider: "المعالج",
    },
  },
  massage: {
    en: {
      staffSingular: "Massage Therapist",
      staffPlural: "Massage Therapists",
      staffWorkspace: "Therapist Workspace",
      selectStaff: "Select Therapist",
      assignedStaff: "Assigned Therapist",
      anyAvailableStaff: "Any available therapist",
      specificStaff: "Specific therapist",
      staffPerformance: "Therapist Performance",
      serviceProvider: "Massage Therapist",
    },
    ar: {
      staffSingular: "معالج مساج",
      staffPlural: "معالجو المساج",
      staffWorkspace: "مساحة المعالج",
      selectStaff: "اختر المعالج",
      assignedStaff: "المعالج المعين",
      anyAvailableStaff: "أي معالج متاح",
      specificStaff: "معالج محدد",
      staffPerformance: "أداء المعالجين",
      serviceProvider: "معالج المساج",
    },
  },
  beauty_salon: {
    en: {
      staffSingular: "Specialist",
      staffPlural: "Specialists",
      staffWorkspace: "Specialist Workspace",
      selectStaff: "Select Specialist",
      assignedStaff: "Assigned Specialist",
      anyAvailableStaff: "Any available specialist",
      specificStaff: "Specific specialist",
      staffPerformance: "Specialist Performance",
      serviceProvider: "Specialist",
    },
    ar: {
      staffSingular: "أخصائي",
      staffPlural: "الأخصائيون",
      staffWorkspace: "مساحة الأخصائي",
      selectStaff: "اختر الأخصائي",
      assignedStaff: "الأخصائي المعين",
      anyAvailableStaff: "أي أخصائي متاح",
      specificStaff: "أخصائي محدد",
      staffPerformance: "أداء الأخصائيين",
      serviceProvider: "الأخصائي",
    },
  },
  clinic: {
    en: {
      staffSingular: "Practitioner",
      staffPlural: "Practitioners",
      staffWorkspace: "Practitioner Workspace",
      selectStaff: "Select Practitioner",
      assignedStaff: "Assigned Practitioner",
      anyAvailableStaff: "Any available practitioner",
      specificStaff: "Specific practitioner",
      staffPerformance: "Practitioner Performance",
      serviceProvider: "Practitioner",
    },
    ar: {
      staffSingular: "ممارس",
      staffPlural: "الممارسون",
      staffWorkspace: "مساحة الممارس",
      selectStaff: "اختر الممارس",
      assignedStaff: "الممارس المعين",
      anyAvailableStaff: "أي ممارس متاح",
      specificStaff: "ممارس محدد",
      staffPerformance: "أداء الممارسين",
      serviceProvider: "الممارس",
    },
  },
  other: {
    en: {
      staffSingular: "Staff Member",
      staffPlural: "Staff",
      staffWorkspace: "Staff Workspace",
      selectStaff: "Select Staff",
      assignedStaff: "Assigned Staff",
      anyAvailableStaff: "Any available staff member",
      specificStaff: "Specific staff member",
      staffPerformance: "Staff Performance",
      serviceProvider: "Staff Member",
    },
    ar: {
      staffSingular: "موظف",
      staffPlural: "الموظفون",
      staffWorkspace: "مساحة الموظف",
      selectStaff: "اختر الموظف",
      assignedStaff: "الموظف المعين",
      anyAvailableStaff: "أي موظف متاح",
      specificStaff: "موظف محدد",
      staffPerformance: "أداء الموظفين",
      serviceProvider: "الموظف",
    },
  },
  unknown: {
    en: {
      staffSingular: "Staff Member",
      staffPlural: "Staff",
      staffWorkspace: "Staff Workspace",
      selectStaff: "Select Staff",
      assignedStaff: "Assigned Staff",
      anyAvailableStaff: "Any available staff member",
      specificStaff: "Specific staff member",
      staffPerformance: "Staff Performance",
      serviceProvider: "Staff Member",
    },
    ar: {
      staffSingular: "موظف",
      staffPlural: "الموظفون",
      staffWorkspace: "مساحة الموظف",
      selectStaff: "اختر الموظف",
      assignedStaff: "الموظف المعين",
      anyAvailableStaff: "أي موظف متاح",
      specificStaff: "موظف محدد",
      staffPerformance: "أداء الموظفين",
      serviceProvider: "الموظف",
    },
  },
};

const normalizeBusinessType = (
  businessType: string | null | undefined,
): BusinessType | "unknown" =>
  businessType && businessType in TERMINOLOGY ? (businessType as BusinessType) : "unknown";

export function getBusinessTerminology(
  businessType: string | null | undefined,
  lang: Lang,
): BusinessTerminology {
  return TERMINOLOGY[normalizeBusinessType(businessType)][lang];
}

export function useBusinessTerminology(lang: Lang): BusinessTerminology {
  const { business } = useBusinessContext();
  return useMemo(
    () => getBusinessTerminology(business?.business_type, lang),
    [business?.business_type, lang],
  );
}
