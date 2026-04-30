import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ServiceDetailPage } from "@/components/casa/pages/ServiceDetailPage";
import { Section } from "@/components/casa/Section";
import { getServiceBySlug } from "@/server/casa.functions";
import { buildPageHead, serviceJsonLd } from "@/lib/seo";
import { absoluteUrl, t } from "@/lib/i18n";

export const Route = createFileRoute("/services/$slug")({
  loader: async ({ params }) => {
    const service = await getServiceBySlug({ data: { slug: params.slug, lang: "en" } });
    if (!service) throw notFound();
    return service;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const url = absoluteUrl("en", `/services/${loaderData.slug_en}`);
    return buildPageHead({
      lang: "en",
      pathWithoutLocale: `/services/${loaderData.slug_en}`,
      title: `${loaderData.title_en} — Casa Gents Salon Ajman`,
      description: loaderData.short_description_en ?? `${loaderData.title_en} at Casa Ajman.`,
      ogType: "article",
      ogImage: loaderData.image_url ?? undefined,
      jsonLd: serviceJsonLd({
        lang: "en",
        name: loaderData.title_en,
        description: loaderData.description_en ?? loaderData.short_description_en ?? "",
        price: Number(loaderData.price),
        url,
      }),
    });
  },
  notFoundComponent: ServicesSlugNotFoundComponent,
  errorComponent: ServicesSlugErrorComponent,
  component: ServicesSlugRouteComponent,
});

function ServicesSlugNotFoundComponent() {
  const tt = t("en");
  return (
    <Section lang="en" eyebrow="404" title={tt.common.notFound}>
      <Link to="/services" className="text-primary hover:underline">
        {tt.services.backAll}
      </Link>
    </Section>
  );
}

function ServicesSlugErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Section lang="en" eyebrow="Error" title={t("en").common.error}>
      <p className="text-muted-foreground">{error.message}</p>
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        {t("en").common.retry}
      </button>
    </Section>
  );
}

function ServicesSlugRouteComponent() {
  return <ServiceDetailPage lang="en" service={Route.useLoaderData()} />;
}
