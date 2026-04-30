import { useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check } from "lucide-react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { Lang } from "@/lib/i18n";
import { t, formatPrice } from "@/lib/i18n";
import type { ServiceRow } from "@/components/casa/ServiceCard";
import { createBooking } from "@/server/casa.functions";

type Barber = { id: string; name_en: string; name_ar: string };

const slots = ["10:00", "10:30", "11:00", "11:30", "13:00", "14:00", "15:30", "17:00", "18:30", "20:00"];

export function ReservationPage({
  lang,
  services,
  barbers,
  presetSlug,
}: {
  lang: Lang;
  services: ServiceRow[];
  barbers: Barber[];
  presetSlug?: string;
}) {
  const tt = t(lang);
  const router = useRouter();

  const initialService =
    services.find((s) => (lang === "ar" ? s.slug_ar : s.slug_en) === presetSlug) ?? services[0];

  const [serviceId, setServiceId] = useState<string>(initialService?.id ?? "");
  const [barberId, setBarberId] = useState<string>(barbers[0]?.id ?? "");
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | { service: string; barber: string; date: string; slot: string }>(null);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const selectedBarber = useMemo(() => barbers.find((b) => b.id === barberId), [barbers, barberId]);

  const serviceLabel = (s: ServiceRow) => (lang === "ar" ? s.title_ar : s.title_en);
  const barberLabel = (b: Barber) => (lang === "ar" ? b.name_ar : b.name_en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !slot || !name.trim() || !phone.trim() || !serviceId) {
      toast.error(tt.reservation.missingFields);
      return;
    }
    setSubmitting(true);
    try {
      await createBooking({
        data: {
          service_id: serviceId,
          barber_id: barberId || null,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          booking_date: format(date, "yyyy-MM-dd"),
          booking_time: slot,
          notes: notes.trim() || null,
          language: lang,
        },
      });
      const summary = {
        service: selectedService ? serviceLabel(selectedService) : "",
        barber: selectedBarber ? barberLabel(selectedBarber) : "",
        date: format(date, "PPP"),
        slot,
      };
      setSubmitted(summary);
      toast.success(tt.reservation.bookingSaved, {
        description: `${summary.service} · ${summary.date} ${summary.slot}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Section lang={lang} eyebrow={tt.reservation.confirmedEyebrow} title={tt.reservation.confirmedTitle}>
        <div className="max-w-xl rounded-lg border border-primary/40 bg-card p-8 shadow-elegant">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-6 w-6" />
          </div>
          <p className="font-serif text-2xl">{tt.reservation.confirmedThanks(name.split(" ")[0])}</p>
          <p className="mt-2 text-muted-foreground">{tt.reservation.confirmedDesc(phone)}</p>
          <dl className="mt-6 space-y-3 border-t border-border/60 pt-6 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{tt.reservation.service}</dt><dd>{submitted.service}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{tt.reservation.barber}</dt><dd>{submitted.barber}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{tt.reservation.date}</dt><dd>{submitted.date}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{tt.reservation.timeSlot}</dt><dd dir="ltr">{submitted.slot}</dd></div>
          </dl>
          <button
            onClick={() => { setSubmitted(null); router.invalidate(); }}
            className="mt-8 inline-flex items-center justify-center rounded-md border border-foreground/20 px-4 py-2 text-sm hover:border-foreground/40"
          >
            {tt.reservation.another}
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section lang={lang} eyebrow={tt.reservation.pageEyebrow} title={tt.reservation.pageTitle} intro={tt.reservation.pageIntro}>
      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{tt.reservation.service}</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{serviceLabel(s)} — {formatPrice(lang, s.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tt.reservation.barber}</Label>
              <Select value={barberId} onValueChange={setBarberId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{barberLabel(b)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tt.reservation.date}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : tt.reservation.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{tt.reservation.timeSlot}</Label>
              <div className="grid grid-cols-3 gap-2" dir="ltr">
                {slots.map((time) => (
                  <button
                    type="button"
                    key={time}
                    onClick={() => setSlot(time)}
                    className={cn(
                      "rounded-md border py-2.5 text-sm transition-colors",
                      slot === time
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{tt.reservation.fullName}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tt.reservation.yourName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{tt.reservation.phone}</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 ..." required dir="ltr" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{tt.reservation.notes}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tt.reservation.notesPh} rows={4} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-4 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110 disabled:opacity-60 md:w-auto"
          >
            {submitting ? "…" : tt.reservation.confirm}
          </button>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border border-border/60 bg-card p-6">
            <div className="label-eyebrow mb-3">{tt.reservation.summary}</div>
            <div className="font-serif text-2xl">{selectedService ? serviceLabel(selectedService) : "—"}</div>
            {selectedService && (
              <div className="mt-1 text-sm text-muted-foreground">
                {tt.services.durationMinutes(selectedService.duration_minutes)} · {formatPrice(lang, selectedService.price)}
              </div>
            )}
            <dl className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{tt.reservation.barber}</dt><dd>{selectedBarber ? barberLabel(selectedBarber) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{tt.reservation.date}</dt><dd>{date ? format(date, "PPP") : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{tt.reservation.timeSlot}</dt><dd dir="ltr">{slot || "—"}</dd></div>
            </dl>
            <p className="mt-6 text-xs text-muted-foreground">{tt.services.detailFreeCancel}</p>
          </div>
        </aside>
      </form>
    </Section>
  );
}
