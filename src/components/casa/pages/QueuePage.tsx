import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock, MessageCircle, TicketCheck } from "lucide-react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import type { ServiceRow } from "@/components/casa/ServiceCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { waLink } from "@/lib/casa";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Barber = { id: string; name_en: string; name_ar: string };
type QueueMode = "any_barber" | "specific_barber";
type QueueStatus = Database["public"]["Functions"]["get_queue_ticket_status"]["Returns"][number];
type QueueJoinResult = Database["public"]["Functions"]["join_queue"]["Returns"][number];

type QueueSessionData = {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  barberName: string;
};

type QueuePageProps = {
  lang: Lang;
  services: ServiceRow[];
  barbers: Barber[];
  ticket?: string;
};

const queueSessionKey = (token: string) => `casa.queue.${token}`;

const safeReadSession = (token: string): QueueSessionData | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(queueSessionKey(token));
    return raw ? (JSON.parse(raw) as QueueSessionData) : null;
  } catch {
    return null;
  }
};

const safeWriteSession = (token: string, data: QueueSessionData) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(queueSessionKey(token), JSON.stringify(data));
};

const formatDateTime = (value: string | null, lang: Lang) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
};

const statusClass = (status: string) =>
  ({
    waiting: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    called: "border-primary/50 bg-primary/10 text-primary",
    in_service: "border-sky-500/40 bg-sky-500/10 text-sky-200",
    completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    no_show: "border-red-500/40 bg-red-500/10 text-red-200",
    cancelled: "border-red-500/40 bg-red-500/10 text-red-200",
  })[status] ?? "border-border/60 bg-secondary text-secondary-foreground";

const queueStatusMessage = (lang: Lang, status: QueueStatus) => {
  const tt = t(lang);
  if (status.status === "waiting" && status.position === 1) return tt.queue.status.next;
  return tt.queue.status[status.status as keyof typeof tt.queue.status] ?? tt.queue.status.waiting;
};

export function QueuePage({ lang, services, barbers, ticket }: QueuePageProps) {
  return ticket ? (
    <QueueStatusScreen lang={lang} ticket={ticket} />
  ) : (
    <QueueJoinForm lang={lang} services={services} barbers={barbers} />
  );
}

