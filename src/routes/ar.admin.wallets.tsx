import { createFileRoute } from "@tanstack/react-router";
import { AdminWalletsPage } from "@/components/casa/pages/AdminWalletsPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/wallets")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/wallets",
      title: "القسائم والمحافظ مسبقة الدفع — كازا",
      description: "إدارة القسائم مسبقة الدفع، عمليات الاستهلاك، وعمولات الموظفين.",
    }),
  component: () => (
    <RequireModule module="wallets" lang="ar">
      <AdminWalletsPage lang="ar" />
    </RequireModule>
  ),
});
