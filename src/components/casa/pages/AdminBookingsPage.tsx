import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarPlus, LogOut, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CASA, waLink } from "@/lib/casa";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type ServiceRow = Pick<
  Database["public"]["Tables"]["services"]["Row"],
  "id" | "title_en" | "title_ar"
>;
type BarberRow = Pick<Database["public"]["Tables"]["barbers"]["Row"], "id" | "name_en" | "name_ar">;
type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
type StatusFilter = BookingStatus | "all";
type ManualBookingForm = {
  serviceId: string;
  barberId: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  status: BookingStatus;
  language: Lang;
  notes: string;
};

type BookingView = BookingRow & {
  service_title_en: string | null;
  service_title_ar: string | null;
  barber_name_en: string | null;
  barber_name_ar: string | null;
};

const STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled", "completed"];
const NO_BARBER = "__none__";

const isBookingStatus = (value: string | null): value is BookingStatus =>
  STATUSES.includes(value as BookingStatus);

const statusClass: Record<BookingStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  confirmed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-200",
  completed: "border-sky-500/40 bg-sky-500/10 text-sky-200",
};

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const localDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const createManualForm = (
  lang: Lang,
  services: ServiceRow[] = [],
  barbers: BarberRow[] = [],
): ManualBookingForm => ({
  serviceId: services[0]?.id ?? "",
  barberId: barbers[0]?.id ?? NO_BARBER,
  customerName: "",
  customerPhone: "",
  bookingDate: todayIso(),
  bookingTime: "10:00",
  status: "confirmed",
  language: lang,
  notes: "",
});

const hydrateBooking = (
  booking: BookingRow,
  services: ServiceRow[],
  barbers: BarberRow[],
): BookingView => {
  const service = booking.service_id
    ? services.find((item) => item.id === booking.service_id)
    : undefined;
  const barber = booking.barber_id
    ? barbers.find((item) => item.id === booking.barber_id)
    : undefined;
  return {
    ...booking,
    service_title_en: service?.title_en ?? null,
    service_title_ar: service?.title_ar ?? null,
    barber_name_en: barber?.name_en ?? null,
    barber_name_ar: barber?.name_ar ?? null,
  };
};

