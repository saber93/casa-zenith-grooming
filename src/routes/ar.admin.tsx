import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/casa/AdminLayout";

export const Route = createFileRoute("/ar/admin")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/ar/admin" || location.pathname === "/ar/admin/") {
      throw redirect({ to: "/ar/admin/queue" });
    }
  },
  component: () => (
    <AdminLayout lang="ar">
      <Outlet />
    </AdminLayout>
  ),
});
