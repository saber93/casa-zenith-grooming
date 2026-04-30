import type { Lang } from "@/lib/i18n";
import { absoluteUrl, SITE_URL, t } from "@/lib/i18n";
import { CASA } from "@/lib/casa";

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

type LinkTag = { rel: string; href: string; hrefLang?: string };

type ScriptTag = { type: string; children: string };

export interface PageSeoInput {
  lang: Lang;
  /** Path WITHOUT the /ar prefix (e.g. "/services", "/services/قص-الشعر"). */
  pathWithoutLocale: string;
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "website" | "article";
  jsonLd?: object | object[];
}

export function buildPageHead(input: PageSeoInput): {
  meta: MetaTag[];
  links: LinkTag[];
  scripts?: ScriptTag[];
} {
  const { lang, pathWithoutLocale, title, description, ogImage, ogType, jsonLd } = input;
  const canonical = absoluteUrl(lang, pathWithoutLocale);
  const enUrl = absoluteUrl("en", pathWithoutLocale);
  const arUrl = absoluteUrl("ar", pathWithoutLocale);
  const ogImg = ogImage ?? `${SITE_URL}/placeholder.jpg`;

  const meta: MetaTag[] = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:type", content: ogType ?? "website" },
    { property: "og:image", content: ogImg },
    { property: "og:locale", content: lang === "ar" ? "ar_AE" : "en_US" },
    { property: "og:locale:alternate", content: lang === "ar" ? "en_US" : "ar_AE" },
    { property: "og:site_name", content: lang === "ar" ? CASA.fullNameAr : CASA.fullName },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImg },
  ];

  const links: LinkTag[] = [
    { rel: "canonical", href: canonical },
    { rel: "alternate", hrefLang: "en", href: enUrl },
    { rel: "alternate", hrefLang: "ar", href: arUrl },
    { rel: "alternate", hrefLang: "x-default", href: enUrl },
  ];

  const scripts: ScriptTag[] | undefined = jsonLd
    ? [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }]
    : undefined;

  return { meta, links, scripts };
}

export function localBusinessJsonLd(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: lang === "ar" ? CASA.fullNameAr : CASA.fullName,
    image: `${SITE_URL}/placeholder.jpg`,
    "@id": SITE_URL,
    url: SITE_URL,
    telephone: CASA.phone,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: lang === "ar" ? CASA.addressAr : CASA.address,
      addressLocality: lang === "ar" ? CASA.cityAr : CASA.city,
      addressRegion: CASA.region,
      addressCountry: CASA.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: CASA.geo.lat,
      longitude: CASA.geo.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "10:00",
        closes: "22:00",
      },
    ],
    sameAs: [CASA.instagram],
  };
}

export function serviceJsonLd(opts: {
  lang: Lang;
  name: string;
  description: string;
  price: number;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: {
      "@type": "HairSalon",
      name: opts.lang === "ar" ? CASA.fullNameAr : CASA.fullName,
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: opts.price,
      priceCurrency: "AED",
      url: opts.url,
      availability: "https://schema.org/InStock",
    },
    areaServed: opts.lang === "ar" ? CASA.cityAr : CASA.city,
  };
}

// Convenience: SEO copy per page in both langs (keywords baked in).
export function pageSeoCopy(
  lang: Lang,
  page: "home" | "services" | "products" | "reservation" | "app",
) {
  const tt = t(lang);
  if (lang === "en") {
    switch (page) {
      case "home":
        return {
          title: "Casa Gents Salon — Barber & Men's Grooming in Ajman",
          description:
            "Premium barber and gents salon in Ajman. Haircuts, beard care, facial, and home barber service. Book online in under a minute.",
        };
      case "services":
        return {
          title: "Services — Men Haircut, Beard, Facial — Casa Ajman",
          description:
            "All Casa services: classic haircut, beard trim, facial care, hair coloring, kids haircut, home barber service in Ajman. Prices and durations.",
        };
      case "products":
        return {
          title: "Grooming Products — Casa Gents Salon Ajman",
          description:
            "Beard oil, hair pomade, shampoo, aftershave and signature cologne. Order via WhatsApp from Casa Ajman.",
        };
      case "reservation":
        return {
          title: "Book Appointment — Casa Barber Ajman",
          description:
            "Reserve your chair at Casa Gents Salon Ajman. Pick your service, barber, date and time online.",
        };
      case "app":
        return {
          title: "Casa Barber App — At-Home Barber in Ajman",
          description:
            "Book a Casa-vetted barber to your home. Coming soon for customers, freelance barbers, and salons.",
        };
    }
  }
  switch (page) {
    case "home":
      return {
        title: "صالون كازا للرجال — حلاق رجالي في عجمان",
        description:
          "صالون رجالي راقٍ في عجمان. قص شعر، عناية باللحية، علاج وجه، وخدمة حلاق منزلية. احجز أونلاين في أقل من دقيقة.",
      };
    case "services":
      return {
        title: "الخدمات — قص شعر رجال، لحية، وجه — كازا عجمان",
        description:
          "جميع خدمات كازا: قص شعر كلاسيكي، تهذيب لحية، عناية بالوجه، صبغ شعر، قص شعر أطفال، خدمة حلاق منزلية في عجمان.",
      };
    case "products":
      return {
        title: "منتجات التجميل — صالون كازا للرجال عجمان",
        description:
          "زيت لحية، بومادة شعر، شامبو، بلسم بعد الحلاقة، وعطر مميز. اطلب عبر واتساب من كازا عجمان.",
      };
    case "reservation":
      return {
        title: "احجز موعدك — حلاق كازا عجمان",
        description:
          "احجز كرسيك في صالون كازا للرجال عجمان. اختر خدمتك، حلاقك، التاريخ والوقت أونلاين.",
      };
    case "app":
      return {
        title: "تطبيق كازا للحلاقين — حلاق منزلي في عجمان",
        description:
          "احجز حلاقاً معتمداً من كازا في منزلك. قريباً للزبائن، الحلاقين المستقلين، والصالونات.",
      };
  }
  // unreachable but TS-safe
  return { title: tt.siteName, description: tt.tagline };
}
