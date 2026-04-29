// Brand-wide constants for Casa.
export const CASA = {
  name: "Casa",
  tagline: "Premium Gents Grooming",
  phone: "+212 600 000 000",
  whatsapp: "212600000000", // digits only, used in wa.me links
  email: "hello@casa-grooming.com",
  address: "12 Rue des Oliviers, Casablanca, Morocco",
  hours: "Mon–Sat · 10:00–21:00",
  instagram: "https://instagram.com",
};

export const waLink = (message: string) =>
  `https://wa.me/${CASA.whatsapp}?text=${encodeURIComponent(message)}`;
