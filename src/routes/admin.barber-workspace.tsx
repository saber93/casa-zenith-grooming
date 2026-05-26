import { createFileRoute } from "@tanstack/react-router";

import { AdminBarberWorkspacePage } from "@/components/casa/pages/AdminBarberWorkspacePage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/barber-workspace")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/barber-workspace",
      title: "Barber Workspace — Casa Gents Salon",
      description: "A focused workspace for Casa barbers to manage the next walk-in client.",
    }),
  component: () => (
    <RequireModule module="barber_workspace" lang="en">
      <AdminBarberWorkspacePage lang="en" />
    </RequireModule>
  ),
});
