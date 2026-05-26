import { createFileRoute } from "@tanstack/react-router";
import { AdminChangePasswordPage } from "@/components/casa/pages/AdminChangePasswordPage";

export const Route = createFileRoute("/ar/admin/change-password")({
  component: () => <AdminChangePasswordPage lang="ar" />,
  head: () => ({
    meta: [
      { title: "تغيير كلمة المرور | إدارة كازا" },
      {
        name: "description",
        content: "تغيير كلمة مرور إدارة كازا المؤقتة.",
      },
    ],
  }),
});