function QueueJoinForm({
  lang,
  services,
  barbers,
}: {
  lang: Lang;
  services: ServiceRow[];
  barbers: Barber[];
}) {
  const tt = t(lang);
  const navigate = useNavigate();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [mode, setMode] = useState<QueueMode>("any_barber");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const serviceLabel = useCallback(
    (service: ServiceRow) => (lang === "ar" ? service.title_ar : service.title_en),
    [lang],
  );
  const barberLabel = useCallback(
    (barber: Barber) => (lang === "ar" ? barber.name_ar : barber.name_en),
    [lang],
  );

  const selectedService = services.find((service) => service.id === serviceId);
  const selectedBarber = barbers.find((barber) => barber.id === barberId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = customerName.trim();
    const phone = customerPhone.trim();
    const selectedSpecificBarber = mode === "specific_barber" ? barberId : null;

    if (!serviceId || !name || !phone || (mode === "specific_barber" && !barberId)) {
      toast.error(tt.queue.missingFields);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .rpc("join_queue", {
          p_service_id: serviceId,
          p_customer_name: name,
          p_customer_phone: phone,
          p_mode: mode,
          p_barber_id: selectedSpecificBarber,
          p_language: lang,
          p_notes: notes.trim() || null,
        })
        .single();

      if (error) throw error;
      const result = data as QueueJoinResult;

      safeWriteSession(result.public_token, {
        customerName: name,
        customerPhone: phone,
        serviceName: selectedService
          ? serviceLabel(selectedService)
          : (result.service_display_name ?? ""),
        barberName:
          mode === "specific_barber" && selectedBarber
            ? barberLabel(selectedBarber)
            : (result.barber_display_name ?? ""),
      });

      await navigate({
        to: localePath(lang, "/queue"),
        search: { ticket: result.public_token },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.common.error;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section
      lang={lang}
      eyebrow={tt.queue.title}
      title={tt.queue.joinTitle}
      intro={tt.queue.joinIntro}
    >
      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{tt.queue.service}</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {serviceLabel(service)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tt.queue.mode}</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as QueueMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any_barber">{tt.queue.anyBarber}</SelectItem>
                  <SelectItem value="specific_barber">{tt.queue.specificBarber}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "specific_barber" && (
              <div className="space-y-2 md:col-span-2">
                <Label>{tt.queue.barber}</Label>
                <Select value={barberId} onValueChange={setBarberId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barberLabel(barber)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="queue-name">{tt.queue.fullName}</Label>
              <Input
                id="queue-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder={tt.reservation.yourName}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="queue-phone">{tt.queue.phone}</Label>
              <Input
                id="queue-phone"
                type="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="+971 ..."
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="queue-notes">{tt.queue.notes}</Label>
            <Textarea
              id="queue-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder={tt.reservation.notesPh}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || services.length === 0}
            className="w-full md:w-auto"
          >
            <TicketCheck className="h-4 w-4" />
            {submitting ? tt.queue.joining : tt.queue.join}
          </Button>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border border-border/60 bg-card p-6">
            <div className="label-eyebrow mb-3">{tt.queue.title}</div>
            <div className="font-serif text-2xl">
              {selectedService ? serviceLabel(selectedService) : "—"}
            </div>
            <dl className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{tt.queue.mode}</dt>
                <dd>{mode === "any_barber" ? tt.queue.anyBarber : tt.queue.specificBarber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{tt.queue.barber}</dt>
                <dd>
                  {mode === "any_barber"
                    ? tt.queue.anyBarber
                    : selectedBarber
                      ? barberLabel(selectedBarber)
                      : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </form>
    </Section>
  );
}

function QueueStatusScreen({ lang, ticket }: { lang: Lang; ticket: string }) {
  const tt = t(lang);
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastEstimate = useRef("");
  const sessionData = useMemo(() => safeReadSession(ticket), [ticket]);

  const loadStatus = useCallback(
    async (notifyChange = false) => {
      setError(null);
      const { data, error: rpcError } = await supabase
        .rpc("get_queue_ticket_status", { p_public_token: ticket })
        .maybeSingle();

      if (rpcError) {
        setError(rpcError.message);
        setStatus(null);
      } else {
        const next = data as QueueStatus | null;
        if (next && notifyChange) {
          const estimate = `${next.estimated_wait_min ?? ""}:${next.estimated_wait_max ?? ""}`;
          if (lastEstimate.current && lastEstimate.current !== estimate) {
            toast.info(tt.queue.updated);
          }
          lastEstimate.current = estimate;
        } else if (next) {
          lastEstimate.current = `${next.estimated_wait_min ?? ""}:${next.estimated_wait_max ?? ""}`;
        }
        setStatus(next);
      }
      setLoading(false);
    },
    [ticket, tt.queue.updated],
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const topic = `queue-ticket:${ticket}`;
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on(
        "broadcast",
        { event: "queue_status_changed" },
        (message: { payload?: { event?: string } }) => {
          if (message.payload?.event === "queue_status_changed") {
            void loadStatus(true);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadStatus, ticket]);

  const whatsappMessage = useMemo(() => {
    if (!status) return tt.queue.whatsappGeneric;
    const wait =
      status.estimated_wait_min != null && status.estimated_wait_max != null
        ? `${status.estimated_wait_min}–${status.estimated_wait_max}`
        : "—";

    if (lang === "ar") {
      return sessionData
        ? [
            "مرحباً كازا، لقد انضممت إلى قائمة الانتظار.",
            `الاسم: ${sessionData.customerName}`,
            `رقم الدور: ${status.queue_number}`,
            `الخدمة: ${sessionData.serviceName || status.service_display_name || "—"}`,
            `الحلاق: ${sessionData.barberName || status.barber_display_name || "—"}`,
            `الانتظار المتوقع: ${wait} دقيقة`,
          ].join("\n")
        : [
            tt.queue.whatsappGeneric,
            `رقم الدور: ${status.queue_number}`,
            `الحالة: ${queueStatusMessage(lang, status)}`,
          ].join("\n");
    }

    return sessionData
      ? [
          "Hi Casa, I joined the queue.",
          `Name: ${sessionData.customerName}`,
          `Queue number: ${status.queue_number}`,
          `Service: ${sessionData.serviceName || status.service_display_name || "—"}`,
          `Barber: ${sessionData.barberName || status.barber_display_name || "—"}`,
          `Estimated wait: ${wait} minutes`,
        ].join("\n")
      : [
          tt.queue.whatsappGeneric,
          `Queue number: ${status.queue_number}`,
          `Status: ${queueStatusMessage(lang, status)}`,
        ].join("\n");
  }, [lang, sessionData, status, tt.queue.whatsappGeneric]);

  return (
    <Section lang={lang} eyebrow={tt.queue.title} title={tt.queue.statusTitle}>
      {loading ? (
        <p className="text-sm text-muted-foreground">{tt.common.loading}</p>
      ) : error || !status ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>{tt.queue.loadError}</AlertTitle>
          <AlertDescription>{error ?? tt.common.error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="rounded-lg border border-border/60 bg-card p-6">
            <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {tt.queue.queueNumber}
                </div>
                <div className="mt-1 font-serif text-6xl text-primary">#{status.queue_number}</div>
              </div>
              <Badge variant="outline" className={cn("w-fit", statusClass(status.status))}>
                {queueStatusMessage(lang, status)}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <QueueFact label={tt.queue.service} value={status.service_display_name ?? "—"} />
              <QueueFact label={tt.queue.barber} value={status.barber_display_name ?? "—"} />
              <QueueFact label={tt.queue.position} value={String(status.position || "—")} />
              <QueueFact
                label={tt.queue.estimatedWait}
                value={
                  status.estimated_wait_min != null && status.estimated_wait_max != null
                    ? tt.queue.estimatedWaitRange(
                        status.estimated_wait_min,
                        status.estimated_wait_max,
                      )
                    : "—"
                }
              />
              <QueueFact
                label={tt.queue.estimatedStart}
                value={formatDateTime(status.estimated_start_time, lang)}
              />
              <QueueFact
                label={tt.queue.predictionConfidence}
                value={
                  tt.queue.confidence[
                    (status.prediction_confidence ?? "low") as keyof typeof tt.queue.confidence
                  ]
                }
              />
            </div>
          </div>

          <aside className="rounded-lg border border-border/60 bg-card p-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <p className="font-serif text-2xl">{queueStatusMessage(lang, status)}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {status.estimated_wait_min != null && status.estimated_wait_max != null
                ? tt.queue.estimatedWaitRange(status.estimated_wait_min, status.estimated_wait_max)
                : tt.queue.status.waiting}
            </p>
            <Button asChild className="mt-6 w-full">
              <a href={waLink(whatsappMessage)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                {tt.queue.confirmWhatsApp}
              </a>
            </Button>
          </aside>
        </div>
      )}
    </Section>
  );
}

function QueueFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function AlertCircleIcon() {
  return <Clock className="h-4 w-4" />;
}
