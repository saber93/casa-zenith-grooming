import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, LogOut, RefreshCw } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type QueueTicket = Database["public"]["Tables"]["queue_tickets"]["Row"];
type ServiceRow = Pick<
  Database["public"]["Tables"]["services"]["Row"],
  "id" | "title_en" | "title_ar"
>;
type BarberRow = Pick<Database["public"]["Tables"]["barbers"]["Row"], "id" | "name_en" | "name_ar">;
type QueueAction = "call" | "start" | "complete" | "no_show" | "cancel" | "reassign";

const queueStatuses = ["waiting", "called", "in_service", "completed", "cancelled", "no_show"];
const activeStatuses = ["waiting", "called", "in_service"];

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const formatDateTime = (value: string | null, lang: Lang) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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

const sortQueue = (a: QueueTicket, b: QueueTicket) => {
  const aStatus = activeStatuses.includes(a.status) ? activeStatuses.indexOf(a.status) : 10;
  const bStatus = activeStatuses.includes(b.status) ? activeStatuses.indexOf(b.status) : 10;
  if (aStatus !== bStatus) return aStatus - bStatus;
  return a.queue_number - b.queue_number;
};

export function AdminQueuePage({ lang }: { lang: Lang }) {
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/queue"),
  )}`;

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ticketResult, servicesResult, barbersResult] = await Promise.all([
        supabase
          .from("queue_tickets")
          .select("*")
          .eq("queue_date", todayIso())
          .order("queue_number", { ascending: true }),
        supabase.from("services").select("id, title_en, title_ar"),
        supabase.from("barbers").select("id, name_en, name_ar"),
      ]);

      if (ticketResult.error) throw ticketResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (barbersResult.error) throw barbersResult.error;

      setTickets(((ticketResult.data ?? []) as QueueTicket[]).sort(sortQueue));
      setServices((servicesResult.data ?? []) as ServiceRow[]);
      setBarbers((barbersResult.data ?? []) as BarberRow[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.queue.loadError;
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [tt.queue.loadError]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.navigate({ to: loginHref });
      return;
    }
    if (!auth.loading && auth.user && auth.isAdmin) {
      void loadQueue();
    }
  }, [auth.loading, auth.user, auth.isAdmin, loadQueue, loginHref, router]);

  useEffect(() => {
    if (!auth.user || !auth.isAdmin) return undefined;

    const channel = supabase
      .channel("admin-queue-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets" }, () => {
        void loadQueue();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [auth.isAdmin, auth.user, loadQueue]);

  const serviceName = useCallback(
    (serviceId: string | null) => {
      const service = services.find((item) => item.id === serviceId);
      return service ? (lang === "ar" ? service.title_ar : service.title_en) : "—";
    },
    [lang, services],
  );

  const barberName = useCallback(
    (barberId: string | null) => {
      const barber = barbers.find((item) => item.id === barberId);
      return barber ? (lang === "ar" ? barber.name_ar : barber.name_en) : tt.admin.noBarber;
    },
    [barbers, lang, tt.admin.noBarber],
  );

  const groups = useMemo(() => {
    const grouped = new Map<string, QueueTicket[]>();
    for (const ticket of tickets) {
      const key = ticket.barber_id ?? "__none__";
      grouped.set(key, [...(grouped.get(key) ?? []), ticket]);
    }

    const knownGroups = barbers.map((barber) => ({
      key: barber.id,
      label: lang === "ar" ? barber.name_ar : barber.name_en,
      tickets: (grouped.get(barber.id) ?? []).sort(sortQueue),
    }));

    const unassigned = (grouped.get("__none__") ?? []).sort(sortQueue);
    return unassigned.length > 0
      ? [...knownGroups, { key: "__none__", label: tt.admin.noBarber, tickets: unassigned }]
      : knownGroups;
  }, [barbers, lang, tickets, tt.admin.noBarber]);

  const runAction = async (ticket: QueueTicket, action: QueueAction, barberId?: string) => {
    setBusyId(ticket.id);
    try {
      const { error } = await supabase.rpc("admin_queue_action", {
        p_ticket_id: ticket.id,
        p_action: action,
        p_barber_id: barberId ?? null,
      });
      if (error) throw error;
      toast.success(tt.queue.actionDone);
      await loadQueue();
    } catch (error) {
      const raw = error instanceof Error ? error.message : tt.common.error;
      const message = raw.includes("Start the service before completing it")
        ? tt.queue.errors.startBeforeComplete
        : raw;
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const waitLabel = (ticket: QueueTicket) =>
    ticket.estimated_wait_min != null && ticket.estimated_wait_max != null
      ? tt.queue.estimatedWaitRange(ticket.estimated_wait_min, ticket.estimated_wait_max)
      : "—";

  const confidenceLabel = (ticket: QueueTicket) =>
    tt.queue.confidence[
      (ticket.prediction_confidence ?? "low") as keyof typeof tt.queue.confidence
    ];

  const statusLabel = (status: string) =>
    tt.queue.ticketStatus[status as keyof typeof tt.queue.ticketStatus] ?? status.replace("_", " ");

  if (auth.loading) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.queue.title}>
        <p className="text-sm text-muted-foreground">{tt.common.loading}</p>
      </Section>
    );
  }

  if (!auth.user) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.queue.title}>
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
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.queue.title}>
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
      title={tt.queue.title}
      intro={tt.queue.adminIntro}
    >
      <div className="mb-8 flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-serif text-4xl">{tickets.length}</div>
          <p className="text-sm text-muted-foreground">{todayIso()}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to={localePath(lang, "/admin/bookings")}>{tt.admin.title}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={localePath(lang, "/admin/queue-display")}>
              {tt.queueDisplay.openDisplayMode}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={loadQueue} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} /> {tt.queue.refresh}
          </Button>
          <Button variant="ghost" size="sm" onClick={auth.signOut}>
            <LogOut className="h-4 w-4" /> {tt.nav.logout}
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tt.queue.loadError}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {loading && tickets.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            {tt.common.loading}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            {tt.queue.empty}
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-lg border border-border/60 bg-card"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <h2 className="font-serif text-2xl">{group.label}</h2>
                <Badge variant="outline">{group.tickets.length}</Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tt.queue.queueNumber}</TableHead>
                      <TableHead>{tt.queue.customer}</TableHead>
                      <TableHead>{tt.queue.service}</TableHead>
                      <TableHead>{tt.queue.mode}</TableHead>
                      <TableHead>{tt.admin.cols.status}</TableHead>
                      <TableHead>{tt.queue.estimatedWait}</TableHead>
                      <TableHead>{tt.queue.predictionConfidence}</TableHead>
                      <TableHead>{tt.queue.created}</TableHead>
                      <TableHead>{tt.queue.calledAt}</TableHead>
                      <TableHead>{tt.queue.startedAt}</TableHead>
                      <TableHead>{tt.queue.completedAt}</TableHead>
                      <TableHead>{tt.queue.actualMinutes}</TableHead>
                      <TableHead>{tt.queue.actions.reassign}</TableHead>
                      <TableHead>{tt.admin.cols.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-serif text-2xl text-primary">
                          #{ticket.queue_number}
                        </TableCell>
                        <TableCell className="min-w-44">
                          <div>{ticket.customer_name}</div>
                          <a
                            href={`tel:${ticket.customer_phone.replace(/\s/g, "")}`}
                            className="text-xs text-muted-foreground hover:text-foreground"
                            dir="ltr"
                          >
                            {ticket.customer_phone}
                          </a>
                        </TableCell>
                        <TableCell className="min-w-40">{serviceName(ticket.service_id)}</TableCell>
                        <TableCell className="min-w-36">
                          {ticket.mode === "specific_barber"
                            ? tt.queue.specificBarber
                            : tt.queue.anyBarber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("whitespace-nowrap", statusClass(ticket.status))}
                          >
                            {queueStatuses.includes(ticket.status)
                              ? statusLabel(ticket.status)
                              : ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-44">{waitLabel(ticket)}</TableCell>
                        <TableCell>{confidenceLabel(ticket)}</TableCell>
                        <TableCell className="min-w-32">
                          {formatDateTime(ticket.created_at, lang)}
                        </TableCell>
                        <TableCell className="min-w-32">
                          {formatDateTime(ticket.called_at, lang)}
                        </TableCell>
                        <TableCell className="min-w-32">
                          {formatDateTime(ticket.started_at, lang)}
                        </TableCell>
                        <TableCell className="min-w-32">
                          {formatDateTime(ticket.completed_at, lang)}
                        </TableCell>
                        <TableCell>{ticket.actual_service_minutes ?? "—"}</TableCell>
                        <TableCell className="min-w-44">
                          <Select
                            value={ticket.barber_id ?? ""}
                            onValueChange={(value) => void runAction(ticket, "reassign", value)}
                            disabled={
                              busyId === ticket.id ||
                              ["completed", "cancelled", "no_show"].includes(ticket.status)
                            }
                          >
                            <SelectTrigger className="w-40" aria-label={tt.queue.actions.reassign}>
                              <SelectValue placeholder={barberName(ticket.barber_id)} />
                            </SelectTrigger>
                            <SelectContent>
                              {barbers.map((barber) => (
                                <SelectItem key={barber.id} value={barber.id}>
                                  {lang === "ar" ? barber.name_ar : barber.name_en}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="min-w-80">
                          <div className="flex flex-wrap gap-2">
                            <QueueActionButton
                              label={tt.queue.actions.call}
                              disabled={busyId === ticket.id || ticket.status !== "waiting"}
                              onClick={() => void runAction(ticket, "call")}
                            />
                            <QueueActionButton
                              label={tt.queue.actions.start}
                              disabled={
                                busyId === ticket.id ||
                                !["waiting", "called"].includes(ticket.status)
                              }
                              onClick={() => void runAction(ticket, "start")}
                            />
                            <QueueActionButton
                              label={tt.queue.actions.complete}
                              disabled={busyId === ticket.id || ticket.status !== "in_service"}
                              onClick={() => void runAction(ticket, "complete")}
                            />
                            <QueueActionButton
                              label={tt.queue.actions.no_show}
                              disabled={
                                busyId === ticket.id ||
                                !["waiting", "called"].includes(ticket.status)
                              }
                              onClick={() => void runAction(ticket, "no_show")}
                            />
                            <QueueActionButton
                              label={tt.queue.actions.cancel}
                              disabled={
                                busyId === ticket.id ||
                                ["completed", "cancelled", "no_show"].includes(ticket.status)
                              }
                              onClick={() => void runAction(ticket, "cancel")}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}

function QueueActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}
