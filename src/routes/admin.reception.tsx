import { createFileRoute } from "@tanstack/react-router";
import { AdminReceptionWorkspacePage } from "@/components/casa/pages/AdminReceptionWorkspacePage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/reception")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/reception",
      title: "Reception Workspace — Casa",
      description:
        "Operate the front-desk cockpit: check in bookings, track queue, and look up customers.",
    }),
  component: () => (
    <RequireModule module="reservations" lang="en">
      <AdminReceptionWorkspacePage lang="en" />
    </RequireModule>
  ),
});
