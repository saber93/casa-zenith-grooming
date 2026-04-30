import { Link } from "@tanstack/react-router";
import { Section } from "@/components/casa/Section";
import { Check, Clock, Tag } from "lucide-react";
import placeholder from "/placeholder.jpg?url";
import type { Lang } from "@/lib/i18n";
import { t, formatPrice, localePath } from "@/lib/i18n";

export type ServiceDetail = {
  id: string;
  slug_en: string;
  slug_ar: string;
  title_en: string;
  title_ar: string;
  short_description_en: string | null;
  short_description_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price: number;
  duration_minutes: number;
  image_url?: string | null;
};

export function ServiceDetailPage({ lang, service }: { lang: Lang; service: ServiceDetail }) {
  const tt = t(lang);
  const title = lang === "ar" ? service.title_ar : service.title_en;
  const short = (lang === "ar" ? service.short_description_ar : service.short_description_en) ?? "";
  const desc = (lang === "ar" ? service.description_ar : service.description_en) ?? "";
  const benefits =
    lang === "ar"
      ? ["مصمم حسب شكل الوجه", "نتيجة تدوم", "استشارة من مصفف خبير"]
      : ["Tailored to face shape", "Long-lasting result", "Senior stylist consultation"];
  const included =
    lang === "ar"
      ? ["استشارة", "غسيل وعلاج", "خدمة دقيقة", "تصفيف نهائي"]
      : ["Consultation", "Wash & condition", "Precision service", "Style & finish"];

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <img
          src={service.image_url || placeholder}
          alt={title}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        <div
          className={`mx-auto max-w-7xl px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-36 ${lang === "ar" ? "text-right" : ""}`}
        >
          <Link
            to={localePath(lang, "/services")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {tt.services.backAll}
          </Link>
          <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-tight md:text-7xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{short}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 backdrop-blur">
              <Clock className="h-4 w-4 text-primary" />{" "}
              {tt.services.durationMinutes(service.duration_minutes)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-primary">
              <Tag className="h-4 w-4" /> {formatPrice(lang, service.price)}
            </span>
          </div>
        </div>
      </section>

      <Section lang={lang}>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="label-eyebrow mb-4">{tt.services.detailAbout}</div>
            <p className="text-lg leading-relaxed text-foreground/90">{desc}</p>

            <div className="mt-14 grid gap-10 md:grid-cols-2">
              <div>
                <div className="label-eyebrow mb-4">{tt.services.detailBenefits}</div>
                <ul className="space-y-3">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="label-eyebrow mb-4">{tt.services.detailIncluded}</div>
                <ul className="space-y-3">
                  {included.map((i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-border/60 bg-card p-6 shadow-elegant">
              <div className="label-eyebrow mb-3">{tt.services.detailReserve}</div>
              <div className="font-serif text-3xl">{formatPrice(lang, service.price)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {tt.services.durationMinutes(service.duration_minutes)}
              </div>
              <Link
                to={localePath(lang, "/reservation")}
                search={{ service: lang === "ar" ? service.slug_ar : service.slug_en }}
                className="mt-6 flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:brightness-110"
              >
                {tt.cta.bookNow}
              </Link>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {tt.services.detailFreeCancel}
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
