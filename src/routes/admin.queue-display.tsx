import { createFileRoute } from "@tanstack/react-router";

import { AdminQueueDisplayPage } from "@/components/casa/pages/AdminQueueDisplayPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/queue-display")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/queue-display",
      title: "Queue Display — Casa Gents Salon",
      description: "A safe waiting-area queue display for Casa walk-in guests.",
    }),
  component: () => <AdminQueueDisplayPage lang="en" />,
});
