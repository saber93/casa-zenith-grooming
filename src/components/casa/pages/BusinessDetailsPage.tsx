import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Clock, Mail, MapPin, Phone, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "@/components/casa/Section";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Lang } from "@/lib/i18n";
import { formatPrice, localePath } from "@/lib/i18n";
import {
  createDurationBooking,
  isBookingConflictError,
  bookingConflictMessage,
} from "@/lib/bookings";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type BarberRow = Database["public"]["Tables"]["barbers"]["Row"];

const D = {
  en: {
    back: "Back to Directory",
    servicesTab: "Services",
    teamTab: "Team",
    aboutTab: "About",
    bookNow: "Book Now",
    duration: "min",
    noServices: "No services available.",
    noTeam: "No team members listed.",
    contact: "Contact",
    address: "Address",
    bookTitle: "Book Appointment",
    bookDesc: "Fill in the details below to reserve your spot.",
    service: "Service",
    staff: "Staff Member",
    anyAvailable: "Any available",
    date: "Date",
    time: "Time",
    name: "Full Name",
    phone: "Phone Number",
    confirm: "Confirm Booking",
    success: "Booking confirmed! We'll be in touch.",
    loading: "Loading…",
    notFound: "Business not found.",
  },
  ar: {
    back: "العودة إلى الدليل",
    servicesTab: "الخدمات",
    teamTab: "الفريق",
    aboutTab: "حول",
    bookNow: "احجز الآن",
    duration: "دقيقة",
    noServices: "لا توجد خدمات متاحة.",
    noTeam: "لا يوجد أعضاء في الفريق.",
    contact: "تواصل",
    address: "العنوان",
    bookTitle: "حجز موعد",
    bookDesc: "أدخل التفاصيل أدناه لحجز موعدك.",
    service: "الخدمة",
    staff: "الموظف",
    anyAvailable: "أي موظف متاح",
    date: "التاريخ",
    time: "الوقت",
    name: "الاسم الكامل",
    phone: "رقم الهاتف",
    confirm: "تأكيد الحجز",
    success: "تم تأكيد الحجز! سنتواصل معك قريباً.",
    loading: "جاري التحميل…",
    notFound: "لم يتم العثور على هذا المكان.",
  },
} as const;

