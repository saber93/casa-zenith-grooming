import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ServiceDetailPage } from "@/components/casa/pages/ServiceDetailPage";
import { Section } from "@/components/casa/Section";
import { getServiceBySlug } from "@/server/casa.functions";
import { buildPageHead, serviceJsonLd } from "@/lib/seo";
import { absoluteUrl, t } from "@/lib/i18n";

export const Route = createFileRoute("/ar/services/$slug")({
  loader: async ({ params }) => {
    const service = await getServiceBySlug({ data: { slug: params.slug, lang: "ar" } });
    if (!service) throw notFound();
    return service;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const url = absoluteUrl("ar", `/services/${loaderData.slug_ar}`);
    return buildPageHead({
      lang: "ar",
      pathWithoutLocale: `/services/${loaderData.slug_ar}`,
      title: `${loaderData.title_ar} — صالون كازا للرجال عجمان`,
      description: loaderData.short_description_ar ?? `${loaderData.title_ar} في كازا عجمان.`,
      ogType: "article",
      ogImage: loaderData.image_url ?? undefined,
      jsonLd: serviceJsonLd({
        lang: "ar",
        name: loaderData.title_ar,
        description: loaderData.description_ar ?? loaderData.short_description_ar ?? "",
        price: Number(loaderData.price),
        url,
      }),
    });
  },
  notFoundComponent: () => {
    const tt = t("ar");
    return (
      <Section lang="ar" eyebrow="404" title={tt.common.notFound}>
        <Link to="/ar/services" className="text-primary hover:underline">{tt.services.backAll}</Link>
      </Section>
    );
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <Section lang="ar" eyebrow="خطأ" title={t("ar").common.error}>
        <p className="text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("ar").common.retry}
        </button>
      </Section>
    );
  },
  component: () => <ServiceDetailPage lang="ar" service={Route.useLoaderData()} />,
});
