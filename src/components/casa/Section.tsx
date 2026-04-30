import type { ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";
import type { Lang } from "@/lib/i18n";

export function Section({
  eyebrow,
  title,
  intro,
  children,
  className = "",
  align = "left",
  lang,
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  children: ReactNode;
  className?: string;
  align?: "left" | "center";
  lang?: Lang;
}) {
  const ref = useReveal<HTMLDivElement>();
  const isRtl = lang === "ar";
  const headerAlign =
    align === "center" ? "mx-auto text-center" : isRtl ? "ms-auto text-right md:ms-0" : "";
  return (
    <section className={`mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28 ${className}`}>
      {(eyebrow || title || intro) && (
        <div ref={ref} className={`reveal mb-12 max-w-2xl ${headerAlign}`}>
          {eyebrow && <div className="label-eyebrow mb-4">{eyebrow}</div>}
          {title && <h2 className="font-serif text-4xl leading-tight md:text-5xl">{title}</h2>}
          {intro && <p className="mt-4 text-base text-muted-foreground md:text-lg">{intro}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
