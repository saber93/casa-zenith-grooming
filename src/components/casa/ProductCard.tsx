import type { Product } from "@/data/products";
import { CASA, waLink } from "@/lib/casa";
import { MessageCircle } from "lucide-react";
import placeholder from "/placeholder.jpg?url";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/60">
      <div className="relative aspect-square overflow-hidden bg-surface">
        <img
          src={placeholder}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
          {product.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl text-foreground">{product.name}</h3>
          <span className="shrink-0 text-primary">{product.price}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
        <a
          href={waLink(`Hi ${CASA.name}, I'd like to order: ${product.name} (${product.price}).`)}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-primary/60 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          <MessageCircle className="h-4 w-4" /> Order via WhatsApp
        </a>
      </div>
    </div>
  );
}
