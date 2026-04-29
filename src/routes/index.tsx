import { createFileRoute, Link } from "@tanstack/react-router";
import { Section } from "@/components/casa/Section";
import { ServiceCard } from "@/components/casa/ServiceCard";
import { ProductCard } from "@/components/casa/ProductCard";
import { services } from "@/data/services";
import { products } from "@/data/products";
import { CASA } from "@/lib/casa";
import { useReveal } from "@/hooks/use-reveal";
import { Calendar, Clock, MapPin, Smartphone, Star } from "lucide-react";
import placeholder from "/placeholder.jpg?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Casa — Premium Gents Grooming in Casablanca" },
      { name: "description", content: "Haircuts, beard care, grooming products, and easy reservations — all in one place at Casa." },
      { property: "og:title", content: "Casa — Premium Gents Grooming" },
      { property: "og:description", content: "Haircuts, beard care, grooming products, and easy reservations." },
      { property: "og:image", content: "/placeholder.jpg" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const featured = services.filter((s) => s.featured).slice(0, 4);
  const productPreview = products.slice(0, 3);
  const heroRef = useReveal<HTMLDivElement>();
  const ctaRef = useReveal<HTMLDivElement>();

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <img
          src={placeholder}
          alt="Casa grooming lounge"
          width={1536}
          height={1024}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div ref={heroRef} className="reveal mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-5 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
          <div className="label-eyebrow mb-5">Established · Casablanca</div>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight text-foreground md:text-7xl lg:text-8xl">
            Premium Gents <span className="italic text-primary">Grooming</span><br className="hidden md:block" /> at Casa
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Haircuts, beard care, grooming products, and easy reservations — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/reservation"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110"
            >
              Book Appointment
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center justify-center rounded-md border border-foreground/20 bg-background/30 px-6 py-3.5 text-sm font-medium text-foreground backdrop-blur transition-all hover:border-foreground/40 hover:bg-background/50"
            >
              Explore Services
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED SERVICES */}
      <Section
        eyebrow="Signature Services"
        title="Crafted, not rushed."
        intro="A short list of carefully designed services. Every chair, every cut, finished to the same Casa standard."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featured.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
        <div className="mt-10">
          <Link to="/services" className="text-sm text-primary hover:underline">
            View all services →
          </Link>
        </div>
      </Section>

      {/* PRODUCTS PREVIEW */}
      <div className="border-y border-border/60 bg-card/40">
        <Section
          eyebrow="Grooming Products"
          title="Take Casa home with you."
          intro="A focused range of products we use and trust in the chair."
          className="py-20 md:py-24"
        >
          <div className="grid gap-6 md:grid-cols-3">
            {productPreview.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
          <div className="mt-10">
            <Link to="/products" className="text-sm text-primary hover:underline">
              Shop all products →
            </Link>
          </div>
        </Section>
      </div>

      {/* BOOKING TEASER */}
      <Section eyebrow="Reservation" title="Book in under a minute.">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-base text-muted-foreground md:text-lg">
              Pick your service, pick your barber, choose a time. We hold the chair — you arrive,
              relax, and let us take care of the rest.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-center gap-3"><Calendar className="h-4 w-4 text-primary" /> Live availability, no waiting on calls</li>
              <li className="flex items-center gap-3"><Clock className="h-4 w-4 text-primary" /> Reminders by WhatsApp</li>
              <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> In-salon or at home</li>
            </ul>
            <Link
              to="/reservation"
              className="mt-10 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110"
            >
              Reserve a Chair
            </Link>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-6 shadow-elegant">
            <div className="label-eyebrow mb-4">Today</div>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              {["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30"].map((t, i) => (
                <div
                  key={t}
                  className={`rounded-md border py-3 transition-colors ${
                    i === 3
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  }`}
                >
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
              Live availability — updated every minute.
            </div>
          </div>
        </div>
      </Section>

      {/* CASA APP TEASER */}
      <div className="bg-card/40">
        <Section eyebrow="Coming Soon" title="The Casa Barber App.">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="text-base text-muted-foreground md:text-lg">
                Book a barber at home, register as a freelance barber, or connect your salon
                to receive more reservations. One app — built for the whole grooming ecosystem.
              </p>
              <Link
                to="/app"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Smartphone className="h-4 w-4" /> Discover the Casa App →
              </Link>
            </div>
            <div className="relative mx-auto aspect-[9/16] w-56 overflow-hidden rounded-[2rem] border-4 border-foreground/10 bg-background shadow-elegant md:w-64">
              <img src={placeholder} alt="Casa App preview" loading="lazy" className="h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/90" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="label-eyebrow mb-1">Casa App</div>
                <div className="font-serif text-2xl">At-home barber, on demand.</div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* TESTIMONIALS */}
      <Section eyebrow="Word of mouth" title="What our guests say.">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { quote: "Best haircut I've had in Casablanca. The attention to detail is on another level.", name: "Yassine B." },
            { quote: "The grooming package made my wedding day. Everything was calm, premium, on time.", name: "Mehdi A." },
            { quote: "I switched to Casa six months ago and never looked back. Real craftsmen.", name: "Karim L." },
          ].map((t) => (
            <figure key={t.name} className="rounded-lg border border-border/60 bg-card p-7">
              <div className="flex gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <blockquote className="mt-5 font-serif text-2xl leading-snug text-foreground">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6 text-sm text-muted-foreground">— {t.name}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* LOCATION */}
      <div className="border-t border-border/60 bg-card/40">
        <Section eyebrow="Visit Us" title="Find Casa.">
          <div className="grid gap-10 md:grid-cols-2">
            <div ref={ctaRef} className="reveal">
              <ul className="space-y-5 text-base">
                <li className="flex items-start gap-3"><MapPin className="mt-1 h-5 w-5 text-primary" /> <span>{CASA.address}</span></li>
                <li className="flex items-start gap-3"><Clock className="mt-1 h-5 w-5 text-primary" /> <span>{CASA.hours}</span></li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/reservation"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:brightness-110"
                >
                  Book Appointment
                </Link>
                <a
                  href={`tel:${CASA.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center justify-center rounded-md border border-foreground/20 px-5 py-3 text-sm font-medium text-foreground hover:border-foreground/40"
                >
                  Call {CASA.phone}
                </a>
              </div>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border/60 bg-card">
              <img src={placeholder} alt="Casa location" loading="lazy" className="h-full w-full object-cover opacity-80" />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
