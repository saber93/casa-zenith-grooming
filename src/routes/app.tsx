import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/casa/pages/AppPage";
import { buildPageHead, pageSeoCopy } from "@/lib/seo";

export const Route = createFileRoute("/app")({
  head: () => {
    const seo = pageSeoCopy("en", "app");
    return buildPageHead({ lang: "en", pathWithoutLocale: "/app", ...seo });
  },
  component: () => <AppPage lang="en" />,
});
