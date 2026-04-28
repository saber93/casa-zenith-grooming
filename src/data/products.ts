export type Product = {
  slug: string;
  name: string;
  price: string;
  description: string;
  image: string;
  category: string;
};

export const products: Product[] = [
  {
    slug: "hair-wax",
    name: "Matte Hair Wax",
    price: "120 MAD",
    description: "Strong hold, matte finish. Reworkable all day.",
    image: "/placeholder.jpg",
    category: "Hair",
  },
  {
    slug: "beard-oil",
    name: "Casa Beard Oil",
    price: "140 MAD",
    description: "Argan & jojoba blend that softens and conditions.",
    image: "/placeholder.jpg",
    category: "Beard",
  },
  {
    slug: "styling-cream",
    name: "Styling Cream",
    price: "130 MAD",
    description: "Medium hold, natural finish for everyday styling.",
    image: "/placeholder.jpg",
    category: "Hair",
  },
  {
    slug: "shampoo",
    name: "Daily Shampoo",
    price: "110 MAD",
    description: "Gentle daily cleanser, sulfate-free.",
    image: "/placeholder.jpg",
    category: "Hair",
  },
  {
    slug: "face-wash",
    name: "Charcoal Face Wash",
    price: "120 MAD",
    description: "Detoxifies, balances oil, leaves skin matte.",
    image: "/placeholder.jpg",
    category: "Skin",
  },
  {
    slug: "aftershave",
    name: "Cooling Aftershave",
    price: "150 MAD",
    description: "Calms irritation, restores comfort post-shave.",
    image: "/placeholder.jpg",
    category: "Skin",
  },
];
