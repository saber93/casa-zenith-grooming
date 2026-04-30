// Brand-wide constants for Casa Gents Salon, Ajman.
export const CASA = {
  name: "Casa",
  nameAr: "كازا",
  fullName: "Casa Gents Salon",
  fullNameAr: "صالون كازا للرجال",
  tagline: "Premium Gents Grooming",
  taglineAr: "صالون رجالي راقي",
  phone: "+971 50 000 0000",
  whatsapp: "971500000000", // digits only, used in wa.me links
  email: "hello@casa-grooming.ae",
  address: "Al Nuaimia, Ajman, United Arab Emirates",
  addressAr: "النعيمية، عجمان، الإمارات العربية المتحدة",
  hours: "Sat–Thu · 10:00–22:00",
  hoursAr: "السبت–الخميس · 10:00–22:00",
  hoursSchema: ["Mo-Th 10:00-22:00", "Sa-Su 10:00-22:00"],
  geo: { lat: 25.4052, lng: 55.5136 }, // approximate Ajman center; user can refine
  city: "Ajman",
  cityAr: "عجمان",
  region: "Ajman",
  country: "AE",
  postalCode: "",
  instagram: "https://instagram.com/casa.grooming",
};

export const waLink = (message: string) =>
  `https://wa.me/${CASA.whatsapp}?text=${encodeURIComponent(message)}`;
