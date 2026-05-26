import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock, Users, Plus, Trash2, Edit2, Coffee, RefreshCw } from "lucide-react";

import { Section } from "@/components/casa/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import type { Lang } from "@/lib/i18n";
import { localePath } from "@/lib/i18n";

type Shift = {
  id: string;
  business_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
};

type Barber = {
  id: string;
  name_en: string;
  name_ar: string;
  shift_id: string | null;
};

type Vacation = {
  id: string;
  business_id: string;
  barber_id: string;
  day: string;
  description: string | null;
  barbers: {
    name_en: string;
    name_ar: string;
  } | null;
};

type BusinessWorkingDay = {
  id: string;
  business_id: string;
  day_of_week: number;
  is_active: boolean;
};

const LOCAL_DICT = {
  en: {
    title: "Operational Schedules",
    intro:
      "Manage business opening days, professional shifts, team assignments, and vacation calendars.",
    tabs: {
      workingDays: "Working Days",
      shifts: "Shifts Manager",
      planner: "Staff Planner",
      vacations: "Time Off Registry",
    },
    workingDays: {
      title: "Weekly Business Calendar",
      desc: "Toggle active days of the week to enable or disable booking slots for the salon.",
      active: "Open",
      closed: "Closed",
      saveSuccess: "Business calendar updated.",
      saveError: "Unable to update calendar.",
    },
    shifts: {
      title: "Shifts Registry",
      desc: "Define custom shift schedules with specified start, end, and break times.",
      addBtn: "Create Shift",
      noShifts: "No shifts defined yet.",
      editBtn: "Edit",
      deleteBtn: "Delete",
      name: "Shift Name",
      startTime: "Start Time",
      endTime: "End Time",
      breakStart: "Break Start (Optional)",
      breakEnd: "Break End (Optional)",
      saveBtn: "Save Shift",
      createSuccess: "Shift created successfully.",
      updateSuccess: "Shift updated successfully.",
      deleteSuccess: "Shift deleted successfully.",
      error: "An error occurred.",
      deleteConfirm:
        "Are you sure you want to delete this shift? Barbers assigned to it will default to general hours.",
    },
    planner: {
      title: "Staff Shift Planner",
      desc: "Assign professional shifts to barbers or set them to fall back on general hours.",
      barber: "Barber",
      currentShift: "Assigned Shift",
      defaultShift: "Default Working Hours (10:00 - 22:00)",
      assignSuccess: "Barber shift updated successfully.",
      assignError: "Unable to update barber shift.",
    },
    vacations: {
      title: "Staff Time-Off Calendar",
      desc: "Record individual vacation days and leaves to automatically block booking availability.",
      addBtn: "Record Leave",
      selectBarber: "Choose Professional",
      selectDay: "Leave Date",
      description: "Reason / Notes",
      descriptionPh: "Annual vacation, sick leave...",
      futureLeaves: "Scheduled Time Off",
      noLeaves: "No future leaves registered yet.",
      saveSuccess: "Time-off recorded successfully.",
      saveError: "Unable to record time-off (double-check conflicts).",
      deleteSuccess: "Time-off record removed.",
    },
    daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    common: {
      loading: "Loading schedule configurations...",
      actions: "Actions",
      cancel: "Cancel",
      save: "Save",
      add: "Add",
    },
  },
  ar: {
    title: "جداول التشغيل",
    intro: "إدارة أيام العمل للنشاط ومناوبات الموظفين وتخطيط مهام الفريق وسجلات الإجازات.",
    tabs: {
      workingDays: "أيام العمل",
      shifts: "إدارة المناوبات",
      planner: "مخطط الموظفين",
      vacations: "سجل الإجازات",
    },
    workingDays: {
      title: "تقويم العمل الأسبوعي",
      desc: "تفعيل أو تعطيل أيام العمل الأسبوعية لإيقاف حجوزات الصالون بالكامل.",
      active: "مفتوح",
      closed: "مغلق",
      saveSuccess: "تم تحديث تقويم العمل بنجاح.",
      saveError: "تعذر تحديث تقويم العمل.",
    },
    shifts: {
      title: "سجل المناوبات",
      desc: "حدد جداول مناوبات مخصصة مع أوقات البدء والانتهاء وفترات الاستراحة.",
      addBtn: "إنشاء مناوبة",
      noShifts: "لم يتم تحديد أي مناوبات بعد.",
      editBtn: "تعديل",
      deleteBtn: "حذف",
      name: "اسم المناوبة",
      startTime: "وقت البدء",
      endTime: "وقت الانتهاء",
      breakStart: "بدء الاستراحة (اختياري)",
      breakEnd: "انتهاء الاستراحة (اختياري)",
      saveBtn: "حفظ المناوبة",
      createSuccess: "تم إنشاء المناوبة بنجاح.",
      updateSuccess: "تم تحديث المناوبة بنجاح.",
      deleteSuccess: "تم حذف المناوبة بنجاح.",
      error: "حدث خطأ ما.",
      deleteConfirm:
        "هل أنت متأكد من حذف المناوبة؟ الموظفون المعينون بها سيعودون للعمل بالساعات الافتراضية.",
    },
    planner: {
      title: "مخطط مناوبات الموظفين",
      desc: "قم بتعيين مناوبات العمل للحلاقين أو تركهم ليعملوا في الساعات العامة الافتراضية.",
      barber: "الحلاق",
      currentShift: "المناوبة المعينة",
      defaultShift: "ساعات العمل الافتراضية (10:00 - 22:00)",
      assignSuccess: "تم تحديث مناوبة الموظف بنجاح.",
      assignError: "تعذر تحديث مناوبة الموظف.",
    },
    vacations: {
      title: "تقويم إجازات الموظفين",
      desc: "تسجيل إجازات الحلاقين الفردية لمنع إمكانية الحجز لديهم تلقائياً في هذا اليوم.",
      addBtn: "تسجيل إجازة",
      selectBarber: "اختر الموظف",
      selectDay: "تاريخ الإجازة",
      description: "السبب / ملاحظات",
      descriptionPh: "إجازة سنوية، إجازة مرضية...",
      futureLeaves: "الإجازات المجدولة القادمة",
      noLeaves: "لا توجد إجازات قادمة مسجلة بعد.",
      saveSuccess: "تم تسجيل الإجازة بنجاح.",
      saveError: "تعذر تسجيل الإجازة (يرجى التأكد من عدم وجود تعارض).",
      deleteSuccess: "تم حذف سجل الإجازة.",
    },
    daysOfWeek: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    common: {
      loading: "جارٍ تحميل إعدادات الجداول...",
      actions: "الإجراءات",
      cancel: "إلغاء",
      save: "حفظ",
      add: "إضافة",
    },
  },
};

