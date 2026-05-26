import { createFileRoute } from "@tanstack/react-router";
import { AdminExpensesPage } from "@/components/casa/pages/AdminExpensesPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/expenses")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/expenses",
      title: "الموردون والمصاريف — كازا",
      description: "إدارة المصاريف التشغيلية وقائمة الموردين المسجلين.",
    }),
  component: () => (
    <RequireModule module="suppliers_expenses" lang="ar">
      <AdminExpensesPage lang="ar" />
    </RequireModule>
  ),
});
