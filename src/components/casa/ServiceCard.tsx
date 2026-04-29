import { Link } from "@tanstack/react-router";
import type { Service } from "@/data/services";
import { Clock } from "lucide-react";
import placeholder from "/placeholder.jpg?url";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      to="/services/$slug"
      params={{ slug: service.slug }}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/60 hover:shadow-elegant"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={placeholder}
          alt={service.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {service.duration}</span>
          <span className="text-primary">{service.price}</span>
        </div>
        <h3 className="mt-3 font-serif text-2xl text-foreground">{service.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{service.shortDescription}</p>
        <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
          Read more
          <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}
