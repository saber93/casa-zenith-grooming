import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { getService, services } from "@/data/services";
import { Section } from "@/components/casa/Section";
import { Check, Clock, Tag } from "lucide-react";
import placeholder from "/placeholder.jpg?url";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const service = getService(params.slug);
    if (!service) throw notFound();
    return { service };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.service;
    return {
      meta: [
        { title: s ? `${s.name} — Casa` : "Service — Casa" },
        { name: "description", content: s?.shortDescription ?? "Casa grooming service." },
        { property: "og:title", content: s ? `${s.name} — Casa` : "Service — Casa" },
        { property: "og:description", content: s?.shortDescription ?? "" },
        { property: "og:image", content: s?.image ?? "/placeholder.jpg" },
      ],
    };
  },
  component: ServiceDetailPage,
  notFoundComponent: () => {
    const { slug } = Route.useParams();
    return (
      <Section eyebrow="Not Found" title={`No service "${slug}"`}>
        <Link to="/services" className="text-primary hover:underline">← Back to all services</Link>
      </Section>
    );
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <Section eyebrow="Error" title="Something went wrong.">
        <p className="text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Retry
        </button>
      </Section>
    );
  },
});

function ServiceDetailPage() {
  const { service } = Route.useLoaderData();
  const recommended = services.filter((s) => service.addons.includes(s.name));

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <img src={placeholder} alt={service.name} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-36">
          <Link to="/services" className="text-sm text-muted-foreground hover:text-foreground">← All services</Link>
          <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-tight md:text-7xl">{service.name}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{service.shortDescription}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 backdrop-blur">
              <Clock className="h-4 w-4 text-primary" /> {service.duration}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-primary">
              <Tag className="h-4 w-4" /> {service.price}
            </span>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="label-eyebrow mb-4">About</div>
            <p className="text-lg leading-relaxed text-foreground/90">{service.description}</p>

            <div className="mt-14 grid gap-10 md:grid-cols-2">
              <div>
                <div className="label-eyebrow mb-4">Benefits</div>
                <ul className="space-y-3">
                  {service.benefits.map((b: string) => (
                    <li key={b} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="label-eyebrow mb-4">What's included</div>
                <ul className="space-y-3">
                  {service.included.map((i: string) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {recommended.length > 0 && (
              <div className="mt-16">
                <div className="label-eyebrow mb-4">Recommended add-ons</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {recommended.map((r) => (
                    <Link
                      key={r.slug}
                      to="/services/$slug"
                      params={{ slug: r.slug }}
                      className="group flex items-center justify-between rounded-md border border-border/60 bg-card p-4 transition-colors hover:border-primary/60"
                    >
                      <div>
                        <div className="font-serif text-lg">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.duration} · {r.price}</div>
                      </div>
                      <span className="text-primary transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky booking card */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-border/60 bg-card p-6 shadow-elegant">
              <div className="label-eyebrow mb-3">Reserve</div>
              <div className="font-serif text-3xl">{service.price}</div>
              <div className="mt-1 text-sm text-muted-foreground">{service.duration} · in-salon or at home</div>
              <Link
                to="/reservation"
                search={{ service: service.slug }}
                className="mt-6 flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:brightness-110"
              >
                Book Now
              </Link>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Free cancellation up to 2h before.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
