import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, Building2, Smartphone, User } from "lucide-react";
import { Section } from "@/components/casa/Section";
import { Input } from "@/components/ui/input";
import placeholder from "/placeholder.jpg?url";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Casa Barber App — Coming Soon" },
      { name: "description", content: "Book a barber at home, register as a freelance barber, or list your salon. Join the Casa Barber App waiting list." },
      { property: "og:title", content: "Casa Barber App — Coming Soon" },
      { property: "og:description", content: "Book a barber at home, register, or list your salon." },
    ],
  }),
  component: AppPage,
});

const roles = [
  {
    icon: User,
    title: "Customers",
    text: "Book a Casa-vetted barber to your home in minutes. Same standards as the salon, on your sofa.",
  },
  {
    icon: Briefcase,
    title: "Freelance Barbers",
    text: "Register as a freelance barber, set your rates, and let Casa send you clients in your area.",
  },
  {
    icon: Building2,
    title: "Salons",
    text: "List your branch, manage your schedule, and receive new bookings from the Casa network.",
  },
];

function AppPage() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }
    setJoined(true);
    toast.success("You're on the list", { description: "We'll email you when Casa Barber App launches." });
  };

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <img src={placeholder} alt="Casa app" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-28 md:grid-cols-2 md:px-8 md:pb-28 md:pt-36">
          <div>
            <div className="label-eyebrow mb-5 inline-flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5" /> Coming Soon
            </div>
            <h1 className="font-serif text-5xl leading-[1.05] md:text-7xl">
              Casa Barber App.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Book a barber at home, register as a freelance barber, or connect your salon to receive
              more reservations. One app — for the whole grooming ecosystem.
            </p>
          </div>
          <div className="relative mx-auto aspect-[9/16] w-64 overflow-hidden rounded-[2rem] border-4 border-foreground/10 bg-background shadow-elegant md:w-72">
            <img src={placeholder} alt="App preview" className="h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/95" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="label-eyebrow mb-1">Casa</div>
              <div className="font-serif text-2xl">At-home barber, on demand.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <Section eyebrow="Built for everyone" title="Three sides. One app.">
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-border/60 bg-card p-7 transition-colors hover:border-primary/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-serif text-2xl">{title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Waitlist */}
      <div className="border-t border-border/60 bg-card/40">
        <Section eyebrow="Early Access" title="Join the waiting list." align="center">
          <div className="mx-auto max-w-xl">
            {joined ? (
              <div className="rounded-lg border border-primary/40 bg-card p-8 text-center">
                <p className="font-serif text-2xl">You're on the list.</p>
                <p className="mt-2 text-sm text-muted-foreground">We'll notify you the moment Casa Barber App goes live.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 flex-1"
                  required
                />
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110"
                >
                  Join Waiting List
                </button>
              </form>
            )}
            <p className="mt-4 text-center text-xs text-muted-foreground">No spam. One email when we launch.</p>
          </div>
        </Section>
      </div>
    </>
  );
}
