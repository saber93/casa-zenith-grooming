import { createFileRoute } from "@tanstack/react-router";

import { AdminQueuePage } from "@/components/casa/pages/AdminQueuePage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/queue")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/queue",
      title: "Walk-in Queue Admin — Casa Gents Salon",
      description: "Manage Casa walk-in queue tickets and service status.",
    }),
  component: () => (
    <RequireModule module="walk_in_queue" lang="en">
      <AdminQueuePage lang="en" />
    </RequireModule>
  ),
});
