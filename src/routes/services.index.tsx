import { createFileRoute } from "@tanstack/react-router";
import { ServicesPage } from "@/components/casa/pages/ServicesPage";
import { listServices } from "@/server/casa.functions";
import { buildPageHead, pageSeoCopy } from "@/lib/seo";

export const Route = createFileRoute("/services/")({
  loader: () => listServices(),
  head: () => {
    const seo = pageSeoCopy("en", "services");
    return buildPageHead({ lang: "en", pathWithoutLocale: "/services", ...seo });
  },
  component: ServicesIndexRouteComponent,
});

function ServicesIndexRouteComponent() {
  return <ServicesPage lang="en" services={Route.useLoaderData()} />;
}
