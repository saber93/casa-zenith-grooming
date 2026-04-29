import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/casa/Section";
import { ServiceCard } from "@/components/casa/ServiceCard";
import { services } from "@/data/services";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Casa Gents Grooming" },
      { name: "description", content: "Haircuts, beard care, facial, coloring, kids cuts, and home barber service. See all Casa services & prices." },
      { property: "og:title", content: "Services — Casa Gents Grooming" },
      { property: "og:description", content: "Haircuts, beard care, facial, coloring, and home barber service." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <>
      <Section
        eyebrow="Our Services"
        title="Designed for the modern gentleman."
        intro="From a precise classic cut to an at-home barber visit — pick the experience that fits your day."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </Section>
    </>
  );
}
