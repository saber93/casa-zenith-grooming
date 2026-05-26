import { createFileRoute } from "@tanstack/react-router";
import { AdminStaffPage } from "@/components/casa/pages/AdminStaffPage";

export const Route = createFileRoute("/ar/admin/staff")({
  component: () => <AdminStaffPage lang="ar" />,
  head: () => ({
    meta: [
      { title: "إدارة الموظفين | كازا" },
      { name: "description", content: "إدارة أدوار الموظفين والتحكم بالوصول." },
    ],
  }),
});
