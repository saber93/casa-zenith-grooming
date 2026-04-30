import type { Lang } from "@/lib/i18n";
import { CASA, waLink } from "@/lib/casa";
import { MessageCircle } from "lucide-react";
import { t } from "@/lib/i18n";

export function WhatsAppFab({ lang }: { lang: Lang }) {
  const msg = lang === "ar"
    ? `مرحباً ${CASA.nameAr}، أود حجز موعد.`
    : `Hi ${CASA.name}, I'd like to book an appointment.`;
  return (
    <a
      href={waLink(msg)}
      target="_blank"
      rel="noreferrer"
      aria-label={t(lang).cta.book}
      className={`fixed bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-elegant transition-transform hover:scale-110 ${lang === "ar" ? "left-5" : "right-5"}`}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
