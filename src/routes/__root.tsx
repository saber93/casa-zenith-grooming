import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Header } from "@/components/casa/Header";
import { Footer } from "@/components/casa/Footer";
import { WhatsAppFab } from "@/components/casa/WhatsAppFab";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import type { Lang } from "@/lib/i18n";
import { dirForLang } from "@/lib/i18n";

const langFromPathname = (pathname: string): Lang =>
  pathname === "/ar" || pathname.startsWith("/ar/") ? "ar" : "en";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="label-eyebrow mb-4">Casa</div>
        <h1 className="font-serif text-7xl text-foreground">404</h1>
        <h2 className="mt-4 font-serif text-2xl text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Casa — Premium Gents Grooming" },
      {
        name: "description",
        content:
          "Premium gents grooming, barber, and skincare in one place. Book your appointment online.",
      },
      { name: "author", content: "Casa" },
      { property: "og:title", content: "Casa — Premium Gents Grooming" },
      {
        property: "og:description",
        content:
          "Premium gents grooming, barber, and skincare in one place. Book your appointment online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Casa — Premium Gents Grooming" },
      {
        name: "twitter:description",
        content:
          "Premium gents grooming, barber, and skincare in one place. Book your appointment online.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/3a6ef6dc-e4d5-4779-9934-9f3882a338f0",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/3a6ef6dc-e4d5-4779-9934-9f3882a338f0",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const lang = useRouterState({
    select: (state) => langFromPathname(state.location.pathname),
  });

  return (
    <html lang={lang} dir={dirForLang(lang)} className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const lang = useRouterState({
    select: (state) => langFromPathname(state.location.pathname),
  });

  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header lang={lang} />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer lang={lang} />
        <WhatsAppFab lang={lang} />
        <Toaster theme="dark" />
      </div>
    </AuthProvider>
  );
}
