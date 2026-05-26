import { createFileRoute } from "@tanstack/react-router";
import { AdminPackagesPage } from "@/components/casa/pages/AdminPackagesPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/packages")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/packages",
      title: "Packages & Bundles — Casa Multi-Business",
      description: "Manage pre-paid service bundles, sessions, and customer package balances.",
    }),
  component: () => (
    <RequireModule module="discounts" lang="en">
      <AdminPackagesPage lang="en" />
    </RequireModule>
  ),
});
