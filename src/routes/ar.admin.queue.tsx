import { createFileRoute } from "@tanstack/react-router";

import { AdminQueuePage } from "@/components/casa/pages/AdminQueuePage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/queue")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/queue",
      title: "إدارة قائمة الانتظار — صالون كازا للرجال",
      description: "إدارة أدوار الدخول المباشر في كازا وحالات الخدمة.",
    }),
  component: () => <AdminQueuePage lang="ar" />,
});
