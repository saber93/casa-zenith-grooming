import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Shield, Trash2, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoleGuard, type StaffRole } from "@/lib/auth/useRoleGuard";
import { useBusinessContext } from "@/lib/business-context";
import { useBusinessTerminology } from "@/lib/business-terminology";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Bilingual dictionary                                               */
/* ------------------------------------------------------------------ */

const LOCAL_DICT = {
  en: {
    eyebrow: "Administration",
    title: "Staff Management",
    intro: "Manage user roles, assign barber profiles, and control admin access.",
    addStaff: "Add Staff Member",
    userId: "User ID",
    userIdPlaceholder: "Paste the user's auth UUID",
    email: "Email",
    role: "Role",
    assignedBarber: "Assigned Barber",
    status: "Status",
    actions: "Actions",
    active: "Active",
    revoke: "Revoke",
    save: "Save",
    saving: "Saving…",
    noStaff: "No staff members with assigned roles yet.",
    roleUpdated: "Role updated successfully.",
    roleAdded: "Staff member added.",
    roleRevoked: "Access revoked.",
    error: "Something went wrong.",
    confirmRevoke: "Are you sure you want to revoke this user's access?",
    admin: "Admin",
    businessAdmin: "Business Admin",
    reception: "Reception",
    cashier: "Cashier",
    barber: "Barber",
    viewer: "Viewer",
    noneAssigned: "None",
    selectRole: "Select a role",
    selectBarber: "Select barber (for barber role)",
    requiredFields: "User ID and role are required.",
    barberRequired: "Barber role requires an assigned barber profile.",
    loading: "Loading…",
    accessDenied: "Access Denied",
    accessDeniedDesc: "You must be an admin to manage staff.",
    refresh: "Refresh",
  },
  ar: {
    eyebrow: "الإدارة",
    title: "إدارة الموظفين",
    intro: "إدارة أدوار المستخدمين وتعيين ملفات الحلاقين والتحكم في الوصول.",
    addStaff: "إضافة موظف",
    userId: "معرف المستخدم",
    userIdPlaceholder: "الصق UUID المستخدم",
    email: "البريد الإلكتروني",
    role: "الدور",
    assignedBarber: "الحلاق المعين",
    status: "الحالة",
    actions: "الإجراءات",
    active: "نشط",
    revoke: "إلغاء",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    noStaff: "لا يوجد موظفون بأدوار معينة بعد.",
    roleUpdated: "تم تحديث الدور بنجاح.",
    roleAdded: "تمت إضافة الموظف.",
    roleRevoked: "تم إلغاء الوصول.",
    error: "حدث خطأ ما.",
    confirmRevoke: "هل أنت متأكد أنك تريد إلغاء وصول هذا المستخدم؟",
    admin: "مدير",
    businessAdmin: "مدير النشاط",
    reception: "استقبال",
    cashier: "أمين صندوق",
    barber: "حلاق",
    viewer: "مشاهد",
    noneAssigned: "لا يوجد",
    selectRole: "اختر دوراً",
    selectBarber: "اختر حلاقاً (لدور الحلاق)",
    requiredFields: "معرف المستخدم والدور مطلوبان.",
    barberRequired: "دور الحلاق يتطلب تعيين ملف حلاق.",
    loading: "جارٍ التحميل…",
    accessDenied: "الوصول مرفوض",
    accessDeniedDesc: "يجب أن تكون مديراً لإدارة الموظفين.",
    refresh: "تحديث",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StaffRecord = {
  id: string;
  user_id: string;
  role: string;
  barber_id: string | null;
  created_at: string;
  status?: string | null;
};

type BarberRow = {
  id: string;
  name_en: string;
  name_ar: string;
};

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const BUSINESS_STAFF_ROLES: StaffRole[] = [
  "business_admin",
  "reception",
  "cashier",
  "barber",
  "viewer",
];

const roleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
    case "business_admin":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    case "reception":
      return "border-sky-500/40 bg-sky-500/10 text-sky-200";
    case "cashier":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    case "barber":
      return "border-violet-500/40 bg-violet-500/10 text-violet-200";
    case "viewer":
      return "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-border/60 bg-secondary text-secondary-foreground";
  }
};

type StaffDictionary = Record<keyof (typeof LOCAL_DICT)["en"], string>;

