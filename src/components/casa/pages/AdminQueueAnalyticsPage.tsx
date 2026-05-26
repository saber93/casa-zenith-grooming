import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Clock3,
  LogOut,
  RefreshCw,
  Scissors,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import { useBusinessTerminology } from "@/lib/business-terminology";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type QueueTicket = Pick<
  Database["public"]["Tables"]["queue_tickets"]["Row"],
  | "actual_service_minutes"
  | "barber_id"
  | "completed_at"
  | "created_at"
  | "estimated_start_time"
  | "estimated_wait_max"
  | "estimated_wait_min"
  | "id"
  | "prediction_confidence"
  | "queue_date"
  | "service_id"
  | "started_at"
  | "status"
>;
type ServiceRow = Pick<
  Database["public"]["Tables"]["services"]["Row"],
  "id" | "title_en" | "title_ar" | "default_duration_max" | "duration_minutes"
>;
type BarberRow = Pick<
  Database["public"]["Tables"]["barbers"]["Row"],
  "id" | "name_en" | "name_ar" | "is_active"
>;
type RangePreset = "today" | "7d" | "30d" | "custom";

type BarberMetric = {
  barberId: string;
  name: string;
  completed: number;
  averageDuration: number | null;
  averageWait: number | null;
  noShows: number;
  confidence: string | null;
  busiestService: string;
  total: number;
};

type ServiceMetric = {
  serviceId: string;
  name: string;
  requests: number;
  averageDuration: number | null;
  p50: number | null;
  p80: number | null;
  noShows: number;
};

type HourMetric = {
  hour: string;
  tickets: number;
  completed: number;
  noShows: number;
};

const QUEUE_ANALYTICS_SELECT =
  "id, actual_service_minutes, barber_id, completed_at, created_at, estimated_start_time, estimated_wait_min, estimated_wait_max, prediction_confidence, queue_date, service_id, started_at, status";

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const addDays = (date: string, days: number) => {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const minutesBetween = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60_000);
};

const signedMinutesBetween = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return Math.round((endMs - startMs) / 60_000);
};

