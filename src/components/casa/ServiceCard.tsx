import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { localePath, t, formatPrice } from "@/lib/i18n";
import { serviceFallbackImage } from "@/lib/casa-images";

export type ServiceRow = {
  id: string;
  slug_en: string;
  slug_ar: string;
  title_en: string;
  title_ar: string;
  short_description_en: string | null;
  short_description_ar: string | null;
  price: number;
  duration_minutes: number;
  image_url?: string | null;
};

export function ServiceCard({ service, lang }: { service: ServiceRow; lang: Lang }) {
  const tt = t(lang);
  const slug = lang === "ar" ? service.slug_ar : service.slug_en;
  const title = lang === "ar" ? service.title_ar : service.title_en;
  const short = (lang === "ar" ? service.short_description_ar : service.short_description_en) ?? "";
  return (
    <Link
      to={localePath(lang, `/services/${slug}`)}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/60 hover:shadow-elegant"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={service.image_url || serviceFallbackImage(service.slug_en)}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />{" "}
            {tt.services.durationMinutes(service.duration_minutes)}
          </span>
          <span className="text-primary">{formatPrice(lang, service.price)}</span>
        </div>
        <h3 className="mt-3 font-serif text-2xl text-foreground">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{short}</p>
        <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
          {tt.cta.readMore}
          <span
            className={`transition-transform group-hover:translate-x-1 ${lang === "ar" ? "me-1 rotate-180" : "ms-1"}`}
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
