import { createFileRoute } from "@tanstack/react-router";
import { AdminPackagesPage } from "@/components/casa/pages/AdminPackagesPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/packages")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/packages",
      title: "الباقات والحزم المسبقة الدفع — كازا",
      description: "إدارة باقات الخدمات مسبقة الدفع والجلسات وتتبع أرصدة باقات العملاء.",
    }),
  component: () => (
    <RequireModule module="discounts" lang="ar">
      <AdminPackagesPage lang="ar" />
    </RequireModule>
  ),
});
