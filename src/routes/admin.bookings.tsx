import { createFileRoute } from "@tanstack/react-router";
import { AdminBookingsPage } from "@/components/casa/pages/AdminBookingsPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/bookings")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/bookings",
      title: "Bookings Admin — Casa Gents Salon",
      description: "Manage Casa Gents Salon reservations and booking statuses.",
    }),
  component: () => <AdminBookingsPage lang="en" />,
});
