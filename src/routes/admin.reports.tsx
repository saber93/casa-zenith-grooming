import { createFileRoute } from "@tanstack/react-router";
import { AdminReportsPage } from "@/components/casa/pages/AdminReportsPage";

export const Route = createFileRoute("/admin/reports")({
  component: () => <AdminReportsPage lang="en" />,
  head: () => ({
    meta: [
      { title: "Financial Reports | Casa Admin" },
      {
        name: "description",
        content: "Revenue, commissions, tips, and expense reports for your business.",
      },
    ],
  }),
});
