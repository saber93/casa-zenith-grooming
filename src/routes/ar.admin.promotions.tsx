import { createFileRoute } from "@tanstack/react-router";
import { AdminPromotionsPage } from "@/components/casa/pages/AdminPromotionsPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/promotions")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/promotions",
      title: "العروض والخصومات والولاء — كازا",
      description:
        "إدارة الكوبونات الترويجية بنسب مئوية وعضويات الولاء والبطاقات الذهبية لكبار الشخصيات.",
    }),
  component: () => (
    <RequireModule module="discounts" lang="ar">
      <AdminPromotionsPage lang="ar" />
    </RequireModule>
  ),
});