export function AdminBookingsPage({ lang }: { lang: Lang }) {
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualBookingForm>(() => createManualForm(lang));
  const [creatingManual, setCreatingManual] = useState(false);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/bookings"),
  )}`;

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    setLoadError(null);
    try {
      const [bookingResult, servicesResult, barbersResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .order("booking_date", { ascending: false })
          .order("booking_time", { ascending: false })
          .limit(500),
        supabase.from("services").select("id, title_en, title_ar"),
        supabase.from("barbers").select("id, name_en, name_ar"),
      ]);

      if (bookingResult.error) throw bookingResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (barbersResult.error) throw barbersResult.error;

      const serviceRows = (servicesResult.data ?? []) as ServiceRow[];
      const barberRows = (barbersResult.data ?? []) as BarberRow[];

      setServices(serviceRows);
      setBarbers(barberRows);

      setBookings(
        (bookingResult.data ?? []).map((booking) =>
          hydrateBooking(booking, serviceRows, barberRows),
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.admin.loadError;
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoadingBookings(false);
    }
  }, [tt.admin.loadError]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.navigate({ to: loginHref });
      return;
    }
    if (!auth.loading && auth.user && auth.isAdmin) {
      loadBookings();
    }
  }, [auth.loading, auth.user, auth.isAdmin, loadBookings, loginHref, router]);

  useEffect(() => {
    if (!manualOpen || manualForm.serviceId || services.length === 0) return;
    setManualForm((current) => ({ ...current, serviceId: services[0]?.id ?? "" }));
  }, [manualForm.serviceId, manualOpen, services]);

  const filteredBookings = useMemo(
    () =>
      filter === "all"
        ? bookings
        : bookings.filter(
            (booking) => (isBookingStatus(booking.status) ? booking.status : "pending") === filter,
          ),
    [bookings, filter],
  );

  const metrics = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((booking) => booking.status === "pending").length,
      today: bookings.filter((booking) => booking.booking_date === todayIso()).length,
    }),
    [bookings],
  );

  const resetManualForm = useCallback(() => {
    setManualForm(createManualForm(lang, services, barbers));
  }, [barbers, lang, services]);

  const openManualReservation = () => {
    setManualForm(createManualForm(lang, services, barbers));
    setManualOpen(true);
  };

  const setManualField = <Key extends keyof ManualBookingForm>(
    key: Key,
    value: ManualBookingForm[Key],
  ) => {
    setManualForm((current) => ({ ...current, [key]: value }));
  };

  const createManualReservation = async (event: React.FormEvent) => {
    event.preventDefault();

    const customerName = manualForm.customerName.trim();
    const customerPhone = manualForm.customerPhone.trim();
    const notes = manualForm.notes.trim();

    if (
      !manualForm.serviceId ||
      !manualForm.bookingDate ||
      !manualForm.bookingTime ||
      !customerName ||
      !customerPhone
    ) {
      toast.error(tt.admin.requiredFields);
      return;
    }

    setCreatingManual(true);
    try {
      const payload: BookingInsert = {
        service_id: manualForm.serviceId,
        barber_id: manualForm.barberId === NO_BARBER ? null : manualForm.barberId,
        customer_name: customerName,
        customer_phone: customerPhone,
        booking_date: manualForm.bookingDate,
        booking_time: manualForm.bookingTime,
        notes: notes || null,
        language: manualForm.language,
        status: manualForm.status,
      };
      const { data, error } = await supabase.from("bookings").insert(payload).select("*").single();
      if (error) throw error;

      setBookings((current) => [hydrateBooking(data as BookingRow, services, barbers), ...current]);
      setFilter("all");
      setManualOpen(false);
      resetManualForm();
      toast.success(tt.admin.reservationAdded);
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.common.error;
      toast.error(message);
    } finally {
      setCreatingManual(false);
    }
  };

  const updateStatus = async (booking: BookingView, status: BookingStatus) => {
    setUpdatingId(booking.id);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", booking.id)
        .select("id")
        .single();
      if (error) throw error;
      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? { ...item, status } : item)),
      );
      toast.success(tt.admin.updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.common.error;
      toast.error(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const serviceLabel = (booking: BookingView) =>
    (lang === "ar" ? booking.service_title_ar : booking.service_title_en) ?? "—";

  const barberLabel = (booking: BookingView) =>
    (lang === "ar" ? booking.barber_name_ar : booking.barber_name_en) ?? "—";

  const serviceOptionLabel = (service: ServiceRow) =>
    lang === "ar" ? service.title_ar : service.title_en;

  const barberOptionLabel = (barber: BarberRow) =>
    lang === "ar" ? barber.name_ar : barber.name_en;

  if (auth.loading) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.admin.title}>
        <p className="text-sm text-muted-foreground">{tt.common.loading}</p>
      </Section>
    );
  }

  if (!auth.user) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.admin.title}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tt.nav.login}</AlertTitle>
          <AlertDescription>{tt.admin.signedOut}</AlertDescription>
        </Alert>
        <Button asChild className="mt-6">
          <Link to={localePath(lang, "/login")}>{tt.admin.signInCta}</Link>
        </Button>
      </Section>
    );
  }

  if (!auth.isAdmin) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.admin.title}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tt.common.error}</AlertTitle>
          <AlertDescription>{tt.admin.notAdmin}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-6" onClick={auth.signOut}>
          <LogOut className="h-4 w-4" /> {tt.nav.logout}
        </Button>
      </Section>
    );
  }

  return (
    <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.admin.title} intro={tt.admin.intro}>
      <div className="mb-8 flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label={tt.admin.total} value={metrics.total} />
          <Metric label={tt.admin.pending} value={metrics.pending} />
          <Metric label={tt.admin.today} value={metrics.today} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {tt.admin.signedInAs(auth.user.email ?? "—")}
          </span>
          <Button size="sm" onClick={openManualReservation}>
            <CalendarPlus /> {tt.admin.addReservation}
          </Button>
          <Button variant="outline" size="sm" onClick={loadBookings} disabled={loadingBookings}>
            <RefreshCw className={loadingBookings ? "animate-spin" : ""} /> {tt.admin.refresh}
          </Button>
          <Button variant="ghost" size="sm" onClick={auth.signOut}>
            <LogOut /> {tt.nav.logout}
          </Button>
        </div>
      </div>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tt.admin.manualTitle}</DialogTitle>
            <DialogDescription>{tt.admin.manualIntro}</DialogDescription>
          </DialogHeader>
          <form onSubmit={createManualReservation} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manual-customer-name">{tt.reservation.fullName}</Label>
                <Input
                  id="manual-customer-name"
                  value={manualForm.customerName}
                  onChange={(event) => setManualField("customerName", event.target.value)}
                  placeholder={tt.reservation.yourName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-customer-phone">{tt.reservation.phone}</Label>
                <Input
                  id="manual-customer-phone"
                  type="tel"
                  value={manualForm.customerPhone}
                  onChange={(event) => setManualField("customerPhone", event.target.value)}
                  placeholder="+971 ..."
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{tt.reservation.service}</Label>
                <Select
                  value={manualForm.serviceId}
                  onValueChange={(value) => setManualField("serviceId", value)}
                  disabled={services.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tt.reservation.service} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {serviceOptionLabel(service)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tt.reservation.barber}</Label>
                <Select
                  value={manualForm.barberId}
                  onValueChange={(value) => setManualField("barberId", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_BARBER}>{tt.admin.noBarber}</SelectItem>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barberOptionLabel(barber)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-date">{tt.reservation.date}</Label>
                <Input
                  id="manual-date"
                  type="date"
                  min={todayIso()}
                  value={manualForm.bookingDate}
                  onChange={(event) => setManualField("bookingDate", event.target.value)}
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-time">{tt.reservation.timeSlot}</Label>
                <Input
                  id="manual-time"
                  type="time"
                  step="300"
                  value={manualForm.bookingTime}
                  onChange={(event) => setManualField("bookingTime", event.target.value)}
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{tt.admin.cols.status}</Label>
                <Select
                  value={manualForm.status}
                  onValueChange={(value) => setManualField("status", value as BookingStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {tt.admin.status[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tt.admin.customerLanguage}</Label>
                <Select
                  value={manualForm.language}
                  onValueChange={(value) => setManualField("language", value as Lang)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-notes">{tt.reservation.notes}</Label>
              <Textarea
                id="manual-notes"
                value={manualForm.notes}
                onChange={(event) => setManualField("notes", event.target.value)}
                placeholder={tt.reservation.notesPh}
                rows={3}
              />
            </div>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManualOpen(false)}
                disabled={creatingManual}
              >
                {tt.common.cancel}
              </Button>
              <Button type="submit" disabled={creatingManual || services.length === 0}>
                {creatingManual ? "…" : tt.admin.saveReservation}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tt.admin.loadError}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as StatusFilter)}
        className="mb-5"
      >
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="all">{tt.admin.all}</TabsTrigger>
          {STATUSES.map((status) => (
            <TabsTrigger key={status} value={status}>
              {tt.admin.status[status]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tt.admin.cols.date}</TableHead>
              <TableHead>{tt.admin.cols.customer}</TableHead>
              <TableHead>{tt.admin.cols.service}</TableHead>
              <TableHead>{tt.admin.cols.barber}</TableHead>
              <TableHead>{tt.admin.cols.status}</TableHead>
              <TableHead>{tt.admin.cols.notes}</TableHead>
              <TableHead>{tt.admin.cols.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingBookings ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  {tt.admin.loading}
                </TableCell>
              </TableRow>
            ) : filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  {tt.admin.empty}
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => {
                const status = isBookingStatus(booking.status) ? booking.status : "pending";
                const waText =
                  lang === "ar"
                    ? `مرحباً ${booking.customer_name}، معك ${CASA.nameAr} بخصوص حجزك يوم ${booking.booking_date} الساعة ${booking.booking_time}.`
                    : `Hi ${booking.customer_name}, this is ${CASA.name} about your booking on ${booking.booking_date} at ${booking.booking_time}.`;
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="min-w-32">
                      <div>{localDate(booking.booking_date)}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {booking.booking_time}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-44">
                      <div>{booking.customer_name}</div>
                      <a
                        href={`tel:${booking.customer_phone.replace(/\s/g, "")}`}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        dir="ltr"
                      >
                        {booking.customer_phone}
                      </a>
                    </TableCell>
                    <TableCell className="min-w-40">{serviceLabel(booking)}</TableCell>
                    <TableCell>{barberLabel(booking)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClass[status]}>
                        {tt.admin.status[status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-56 text-muted-foreground">
                      {booking.notes || "—"}
                    </TableCell>
                    <TableCell className="min-w-52">
                      <div className="flex items-center gap-2">
                        <Select
                          value={status}
                          onValueChange={(value) => updateStatus(booking, value as BookingStatus)}
                          disabled={updatingId === booking.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((item) => (
                              <SelectItem key={item} value={item}>
                                {tt.admin.status[item]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button asChild variant="outline" size="icon">
                          <a href={waLink(waText)} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-28 rounded-lg border border-border/60 bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-3xl">{value}</div>
    </div>
  );
}
