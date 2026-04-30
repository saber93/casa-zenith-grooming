import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/casa/pages/ProductsPage";
import { listProducts } from "@/server/casa.functions";
import { buildPageHead, pageSeoCopy } from "@/lib/seo";

export const Route = createFileRoute("/ar/products")({
  loader: () => listProducts(),
  head: () => {
    const seo = pageSeoCopy("ar", "products");
    return buildPageHead({ lang: "ar", pathWithoutLocale: "/products", ...seo });
  },
  component: () => <ProductsPage lang="ar" products={Route.useLoaderData()} />,
});
