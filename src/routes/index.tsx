import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/casa/pages/HomePage";
import { listProducts, listServices } from "@/server/casa.functions";
import { buildPageHead, localBusinessJsonLd, pageSeoCopy } from "@/lib/seo";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [services, products] = await Promise.all([listServices(), listProducts()]);
    return { services, products };
  },
  head: () => {
    const seo = pageSeoCopy("en", "home");
    return buildPageHead({
      lang: "en",
      pathWithoutLocale: "/",
      title: seo.title,
      description: seo.description,
      jsonLd: localBusinessJsonLd("en"),
    });
  },
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const { services, products } = Route.useLoaderData();
  return <HomePage lang="en" services={services} products={products} />;
}
