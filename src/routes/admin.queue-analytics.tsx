import { createFileRoute } from "@tanstack/react-router";

import { AdminQueueAnalyticsPage } from "@/components/casa/pages/AdminQueueAnalyticsPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/queue-analytics")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/queue-analytics",
      title: "Queue Analytics — Casa Gents Salon",
      description: "Operational queue and service timing insights for Casa salon.",
    }),
  component: () => <AdminQueueAnalyticsPage lang="en" />,
});
