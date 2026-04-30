import { createFileRoute } from "@tanstack/react-router";
import { ServicesPage } from "@/components/casa/pages/ServicesPage";
import { listServices } from "@/server/casa.functions";
import { buildPageHead, pageSeoCopy } from "@/lib/seo";

export const Route = createFileRoute("/ar/services/")({
  loader: () => listServices(),
  head: () => {
    const seo = pageSeoCopy("ar", "services");
    return buildPageHead({ lang: "ar", pathWithoutLocale: "/services", ...seo });
  },
  component: () => <ServicesPage lang="ar" services={Route.useLoaderData()} />,
});
