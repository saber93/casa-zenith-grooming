import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/casa/Section";
import { ProductCard } from "@/components/casa/ProductCard";
import { products } from "@/data/products";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Grooming Products — Casa" },
      { name: "description", content: "Hair wax, beard oil, shampoo, face wash, aftershave — premium grooming products from Casa." },
      { property: "og:title", content: "Grooming Products — Casa" },
      { property: "og:description", content: "Premium grooming products from Casa." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <Section
      eyebrow="Grooming Products"
      title="Take Casa home with you."
      intro="A focused range we use every day in the chair. Order via WhatsApp — we'll confirm in minutes."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </Section>
  );
}