const average = (values: Array<number | null | undefined>) => {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const percentile = (values: number[], percent: number) => {
  const valid = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const index = Math.min(valid.length - 1, Math.ceil((percent / 100) * valid.length) - 1);
  return valid[index] ?? null;
};

const formatNumber = (value: number | null, lang: Lang, digits = 0) =>
  value == null
    ? "—"
    : new Intl.NumberFormat(lang === "ar" ? "ar-AE" : "en-GB", {
        maximumFractionDigits: digits,
      }).format(value);

const formatMinutes = (value: number | null, lang: Lang) =>
  value == null ? "—" : `${formatNumber(value, lang, 1)} ${t(lang).queueAnalytics.minutes}`;

const formatWaitRange = (min: number | null, max: number | null, lang: Lang) =>
  min == null || max == null
    ? "—"
    : `${formatNumber(min, lang, 0)}–${formatNumber(max, lang, 0)} ${t(lang).queueAnalytics.minutes}`;

const labelForConfidence = (confidence: string | null, lang: Lang) => {
  if (!confidence) return "—";
  const tt = t(lang);
  return tt.queue.confidence[confidence as keyof typeof tt.queue.confidence] ?? confidence;
};

const isCompleted = (ticket: QueueTicket) => ticket.status === "completed";
const isNoShow = (ticket: QueueTicket) => ticket.status === "no_show";
const isCancelled = (ticket: QueueTicket) => ticket.status === "cancelled";

export function AdminQueueAnalyticsPage({ lang }: { lang: Lang }) {
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const terminology = useBusinessTerminology(lang);
  const business = businessContext.business;
  const canAccess =
    auth.isAdmin ||
    ["business_owner", "business_admin", "business_manager"].includes(
      businessContext.currentUserRole ?? "",
    );
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [rangePreset, setRangePreset] = useState<RangePreset>("today");
  const [customStart, setCustomStart] = useState(todayIso());
  const [customEnd, setCustomEnd] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/queue-analytics"),
  )}`;

  const dateRange = useMemo(() => {
    const today = todayIso();
    if (rangePreset === "7d") return { start: addDays(today, -6), end: today };
    if (rangePreset === "30d") return { start: addDays(today, -29), end: today };
    if (rangePreset === "custom") {
      return customStart <= customEnd
        ? { start: customStart, end: customEnd }
        : { start: customEnd, end: customStart };
    }
    return { start: today, end: today };
  }, [customEnd, customStart, rangePreset]);

  const loadAnalytics = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [ticketResult, serviceResult, barberResult] = await Promise.all([
        supabase
          .from("queue_tickets")
          .select(QUEUE_ANALYTICS_SELECT)
          .eq("business_id", business.id)
          .gte("queue_date", dateRange.start)
          .lte("queue_date", dateRange.end)
          .order("queue_date", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("services")
          .select("id, title_en, title_ar, default_duration_max, duration_minutes")
          .eq("business_id", business.id),
        supabase
          .from("barbers")
          .select("id, name_en, name_ar, is_active")
          .eq("business_id", business.id),
      ]);

      if (ticketResult.error) throw ticketResult.error;
      if (serviceResult.error) throw serviceResult.error;
      if (barberResult.error) throw barberResult.error;

      setTickets((ticketResult.data ?? []) as QueueTicket[]);
      setServices((serviceResult.data ?? []) as ServiceRow[]);
      setBarbers((barberResult.data ?? []) as BarberRow[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.queue.loadError;
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [business, dateRange.end, dateRange.start, tt.queue.loadError]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.navigate({ to: loginHref });
      return;
    }
    if (!auth.loading && auth.user && canAccess && !businessContext.loading) {
      void loadAnalytics();
    }
  }, [
    auth.loading,
    auth.user,
    canAccess,
    businessContext.loading,
    loadAnalytics,
    loginHref,
    router,
  ]);

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );
  const barberById = useMemo(
    () => new Map(barbers.map((barber) => [barber.id, barber])),
    [barbers],
  );

  const serviceName = useCallback(
    (serviceId: string | null) => {
      const service = serviceId ? serviceById.get(serviceId) : undefined;
      return service ? (lang === "ar" ? service.title_ar : service.title_en) : "—";
    },
    [lang, serviceById],
  );

  const barberName = useCallback(
    (barberId: string | null) => {
      const barber = barberId ? barberById.get(barberId) : undefined;
      return barber ? (lang === "ar" ? barber.name_ar : barber.name_en) : tt.admin.noBarber;
    },
    [barberById, lang, tt.admin.noBarber],
  );

  const analytics = useMemo(() => {
    const completedTickets = tickets.filter(isCompleted);
    const noShowTickets = tickets.filter(isNoShow);
    const cancelledTickets = tickets.filter(isCancelled);
    const waitDurations = tickets
      .filter((ticket) => ticket.status === "completed" || ticket.status === "in_service")
      .map((ticket) => minutesBetween(ticket.created_at, ticket.started_at));
    const serviceDurations = tickets.map((ticket) => ticket.actual_service_minutes);
    const estimatedWaitMin = average(tickets.map((ticket) => ticket.estimated_wait_min));
    const estimatedWaitMax = average(tickets.map((ticket) => ticket.estimated_wait_max));
    const estimateDiffs = tickets
      .filter((ticket) => ticket.started_at && ticket.estimated_start_time)
      .map((ticket) => signedMinutesBetween(ticket.estimated_start_time, ticket.started_at));

    const serviceCounts = new Map<string, number>();
    for (const ticket of tickets) {
      if (!ticket.service_id) continue;
      serviceCounts.set(ticket.service_id, (serviceCounts.get(ticket.service_id) ?? 0) + 1);
    }
    const mostRequestedServiceId =
      [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const activeBarberIds = new Set(
      tickets
        .filter((ticket) => ["waiting", "called", "in_service"].includes(ticket.status))
        .map((ticket) => ticket.barber_id)
        .filter((barberId): barberId is string => !!barberId),
    );

    const longRunningCount = tickets.filter((ticket) => {
      const service = ticket.service_id ? serviceById.get(ticket.service_id) : undefined;
      const expectedMax = service?.default_duration_max ?? service?.duration_minutes ?? 40;
      const actual =
        ticket.actual_service_minutes ?? minutesBetween(ticket.started_at, ticket.completed_at);
      return actual != null && actual > expectedMax;
    }).length;

    const missingTimingCount = completedTickets.filter(
      (ticket) =>
        !ticket.started_at || !ticket.completed_at || ticket.actual_service_minutes == null,
    ).length;

    return {
      totalTickets: tickets.length,
      completed: completedTickets.length,
      noShows: noShowTickets.length,
      cancelled: cancelledTickets.length,
      averageWait: average(waitDurations),
      averageServiceDuration: average(serviceDurations),
      activeBarbers: activeBarberIds.size,
      mostRequestedService: mostRequestedServiceId ? serviceName(mostRequestedServiceId) : "—",
      averageEstimatedWaitMin: estimatedWaitMin,
      averageEstimatedWaitMax: estimatedWaitMax,
      estimateDifference: average(estimateDiffs),
      longRunningCount,
      missingTimingCount,
      noShowRate: tickets.length > 0 ? noShowTickets.length / tickets.length : 0,
    };
  }, [serviceById, serviceName, tickets]);

  const barberMetrics = useMemo<BarberMetric[]>(() => {
    const ids = new Set(
      tickets.map((ticket) => ticket.barber_id).filter((id): id is string => !!id),
    );
    return [...ids]
      .map((barberId) => {
        const barberTickets = tickets.filter((ticket) => ticket.barber_id === barberId);
        const completed = barberTickets.filter(isCompleted);
        const serviceCounts = new Map<string, number>();
        for (const ticket of barberTickets) {
          if (!ticket.service_id) continue;
          serviceCounts.set(ticket.service_id, (serviceCounts.get(ticket.service_id) ?? 0) + 1);
        }
        const busiestServiceId =
          [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const latestConfidence = [...barberTickets]
          .reverse()
          .find((ticket) => ticket.prediction_confidence)?.prediction_confidence;

        return {
          barberId,
          name: barberName(barberId),
          completed: completed.length,
          averageDuration: average(completed.map((ticket) => ticket.actual_service_minutes)),
          averageWait: average(
            completed.map((ticket) => minutesBetween(ticket.created_at, ticket.started_at)),
          ),
          noShows: barberTickets.filter(isNoShow).length,
          confidence: latestConfidence ?? null,
          busiestService: busiestServiceId ? serviceName(busiestServiceId) : "—",
          total: barberTickets.length,
        };
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [barberName, serviceName, tickets]);

  const serviceMetrics = useMemo<ServiceMetric[]>(() => {
    const ids = new Set(
      tickets.map((ticket) => ticket.service_id).filter((id): id is string => !!id),
    );
    return [...ids]
      .map((serviceId) => {
        const serviceTickets = tickets.filter((ticket) => ticket.service_id === serviceId);
        const durations = serviceTickets
          .map((ticket) => ticket.actual_service_minutes)
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
        return {
          serviceId,
          name: serviceName(serviceId),
          requests: serviceTickets.length,
          averageDuration: average(durations),
          p50: percentile(durations, 50),
          p80: percentile(durations, 80),
          noShows: serviceTickets.filter(isNoShow).length,
        };
      })
      .sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name));
  }, [serviceName, tickets]);

  const hourlyMetrics = useMemo<HourMetric[]>(() => {
    const hours = new Map<number, HourMetric>();
    for (const ticket of tickets) {
      if (!ticket.created_at) continue;
      const hour = new Date(ticket.created_at).getHours();
      const current =
        hours.get(hour) ??
        ({
          hour: `${hour.toString().padStart(2, "0")}:00`,
          tickets: 0,
          completed: 0,
          noShows: 0,
        } satisfies HourMetric);
      current.tickets += 1;
      if (isCompleted(ticket)) current.completed += 1;
      if (isNoShow(ticket)) current.noShows += 1;
      hours.set(hour, current);
    }
    return [...hours.entries()].sort((a, b) => a[0] - b[0]).map(([, metric]) => metric);
  }, [tickets]);

  const peakHour = [...hourlyMetrics].sort((a, b) => b.tickets - a.tickets)[0]?.hour ?? "—";

  const suggestions = useMemo(() => {
    const items: string[] = [];
    if (analytics.noShowRate >= 0.15 && analytics.totalTickets >= 3) {
      items.push(tt.queueAnalytics.suggestions.noShowHigh);
    }
    if ((analytics.averageWait ?? 0) >= 30) {
      items.push(
        lang === "ar"
          ? `متوسط الانتظار مرتفع. ننصح بإضافة ${terminology.staffSingular} آخر خلال ساعات الذروة.`
          : `Average wait is high. Consider adding one more ${terminology.staffSingular.toLowerCase()} during peak hours.`,
      );
    }
    const topBarber = barberMetrics[0];
    const secondBarber = barberMetrics[1];
    if (
      topBarber &&
      secondBarber &&
      topBarber.total >= secondBarber.total * 2 &&
      topBarber.total >= 4
    ) {
      items.push(
        lang === "ar"
          ? `أحد ${terminology.staffPlural} يتعامل مع حجم أكبر من الأدوار مقارنة بالبقية.`
          : `One ${terminology.staffSingular.toLowerCase()} is handling more queue volume than others.`,
      );
    }
    if (analytics.missingTimingCount >= 2) {
      items.push(
        lang === "ar"
          ? `اطلب من ${terminology.staffPlural} استخدام بدء الخدمة وإنهاء الخدمة باستمرار.`
          : `Ask ${terminology.staffPlural.toLowerCase()} to use Start Service and Complete Service consistently.`,
      );
    }
    return items.length > 0 ? items : [tt.queueAnalytics.suggestions.stable];
  }, [analytics, barberMetrics, lang, terminology, tt.queueAnalytics.suggestions]);

  const setPreset = (preset: RangePreset) => {
    setRangePreset(preset);
  };

  if (auth.loading) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.queueAnalytics.title}>
        <p className="text-sm text-muted-foreground">{tt.common.loading}</p>
      </Section>
    );
  }

  if (!auth.user) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.queueAnalytics.title}>
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

  if (!canAccess) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.queueAnalytics.title}>
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
      title={tt.queueAnalytics.title}
      intro={tt.queueAnalytics.intro}
      className="py-10 md:py-16"
    >
      <div data-testid="queue-analytics" className="space-y-8">
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                {tt.queueAnalytics.dateRange}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["today", "7d", "30d"] as RangePreset[]).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={rangePreset === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreset(preset)}
                  >
                    {preset === "today"
                      ? tt.queueAnalytics.today
                      : preset === "7d"
                        ? tt.queueAnalytics.last7
                        : tt.queueAnalytics.last30}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={rangePreset === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreset("custom")}
                >
                  {tt.queueAnalytics.dateRange}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="analytics-start">{tt.admin.cols.date}</Label>
                <Input
                  id="analytics-start"
                  type="date"
                  value={customStart}
                  onChange={(event) => {
                    setCustomStart(event.target.value);
                    setRangePreset("custom");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="analytics-end">{tt.queueAnalytics.dateRange}</Label>
                <Input
                  id="analytics-end"
                  type="date"
                  value={customEnd}
                  onChange={(event) => {
                    setCustomEnd(event.target.value);
                    setRangePreset("custom");
                  }}
                />
              </div>
              <Button type="button" variant="outline" onClick={loadAnalytics} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                {tt.queue.refresh}
              </Button>
            </div>
          </div>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tt.queue.loadError}</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading && tickets.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            {tt.common.loading}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label={tt.queueAnalytics.totalTickets}
                value={formatNumber(analytics.totalTickets, lang)}
              />
              <KpiCard
                label={tt.queueAnalytics.completedServices}
                value={formatNumber(analytics.completed, lang)}
              />
              <KpiCard
                label={tt.queueAnalytics.noShows}
                value={formatNumber(analytics.noShows, lang)}
              />
              <KpiCard
                label={tt.queueAnalytics.cancelled}
                value={formatNumber(analytics.cancelled, lang)}
              />
              <KpiCard
                label={tt.queueAnalytics.averageWait}
                value={formatMinutes(analytics.averageWait, lang)}
              />
              <KpiCard
                label={tt.queueAnalytics.averageServiceDuration}
                value={formatMinutes(analytics.averageServiceDuration, lang)}
              />
              <KpiCard
                label={
                  lang === "ar"
                    ? `${terminology.staffPlural} النشطون`
                    : `Active ${terminology.staffPlural}`
                }
                value={formatNumber(analytics.activeBarbers, lang)}
              />
              <KpiCard
                label={tt.queueAnalytics.mostRequestedService}
                value={analytics.mostRequestedService}
              />
            </div>

            {tickets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-card p-10 text-center text-muted-foreground">
                {tt.queueAnalytics.noData}
              </div>
            ) : (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <AnalyticsPanel
                    title={terminology.staffPerformance}
                    icon={<Scissors className="h-5 w-5" />}
                  >
                    {barberMetrics.length === 0 ? (
                      <EmptyText text={tt.queueAnalytics.noData} />
                    ) : (
                      <div className="space-y-3">
                        {barberMetrics.map((barber) => (
                          <MetricCard key={barber.barberId} title={barber.name}>
                            <MetricGrid
                              items={[
                                [
                                  tt.queueAnalytics.completedServices,
                                  formatNumber(barber.completed, lang),
                                ],
                                [
                                  tt.queueAnalytics.averageServiceDuration,
                                  formatMinutes(barber.averageDuration, lang),
                                ],
                                [
                                  tt.queueAnalytics.averageWait,
                                  formatMinutes(barber.averageWait, lang),
                                ],
                                [tt.queueAnalytics.noShows, formatNumber(barber.noShows, lang)],
                                [
                                  tt.queue.predictionConfidence,
                                  labelForConfidence(barber.confidence, lang),
                                ],
                                [tt.queueAnalytics.busiestService, barber.busiestService],
                              ]}
                            />
                          </MetricCard>
                        ))}
                      </div>
                    )}
                  </AnalyticsPanel>

                  <AnalyticsPanel
                    title={tt.queueAnalytics.servicePerformance}
                    icon={<Scissors className="h-5 w-5" />}
                  >
                    {serviceMetrics.length === 0 ? (
                      <EmptyText text={tt.queueAnalytics.noData} />
                    ) : (
                      <div className="space-y-3">
                        {serviceMetrics.map((service) => (
                          <MetricCard key={service.serviceId} title={service.name}>
                            <MetricGrid
                              items={[
                                [tt.queueAnalytics.requests, formatNumber(service.requests, lang)],
                                [
                                  tt.queueAnalytics.averageServiceDuration,
                                  formatMinutes(service.averageDuration, lang),
                                ],
                                ["p50", formatMinutes(service.p50, lang)],
                                ["p80", formatMinutes(service.p80, lang)],
                                [tt.queueAnalytics.noShows, formatNumber(service.noShows, lang)],
                              ]}
                            />
                          </MetricCard>
                        ))}
                      </div>
                    )}
                  </AnalyticsPanel>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                  <AnalyticsPanel
                    title={tt.queueAnalytics.busiestHours}
                    icon={<BarChart3 className="h-5 w-5" />}
                  >
                    {hourlyMetrics.length === 0 ? (
                      <EmptyText text={tt.queueAnalytics.noData} />
                    ) : (
                      <>
                        <ChartContainer
                          config={{
                            tickets: {
                              label: tt.queueAnalytics.tickets,
                              color: "#fe0a00",
                            },
                            completed: {
                              label: tt.queueAnalytics.completedServices,
                              color: "#34d399",
                            },
                            noShows: { label: tt.queueAnalytics.noShows, color: "#f87171" },
                          }}
                          className="min-h-72"
                        >
                          <BarChart data={hourlyMetrics}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                            <YAxis
                              allowDecimals={false}
                              tickLine={false}
                              axisLine={false}
                              width={32}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar
                              dataKey="tickets"
                              fill="var(--color-tickets)"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="completed"
                              fill="var(--color-completed)"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="noShows"
                              fill="var(--color-noShows)"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ChartContainer>
                        <div className="mt-4 rounded-md border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
                          {tt.queueAnalytics.peakHour}:{" "}
                          <span className="text-foreground">{peakHour}</span>
                        </div>
                      </>
                    )}
                  </AnalyticsPanel>

                  <AnalyticsPanel
                    title={tt.queueAnalytics.queueHealth}
                    icon={<Clock3 className="h-5 w-5" />}
                  >
                    <MetricGrid
                      items={[
                        [
                          tt.queueAnalytics.averageEstimatedWaitRange,
                          formatWaitRange(
                            analytics.averageEstimatedWaitMin,
                            analytics.averageEstimatedWaitMax,
                            lang,
                          ),
                        ],
                        [
                          tt.queueAnalytics.averageActualServiceDuration,
                          formatMinutes(analytics.averageServiceDuration, lang),
                        ],
                        [
                          tt.queueAnalytics.estimateDifference,
                          formatMinutes(analytics.estimateDifference, lang),
                        ],
                        [
                          tt.queueAnalytics.longRunningServices,
                          formatNumber(analytics.longRunningCount, lang),
                        ],
                        [
                          tt.queueAnalytics.timingDataMissing,
                          formatNumber(analytics.missingTimingCount, lang),
                        ],
                      ]}
                    />
                  </AnalyticsPanel>
                </div>

                <AnalyticsPanel
                  title={tt.queueAnalytics.operationalSuggestions}
                  icon={<Users className="h-5 w-5" />}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion}
                        className="rounded-md border border-primary/20 bg-primary/10 p-4 text-sm"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </AnalyticsPanel>
              </>
            )}
          </>
        )}
      </div>
    </Section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-3 break-words font-serif text-3xl text-foreground">{value}</div>
    </div>
  );
}

function AnalyticsPanel({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-border/60 bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="text-primary">{icon}</div>
        <h2 className="font-serif text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      {children}
    </div>
  );
}

function MetricGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          key={`${label}:${value}`}
          className="rounded-md border border-border/50 bg-card/50 p-3"
        >
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 break-words text-sm text-foreground">{value}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
