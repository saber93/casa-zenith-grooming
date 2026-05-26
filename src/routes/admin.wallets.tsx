import { createFileRoute } from "@tanstack/react-router";
import { AdminWalletsPage } from "@/components/casa/pages/AdminWalletsPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/wallets")({
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/admin/wallets",
      title: "Prepaid Vouchers & Wallets — Casa Multi-Business",
      description: "Manage prepaid vouchers, drawdowns, and staff percentage commissions.",
    }),
  component: () => (
    <RequireModule module="wallets" lang="en">
      <AdminWalletsPage lang="en" />
    </RequireModule>
  ),
});
