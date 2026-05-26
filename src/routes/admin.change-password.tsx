import { createFileRoute } from "@tanstack/react-router";
import { AdminChangePasswordPage } from "@/components/casa/pages/AdminChangePasswordPage";

export const Route = createFileRoute("/admin/change-password")({
  component: () => <AdminChangePasswordPage lang="en" />,
  head: () => ({
    meta: [
      { title: "Change Password | Casa Admin" },
      {
        name: "description",
        content: "Change your temporary Casa admin password.",
      },
    ],
  }),
});
