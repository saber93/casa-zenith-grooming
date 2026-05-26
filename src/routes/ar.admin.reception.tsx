import { createFileRoute } from "@tanstack/react-router";
import { AdminReceptionWorkspacePage } from "@/components/casa/pages/AdminReceptionWorkspacePage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/reception")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/reception",
      title: "مساحة عمل الاستقبال — كازا",
      description: "إدارة مكتب الاستقبال: تسجيل وصول الحجوزات ومتابعة قائمة الانتظار والعملاء.",
    }),
  component: () => (
    <RequireModule module="reservations" lang="ar">
      <AdminReceptionWorkspacePage lang="ar" />
    </RequireModule>
  ),
});
