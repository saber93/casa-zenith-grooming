# Casa — Premium Gents Grooming Website

A mobile-first, dark-themed marketing & booking site for the Casa salon brand. Charcoal base with warm ember accents, Instrument Serif headlines paired with Work Sans body for an editorial, high-end grooming lounge feel.

## Design direction

- **Palette**: `#1a1a1a` background, `#2d2d2d` surfaces, `#4a4a4a` borders/muted, `#e85d3a` ember accent for CTAs and highlights, off-white `#f5f1ec` text.
- **Typography**: Instrument Serif (large editorial headlines, italic flourishes) + Work Sans (UI, body, buttons). Generous tracking on small caps labels.
- **Feel**: Lots of negative space, thin hairline dividers, subtle grain on hero, large imagery, slow fade-in/slide-up on scroll, hover scale on cards, ember underline animation on links.
- **Buttons**: Solid ember primary, outlined ivory secondary, rounded-md, clear hover lift.
- **Imagery**: All images use `/placeholder.jpg` as requested.

## Pages & routes

```text
/                      Home
/services              Services grid
/services/$slug        Dynamic service detail
/products              Products grid
/reservation           Booking form
/app                   Casa Barber App teaser (also embedded section on home)
```

Each route gets its own SEO `head()` (title, description, og tags). Shared `Header` (logo + nav + Book CTA) and `Footer` (location, contact, socials) live in `__root.tsx`. Sticky floating WhatsApp button visible site-wide.

## Page contents

**1. Homepage (`/`)**
- Hero: full-viewport, dark image with ember overlay, headline "Premium Gents Grooming at Casa", subheadline, dual CTAs ("Book Appointment" → /reservation, "Explore Services" → /services).
- Featured Services: 4 highlighted cards linking to detail pages.
- Products preview: horizontal scroll / 3-column grid teaser → /products.
- Booking teaser: split section with calendar mockup + "Reserve in under a minute" CTA.
- Casa Barber App teaser: dark band, phone mockup, "Coming Soon" + link to /app.
- Testimonials: 3 quote cards with names and ratings.
- Location & contact: address, hours, embedded map placeholder, phone, email.
- Sticky WhatsApp FAB (bottom-right).

**2. Services (`/services`)**
Grid of 8 service cards (Classic Haircut, Beard Trim & Styling, Haircut + Beard Package, Facial Care, Hair Coloring, Groom Package, Kids Haircut, Home Barber Service). Each card: image, name, price, duration, short description, "Read More" → `/services/$slug`.

**3. Service Detail (`/services/$slug`)**
Single reusable template driven by a services data file. Hero image + title, full description, benefits list, what's included, duration, price, recommended add-ons (linked products), prominent "Book Now" CTA → /reservation with service preselected via search param.

**4. Products (`/products`)**
Ecommerce-style grid (Hair Wax, Beard Oil, Styling Cream, Shampoo, Face Wash, Aftershave). Each card: image, name, price, short description, "Order via WhatsApp" button (opens `wa.me` with prefilled message).

**5. Reservation (`/reservation`)**
Form with: service select, barber select (dummy: Karim, Yassine, Omar, Hicham), shadcn date picker, time slot grid, name, phone, notes textarea, "Confirm Booking". Client-side validation with react-hook-form + zod. On submit, shows a success toast + summary card. Structured so Supabase insert can be wired in later.

**6. Casa Barber App (`/app`)**
Hero "Casa Barber App — Coming Soon" with phone mockup. Three role cards: Customers (book home barber), Freelance Barbers (register, get clients), Salons (list branch, manage bookings). "Join Waiting List" form (email capture, success toast).

## Technical notes

- TanStack Start file-based routes in `src/routes/`; each new page declares its own `head()` meta.
- Services data lives in `src/data/services.ts` (typed array with slug, title, price, duration, description, benefits, included, addons, image). The detail route uses `Route.useParams()` + lookup; unknown slug → `notFound()`.
- Products in `src/data/products.ts` similarly.
- Reusable components in `src/components/`: `Header`, `Footer`, `WhatsAppFab`, `ServiceCard`, `ProductCard`, `SectionHeading`, `Testimonial`.
- Tailwind v4 theme tokens updated in `src/styles.css` (background, foreground, primary=ember, accent=ember, plus a `--color-ivory` for warm off-white). Fonts loaded via Google Fonts `<link>` in `__root.tsx` head.
- Animations via existing `tw-animate-css` + custom keyframes (fade-in, slide-up) and an IntersectionObserver hook for on-scroll reveals.
- WhatsApp number stored as a constant; all WhatsApp/phone CTAs reference it for easy update.
- Mobile-first layout, hamburger menu on small screens, generous tap targets.
- No backend wired in this pass — booking & waitlist are UI-complete and ready for Supabase later.
