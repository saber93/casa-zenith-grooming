import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Flower2,
  HandHeart,
  MapPin,
  Phone,
  Scissors,
  Search,
  Sparkles,
  Store,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/casa/Section";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Lang } from "@/lib/i18n";
import { localePath } from "@/lib/i18n";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type BusinessType = "barbershop" | "salon" | "spa" | "massage";

const D = {
  en: {
    heroTitle: "Discover Premium Salons & Spas",
    heroSub:
      "Browse and book appointments at top-rated barbershops, salons, spas, and massage centers near you.",
    searchPh: "Search by name or city…",
    all: "All",
    barbershop: "Barbershop",
    salon: "Salon",
    spa: "Spa",
    massage: "Massage",
    viewDetails: "View Details",
    noResults: "No businesses found matching your search.",
    loading: "Loading directory…",
  },
  ar: {
    heroTitle: "اكتشف صالونات ومنتجعات مميزة",
    heroSub:
      "تصفّح واحجز مواعيدك في أفضل صالونات الحلاقة والتجميل والسبا ومراكز المساج القريبة منك.",
    searchPh: "ابحث بالاسم أو المدينة…",
    all: "الكل",
    barbershop: "حلاقة",
    salon: "صالون",
    spa: "سبا",
    massage: "مساج",
    viewDetails: "عرض التفاصيل",
    noResults: "لم يتم العثور على نتائج مطابقة.",
    loading: "جاري تحميل الدليل…",
  },
} as const;

const TYPE_BADGE: Record<BusinessType, string> = {
  barbershop: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  salon: "border-rose-500/50 bg-rose-500/10 text-rose-300",
  spa: "border-teal-500/50 bg-teal-500/10 text-teal-300",
  massage: "border-violet-500/50 bg-violet-500/10 text-violet-300",
};

const TYPE_ICON: Record<BusinessType, typeof Scissors> = {
  barbershop: Scissors,
  salon: Sparkles,
  spa: Flower2,
  massage: HandHeart,
};

const CATEGORIES: Array<{ key: "all" | BusinessType }> = [
  { key: "all" },
  { key: "barbershop" },
  { key: "salon" },
  { key: "spa" },
  { key: "massage" },
];

export function PublicDirectoryPage({ lang }: { lang: Lang }) {
  const dict = D[lang];
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | BusinessType>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("status", "active")
        .order("name_en");
      setBusinesses(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return businesses.filter((b) => {
      if (category !== "all" && b.business_type !== category) return false;
      if (!q) return true;
      return (
        b.name_en.toLowerCase().includes(q) ||
        b.name_ar.toLowerCase().includes(q) ||
        (b.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [businesses, category, search]);

  const name = (b: BusinessRow) => (lang === "ar" ? b.name_ar : b.name_en);
  const addr = (b: BusinessRow) => (lang === "ar" ? b.address_ar : b.address_en);
  const initials = (b: BusinessRow) =>
    name(b)
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase();

  return (
    <Section lang={lang} eyebrow="" title="">
      {/* Hero */}
      <div className="relative mb-12 overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 via-card/80 to-violet-500/10 px-6 py-16 text-center backdrop-blur-md sm:py-20">
        <Sparkles className="mx-auto mb-4 h-8 w-8 text-primary/70 animate-pulse" />
        <h1 className="font-serif text-3xl font-bold sm:text-5xl">{dict.heroTitle}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          {dict.heroSub}
        </p>
        <div className="relative mx-auto mt-8 max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.searchPh}
            className="pl-10 bg-card/60 backdrop-blur-sm border-border/50"
            dir={lang === "ar" ? "rtl" : "ltr"}
          />
        </div>
        {/* Category pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map(({ key }) => {
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {dict[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="py-20 text-center text-muted-foreground">{dict.loading}</p>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">{dict.noResults}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((biz) => {
            const bt = (biz.business_type ?? "salon") as BusinessType;
            const Icon = TYPE_ICON[bt] ?? Store;
            return (
              <div
                key={biz.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur-md transition-all hover:scale-[1.02] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Logo / initials */}
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary/5 to-violet-500/5">
                  {biz.logo_url ? (
                    <img
                      src={biz.logo_url}
                      alt={name(biz)}
                      className="h-16 w-16 rounded-full object-cover border-2 border-border/40"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                      {initials(biz)}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold leading-snug">{name(biz)}</h3>
                    <Badge variant="outline" className={`shrink-0 ${TYPE_BADGE[bt]}`}>
                      <Icon className="mr-1 h-3 w-3" />
                      {dict[bt]}
                    </Badge>
                  </div>
                  {(biz.city || addr(biz)) && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {biz.city}
                      {addr(biz) ? ` · ${addr(biz)}` : ""}
                    </p>
                  )}
                  {biz.phone && (
                    <a
                      href={`tel:${biz.phone}`}
                      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      dir="ltr"
                    >
                      <Phone className="h-3 w-3" />
                      {biz.phone}
                    </a>
                  )}
                  <div className="mt-auto pt-4">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-full group-hover:border-primary/60 group-hover:text-primary"
                    >
                      <Link to={localePath(lang, `/business/${biz.slug}`)}>
                        {dict.viewDetails}{" "}
                        <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