export function AdminSchedulesPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const business = businessContext.business;
  const d = LOCAL_DICT[lang];

  // Core Data State
  const [workingDays, setWorkingDays] = useState<BusinessWorkingDay[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(false);

  // Shifts Form Dialog state
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  });
  const [savingShift, setSavingShift] = useState(false);

  // Vacations form state
  const [vacationForm, setVacationForm] = useState({
    barberId: "",
    day: "",
    description: "",
  });
  const [savingVacation, setSavingVacation] = useState(false);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, `/admin/schedules`),
  )}`;

  const loadData = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const [wdRes, shiftRes, barberRes, vacationRes] = await Promise.all([
        supabase
          .from("business_working_days")
          .select("*")
          .eq("business_id", business.id)
          .order("day_of_week"),
        supabase.from("shifts").select("*").eq("business_id", business.id).order("name"),
        supabase
          .from("barbers")
          .select("id, name_en, name_ar, shift_id")
          .eq("business_id", business.id)
          .order("name_en"),
        supabase
          .from("vacations")
          .select(
            `
            id,
            business_id,
            barber_id,
            day,
            description,
            barbers (
              name_en,
              name_ar
            )
          `,
          )
          .eq("business_id", business.id)
          .order("day", { ascending: false }),
      ]);

      if (wdRes.error) throw wdRes.error;
      if (shiftRes.error) throw shiftRes.error;
      if (barberRes.error) throw barberRes.error;
      if (vacationRes.error) throw vacationRes.error;

      setWorkingDays(wdRes.data as BusinessWorkingDay[]);
      setShifts(shiftRes.data as Shift[]);
      setBarbers(barberRes.data as Barber[]);
      setVacations(vacationRes.data as unknown as Vacation[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error loading schedule data.");
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.navigate({ to: loginHref });
      return;
    }
    if (!auth.loading && auth.user && business) {
      void loadData();
    }
  }, [auth.loading, auth.user, business, loadData, loginHref, router]);

  // Working Days Toggler
  const handleToggleWorkingDay = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("business_working_days")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(d.workingDays.saveSuccess);
      setWorkingDays((prev) =>
        prev.map((day) => (day.id === id ? { ...day, is_active: !currentStatus } : day)),
      );
    } catch (err) {
      toast.error(d.workingDays.saveError);
    }
  };

  // Open Shift Form Dialog (New or Edit)
  const openShiftDialog = (shift: Shift | null = null) => {
    setEditingShift(shift);
    if (shift) {
      // time in database is e.g. "09:00:00" -> slice to "09:00"
      setShiftForm({
        name: shift.name,
        startTime: shift.start_time.slice(0, 5),
        endTime: shift.end_time.slice(0, 5),
        breakStart: shift.break_start ? shift.break_start.slice(0, 5) : "",
        breakEnd: shift.break_end ? shift.break_end.slice(0, 5) : "",
      });
    } else {
      setShiftForm({
        name: "",
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "",
        breakEnd: "",
      });
    }
    setShiftDialogOpen(true);
  };

  // Save Shift
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setSavingShift(true);

    try {
      const payload = {
        business_id: business.id,
        name: shiftForm.name.trim(),
        start_time: shiftForm.startTime + ":00",
        end_time: shiftForm.endTime + ":00",
        break_start: shiftForm.breakStart ? shiftForm.breakStart + ":00" : null,
        break_end: shiftForm.breakEnd ? shiftForm.breakEnd + ":00" : null,
      };

      if (editingShift) {
        const { error } = await supabase.from("shifts").update(payload).eq("id", editingShift.id);

        if (error) throw error;
        toast.success(d.shifts.updateSuccess);
      } else {
        const { error } = await supabase.from("shifts").insert(payload);

        if (error) throw error;
        toast.success(d.shifts.createSuccess);
      }

      setShiftDialogOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : d.shifts.error);
    } finally {
      setSavingShift(false);
    }
  };

  // Delete Shift
  const handleDeleteShift = async (id: string) => {
    if (!window.confirm(d.shifts.deleteConfirm)) return;

    try {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;
      toast.success(d.shifts.deleteSuccess);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : d.shifts.error);
    }
  };

  // Assign Barber Shift
  const handleAssignBarberShift = async (barberId: string, shiftId: string | null) => {
    try {
      const { error } = await supabase
        .from("barbers")
        .update({ shift_id: shiftId || null })
        .eq("id", barberId);

      if (error) throw error;
      toast.success(d.planner.assignSuccess);
      setBarbers((prev) =>
        prev.map((b) => (b.id === barberId ? { ...b, shift_id: shiftId || null } : b)),
      );
    } catch (err) {
      toast.error(d.planner.assignError);
    }
  };

  // Record Vacation / Leave
  const handleAddVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !vacationForm.barberId || !vacationForm.day) {
      toast.error(
        lang === "ar" ? "يرجى ملء جميع الحقول المطلوبة." : "Please fill in all required fields.",
      );
      return;
    }
    setSavingVacation(true);

    try {
      const { error } = await supabase.from("vacations").insert({
        business_id: business.id,
        barber_id: vacationForm.barberId,
        day: vacationForm.day,
        description: vacationForm.description.trim() || null,
      });

      if (error) throw error;
      toast.success(d.vacations.saveSuccess);
      setVacationForm({ barberId: "", day: "", description: "" });
      await loadData();
    } catch (err) {
      toast.error(d.vacations.saveError);
    } finally {
      setSavingVacation(false);
    }
  };

  // Delete Vacation
  const handleDeleteVacation = async (id: string) => {
    try {
      const { error } = await supabase.from("vacations").delete().eq("id", id);
      if (error) throw error;
      toast.success(d.vacations.deleteSuccess);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting record.");
    }
  };

  if (loading && workingDays.length === 0) {
    return (
      <Section lang={lang} eyebrow={d.common.loading} title="">
        <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground">{d.common.loading}</p>
        </div>
      </Section>
    );
  }

  return (
    <Section
      lang={lang}
      eyebrow={lang === "ar" ? "الإدارة" : "Admin Panel"}
      title={d.title}
      intro={d.intro}
    >
      <div className="space-y-6">
        <Tabs defaultValue="workingDays" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-background/50 border border-border/40 p-1 rounded-lg">
            <TabsTrigger value="workingDays" className="rounded-md transition-all">
              {d.tabs.workingDays}
            </TabsTrigger>
            <TabsTrigger value="shifts" className="rounded-md transition-all">
              {d.tabs.shifts}
            </TabsTrigger>
            <TabsTrigger value="planner" className="rounded-md transition-all">
              {d.tabs.planner}
            </TabsTrigger>
            <TabsTrigger value="vacations" className="rounded-md transition-all">
              {d.tabs.vacations}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: WORKING DAYS */}
          <TabsContent value="workingDays" className="mt-6">
            <Card className="border-border/60 bg-card/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="font-serif text-2xl flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-primary" /> {d.workingDays.title}
                </CardTitle>
                <CardDescription>{d.workingDays.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {workingDays.map((wd) => {
                    const dayName = d.daysOfWeek[wd.day_of_week];
                    return (
                      <div
                        key={wd.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-32 ${
                          wd.is_active
                            ? "bg-primary/5 border-primary/30 shadow-glow"
                            : "bg-background/40 border-border/40 opacity-75"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-lg">{dayName}</span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              wd.is_active
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {wd.is_active ? d.workingDays.active : d.workingDays.closed}
                          </span>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Switch
                            checked={wd.is_active}
                            onCheckedChange={() => handleToggleWorkingDay(wd.id, wd.is_active)}
                            aria-label={`Toggle active for ${dayName}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: SHIFTS MANAGER */}
          <TabsContent value="shifts" className="mt-6">
            <Card className="border-border/60 bg-card/40 backdrop-blur-md">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-serif text-2xl flex items-center gap-2">
                    <Clock className="h-6 w-6 text-primary" /> {d.shifts.title}
                  </CardTitle>
                  <CardDescription>{d.shifts.desc}</CardDescription>
                </div>
                <Button onClick={() => openShiftDialog()} className="self-start md:self-auto gap-2">
                  <Plus className="h-4 w-4" /> {d.shifts.addBtn}
                </Button>
              </CardHeader>
              <CardContent>
                {shifts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border border-dashed border-border/40 rounded-xl">
                    {d.shifts.noShifts}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="p-5 rounded-xl border border-border/60 bg-background/50 space-y-4 hover:border-primary/40 transition-colors relative"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-lg text-foreground">{shift.name}</h4>
                            <div className="text-sm font-medium text-primary mt-1 font-mono flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openShiftDialog(shift)}
                              title={d.shifts.editBtn}
                              className="h-8 w-8 hover:bg-muted"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteShift(shift.id)}
                              title={d.shifts.deleteBtn}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {shift.break_start && shift.break_end && (
                          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground flex items-center gap-2">
                            <Coffee className="h-4 w-4 text-primary" />
                            <span>
                              {lang === "ar" ? "فترة الاستراحة:" : "Break Window:"}{" "}
                              <strong className="font-mono text-primary/90">
                                {shift.break_start.slice(0, 5)} - {shift.break_end.slice(0, 5)}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dialog Form for Shifts */}
            <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
              <DialogContent className="border-border/60 bg-card max-w-md">
                <form onSubmit={handleSaveShift}>
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl">
                      {editingShift ? d.shifts.editBtn : d.shifts.addBtn}
                    </DialogTitle>
                    <DialogDescription>{d.shifts.desc}</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift-name">{d.shifts.name}</Label>
                      <Input
                        id="shift-name"
                        required
                        value={shiftForm.name}
                        onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                        placeholder="e.g. Morning Shift"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shift-start">{d.shifts.startTime}</Label>
                        <Input
                          id="shift-start"
                          type="time"
                          required
                          value={shiftForm.startTime}
                          onChange={(e) =>
                            setShiftForm({ ...shiftForm, startTime: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shift-end">{d.shifts.endTime}</Label>
                        <Input
                          id="shift-end"
                          type="time"
                          required
                          value={shiftForm.endTime}
                          onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="break-start">{d.shifts.breakStart}</Label>
                        <Input
                          id="break-start"
                          type="time"
                          value={shiftForm.breakStart}
                          onChange={(e) =>
                            setShiftForm({ ...shiftForm, breakStart: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="break-end">{d.shifts.breakEnd}</Label>
                        <Input
                          id="break-end"
                          type="time"
                          value={shiftForm.breakEnd}
                          onChange={(e) => setShiftForm({ ...shiftForm, breakEnd: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShiftDialogOpen(false)}
                      disabled={savingShift}
                    >
                      {d.common.cancel}
                    </Button>
                    <Button type="submit" disabled={savingShift}>
                      {savingShift ? "..." : d.common.save}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* TAB 3: STAFF SHIFT PLANNER */}
          <TabsContent value="planner" className="mt-6">
            <Card className="border-border/60 bg-card/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="font-serif text-2xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" /> {d.planner.title}
                </CardTitle>
                <CardDescription>{d.planner.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {barbers.map((barber) => {
                    const currentShift = shifts.find((s) => s.id === barber.shift_id);
                    return (
                      <div
                        key={barber.id}
                        className="p-5 rounded-xl border border-border/60 bg-background/50 space-y-4 hover:border-primary/30 transition-colors flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm flex items-center justify-center">
                            {(lang === "ar" ? barber.name_ar : barber.name_en)
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">
                              {lang === "ar" ? barber.name_ar : barber.name_en}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {currentShift
                                ? `${d.planner.currentShift}: ${currentShift.name}`
                                : d.planner.defaultShift}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <Label className="text-xs text-muted-foreground">
                            {lang === "ar" ? "تعيين المناوبة" : "Set Shift Schedule"}
                          </Label>
                          <Select
                            value={barber.shift_id || "default"}
                            onValueChange={(val) =>
                              handleAssignBarberShift(barber.id, val === "default" ? null : val)
                            }
                          >
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder={d.planner.defaultShift} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">{d.planner.defaultShift}</SelectItem>
                              {shifts.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: TIME-OFF / VACATIONS */}
          <TabsContent value="vacations" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT: Add Vacation Form */}
              <div className="lg:col-span-4">
                <Card className="border-border/60 bg-card/40 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" /> {d.vacations.title}
                    </CardTitle>
                    <CardDescription>{d.vacations.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddVacation} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="vacation-barber">{d.vacations.selectBarber}</Label>
                        <Select
                          value={vacationForm.barberId}
                          onValueChange={(val) =>
                            setVacationForm({ ...vacationForm, barberId: val })
                          }
                        >
                          <SelectTrigger id="vacation-barber" className="w-full">
                            <SelectValue placeholder={d.vacations.selectBarber} />
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

                      <div className="space-y-2">
                        <Label htmlFor="vacation-day">{d.vacations.selectDay}</Label>
                        <Input
                          id="vacation-day"
                          type="date"
                          required
                          value={vacationForm.day}
                          onChange={(e) =>
                            setVacationForm({ ...vacationForm, day: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vacation-desc">{d.vacations.description}</Label>
                        <Input
                          id="vacation-desc"
                          value={vacationForm.description}
                          onChange={(e) =>
                            setVacationForm({ ...vacationForm, description: e.target.value })
                          }
                          placeholder={d.vacations.descriptionPh}
                        />
                      </div>

                      <Button type="submit" disabled={savingVacation} className="w-full gap-2 mt-2">
                        <Plus className="h-4 w-4" /> {d.vacations.addBtn}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT: Vacations Registry list */}
              <div className="lg:col-span-8">
                <Card className="border-border/60 bg-card/40 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" /> {d.vacations.futureLeaves}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {vacations.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border-t border-border/40">
                        {d.vacations.noLeaves}
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40 max-h-[500px] overflow-y-auto">
                        {vacations.map((vac) => {
                          const barberName = vac.barbers
                            ? lang === "ar"
                              ? vac.barbers.name_ar
                              : vac.barbers.name_en
                            : "Staff";

                          // Format the vacation date for display
                          const formattedDate = new Date(vac.day).toLocaleDateString(
                            lang === "ar" ? "ar-AE" : "en-US",
                            { weekday: "long", year: "numeric", month: "long", day: "numeric" },
                          );

                          return (
                            <div
                              key={vac.id}
                              className="p-4 flex items-center justify-between text-sm"
                            >
                              <div>
                                <h5 className="font-bold text-foreground">{barberName}</h5>
                                <div className="text-xs text-primary font-medium mt-1">
                                  {formattedDate}
                                </div>
                                {vac.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {vac.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteVacation(vac.id)}
                                title={lang === "ar" ? "حذف" : "Delete"}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Section>
  );
}
