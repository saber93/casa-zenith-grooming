import { Link } from "@tanstack/react-router";
import { CASA } from "@/lib/casa";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <div className="font-serif text-3xl">{CASA.name}</div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A premium grooming lounge for the modern gentleman. Haircuts, beard care,
            skin, and home barber service — all in one place.
          </p>
        </div>

        <div>
          <div className="label-eyebrow mb-4">Visit</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> {CASA.address}</li>
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-primary" /> {CASA.phone}</li>
            <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-primary" /> {CASA.email}</li>
          </ul>
        </div>

        <div>
          <div className="label-eyebrow mb-4">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/services" className="text-muted-foreground hover:text-foreground">Services</Link></li>
            <li><Link to="/products" className="text-muted-foreground hover:text-foreground">Products</Link></li>
            <li><Link to="/reservation" className="text-muted-foreground hover:text-foreground">Reservation</Link></li>
            <li><Link to="/app" className="text-muted-foreground hover:text-foreground">Casa Barber App</Link></li>
          </ul>
          <a
            href={CASA.instagram}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Instagram className="h-4 w-4" /> @casa
          </a>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-muted-foreground md:flex-row md:px-8">
          <span>© {new Date().getFullYear()} {CASA.name}. All rights reserved.</span>
          <span>{CASA.hours}</span>
        </div>
      </div>
    </footer>
  );
}
