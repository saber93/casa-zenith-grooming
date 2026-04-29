import { CASA, waLink } from "@/lib/casa";
import { MessageCircle } from "lucide-react";

export function WhatsAppFab() {
  return (
    <a
      href={waLink(`Hi ${CASA.name}, I'd like to book an appointment.`)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-elegant transition-transform hover:scale-110"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
