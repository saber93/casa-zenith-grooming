import { Link } from "@tanstack/react-router";
import { CASA } from "@/lib/casa";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { t, localePath } from "@/lib/i18n";

export function Footer({ lang }: { lang: Lang }) {
  const tt = t(lang);
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <img
            src="/casa-logo.jpeg"
            alt={lang === "ar" ? "شعار كازا" : "Casa logo"}
            className="h-24 w-auto object-contain"
          />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{tt.footer.tagline}</p>
        </div>

        <div>
          <div className="label-eyebrow mb-4">{tt.footer.visit}</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span>{lang === "ar" ? CASA.addressAr : CASA.address}</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span dir="ltr">{CASA.phone}</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span dir="ltr">{CASA.email}</span>
            </li>
          </ul>
        </div>

        <div>
          <div className="label-eyebrow mb-4">{tt.footer.explore}</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                to={localePath(lang, "/services")}
                className="text-muted-foreground hover:text-foreground"
              >
                {tt.nav.services}
              </Link>
            </li>
            <li>
              <Link
                to={localePath(lang, "/products")}
                className="text-muted-foreground hover:text-foreground"
              >
                {tt.nav.products}
              </Link>
            </li>
            <li>
              <Link
                to={localePath(lang, "/reservation")}
                className="text-muted-foreground hover:text-foreground"
              >
                {tt.nav.reservation}
              </Link>
            </li>
            <li>
              <Link
                to={localePath(lang, "/app")}
                className="text-muted-foreground hover:text-foreground"
              >
                {tt.nav.app}
              </Link>
            </li>
          </ul>
          <a
            href={CASA.instagram}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Instagram className="h-4 w-4" /> @casa.grooming
          </a>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-muted-foreground md:flex-row md:px-8">
          <span>
            © {new Date().getFullYear()} {lang === "ar" ? CASA.fullNameAr : CASA.fullName}.{" "}
            {tt.footer.rights}
          </span>
          <span>{lang === "ar" ? CASA.hoursAr : CASA.hours}</span>
        </div>
      </div>
    </footer>
  );
}
