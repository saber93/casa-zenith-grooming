import { createFileRoute, useRouter } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check } from "lucide-react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { services } from "@/data/services";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const reservationSearch = z.object({
  service: fallback(z.string(), "").default(""),
});

const barbers = [
  { id: "karim", name: "Karim", role: "Senior stylist" },
  { id: "yassine", name: "Yassine", role: "Beard specialist" },
  { id: "omar", name: "Omar", role: "Color & cuts" },
  { id: "hicham", name: "Hicham", role: "Home barber" },
];

const slots = ["10:00", "10:30", "11:00", "11:30", "13:00", "14:00", "15:30", "17:00", "18:30", "20:00"];

export const Route = createFileRoute("/reservation")({
  validateSearch: zodValidator(reservationSearch),
  head: () => ({
    meta: [
      { title: "Reserve — Casa Gents Grooming" },
      { name: "description", content: "Book your Casa appointment online. Pick a service, barber, date and time — confirmed in seconds." },
      { property: "og:title", content: "Reserve — Casa Gents Grooming" },
      { property: "og:description", content: "Book your Casa appointment online." },
    ],
  }),
  component: ReservationPage,
});

function ReservationPage() {
  const { service: presetService } = Route.useSearch();
  const router = useRouter();

  const [serviceSlug, setServiceSlug] = useState(presetService || services[0].slug);
  const [barberId, setBarberId] = useState(barbers[0].id);
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState<null | { service: string; barber: string; date: string; slot: string }>(null);

  const selectedService = useMemo(() => services.find((s) => s.slug === serviceSlug)!, [serviceSlug]);
  const selectedBarber = useMemo(() => barbers.find((b) => b.id === barberId)!, [barberId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !slot || !name.trim() || !phone.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const summary = {
      service: selectedService.name,
      barber: selectedBarber.name,
      date: format(date, "PPP"),
      slot,
    };
    setSubmitted(summary);
    toast.success("Booking confirmed", {
      description: `${summary.service} with ${summary.barber} · ${summary.date} at ${summary.slot}`,
    });
  };

  if (submitted) {
    return (
      <Section eyebrow="Confirmed" title="Your chair is held.">
        <div className="max-w-xl rounded-lg border border-primary/40 bg-card p-8 shadow-elegant">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-6 w-6" />
          </div>
          <p className="font-serif text-2xl">Thank you, {name.split(" ")[0]}.</p>
          <p className="mt-2 text-muted-foreground">We'll send a WhatsApp confirmation to {phone} shortly.</p>
          <dl className="mt-6 space-y-3 border-t border-border/60 pt-6 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Service</dt><dd>{submitted.service}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Barber</dt><dd>{submitted.barber}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{submitted.date}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Time</dt><dd>{submitted.slot}</dd></div>
          </dl>
          <button
            onClick={() => { setSubmitted(null); router.invalidate(); }}
            className="mt-8 inline-flex items-center justify-center rounded-md border border-foreground/20 px-4 py-2 text-sm hover:border-foreground/40"
          >
            Make another booking
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section
      eyebrow="Reservation"
      title="Book your chair."
      intro="Pick a service, your barber, and a time that works. We'll confirm by WhatsApp."
    >
      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select value={serviceSlug} onValueChange={setServiceSlug}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>{s.name} — {s.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Barber</Label>
              <Select value={barberId} onValueChange={setBarberId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} · {b.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
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
              <Label>Time slot</Label>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setSlot(t)}
                    className={cn(
                      "rounded-md border py-2.5 text-sm transition-colors",
                      slot === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 ..." required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" rows={4} />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-4 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110 md:w-auto"
          >
            Confirm Booking
          </button>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border border-border/60 bg-card p-6">
            <div className="label-eyebrow mb-3">Summary</div>
            <div className="font-serif text-2xl">{selectedService.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{selectedService.duration} · {selectedService.price}</div>
            <dl className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Barber</dt><dd>{selectedBarber.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{date ? format(date, "PPP") : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Time</dt><dd>{slot || "—"}</dd></div>
            </dl>
            <p className="mt-6 text-xs text-muted-foreground">Free cancellation up to 2h before.</p>
          </div>
        </aside>
      </form>
    </Section>
  );
}
