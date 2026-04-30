import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/casa/pages/AppPage";
import { buildPageHead, pageSeoCopy } from "@/lib/seo";

export const Route = createFileRoute("/ar/app")({
  head: () => {
    const seo = pageSeoCopy("ar", "app");
    return buildPageHead({ lang: "ar", pathWithoutLocale: "/app", ...seo });
  },
  component: () => <AppPage lang="ar" />,
});
