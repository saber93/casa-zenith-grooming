import { createFileRoute } from "@tanstack/react-router";

import { AdminBarberWorkspacePage } from "@/components/casa/pages/AdminBarberWorkspacePage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/barber-workspace")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/barber-workspace",
      title: "مساحة الحلاق — صالون كازا للرجال",
      description: "مساحة مركزة لحلاقي كازا لإدارة العميل التالي في قائمة الانتظار.",
    }),
  component: () => <AdminBarberWorkspacePage lang="ar" />,
});
