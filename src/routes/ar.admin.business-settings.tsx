import { createFileRoute } from "@tanstack/react-router";

import { AdminBusinessSettingsPage } from "@/components/casa/pages/AdminBusinessSettingsPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/business-settings")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/business-settings",
      title: "إعدادات النشاط — منصة كازا",
      description: "تهيئة نوع النشاط والوحدات المفعلة في منصة كازا.",
    }),
  component: () => <AdminBusinessSettingsPage lang="ar" />,
});
