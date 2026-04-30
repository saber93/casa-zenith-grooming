import { createFileRoute } from "@tanstack/react-router";
import { ReservationPage } from "@/components/casa/pages/ReservationPage";
import { listBarbers, listServices } from "@/server/casa.functions";
import { buildPageHead, pageSeoCopy } from "@/lib/seo";
import { reservationSearchValidator } from "@/lib/search-schemas";

export const Route = createFileRoute("/ar/reservation")({
  validateSearch: reservationSearchValidator,
  loader: async () => {
    const [services, barbers] = await Promise.all([listServices(), listBarbers()]);
    return { services, barbers };
  },
  head: () => {
    const seo = pageSeoCopy("ar", "reservation");
    return buildPageHead({ lang: "ar", pathWithoutLocale: "/reservation", ...seo });
  },
  component: ArReservationRouteComponent,
});

function ArReservationRouteComponent() {
  const { services, barbers } = Route.useLoaderData();
  const { service } = Route.useSearch();
  return <ReservationPage lang="ar" services={services} barbers={barbers} presetSlug={service} />;
}
