import { Section } from "@/components/casa/Section";
import { ServiceCard, type ServiceRow } from "@/components/casa/ServiceCard";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function ServicesPage({ lang, services }: { lang: Lang; services: ServiceRow[] }) {
  const tt = t(lang);
  return (
    <Section
      lang={lang}
      eyebrow={tt.services.pageEyebrow}
      title={tt.services.pageTitle}
      intro={tt.services.pageIntro}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} lang={lang} />
        ))}
      </div>
    </Section>
  );
}
