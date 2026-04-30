import { Link } from "@tanstack/react-router";
import { Section } from "@/components/casa/Section";
import { ServiceCard, type ServiceRow } from "@/components/casa/ServiceCard";
import { ProductCard, type ProductRow } from "@/components/casa/ProductCard";
import { CASA } from "@/lib/casa";
import { useReveal } from "@/hooks/use-reveal";
import { Calendar, Clock, MapPin, Smartphone, Star } from "lucide-react";
import placeholder from "/placeholder.jpg?url";
import type { Lang } from "@/lib/i18n";
import { t, localePath } from "@/lib/i18n";

export function HomePage({
  lang,
  services,
  products,
}: {
  lang: Lang;
  services: ServiceRow[];
  products: ProductRow[];
}) {
  const tt = t(lang);
  const featured = services.slice(0, 4);
  const productPreview = products.slice(0, 3);
  const heroRef = useReveal<HTMLDivElement>();
  const ctaRef = useReveal<HTMLDivElement>();
  const isRtl = lang === "ar";

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <img
          src={placeholder}
          alt={lang === "ar" ? "صالون كازا للحلاقة" : "Casa grooming lounge"}
          width={1536}
          height={1024}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div
          ref={heroRef}
          className={`reveal mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-5 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40 ${isRtl ? "text-right" : ""}`}
        >
          <div className="label-eyebrow mb-5">{tt.home.eyebrow}</div>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight text-foreground md:text-7xl lg:text-8xl">
            {tt.home.heroTitle1}{" "}
            <span className="italic text-primary">{tt.home.heroTitleAccent}</span>
            <br className="hidden md:block" /> {tt.home.heroTitle2}
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            {tt.home.heroLead}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to={localePath(lang, "/reservation")}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110"
            >
              {tt.cta.book}
            </Link>
            <Link
              to={localePath(lang, "/services")}
              className="inline-flex items-center justify-center rounded-md border border-foreground/20 bg-background/30 px-6 py-3.5 text-sm font-medium text-foreground backdrop-blur transition-all hover:border-foreground/40 hover:bg-background/50"
            >
              {tt.cta.explore}
            </Link>
          </div>
        </div>
      </section>

      <Section
        lang={lang}
        eyebrow={tt.home.featuredEyebrow}
        title={tt.home.featuredTitle}
        intro={tt.home.featuredIntro}
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featured.map((s) => (
            <ServiceCard key={s.id} service={s} lang={lang} />
          ))}
        </div>
        <div className="mt-10">
          <Link to={localePath(lang, "/services")} className="text-sm text-primary hover:underline">
            {tt.cta.viewAllServices}
          </Link>
        </div>
      </Section>

      <div className="border-y border-border/60 bg-card/40">
        <Section
          lang={lang}
          eyebrow={tt.home.productsEyebrow}
          title={tt.home.productsTitle}
          intro={tt.home.productsIntro}
          className="py-20 md:py-24"
        >
          <div className="grid gap-6 md:grid-cols-3">
            {productPreview.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
          <div className="mt-10">
            <Link
              to={localePath(lang, "/products")}
              className="text-sm text-primary hover:underline"
            >
              {tt.cta.shopAll}
            </Link>
          </div>
        </Section>
      </div>

      <Section lang={lang} eyebrow={tt.home.bookEyebrow} title={tt.home.bookTitle}>
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-base text-muted-foreground md:text-lg">{tt.home.bookLead}</p>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" /> {tt.home.bookFeatures[0]}
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary" /> {tt.home.bookFeatures[1]}
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-primary" /> {tt.home.bookFeatures[2]}
              </li>
            </ul>
            <Link
              to={localePath(lang, "/reservation")}
              className="mt-10 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110"
            >
              {tt.cta.reserve}
            </Link>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-6 shadow-elegant">
            <div className="label-eyebrow mb-4">{tt.home.todayLabel}</div>
            <div className="grid grid-cols-4 gap-2 text-center text-sm" dir="ltr">
              {["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30"].map(
                (time, i) => (
                  <div
                    key={time}
                    className={`rounded-md border py-3 transition-colors ${
                      i === 3
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    }`}
                  >
                    {time}
                  </div>
                ),
              )}
            </div>
            <div className="mt-5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
              {tt.home.liveAvailability}
            </div>
          </div>
        </div>
      </Section>

      <div className="bg-card/40">
        <Section lang={lang} eyebrow={tt.home.appEyebrow} title={tt.home.appTitle}>
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="text-base text-muted-foreground md:text-lg">{tt.home.appLead}</p>
              <Link
                to={localePath(lang, "/app")}
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Smartphone className="h-4 w-4" /> {tt.home.appCta}
              </Link>
            </div>
            <div className="relative mx-auto aspect-[9/16] w-56 overflow-hidden rounded-[2rem] border-4 border-foreground/10 bg-background shadow-elegant md:w-64">
              <img
                src={placeholder}
                alt={tt.home.appCardTitle}
                loading="lazy"
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/90" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="label-eyebrow mb-1">
                  {lang === "ar" ? "تطبيق كازا" : "Casa App"}
                </div>
                <div className="font-serif text-2xl">{tt.home.appCardTitle}</div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Section lang={lang} eyebrow={tt.home.testimonialsEyebrow} title={tt.home.testimonialsTitle}>
        <div className="grid gap-6 md:grid-cols-3">
          {tt.home.testimonials.map((tm) => (
            <figure key={tm.name} className="rounded-lg border border-border/60 bg-card p-7">
              <div className="flex gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-5 font-serif text-2xl leading-snug text-foreground">
                "{tm.quote}"
              </blockquote>
              <figcaption className="mt-6 text-sm text-muted-foreground">— {tm.name}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <div className="border-t border-border/60 bg-card/40">
        <Section lang={lang} eyebrow={tt.home.visitEyebrow} title={tt.home.visitTitle}>
          <div className="grid gap-10 md:grid-cols-2">
            <div ref={ctaRef} className="reveal">
              <ul className="space-y-5 text-base">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-primary shrink-0" />{" "}
                  <span>{lang === "ar" ? CASA.addressAr : CASA.address}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-1 h-5 w-5 text-primary shrink-0" />{" "}
                  <span>{lang === "ar" ? CASA.hoursAr : CASA.hours}</span>
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={localePath(lang, "/reservation")}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:brightness-110"
                >
                  {tt.cta.book}
                </Link>
                <a
                  href={`tel:${CASA.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center justify-center rounded-md border border-foreground/20 px-5 py-3 text-sm font-medium text-foreground hover:border-foreground/40"
                  dir="ltr"
                >
                  {CASA.phone}
                </a>
              </div>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border/60 bg-card">
              <img
                src={placeholder}
                alt={tt.home.visitTitle}
                loading="lazy"
                className="h-full w-full object-cover opacity-80"
              />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
