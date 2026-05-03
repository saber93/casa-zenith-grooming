import { createFileRoute } from "@tanstack/react-router";

import { AdminQueueAnalyticsPage } from "@/components/casa/pages/AdminQueueAnalyticsPage";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/ar/admin/queue-analytics")({
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/admin/queue-analytics",
      title: "تحليلات قائمة الانتظار — صالون كازا للرجال",
      description: "رؤى تشغيلية لقائمة الانتظار وتوقيت الخدمات في صالون كازا.",
    }),
  component: () => <AdminQueueAnalyticsPage lang="ar" />,
});
