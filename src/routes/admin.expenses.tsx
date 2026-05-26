import { createFileRoute } from "@tanstack/react-router";
import { AdminExpensesPage } from "@/components/casa/pages/AdminExpensesPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/expenses")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/expenses",
      title: "Expenses & Suppliers — Casa Multi-Business",
      description: "Manage expenses, operational costs, and supplier registries.",
    }),
  component: () => (
    <RequireModule module="suppliers_expenses" lang="en">
      <AdminExpensesPage lang="en" />
    </RequireModule>
  ),
});
