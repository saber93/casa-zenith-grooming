import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/casa/pages/ProductsPage";
import { listProducts } from "@/server/casa.functions";
import { buildPageHead, pageSeoCopy } from "@/lib/seo";
import { RequireModule } from "@/lib/business-context";

export const Route = createFileRoute("/products")({
  loader: () => listProducts(),
  head: () => {
    const seo = pageSeoCopy("en", "products");
    return buildPageHead({ lang: "en", pathWithoutLocale: "/products", ...seo });
  },
  component: ProductsRouteComponent,
});

function ProductsRouteComponent() {
  return (
    <RequireModule module="products_catalog" lang="en">
      <ProductsPage lang="en" products={Route.useLoaderData()} />
    </RequireModule>
  );
}
