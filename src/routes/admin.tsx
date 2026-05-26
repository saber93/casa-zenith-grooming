import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/casa/AdminLayout";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      throw redirect({ to: "/admin/queue" });
    }
  },
  component: () => (
    <AdminLayout lang="en">
      <Outlet />
    </AdminLayout>
  ),
});
