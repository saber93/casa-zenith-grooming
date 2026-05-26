import { createFileRoute } from "@tanstack/react-router";
import { PublicDirectoryPage } from "@/components/casa/pages/PublicDirectoryPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/public-directory")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/public-directory",
      title: "اكتشف صالونات ومنتجعات مميزة | كازا",
      description:
        "تصفّح واحجز مواعيدك في أفضل صالونات الحلاقة والتجميل والسبا ومراكز المساج القريبة منك.",
    }),
  component: () => <PublicDirectoryPage lang="ar" />,
});
