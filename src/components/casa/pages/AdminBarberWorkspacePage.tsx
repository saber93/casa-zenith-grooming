import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  LogOut,
  MessageCircle,
  Phone,
  Play,
  RefreshCw,
  Scissors,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type QueueTicket = Database["public"]["Tables"]["queue_tickets"]["Row"];
type ServiceRow = Pick<
  Database["public"]["Tables"]["services"]["Row"],
  | "id"
  | "title_en"
  | "title_ar"
  | "default_duration_min"
  | "default_duration_max"
  | "duration_minutes"
>;
type BarberRow = Pick<
  Database["public"]["Tables"]["barbers"]["Row"],
  "id" | "name_en" | "name_ar" | "is_active"
>;
type QueueAction = "call" | "start" | "complete" | "no_show" | "cancel";

const BARBER_WORKSPACE_STORAGE_KEY = "casa.admin.barberWorkspace.barberId";
const ACTIVE_QUEUE_STATUSES = ["waiting", "called", "in_service"];

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const sortByQueueNumber = (a: QueueTicket, b: QueueTicket) =>
  a.queue_number - b.queue_number ||
  new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();

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

const formatMinutes = (value: number, lang: Lang) =>
  lang === "ar" ? `${value} دقيقة` : `${value} min`;

const formatMinuteRange = (
  min: number | null | undefined,
  max: number | null | undefined,
  lang: Lang,
) => {
  if (min == null || max == null) return "—";
  return lang === "ar" ? `${min}–${max} دقيقة` : `${min}–${max} min`;
};

const elapsedMinutes = (startedAt: string | null, nowMs: number) => {
  if (!startedAt) return 0;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((nowMs - started) / 60_000));
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

const phoneDigits = (phone: string) => phone.replace(/\D/g, "");

const customerWhatsAppLink = (phone: string, message: string) =>
  `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(message)}`;

