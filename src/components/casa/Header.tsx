import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { t, localePath } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/casa/LanguageSwitcher";
import { useAuth } from "@/lib/auth-context";

export function Header({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const tt = t(lang);
  const { isAdmin, loading, signOut, user } = useAuth();
  const { pathname } = useLocation();
  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(pathname)}`;

  const nav = [
    { to: localePath(lang, "/"), label: tt.nav.home, exact: true },
    { to: localePath(lang, "/services"), label: tt.nav.services },
    { to: localePath(lang, "/products"), label: tt.nav.products },
    { to: localePath(lang, "/reservation"), label: tt.nav.reservation },
    { to: localePath(lang, "/queue"), label: tt.nav.queue },
    { to: localePath(lang, "/app"), label: tt.nav.app },
    ...(isAdmin
      ? [
          { to: localePath(lang, "/admin/bookings"), label: tt.nav.admin },
          { to: localePath(lang, "/admin/queue"), label: tt.queue.title },
          { to: localePath(lang, "/admin/barber-workspace"), label: tt.barberWorkspace.title },
          { to: localePath(lang, "/admin/queue-analytics"), label: tt.queueAnalytics.title },
        ]
      : []),
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          to={localePath(lang, "/")}
          className="flex items-center"
          onClick={() => setOpen(false)}
          aria-label={lang === "ar" ? "الصفحة الرئيسية لكازا" : "Casa home"}
        >
          <img
            src="/casa-logo.jpeg"
            alt={lang === "ar" ? "شعار كازا" : "Casa logo"}
            className="h-12 w-auto object-contain"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm transition-colors hover:text-foreground ${
                isActive(item.to, item.exact) ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher lang={lang} />
          {!loading &&
            (user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {tt.nav.logout}
              </button>
            ) : (
              <a
                href={loginHref}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {tt.nav.login}
              </a>
            ))}
          <Link
            to={localePath(lang, "/reservation")}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110"
          >
            {tt.cta.book}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher lang={lang} />
          <button
            aria-label="Open menu"
            className="text-foreground"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-4">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`border-b border-border/40 py-3 text-base ${
                  isActive(item.to, item.exact) ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {!loading &&
              (user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="border-b border-border/40 py-3 text-left text-base text-muted-foreground"
                >
                  {tt.nav.logout}
                </button>
              ) : (
                <a
                  href={loginHref}
                  onClick={() => setOpen(false)}
                  className="border-b border-border/40 py-3 text-base text-muted-foreground"
                >
                  {tt.nav.login}
                </a>
              ))}
            <Link
              to={localePath(lang, "/reservation")}
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              {tt.cta.book}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
