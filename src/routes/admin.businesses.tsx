import { createFileRoute } from "@tanstack/react-router";
import { AdminBusinessesPage } from "@/components/casa/pages/AdminBusinessesPage";

export const Route = createFileRoute("/admin/businesses")({
  component: () => <AdminBusinessesPage lang="en" />,
  head: () => ({
    meta: [
      { title: "Businesses | Casa Admin" },
      {
        name: "description",
        content: "Create and manage businesses on the Casa platform.",
      },
    ],
  }),
});
