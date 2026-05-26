import { createFileRoute } from "@tanstack/react-router";
import { AdminReportsPage } from "@/components/casa/pages/AdminReportsPage";

export const Route = createFileRoute("/ar/admin/reports")({
  component: () => <AdminReportsPage lang="ar" />,
  head: () => ({
    meta: [
      { title: "التقارير المالية | إدارة كازا" },
      {
        name: "description",
        content: "الإيرادات، العمولات، البقاشيش، وتقارير المصاريف لنشاطك التجاري.",
      },
    ],
  }),
});
