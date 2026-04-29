export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: string;
  duration: string;
  benefits: string[];
  included: string[];
  addons: string[];
  image: string;
  featured?: boolean;
};

export const services: Service[] = [
  {
    slug: "classic-haircut",
    name: "Classic Haircut",
    shortDescription: "Precision cut tailored to your face shape and lifestyle.",
    description:
      "A signature Casa haircut performed by a senior stylist. Consultation, scissor and clipper work, hot towel finish, and a refined style — built around how you actually wear your hair.",
    price: "150 MAD",
    duration: "45 min",
    benefits: [
      "Tailored to face shape",
      "Long-lasting shape & line",
      "Senior stylist consultation",
    ],
    included: ["Consultation", "Wash & condition", "Precision cut", "Style & finish"],
    addons: ["Beard Trim & Styling", "Facial Care"],
    image: "/placeholder.jpg",
    featured: true,
  },
  {
    slug: "beard-trim-styling",
    name: "Beard Trim & Styling",
    shortDescription: "Sharp lines, soft skin, signature shape.",
    description:
      "Hot towel prep, precision line-up with straight razor, beard sculpting, and a finishing oil tailored to your beard type.",
    price: "100 MAD",
    duration: "30 min",
    benefits: ["Defined jawline", "Soft, conditioned beard", "Symmetrical shape"],
    included: ["Hot towel", "Straight razor line-up", "Beard shape", "Finishing oil"],
    addons: ["Classic Haircut", "Aftershave finish"],
    image: "/placeholder.jpg",
    featured: true,
  },
  {
    slug: "haircut-beard-package",
    name: "Haircut + Beard Package",
    shortDescription: "The full Casa look — head to chin.",
    description:
      "Our most-booked service. A full haircut paired with a precision beard trim, both finished with hot towel and styling products.",
    price: "220 MAD",
    duration: "1h 15min",
    benefits: ["Cohesive overall look", "Save vs. à la carte", "One single appointment"],
    included: ["Consultation", "Haircut", "Beard trim & line-up", "Style & finish"],
    addons: ["Facial Care", "Hair Coloring touch-up"],
    image: "/placeholder.jpg",
    featured: true,
  },
  {
    slug: "facial-care",
    name: "Facial Care",
    shortDescription: "Deep cleanse, exfoliation, and a calmer complexion.",
    description:
      "A men's facial built around deep cleansing, gentle exfoliation, steam, extraction where needed, and a calming finishing balm.",
    price: "180 MAD",
    duration: "45 min",
    benefits: ["Clearer skin", "Reduced shine", "Calmer complexion"],
    included: ["Cleanse", "Exfoliate", "Steam", "Mask", "Finishing balm"],
    addons: ["Beard Trim & Styling"],
    image: "/placeholder.jpg",
  },
  {
    slug: "hair-coloring",
    name: "Hair Coloring",
    shortDescription: "Subtle grey blending or full color, done right.",
    description:
      "From discreet grey blending to a full-color refresh. We use ammonia-low, scalp-friendly formulas tailored to your tone.",
    price: "from 250 MAD",
    duration: "1h",
    benefits: ["Natural-looking result", "Grey coverage", "Scalp-friendly formula"],
    included: ["Color consultation", "Application", "Wash & condition", "Style"],
    addons: ["Classic Haircut"],
    image: "/placeholder.jpg",
  },
  {
    slug: "groom-package",
    name: "Groom Package",
    shortDescription: "The full ceremony — for the day that matters.",
    description:
      "A complete grooming experience for grooms and special occasions: haircut, beard sculpt, facial, and a finishing styling session.",
    price: "450 MAD",
    duration: "2h",
    benefits: ["Camera-ready finish", "All-in-one experience", "Private chair"],
    included: ["Haircut", "Beard sculpt", "Facial", "Hand & nail care", "Styling"],
    addons: ["Home barber on the day"],
    image: "/placeholder.jpg",
    featured: true,
  },
  {
    slug: "kids-haircut",
    name: "Kids Haircut",
    shortDescription: "Calm, careful, and quick — for ages 4–12.",
    description:
      "A focused haircut for kids in a relaxed setting. Patient stylists, modern cuts, and a small treat at the end.",
    price: "80 MAD",
    duration: "30 min",
    benefits: ["Patient, kid-friendly stylists", "Modern shapes", "Quick & easy"],
    included: ["Consultation", "Haircut", "Style"],
    addons: [],
    image: "/placeholder.jpg",
  },
  {
    slug: "home-barber-service",
    name: "Home Barber Service",
    shortDescription: "Casa-quality grooming, in your living room.",
    description:
      "We bring the chair to you. A Casa-trained barber arrives with sterilized tools and full setup for a private, premium service at home.",
    price: "from 300 MAD",
    duration: "1h",
    benefits: ["Total privacy", "Zero travel", "Same Casa standards"],
    included: ["Travel within city", "Setup & sterilization", "Haircut or beard service"],
    addons: ["Group bookings", "Event styling"],
    image: "/placeholder.jpg",
  },
];

export const getService = (slug: string) =>
  services.find((s) => s.slug === slug);
