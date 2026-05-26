import { createFileRoute } from "@tanstack/react-router";

import { AdminQueueDisplayPage } from "@/components/casa/pages/AdminQueueDisplayPage";
import { RequireModule } from "@/lib/business-context";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/queue-display")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/queue-display",
      title: "شاشة قائمة الانتظار — صالون كازا للرجال",
      description: "شاشة آمنة لمنطقة الانتظار تعرض حالة قائمة الدخول المباشر في كازا.",
    }),
  component: () => (
    <RequireModule module="queue_display" lang="ar">
      <AdminQueueDisplayPage lang="ar" />
    </RequireModule>
  ),
});
