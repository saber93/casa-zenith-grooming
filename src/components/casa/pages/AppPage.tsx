import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, Building2, Smartphone, User } from "lucide-react";
import { Section } from "@/components/casa/Section";
import { Input } from "@/components/ui/input";
import placeholder from "/placeholder.jpg?url";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const ICONS = [User, Briefcase, Building2];

export function AppPage({ lang }: { lang: Lang }) {
  const tt = t(lang);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }
    setJoined(true);
    toast.success(tt.app.waitJoined, { description: tt.app.waitJoinedDesc });
  };

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <img src={placeholder} alt={tt.app.title} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className={`mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-28 md:grid-cols-2 md:px-8 md:pb-28 md:pt-36 ${lang === "ar" ? "text-right" : ""}`}>
          <div>
            <div className="label-eyebrow mb-5 inline-flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5" /> {tt.app.eyebrow}
            </div>
            <h1 className="font-serif text-5xl leading-[1.05] md:text-7xl">{tt.app.title}</h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">{tt.app.lead}</p>
          </div>
          <div className="relative mx-auto aspect-[9/16] w-64 overflow-hidden rounded-[2rem] border-4 border-foreground/10 bg-background shadow-elegant md:w-72">
            <img src={placeholder} alt="App preview" className="h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/95" />
          </div>
        </div>
      </section>

      <Section lang={lang} eyebrow={tt.app.rolesEyebrow} title={tt.app.rolesTitle}>
        <div className="grid gap-6 md:grid-cols-3">
          {tt.app.roles.map((r, i) => {
            const Icon = ICONS[i];
            return (
              <div key={r.title} className="rounded-lg border border-border/60 bg-card p-7 transition-colors hover:border-primary/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-serif text-2xl">{r.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{r.text}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="border-t border-border/60 bg-card/40">
        <Section lang={lang} eyebrow={tt.app.waitEyebrow} title={tt.app.waitTitle} align="center">
          <div className="mx-auto max-w-xl">
            {joined ? (
              <div className="rounded-lg border border-primary/40 bg-card p-8 text-center">
                <p className="font-serif text-2xl">{tt.app.waitJoined}</p>
                <p className="mt-2 text-sm text-muted-foreground">{tt.app.waitJoinedDesc}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder={tt.app.emailPh}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 flex-1"
                  required
                  dir="ltr"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110"
                >
                  {tt.app.joinCta}
                </button>
              </form>
            )}
            <p className="mt-4 text-center text-xs text-muted-foreground">{tt.app.noSpam}</p>
          </div>
        </Section>
      </div>
    </>
  );
}
