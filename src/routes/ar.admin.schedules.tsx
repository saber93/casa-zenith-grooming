import { createFileRoute } from "@tanstack/react-router";
import { AdminSchedulesPage } from "@/components/casa/pages/AdminSchedulesPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/schedules")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/schedules",
      title: "جداول المناوبات وساعات العمل — كازا",
      description: "إدارة أيام العمل، مناوبات الموظفين، مخطط الفريق، وسجل الإجازات.",
    }),
  component: () => <AdminSchedulesPage lang="ar" />,
});
