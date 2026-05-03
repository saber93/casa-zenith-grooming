import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, LogOut, Radio, RefreshCw, Scissors, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { CASA } from "@/lib/casa";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type QueueTicket = Pick<
  Database["public"]["Tables"]["queue_tickets"]["Row"],
  | "id"
  | "barber_id"
  | "created_at"
  | "estimated_wait_max"
  | "estimated_wait_min"
  | "queue_number"
  | "status"
>;
type BarberRow = Pick<Database["public"]["Tables"]["barbers"]["Row"], "id" | "is_active">;

const ACTIVE_STATUSES = ["waiting", "called", "in_service"];

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const sortByQueueNumber = (a: QueueTicket, b: QueueTicket) =>
  a.queue_number - b.queue_number ||
  new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();

const formatCurrentTime = (nowMs: number, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "ar" ? "ar-AE" : "en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(nowMs));

const waitRange = (min: number | null, max: number | null, lang: Lang) => {
  if (min == null || max == null) return "—";
  return lang === "ar" ? `${min}–${max} دقيقة` : `${min}–${max} min`;
};

const queueNumber = (ticket: QueueTicket | null) => (ticket ? `#${ticket.queue_number}` : "—");

export function AdminQueueDisplayPage({ lang }: { lang: Lang }) {
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/queue-display"),
  )}`;

  const loadDisplay = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setLoadError(null);
      try {
        const [ticketResult, barberResult] = await Promise.all([
          supabase
            .from("queue_tickets")
            .select(
              "id, barber_id, created_at, estimated_wait_min, estimated_wait_max, queue_number, status",
            )
            .eq("queue_date", todayIso())
            .in("status", ACTIVE_STATUSES)
            .order("queue_number", { ascending: true }),
          supabase.from("barbers").select("id, is_active").eq("is_active", true),
        ]);

        if (ticketResult.error) throw ticketResult.error;
        if (barberResult.error) throw barberResult.error;

        setTickets(((ticketResult.data ?? []) as QueueTicket[]).sort(sortByQueueNumber));
        setBarbers((barberResult.data ?? []) as BarberRow[]);
        setNowMs(Date.now());
      } catch (error) {
        const message = error instanceof Error ? error.message : tt.queue.loadError;
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!silent) setLoading(false);
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
      void loadDisplay();
    }
  }, [auth.loading, auth.user, auth.isAdmin, loadDisplay, loginHref, router]);

  useEffect(() => {
    if (!auth.user || !auth.isAdmin) return undefined;

    const channel = supabase
      .channel("admin-queue-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets" }, () => {
        void loadDisplay(true);
      })
      .subscribe();

    const refreshId = window.setInterval(() => {
      void loadDisplay(true);
    }, 30_000);

    return () => {
      window.clearInterval(refreshId);
      void supabase.removeChannel(channel);
    };
  }, [auth.isAdmin, auth.user, loadDisplay]);

  useEffect(() => {
    const timeId = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timeId);
  }, []);

  const stats = useMemo(() => {
    const inService = tickets
      .filter((ticket) => ticket.status === "in_service")
      .sort(sortByQueueNumber)[0];
    const called = tickets
      .filter((ticket) => ticket.status === "called")
      .sort(sortByQueueNumber)[0];
    const waiting = tickets.filter((ticket) => ticket.status === "waiting").sort(sortByQueueNumber);
    const activeBarberIds = new Set(
      barbers.filter((barber) => barber.is_active).map((barber) => barber.id),
    );
    const activeTicketBarberIds = new Set(
      tickets
        .filter((ticket) => ticket.barber_id && activeBarberIds.has(ticket.barber_id))
        .map((ticket) => ticket.barber_id),
    );

    const waitMin = waiting.reduce<number | null>(
      (max, ticket) =>
        ticket.estimated_wait_min == null
          ? max
          : Math.max(max ?? ticket.estimated_wait_min, ticket.estimated_wait_min),
      null,
    );
    const waitMax = waiting.reduce<number | null>(
      (max, ticket) =>
        ticket.estimated_wait_max == null
          ? max
          : Math.max(max ?? ticket.estimated_wait_max, ticket.estimated_wait_max),
      null,
    );

    return {
      nowServing: inService ?? called ?? null,
      next: waiting[0] ?? null,
      waitingCount: tickets.filter(
        (ticket) => ticket.status === "waiting" || ticket.status === "called",
      ).length,
      estimatedWaitMin: waitMin,
      estimatedWaitMax: waitMax,
      activeBarbersCount: activeTicketBarberIds.size,
    };
  }, [barbers, tickets]);

  if (auth.loading || loading) {
    return <DisplayShell lang={lang}>{tt.common.loading}</DisplayShell>;
  }

  if (!auth.user) {
    return (
      <DisplayShell lang={lang}>
        <Alert className="mx-auto max-w-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tt.nav.login}</AlertTitle>
          <AlertDescription>{tt.admin.signedOut}</AlertDescription>
        </Alert>
        <Button asChild className="mt-6">
          <Link to={localePath(lang, "/login")}>{tt.admin.signInCta}</Link>
        </Button>
      </DisplayShell>
    );
  }

  if (!auth.isAdmin) {
    return (
      <DisplayShell lang={lang}>
        <Alert variant="destructive" className="mx-auto max-w-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tt.common.error}</AlertTitle>
          <AlertDescription>{tt.admin.notAdmin}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-6" onClick={auth.signOut}>
          <LogOut className="h-4 w-4" /> {tt.nav.logout}
        </Button>
      </DisplayShell>
    );
  }

  return (
    <DisplayShell lang={lang}>
      <div
        data-testid="queue-display"
        className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 md:px-10 md:py-8"
      >
        <header className="flex flex-col gap-4 border-b border-primary/20 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="label-eyebrow mb-2">{tt.queueDisplay.title}</div>
            <h1 className="font-serif text-5xl leading-none md:text-7xl">
              {lang === "ar" ? CASA.fullNameAr : CASA.fullName}
            </h1>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-primary">
            <Clock className="h-6 w-6" />
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {tt.queueDisplay.currentTime}
              </div>
              <div className="text-2xl font-semibold" dir="ltr">
                {formatCurrentTime(nowMs, lang)}
              </div>
            </div>
          </div>
        </header>

        {loadError && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tt.queue.loadError}</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <main className="grid flex-1 gap-5 py-6 lg:grid-cols-[1.25fr_0.75fr]">
          <DisplayHeroCard
            label={tt.queueDisplay.nowServing}
            value={queueNumber(stats.nowServing)}
            muted={!stats.nowServing}
            emptyText={tt.queueDisplay.noActiveQueue}
          />

          <div className="grid gap-5">
            <DisplayStatCard
              label={tt.queueDisplay.next}
              value={queueNumber(stats.next)}
              muted={!stats.next}
            />
            <DisplayStatCard
              label={tt.queueDisplay.estimatedWait}
              value={waitRange(stats.estimatedWaitMin, stats.estimatedWaitMax, lang)}
              icon={<RefreshCw className="h-8 w-8" />}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:col-span-2">
            <DisplayStatCard
              label={tt.queueDisplay.waiting}
              value={String(stats.waitingCount)}
              icon={<Users className="h-8 w-8" />}
            />
            <DisplayStatCard
              label={tt.queueDisplay.activeBarbers}
              value={String(stats.activeBarbersCount)}
              icon={<Scissors className="h-8 w-8" />}
            />
          </div>
        </main>

        <footer className="flex flex-col gap-3 border-t border-primary/20 pt-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            {tt.queueDisplay.live}
          </div>
          <div>{todayIso()}</div>
        </footer>
      </div>
    </DisplayShell>
  );
}

function DisplayShell({ children, lang }: { children: React.ReactNode; lang: Lang }) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground",
        "bg-[radial-gradient(circle_at_top,_rgb(254_10_0_/_0.16),_transparent_34rem)]",
      )}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {children}
    </div>
  );
}

function DisplayHeroCard({
  label,
  value,
  muted,
  emptyText,
}: {
  label: string;
  value: string;
  muted?: boolean;
  emptyText: string;
}) {
  return (
    <section className="flex min-h-[22rem] flex-col justify-between rounded-lg border border-primary/30 bg-card p-6 shadow-glow md:p-8">
      <div className="text-xl uppercase tracking-[0.24em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-serif text-[9rem] leading-none md:text-[14rem]",
          muted ? "text-muted-foreground/50" : "text-primary",
        )}
      >
        {value}
      </div>
      <div className="min-h-8 text-2xl text-muted-foreground">{muted ? emptyText : ""}</div>
    </section>
  );
}

function DisplayStatCard({
  label,
  value,
  icon,
  muted,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section className="flex min-h-44 flex-col justify-between rounded-lg border border-border/60 bg-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-base uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <div
        className={cn(
          "font-serif text-7xl leading-none md:text-8xl",
          muted && "text-muted-foreground/50",
        )}
      >
        {value}
      </div>
    </section>
  );
}
