import { createFileRoute } from "@tanstack/react-router";

import { QueuePage } from "@/components/casa/pages/QueuePage";
import { buildPageHead } from "@/lib/seo";
import { queueSearchValidator } from "@/lib/search-schemas";
import { listBarbers, listServices } from "@/server/casa.functions";

export const Route = createFileRoute("/ar/queue")({
  validateSearch: queueSearchValidator,
  loader: async () => {
    const [services, barbers] = await Promise.all([listServices(), listBarbers()]);
    return { services, barbers };
  },
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/queue",
      title: "قائمة الانتظار — صالون كازا للرجال",
      description: "انضم إلى قائمة انتظار كازا وتابع حالة دورك مباشرة.",
    }),
  component: ArQueueRouteComponent,
});

function ArQueueRouteComponent() {
  const { services, barbers } = Route.useLoaderData();
  const { ticket } = Route.useSearch();
  return <QueuePage lang="ar" services={services} barbers={barbers} ticket={ticket} />;
}
