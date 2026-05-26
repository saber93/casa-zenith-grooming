import { createFileRoute } from "@tanstack/react-router";
import { BusinessDetailsPage } from "@/components/casa/pages/BusinessDetailsPage";

function ArabicBusinessDetailsRouteComponent() {
  const { slug } = Route.useParams();
  return <BusinessDetailsPage lang="ar" slug={slug} />;
}

export const Route = createFileRoute("/ar/business/$slug")({
  component: ArabicBusinessDetailsRouteComponent,
  head: () => ({
    meta: [
      { title: "تفاصيل العمل | كازا" },
      { name: "description", content: "عرض الخدمات، فريق العمل، وحجز المواعيد." },
    ],
  }),
});
