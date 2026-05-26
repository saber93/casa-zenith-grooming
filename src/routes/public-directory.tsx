import { createFileRoute } from "@tanstack/react-router";
import { PublicDirectoryPage } from "@/components/casa/pages/PublicDirectoryPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/public-directory")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/public-directory",
      title: "Discover Premium Salons & Spas | Casa",
      description:
        "Browse and book appointments at top-rated barbershops, salons, spas, and massage centers near you.",
    }),
  component: () => <PublicDirectoryPage lang="en" />,
});