export function AdminBarberWorkspacePage({ lang }: { lang: Lang }) {
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/barber-workspace"),
  )}`;

  const loadWorkspace = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const [ticketResult, servicesResult, barbersResult] = await Promise.all([
          supabase
            .from("queue_tickets")
            .select("*")
            .eq("queue_date", todayIso())
            .in("status", ACTIVE_QUEUE_STATUSES)
            .order("queue_number", { ascending: true }),
          supabase
            .from("services")
            .select(
              "id, title_en, title_ar, default_duration_min, default_duration_max, duration_minutes",
            ),
          supabase
            .from("barbers")
            .select("id, name_en, name_ar, is_active")
            .eq("is_active", true)
            .order("name_en", { ascending: true }),
        ]);

        if (ticketResult.error) throw ticketResult.error;
        if (servicesResult.error) throw servicesResult.error;
        if (barbersResult.error) throw barbersResult.error;

        setTickets(((ticketResult.data ?? []) as QueueTicket[]).sort(sortByQueueNumber));
        setServices((servicesResult.data ?? []) as ServiceRow[]);
        setBarbers((barbersResult.data ?? []) as BarberRow[]);
        setNowMs(Date.now());
      } catch (error) {
        const message = error instanceof Error ? error.message : tt.queue.loadError;
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [tt.queue.loadError],
  );

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.navigate({ to: loginHref });
      return;
    }
    if (!auth.loading && auth.user && auth.isAdmin) {
      void loadWorkspace();
    }
  }, [auth.loading, auth.user, auth.isAdmin, loadWorkspace, loginHref, router]);

  useEffect(() => {
    if (barbers.length === 0) {
      setSelectedBarberId("");
      return;
    }

    setSelectedBarberId((current) => {
      if (barbers.some((barber) => barber.id === current)) return current;

      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(BARBER_WORKSPACE_STORAGE_KEY);
        if (saved && barbers.some((barber) => barber.id === saved)) return saved;
      }

      return barbers[0]?.id ?? "";
    });
  }, [barbers]);

  useEffect(() => {
    if (!selectedBarberId || typeof window === "undefined") return;
    window.localStorage.setItem(BARBER_WORKSPACE_STORAGE_KEY, selectedBarberId);
  }, [selectedBarberId]);

  useEffect(() => {
    if (!auth.user || !auth.isAdmin) return undefined;

    const channel = supabase
      .channel("admin-barber-workspace-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets" }, () => {
        void loadWorkspace(true);
      })
      .subscribe();

    const refreshId = window.setInterval(() => {
      void loadWorkspace(true);
    }, 30_000);

    return () => {
      window.clearInterval(refreshId);
      void supabase.removeChannel(channel);
    };
  }, [auth.isAdmin, auth.user, loadWorkspace]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timerId);
  }, []);

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );
  const selectedBarber = barbers.find((barber) => barber.id === selectedBarberId);
  const selectedTickets = useMemo(
    () => tickets.filter((ticket) => ticket.barber_id === selectedBarberId).sort(sortByQueueNumber),
    [selectedBarberId, tickets],
  );

  const currentClient =
    selectedTickets.filter((ticket) => ticket.status === "in_service").sort(sortByQueueNumber)[0] ??
    selectedTickets.filter((ticket) => ticket.status === "called").sort(sortByQueueNumber)[0] ??
    null;
  const waitingTickets = selectedTickets
    .filter((ticket) => ticket.status === "waiting")
    .sort(sortByQueueNumber);
  const nextClient = waitingTickets[0] ?? null;
  const noShowTarget = currentClient?.status === "called" ? currentClient : nextClient;
  const cancelTarget = currentClient?.status === "called" ? currentClient : nextClient;

  const serviceName = useCallback(
    (serviceId: string | null) => {
      const service = serviceId ? serviceById.get(serviceId) : undefined;
      return service ? (lang === "ar" ? service.title_ar : service.title_en) : "—";
    },
    [lang, serviceById],
  );

  const statusLabel = useCallback(
    (status: string) =>
      tt.queue.ticketStatus[status as keyof typeof tt.queue.ticketStatus] ??
      status.replace("_", " "),
    [tt],
  );

  const waitLabel = (ticket: QueueTicket | null) =>
    ticket && ticket.estimated_wait_min != null && ticket.estimated_wait_max != null
      ? tt.queue.estimatedWaitRange(ticket.estimated_wait_min, ticket.estimated_wait_max)
      : "—";

  const serviceRange = (ticket: QueueTicket | null) => {
    if (!ticket) return { min: null, max: null };
    const service = ticket.service_id ? serviceById.get(ticket.service_id) : undefined;
    const fallbackDuration = service?.duration_minutes ?? null;
    const min =
      service?.default_duration_min ??
      (ticket.estimated_wait_min && ticket.estimated_wait_min > 0
        ? ticket.estimated_wait_min
        : fallbackDuration);
    const max =
      service?.default_duration_max ??
      (ticket.estimated_wait_max && ticket.estimated_wait_max > 0
        ? ticket.estimated_wait_max
        : fallbackDuration);
    return { min, max };
  };

  const primaryAction = (() => {
    if (currentClient?.status === "called") {
      return {
        action: "start" as const,
        ticket: currentClient,
        label: tt.barberWorkspace.startService,
        icon: <Play className="h-5 w-5" />,
      };
    }
    if (currentClient?.status === "in_service") {
      return {
        action: "complete" as const,
        ticket: currentClient,
        label: tt.barberWorkspace.completeService,
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    }
    if (!currentClient && nextClient) {
      return {
        action: "call" as const,
        ticket: nextClient,
        label: tt.barberWorkspace.nextClient,
        icon: <UserCheck className="h-5 w-5" />,
      };
    }
    return null;
  })();

  const runAction = async (ticket: QueueTicket, action: QueueAction) => {
    const actionKey = `${action}:${ticket.id}`;
    setBusyKey(actionKey);
    try {
      const { error } = await supabase.rpc("admin_queue_action", {
        p_ticket_id: ticket.id,
        p_action: action,
        p_barber_id: null,
      });
      if (error) throw error;
      toast.success(
        action === "complete" ? tt.barberWorkspace.completeSuccess : tt.queue.actionDone,
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : tt.common.error;
      const message = raw.includes("Start the service before completing it")
        ? tt.queue.errors.startBeforeComplete
        : raw;
      toast.error(message);
    } finally {
      await loadWorkspace(true);
      setBusyKey(null);
    }
  };

  const isPrimaryBusy = primaryAction
    ? busyKey === `${primaryAction.action}:${primaryAction.ticket.id}`
    : false;
  const noShowBusy = noShowTarget ? busyKey === `no_show:${noShowTarget.id}` : false;
  const cancelBusy = cancelTarget ? busyKey === `cancel:${cancelTarget.id}` : false;

  if (auth.loading) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.barberWorkspace.title}>
        <p className="text-sm text-muted-foreground">{tt.common.loading}</p>
      </Section>
    );
  }

  if (!auth.user) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.barberWorkspace.title}>
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
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.barberWorkspace.title}>
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
    <Section
      lang={lang}
      eyebrow={tt.admin.eyebrow}
      title={tt.barberWorkspace.title}
      intro={tt.barberWorkspace.intro}
      className="py-8 md:py-14"
    >
      <div data-testid="barber-workspace" className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {tt.barberWorkspace.selectBarber}
              </p>
              <h2 className="font-serif text-2xl">
                {selectedBarber
                  ? lang === "ar"
                    ? selectedBarber.name_ar
                    : selectedBarber.name_en
                  : "—"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm">
                <Link to={localePath(lang, "/admin/queue-display")}>
                  {tt.queueDisplay.openDisplayMode}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void loadWorkspace()}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                <span className="sr-only">{tt.queue.refresh}</span>
              </Button>
            </div>
          </div>

          {barbers.length > 0 ? (
            <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
              <SelectTrigger data-testid="barber-workspace-selector" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {lang === "ar" ? barber.name_ar : barber.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">{tt.queue.empty}</p>
          )}
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tt.queue.loadError}</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <ClientCard
          title={tt.barberWorkspace.currentClient}
          emptyText={tt.barberWorkspace.noActiveClient}
          ticket={currentClient}
          lang={lang}
          serviceName={serviceName}
          statusLabel={statusLabel}
          nowMs={nowMs}
          serviceRange={serviceRange(currentClient)}
        />

        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 shadow-glow">
          {primaryAction ? (
            <Button
              data-testid="barber-workspace-primary-action"
              type="button"
              size="lg"
              className="h-16 w-full gap-3 text-base"
              disabled={isPrimaryBusy || (primaryAction.action === "call" && !!currentClient)}
              onClick={() => void runAction(primaryAction.ticket, primaryAction.action)}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          ) : (
            <div className="rounded-md border border-border/60 bg-background/60 p-4 text-center text-sm text-muted-foreground">
              {tt.barberWorkspace.noWaitingClients}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {tt.barberWorkspace.accuracyHint}
          </p>
        </div>

        <NextClientCard
          ticket={nextClient}
          lang={lang}
          serviceName={serviceName}
          waitLabel={waitLabel}
        />

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12"
            disabled={!noShowTarget || currentClient?.status === "in_service" || noShowBusy}
            onClick={() => noShowTarget && void runAction(noShowTarget, "no_show")}
          >
            <Ban className="h-4 w-4" /> {tt.barberWorkspace.markNoShow}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 border-red-500/30 text-red-200 hover:bg-red-500/10 hover:text-red-100"
            disabled={!cancelTarget || cancelBusy}
            onClick={() => cancelTarget && void runAction(cancelTarget, "cancel")}
          >
            {tt.barberWorkspace.cancel}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">{tt.barberWorkspace.waitingQueue}</h2>
            <Badge variant="outline">{waitingTickets.length}</Badge>
          </div>
          {waitingTickets.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-card p-5 text-center text-sm text-muted-foreground">
              {tt.barberWorkspace.noWaitingClients}
            </div>
          ) : (
            waitingTickets.map((ticket) => (
              <QueueListCard
                key={ticket.id}
                ticket={ticket}
                lang={lang}
                serviceName={serviceName(ticket.service_id)}
                statusLabel={statusLabel(ticket.status)}
                waitLabel={waitLabel(ticket)}
              />
            ))
          )}
        </div>
      </div>
    </Section>
  );
}

function ClientCard({
  title,
  emptyText,
  ticket,
  lang,
  serviceName,
  statusLabel,
  nowMs,
  serviceRange,
}: {
  title: string;
  emptyText: string;
  ticket: QueueTicket | null;
  lang: Lang;
  serviceName: (serviceId: string | null) => string;
  statusLabel: (status: string) => string;
  nowMs: number;
  serviceRange: { min: number | null; max: number | null };
}) {
  const tt = t(lang);
  const elapsed = elapsedMinutes(ticket?.started_at ?? null, nowMs);
  const expectedMax = Math.max(ticket?.estimated_wait_max ?? 0, serviceRange.max ?? 0);
  const isLongerThanExpected =
    ticket?.status === "in_service" && expectedMax > 0 && elapsed > expectedMax;
  const progress = expectedMax > 0 ? Math.min(100, Math.round((elapsed / expectedMax) * 100)) : 0;

  return (
    <div
      data-testid="barber-workspace-current-card"
      className="rounded-lg border border-border/60 bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">{title}</h2>
        {ticket && (
          <Badge variant="outline" className={cn("whitespace-nowrap", statusClass(ticket.status))}>
            {statusLabel(ticket.status)}
          </Badge>
        )}
      </div>

      {!ticket ? (
        <div className="rounded-md border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-5">
          <TicketIdentity
            ticket={ticket}
            lang={lang}
            serviceName={serviceName(ticket.service_id)}
          />

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoPill
              label={tt.barberWorkspace.startedAt}
              value={formatDateTime(ticket.started_at, lang)}
            />
            <InfoPill
              label={tt.barberWorkspace.serviceDuration}
              value={formatMinuteRange(serviceRange.min, serviceRange.max, lang)}
            />
          </div>

          {ticket.status === "in_service" && (
            <div className="space-y-3 rounded-md border border-border/60 bg-background/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  {tt.barberWorkspace.elapsedTime}: {formatMinutes(elapsed, lang)}
                </span>
                <span className="text-muted-foreground">
                  {tt.barberWorkspace.expected}:{" "}
                  {formatMinuteRange(serviceRange.min, serviceRange.max, lang)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isLongerThanExpected ? "bg-amber-400" : "bg-primary",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {isLongerThanExpected && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  {tt.barberWorkspace.runningLong}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NextClientCard({
  ticket,
  lang,
  serviceName,
  waitLabel,
}: {
  ticket: QueueTicket | null;
  lang: Lang;
  serviceName: (serviceId: string | null) => string;
  waitLabel: (ticket: QueueTicket | null) => string;
}) {
  const tt = t(lang);

  return (
    <div
      data-testid="barber-workspace-next-card"
      className="rounded-lg border border-border/60 bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">{tt.barberWorkspace.nextClient}</h2>
        {ticket && <Badge variant="outline">{tt.queue.ticketStatus.waiting}</Badge>}
      </div>

      {!ticket ? (
        <div className="rounded-md border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          {tt.barberWorkspace.noWaitingClients}
        </div>
      ) : (
        <div className="space-y-5">
          <TicketIdentity
            ticket={ticket}
            lang={lang}
            serviceName={serviceName(ticket.service_id)}
          />
          <InfoPill label={tt.queue.estimatedWait} value={waitLabel(ticket)} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Button asChild variant="secondary" className="h-12">
              <a
                href={customerWhatsAppLink(
                  ticket.customer_phone,
                  tt.barberWorkspace.customerWhatsAppMessage(ticket.queue_number),
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <a href={`tel:${ticket.customer_phone.replace(/\s/g, "")}`} dir="ltr">
                <Phone className="h-4 w-4" /> {tt.queue.phone}
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueListCard({
  ticket,
  lang,
  serviceName,
  statusLabel,
  waitLabel,
}: {
  ticket: QueueTicket;
  lang: Lang;
  serviceName: string;
  statusLabel: string;
  waitLabel: string;
}) {
  const tt = t(lang);
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl text-primary">#{ticket.queue_number}</span>
            <Badge
              variant="outline"
              className={cn("whitespace-nowrap", statusClass(ticket.status))}
            >
              {statusLabel}
            </Badge>
          </div>
          <p className="mt-1 truncate font-medium">{ticket.customer_name}</p>
          <p className="text-sm text-muted-foreground">{serviceName}</p>
        </div>
        <div className="text-end text-xs text-muted-foreground">
          <div>{tt.queue.estimatedWait}</div>
          <div className="mt-1 text-sm text-foreground">{waitLabel}</div>
        </div>
      </div>
    </div>
  );
}

function TicketIdentity({
  ticket,
  lang,
  serviceName,
}: {
  ticket: QueueTicket;
  lang: Lang;
  serviceName: string;
}) {
  const tt = t(lang);
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 font-serif text-3xl text-primary">
        #{ticket.queue_number}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {tt.barberWorkspace.queueNumber}
        </p>
        <h3 className="mt-1 truncate text-xl font-semibold">{ticket.customer_name}</h3>
        <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Scissors className="h-4 w-4" />
          {serviceName}
        </p>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}
