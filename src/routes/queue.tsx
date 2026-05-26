import { createFileRoute } from "@tanstack/react-router";

import { QueuePage } from "@/components/casa/pages/QueuePage";
import { buildPageHead } from "@/lib/seo";
import { queueSearchValidator } from "@/lib/search-schemas";
import { listBarbers, listServices } from "@/server/casa.functions";
import { RequireModule } from "@/lib/business-context";

export const Route = createFileRoute("/queue")({
  validateSearch: queueSearchValidator,
  loader: async () => {
    const [services, barbers] = await Promise.all([listServices(), listBarbers()]);
    return { services, barbers };
  },
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/queue",
      title: "Walk-in Queue — Casa Gents Salon",
      description: "Join the Casa walk-in queue and follow your live wait status.",
    }),
  component: QueueRouteComponent,
});

function QueueRouteComponent() {
  const { services, barbers } = Route.useLoaderData();
  const { ticket } = Route.useSearch();
  return (
    <RequireModule module="walk_in_queue" lang="en">
      <QueuePage lang="en" services={services} barbers={barbers} ticket={ticket} />
    </RequireModule>
  );
}
