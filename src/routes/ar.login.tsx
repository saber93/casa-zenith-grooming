import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/casa/pages/LoginPage";
import { buildPageHead } from "@/lib/seo";
import { loginSearchValidator } from "@/lib/search-schemas";

export const Route = createFileRoute("/ar/login")({
  validateSearch: loginSearchValidator,
  head: () =>
    buildPageHead({
      lang: "ar",
      pathWithoutLocale: "/login",
      title: "دخول الإدارة — صالون كازا للرجال",
      description: "سجّل الدخول لإدارة حجوزات صالون كازا للرجال.",
    }),
  component: ArLoginRouteComponent,
});

function ArLoginRouteComponent() {
  const { redirect } = Route.useSearch();
  return <LoginPage lang="ar" redirect={redirect} />;
}
