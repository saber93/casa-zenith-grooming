import { createFileRoute } from "@tanstack/react-router";
import { AdminStaffPage } from "@/components/casa/pages/AdminStaffPage";

export const Route = createFileRoute("/admin/staff")({
  component: () => <AdminStaffPage lang="en" />,
  head: () => ({
    meta: [
      { title: "Staff Management | Casa Admin" },
      { name: "description", content: "Manage staff roles and access control." },
    ],
  }),
});
