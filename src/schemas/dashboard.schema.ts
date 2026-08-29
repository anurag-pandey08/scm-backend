import { z } from "zod";

/**
 * The dashboard's one question: how far back.
 *
 * Thirty days is what the screen asks for and what the header prints, but the
 * window is a parameter rather than a constant because the figures are only
 * ever read against a period — "booked", "still to collect" and "on the road"
 * all mean nothing without one. Capped at a year, which is as far back as the
 * freight trend goes anyway.
 */
export const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