const todayIso = () => {
  const n = new Date();
  return new Date(n.getTime() - n.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export function BusinessDetailsPage({ lang, slug }: { lang: Lang; slug: string }) {
  const dict = D[lang];
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [staff, setStaff] = useState<BarberRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardServiceId, setWizardServiceId] = useState("");
  const [wizardStaffId, setWizardStaffId] = useState("__any__");
  const [wizardDate, setWizardDate] = useState(todayIso);
  const [wizardTime, setWizardTime] = useState("10:00");
  const [wizardName, setWizardName] = useState("");
  const [wizardPhone, setWizardPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (!biz) {
        setLoading(false);
        return;
      }
      setBusiness(biz);

      const [svcRes, staffRes] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("business_id", biz.id)
          .eq("is_active", true)
          .order("price"),
        supabase.from("barbers").select("*").eq("business_id", biz.id).eq("is_active", true),
      ]);

      setServices(svcRes.data ?? []);
      setStaff(staffRes.data ?? []);
      setLoading(false);
    })();
  }, [slug]);

  const n = useCallback(
    (en: string | null, ar: string | null) =>
      lang === "ar" ? (ar ?? en ?? "—") : (en ?? ar ?? "—"),
    [lang],
  );

  const openWizard = (serviceId: string) => {
    setWizardServiceId(serviceId);
    setWizardStaffId("__any__");
    setWizardDate(todayIso());
    setWizardTime("10:00");
    setWizardName("");
    setWizardPhone("");
    setWizardOpen(true);
  };

  const handleBook = async () => {
    if (!business || !wizardServiceId || !wizardName.trim() || !wizardPhone.trim()) {
      toast.error(lang === "ar" ? "يرجى ملء جميع الحقول" : "Please fill in all fields");
      return;
    }
    const svc = services.find((s) => s.id === wizardServiceId);
    if (!svc) return;

    const [h, m] = wizardTime.split(":").map(Number);
    const startsAt = new Date(
      `${wizardDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
    );
    const endsAt = new Date(startsAt.getTime() + (svc.duration_minutes ?? 30) * 60_000);

    setSubmitting(true);
    try {
      const { error } = await createDurationBooking({
        businessId: business.id,
        serviceId: wizardServiceId,
        customerName: wizardName.trim(),
        customerPhone: wizardPhone.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        staffId: wizardStaffId === "__any__" ? null : wizardStaffId,
        language: lang,
      });
      if (error) throw error;
      toast.success(dict.success);
      setWizardOpen(false);
    } catch (err) {
      const msg = isBookingConflictError(err)
        ? bookingConflictMessage(err, lang)
        : err instanceof Error
          ? err.message
          : "Error";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Section lang={lang} eyebrow="" title="">
        <p className="py-20 text-center text-muted-foreground">{dict.loading}</p>
      </Section>
    );
  }

  if (!business) {
    return (
      <Section lang={lang} eyebrow="" title="">
        <div className="py-20 text-center">
          <p className="text-muted-foreground">{dict.notFound}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={localePath(lang, "/public-directory")}>{dict.back}</Link>
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <Section lang={lang} eyebrow="" title="">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to={localePath(lang, "/public-directory")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {dict.back}
        </Link>
      </Button>

      {/* Business header */}
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 via-card/80 to-violet-500/10 p-8 backdrop-blur-md">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={n(business.name_en, business.name_ar)}
              className="h-20 w-20 rounded-xl border-2 border-border/40 object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
              {n(business.name_en, business.name_ar)
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </span>
          )}
          <div className="text-center sm:text-start">
            <h1 className="font-serif text-3xl font-bold">
              {n(business.name_en, business.name_ar)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
              <Badge variant="outline" className="text-xs capitalize">
                {business.business_type ?? "salon"}
              </Badge>
              {business.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {business.city}
                </span>
              )}
            </div>
            {/* Contact buttons */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {business.phone && (
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${business.phone}`}>
                    <Phone className="mr-1 h-3 w-3" /> {business.phone}
                  </a>
                </Button>
              )}
              {business.whatsapp_number && (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`https://wa.me/${business.whatsapp_number.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </Button>
              )}
              {business.email && (
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${business.email}`}>
                    <Mail className="mr-1 h-3 w-3" /> Email
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="services">
        <TabsList className="mb-6">
          <TabsTrigger value="services">{dict.servicesTab}</TabsTrigger>
          <TabsTrigger value="team">{dict.teamTab}</TabsTrigger>
          <TabsTrigger value="about">{dict.aboutTab}</TabsTrigger>
        </TabsList>

        {/* Services */}
        <TabsContent value="services">
          {services.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{dict.noServices}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="group rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                >
                  <h3 className="font-semibold">{n(svc.title_en, svc.title_ar)}</h3>
                  {(svc.description_en || svc.description_ar) && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {n(svc.description_en, svc.description_ar)}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-serif text-lg font-bold">
                        {formatPrice(lang, svc.price)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {svc.duration_minutes} {dict.duration}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openWizard(svc.id)}
                      className="opacity-80 transition-opacity group-hover:opacity-100"
                    >
                      {dict.bookNow}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          {staff.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{dict.noTeam}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm"
                >
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={n(member.name_en, member.name_ar)}
                      className="h-14 w-14 rounded-full border-2 border-border/40 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium">{n(member.name_en, member.name_ar)}</h4>
                    {(member.bio_en || member.bio_ar) && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n(member.bio_en, member.bio_ar)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* About */}
        <TabsContent value="about">
          <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm">
            {(business.address_en || business.address_ar) && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {n(business.address_en, business.address_ar)}
                  {business.city ? `, ${business.city}` : ""}
                  {business.country ? `, ${business.country}` : ""}
                </span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={`tel:${business.phone}`}
                  className="text-sm hover:text-foreground"
                  dir="ltr"
                >
                  {business.phone}
                </a>
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${business.email}`} className="text-sm hover:text-foreground">
                  {business.email}
                </a>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Booking Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dict.bookTitle}</DialogTitle>
            <DialogDescription>{dict.bookDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service (pre-selected) */}
            <div className="space-y-1">
              <Label>{dict.service}</Label>
              <Select value={wizardServiceId} onValueChange={setWizardServiceId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {n(svc.title_en, svc.title_ar)} — {formatPrice(lang, svc.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staff */}
            <div className="space-y-1">
              <Label>{dict.staff}</Label>
              <Select value={wizardStaffId} onValueChange={setWizardStaffId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">{dict.anyAvailable}</SelectItem>
                  {staff.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {n(m.name_en, m.name_ar)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <Label>{dict.date}</Label>
                <Input
                  type="date"
                  min={todayIso()}
                  value={wizardDate}
                  onChange={(e) => setWizardDate(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{dict.time}</Label>
                <Input
                  type="time"
                  value={wizardTime}
                  onChange={(e) => setWizardTime(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-1">
              <Label>{dict.name}</Label>
              <Input value={wizardName} onChange={(e) => setWizardName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>{dict.phone}</Label>
              <Input
                type="tel"
                value={wizardPhone}
                onChange={(e) => setWizardPhone(e.target.value)}
                placeholder="+971 …"
                dir="ltr"
                required
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWizardOpen(false)}
              disabled={submitting}
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="button" onClick={handleBook} disabled={submitting}>
              {submitting ? "…" : dict.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
