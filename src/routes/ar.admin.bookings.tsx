import { createFileRoute } from "@tanstack/react-router";
import { AdminBookingsPage } from "@/components/casa/pages/AdminBookingsPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/bookings")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/bookings",
      title: "إدارة الحجوزات — صالون كازا للرجال",
      description: "إدارة حجوزات صالون كازا للرجال وحالات المواعيد.",
    }),
  component: () => <AdminBookingsPage lang="ar" />,
});
