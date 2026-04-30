import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/casa/pages/HomePage";
import { listProducts, listServices } from "@/server/casa.functions";
import { buildPageHead, localBusinessJsonLd, pageSeoCopy } from "@/lib/seo";

export const Route = createFileRoute("/ar/")({
  loader: async () => {
    const [services, products] = await Promise.all([listServices(), listProducts()]);
    return { services, products };
  },
  head: () => {
    const seo = pageSeoCopy("ar", "home");
    return buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/",
      title: seo.title,
      description: seo.description,
      jsonLd: localBusinessJsonLd("ar"),
    });
  },
  component: () => {
    const { services, products } = Route.useLoaderData();
    return <HomePage lang="ar" services={services} products={products} />;
  },
});
