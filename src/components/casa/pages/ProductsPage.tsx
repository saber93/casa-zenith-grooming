import { Section } from "@/components/casa/Section";
import { ProductCard, type ProductRow } from "@/components/casa/ProductCard";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function ProductsPage({ lang, products }: { lang: Lang; products: ProductRow[] }) {
  const tt = t(lang);
  return (
    <Section lang={lang} eyebrow={tt.products.pageEyebrow} title={tt.products.pageTitle} intro={tt.products.pageIntro}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => <ProductCard key={p.id} product={p} lang={lang} />)}
      </div>
    </Section>
  );
}
