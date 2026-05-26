import { createFileRoute } from "@tanstack/react-router";

import { AdminQueuePage } from "@/components/casa/pages/AdminQueuePage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/queue")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/queue",
      title: "إدارة قائمة الانتظار — صالون كازا للرجال",
      description: "إدارة أدوار الدخول المباشر في كازا وحالات الخدمة.",
    }),
  component: () => (
    <RequireModule module="walk_in_queue" lang="ar">
      <AdminQueuePage lang="ar" />
    </RequireModule>
  ),
});
