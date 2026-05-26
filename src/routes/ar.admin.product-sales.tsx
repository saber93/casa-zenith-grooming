import { createFileRoute } from "@tanstack/react-router";

import { AdminProductSalesPage } from "@/components/casa/pages/AdminProductSalesPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/product-sales")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/product-sales",
      title: "مبيعات المنتجات — منصة كازا",
      description: "تسجيل مبيعات منتجات كازا للنشاط المحدد.",
    }),
  component: () => (
    <RequireModule module="products_pos" lang="ar">
      <AdminProductSalesPage lang="ar" />
    </RequireModule>
  ),
});
