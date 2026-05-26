import { createFileRoute } from "@tanstack/react-router";

import { AdminProductSalesPage } from "@/components/casa/pages/AdminProductSalesPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/product-sales")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/product-sales",
      title: "Product Sales — Casa Platform",
      description: "Record Casa product POS sales for the selected business.",
    }),
  component: () => (
    <RequireModule module="products_pos" lang="en">
      <AdminProductSalesPage lang="en" />
    </RequireModule>
  ),
});
