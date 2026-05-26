import { createFileRoute } from "@tanstack/react-router";
import { AdminBusinessesPage } from "@/components/casa/pages/AdminBusinessesPage";

export const Route = createFileRoute("/ar/admin/businesses")({
  component: () => <AdminBusinessesPage lang="ar" />,
  head: () => ({
    meta: [
      { title: "المنشآت | إدارة كازا" },
      {
        name: "description",
        content: "إنشاء وإدارة المنشآت على منصة كازا.",
      },
    ],
  }),
});
