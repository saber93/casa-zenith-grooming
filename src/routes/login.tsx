import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/casa/pages/LoginPage";
import { buildPageHead } from "@/lib/seo";
import { loginSearchValidator } from "@/lib/search-schemas";

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchValidator,
  head: () =>
    buildPageHead({
      lang: "en",
      pathWithoutLocale: "/login",
      title: "Admin Sign In — Casa Gents Salon",
      description: "Sign in to manage Casa Gents Salon bookings.",
    }),
  component: LoginRouteComponent,
});

function LoginRouteComponent() {
  const { redirect } = Route.useSearch();
  return <LoginPage lang="en" redirect={redirect ?? ""} />;
}
