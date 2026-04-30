import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/casa/pages/ProductsPage";
import { listProducts } from "@/server/casa.functions";
import { buildPageHead, pageSeoCopy } from "@/lib/seo";

export const Route = createFileRoute("/products")({
  loader: () => listProducts(),
  head: () => {
    const seo = pageSeoCopy("en", "products");
    return buildPageHead({ lang: "en", pathWithoutLocale: "/products", ...seo });
  },
  component: ProductsRouteComponent,
});

function ProductsRouteComponent() {
  return <ProductsPage lang="en" products={Route.useLoaderData()} />;
}
