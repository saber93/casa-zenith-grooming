import { createFileRoute } from "@tanstack/react-router";
import { AdminPromotionsPage } from "@/components/casa/pages/AdminPromotionsPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/promotions")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/promotions",
      title: "Promotions & Loyalty — Casa Multi-Business",
      description: "Manage percentage-based coupons, special offers, and VIP loyalty memberships.",
    }),
  component: () => (
    <RequireModule module="discounts" lang="en">
      <AdminPromotionsPage lang="en" />
    </RequireModule>
  ),
});
