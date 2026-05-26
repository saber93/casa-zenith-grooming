import { createFileRoute } from "@tanstack/react-router";

import { AdminBusinessSettingsPage } from "@/components/casa/pages/AdminBusinessSettingsPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/business-settings")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/business-settings",
      title: "Business Settings — Casa Platform",
      description: "Configure Casa business type presets and enabled modules.",
    }),
  component: () => <AdminBusinessSettingsPage lang="en" />,
});
