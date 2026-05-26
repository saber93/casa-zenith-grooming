import { createFileRoute } from "@tanstack/react-router";
import { BusinessDetailsPage } from "@/components/casa/pages/BusinessDetailsPage";

function BusinessDetailsRouteComponent() {
  const { slug } = Route.useParams();
  return <BusinessDetailsPage lang="en" slug={slug} />;
}

export const Route = createFileRoute("/business/$slug")({
  component: BusinessDetailsRouteComponent,
  head: () => ({
    meta: [
      { title: "Business Details | Casa" },
      { name: "description", content: "View services, team, and book appointments." },
    ],
  }),
});
