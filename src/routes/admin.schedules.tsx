import { createFileRoute } from "@tanstack/react-router";
import { AdminSchedulesPage } from "@/components/casa/pages/AdminSchedulesPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/schedules")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/schedules",
      title: "Shift Schedules & Work Hours — Casa",
      description: "Manage working days, staff shifts, team planners, and vacation registries.",
    }),
  component: () => <AdminSchedulesPage lang="en" />,
});
