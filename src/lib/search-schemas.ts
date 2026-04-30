import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

// Shared search schema for /reservation and /ar/reservation.
export const reservationSearchSchema = z.object({
  service: fallback(z.string(), "").default(""),
});
export const reservationSearchValidator = zodValidator(reservationSearchSchema);

// /login redirect target
export const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});
export const loginSearchValidator = zodValidator(loginSearchSchema);
