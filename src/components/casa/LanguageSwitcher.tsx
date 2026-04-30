import { Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const LS_KEY = "casa.lang";

export function persistLang(lang: Lang) {
  try {
    localStorage.setItem(LS_KEY, lang);
  } catch {
    // localStorage can be unavailable during SSR or private browsing.
  }
}
export function readPersistedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === "ar" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

/** Returns the equivalent path in the OTHER language for the current URL. */
function swapLangPath(pathname: string, target: Lang): string {
  const isArabic = pathname === "/ar" || pathname.startsWith("/ar/");
  const stripped = isArabic ? pathname.replace(/^\/ar(\/|$)/, "/") : pathname;
  const normalized = stripped === "" ? "/" : stripped;
  if (target === "ar") {
    return normalized === "/" ? "/ar" : `/ar${normalized}`;
  }
  return normalized;
}

export function LanguageSwitcher({ lang }: { lang: Lang }) {
  const { pathname } = useLocation();
  const target: Lang = lang === "ar" ? "en" : "ar";
  const href = swapLangPath(pathname, target);

  // Persist current lang on render so localStorage stays in sync with the URL.
  useEffect(() => {
    persistLang(lang);
  }, [lang]);

  return (
    <Link
      to={href}
      onClick={() => persistLang(target)}
      aria-label={`Switch to ${target === "ar" ? "Arabic" : "English"}`}
      className="inline-flex items-center justify-center rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
    >
      <span className="font-sans tracking-wider">{t(lang).common.switchLangShort}</span>
    </Link>
  );
}