const roleLabel = (role: string, d: StaffDictionary) => {
  const map: Record<string, string> = {
    admin: d.admin,
    business_admin: d.businessAdmin,
    business_manager: d.businessAdmin,
    reception: d.reception,
    cashier: d.cashier,
    barber: d.barber,
    viewer: d.viewer,
  };
  return map[role] ?? role;
};

const truncateUuid = (uuid: string) =>
  uuid.length > 12 ? `${uuid.slice(0, 8)}…${uuid.slice(-4)}` : uuid;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminStaffPage({ lang }: { lang: Lang }) {
  const baseD = LOCAL_DICT[lang];
  const terminology = useBusinessTerminology(lang);
  const d = useMemo(
    () => ({
      ...baseD,
      intro:
        lang === "ar"
          ? `إدارة أدوار المستخدمين وتعيين ملفات ${terminology.staffPlural} والتحكم في الوصول.`
          : `Manage user roles, assign ${terminology.staffPlural.toLowerCase()} profiles, and control access.`,
      assignedBarber: terminology.assignedStaff,
      barber: terminology.staffSingular,
      selectBarber:
        lang === "ar"
          ? `${terminology.selectStaff} (لدور الحلاق)`
          : `${terminology.selectStaff} (for barber role)`,
      barberRequired:
        lang === "ar"
          ? `دور الحلاق يتطلب تعيين ملف ${terminology.staffSingular}.`
          : `Barber role requires an assigned ${terminology.staffSingular.toLowerCase()} profile.`,
    }),
    [baseD, lang, terminology],
  );
  const auth = useAuth();
  const guard = useRoleGuard();
  const businessContext = useBusinessContext();
  const business = businessContext.business;
  const canManageStaff = guard.isAdmin || guard.isBusinessOwner || guard.isBusinessAdmin;

  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  /* Add-form state */
  const [formUserId, setFormUserId] = useState("");
  const [formRole, setFormRole] = useState<StaffRole | "">("");
  const [formBarberId, setFormBarberId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const loadData = useCallback(
    async (silent = false) => {
      if (!business) return;
      if (!silent) setLoading(true);
      try {
        const [staffResult, barbersResult] = await Promise.all([
          supabase
            .from("business_memberships")
            .select("id, user_id, role, barber_id, status, created_at")
            .eq("business_id", business.id)
            .neq("role", "customer")
            .order("created_at", { ascending: true }),
          supabase
            .from("barbers")
            .select("id, name_en, name_ar")
            .eq("business_id", business.id)
            .eq("is_active", true)
            .order("name_en", { ascending: true }),
        ]);

        if (staffResult.error) throw staffResult.error;
        if (barbersResult.error) throw barbersResult.error;

        setStaff((staffResult.data ?? []) as StaffRecord[]);
        setBarbers((barbersResult.data ?? []) as BarberRow[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : d.error;
        toast.error(message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [business, d.error],
  );

  useEffect(() => {
    if (
      !auth.loading &&
      auth.user &&
      !guard.loading &&
      canManageStaff &&
      !businessContext.loading
    ) {
      void loadData();
    }
  }, [auth.loading, auth.user, guard.loading, canManageStaff, businessContext.loading, loadData]);

  /* ---------------------------------------------------------------- */
  /*  Barber name resolver                                             */
  /* ---------------------------------------------------------------- */

  const barberName = useCallback(
    (barberId: string | null) => {
      if (!barberId) return d.noneAssigned;
      const barber = barbers.find((b) => b.id === barberId);
      if (!barber) return d.noneAssigned;
      return lang === "ar" ? barber.name_ar : barber.name_en;
    },
    [barbers, d.noneAssigned, lang],
  );

  /* ---------------------------------------------------------------- */
  /*  Add / upsert staff                                               */
  /* ---------------------------------------------------------------- */

  const handleSave = async () => {
    if (!formUserId.trim() || !formRole) {
      toast.error(d.requiredFields);
      return;
    }
    if (formRole === "barber" && !formBarberId) {
      toast.error(d.barberRequired);
      return;
    }

    setSaving(true);
    try {
      if (!business) throw new Error(d.error);
      if (!guard.isAdmin && formRole === "admin") {
        throw new Error(d.accessDenied);
      }

      const userId = formUserId.trim();
      const { error: deleteError } = await supabase
        .from("business_memberships")
        .delete()
        .eq("business_id", business.id)
        .eq("user_id", userId)
        .not("role", "eq", "business_owner");
      if (deleteError) throw deleteError;

      const { error } = await supabase.from("business_memberships").insert({
        business_id: business.id,
        user_id: userId,
        role: formRole as StaffRole,
        barber_id: formRole === "barber" ? formBarberId : null,
        status: "active",
      });
      if (error) throw error;

      toast.success(d.roleAdded);
      setFormUserId("");
      setFormRole("");
      setFormBarberId("");
      setDialogOpen(false);
      await loadData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : d.error;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Revoke access                                                    */
  /* ---------------------------------------------------------------- */

  const handleRevoke = async (record: StaffRecord) => {
    if (!window.confirm(d.confirmRevoke)) return;

    try {
      const { error } = await supabase.from("business_memberships").delete().eq("id", record.id);
      if (error) throw error;

      toast.success(d.roleRevoked);
      await loadData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : d.error;
      toast.error(message);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Guard states                                                     */
  /* ---------------------------------------------------------------- */

  if (auth.loading || guard.loading) {
    return (
      <Section lang={lang} eyebrow={d.eyebrow} title={d.title}>
        <p className="text-sm text-muted-foreground">{d.loading}</p>
      </Section>
    );
  }

  if (!canManageStaff) {
    return (
      <Section lang={lang} eyebrow={d.eyebrow} title={d.title}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{d.accessDenied}</AlertTitle>
          <AlertDescription>{d.accessDeniedDesc}</AlertDescription>
        </Alert>
      </Section>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <Section
      lang={lang}
      eyebrow={d.eyebrow}
      title={d.title}
      intro={d.intro}
      className="py-8 md:py-14"
    >
      <div data-testid="admin-staff-page" className="mx-auto max-w-4xl space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span className="text-sm">
              {staff.length} {lang === "ar" ? "موظف" : "staff"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => void loadData()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              <span className="sr-only">{d.refresh}</span>
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {d.addStaff}
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    {d.addStaff}
                  </DialogTitle>
                  <DialogDescription>{d.intro}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* User ID */}
                  <div className="space-y-2">
                    <Label htmlFor="staff-user-id">{d.userId}</Label>
                    <Input
                      id="staff-user-id"
                      placeholder={d.userIdPlaceholder}
                      value={formUserId}
                      onChange={(e) => setFormUserId(e.target.value)}
                      dir="ltr"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label>{d.role}</Label>
                    <Select
                      value={formRole}
                      onValueChange={(v) => {
                        setFormRole(v as StaffRole);
                        if (v !== "barber") setFormBarberId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={d.selectRole} />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_STAFF_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabel(r, d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Barber (conditional) */}
                  {formRole === "barber" && (
                    <div className="space-y-2">
                      <Label>{d.assignedBarber}</Label>
                      <Select value={formBarberId} onValueChange={setFormBarberId}>
                        <SelectTrigger>
                          <SelectValue placeholder={d.selectBarber} />
                        </SelectTrigger>
                        <SelectContent>
                          {barbers.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {lang === "ar" ? b.name_ar : b.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Save */}
                  <Button
                    className="w-full gap-2"
                    disabled={saving}
                    onClick={() => void handleSave()}
                  >
                    <Shield className="h-4 w-4" />
                    {saving ? d.saving : d.save}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Staff table */}
        <div className="rounded-lg border border-border/60 bg-card">
          {staff.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{d.noStaff}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{d.userId}</TableHead>
                  <TableHead>{d.role}</TableHead>
                  <TableHead>{d.assignedBarber}</TableHead>
                  <TableHead>{d.status}</TableHead>
                  <TableHead className="text-end">{d.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs" dir="ltr">
                      {truncateUuid(record.user_id)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("whitespace-nowrap", roleBadgeColor(record.role))}
                      >
                        {roleLabel(record.role, d)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {barberName(record.barber_id)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      >
                        {d.active}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-red-500/30 text-red-200 hover:bg-red-500/10 hover:text-red-100"
                        onClick={() => void handleRevoke(record)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {d.revoke}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Section>
  );
}
