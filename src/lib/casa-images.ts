const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const SALON_VISIT_IMAGE = unsplash("photo-1585747860715-2ba37e788b70");

const SERVICE_IMAGE_BY_SLUG: Record<string, string> = {
  "classic-haircut": unsplash("photo-1621605815971-fbc98d665033"),
  "beard-trim-styling": unsplash("photo-1599351431202-1e0f0137899a"),
  "haircut-beard-package": unsplash("photo-1585747860715-2ba37e788b70"),
  "facial-care": unsplash("photo-1570172619644-dfd03ed5d881"),
  "hair-coloring": unsplash("photo-1621605815971-fbc98d665033"),
  "groom-package": unsplash("photo-1585747860715-2ba37e788b70"),
  "kids-haircut": unsplash("photo-1621605815971-fbc98d665033"),
  "home-barber-service": unsplash("photo-1585747860715-2ba37e788b70"),
};

const PRODUCT_IMAGE_BY_SLUG: Record<string, string> = {
  "beard-oil": unsplash("photo-1620916566398-39f1143ab7be"),
  "hair-pomade": unsplash("photo-1556228720-195a672e8a03"),
  shampoo: unsplash("photo-1620916566398-39f1143ab7be"),
  "face-wash": unsplash("photo-1570172619644-dfd03ed5d881"),
  aftershave: unsplash("photo-1556228720-195a672e8a03"),
  cologne: unsplash("photo-1620916566398-39f1143ab7be"),
};

export function serviceFallbackImage(slug: string) {
  return SERVICE_IMAGE_BY_SLUG[slug] ?? SALON_VISIT_IMAGE;
}

export function productFallbackImage(slug: string) {
  return PRODUCT_IMAGE_BY_SLUG[slug] ?? PRODUCT_IMAGE_BY_SLUG["beard-oil"];
}
