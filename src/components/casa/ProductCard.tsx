import { CASA, waLink } from "@/lib/casa";
import { MessageCircle } from "lucide-react";
import placeholder from "/placeholder.jpg?url";
import type { Lang } from "@/lib/i18n";
import { t, formatPrice } from "@/lib/i18n";

export type ProductRow = {
  id: string;
  slug_en: string;
  slug_ar: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price: number;
  image_url?: string | null;
  whatsapp_order_text_en?: string | null;
  whatsapp_order_text_ar?: string | null;
};

export function ProductCard({ product, lang }: { product: ProductRow; lang: Lang }) {
  const tt = t(lang);
  const name = lang === "ar" ? product.name_ar : product.name_en;
  const desc = (lang === "ar" ? product.description_ar : product.description_en) ?? "";
  const waText =
    (lang === "ar" ? product.whatsapp_order_text_ar : product.whatsapp_order_text_en) ||
    (lang === "ar" ? `مرحباً ${CASA.nameAr}، أود طلب: ${name}` : `Hi ${CASA.name}, I'd like to order: ${name}`);

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/60">
      <div className="relative aspect-square overflow-hidden bg-surface">
        <img
          src={product.image_url || placeholder}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl text-foreground">{name}</h3>
          <span className="shrink-0 text-primary">{formatPrice(lang, product.price)}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
        <a
          href={waLink(waText)}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-primary/60 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          <MessageCircle className="h-4 w-4" /> {tt.cta.orderWhatsApp}
        </a>
      </div>
    </div>
  );
}
