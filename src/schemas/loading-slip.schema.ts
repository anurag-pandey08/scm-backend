import { z } from "zod";
import { LOADING_SLIP_STATUSES } from "../types/loading-slip.types.ts";

/**
 * The request shapes for the loading-slip endpoints.
 *
 * The rules are the printed slip book's. A slip means nothing without a
 * number, a date, whose order the lorry is against, which lorry it is, where
 * it is going and what was agreed for it — and beyond those six the page can
 * be left as the paper often leaves it: no rate where the trip went on a lump
 * sum, no bed where nobody wrote one down.
 *
 * Money and weights are plain numbers here and Decimals in the database. The
 * caps below are what the columns can hold: a figure past one would be
 * silently rounded by Postgres, which on a lorry hire is the wrong way to
 * fail.
 */

/** Decimal(14,2) — a hair under a thousand crore. */
const MAX_MONEY = 999_999_999_999.99;
/** Decimal(12,2) — rupees per tonne, and the two smaller rupee columns. */
const MAX_RATE = 9_999_999_999.99;
/** Decimal(12,3) in tonnes. */
const MAX_WEIGHT = 999_999_999.999;
/** Decimal(8,2) in feet. A lorry bed is not a thousand feet long. */
const MAX_FEET = 999_999.99;

const text = (max: number) => z.string().trim().max(max);

const rupees = (label: string, max: number) =>
  z
    .number()
    .nonnegative(`${label} cannot be negative`)
    .max(max, `${label} is larger than the slip book can hold`);

const feet = z.number().nonnegative("Cannot be negative").max(MAX_FEET);

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "must be a real date");

export const loadingSlipSchema = z
  .object({
    // Digits as written on the book, kept a string for the same reason the
    // L.R. number is: a book that has ever used a suffix would otherwise have
    // nowhere to put it.
    slipNo: z
      .string()
      .trim()
      .min(1, "Slip number is required")
      .max(20)
      .regex(/^[A-Za-z0-9/-]+$/, "must be a slip number"),
    slipDate: isoDate,

    party: text(200).min(1, "Whose order the lorry is against"),

    vehicleNo: text(20).min(1, "Lorry number is required").toUpperCase(),
    from: text(120),
    to: text(120).min(1, "Destination is required"),

    // Left at zero on a lump-sum trip, exactly as on the paper — so neither of
    // these is required and neither is checked against the hire. Rate × weight
    // is what the office quoted, not what it agreed.
    rate: rupees("Rate", MAX_RATE),
    weight: z.number().nonnegative("Weight cannot be negative").max(MAX_WEIGHT),

    totalFreight: rupees("Agreed hire", MAX_MONEY).refine(
      (value) => value > 0,
      "Agreed hire is required",
    ),
    advance: rupees("Advance", MAX_RATE),
    detention: rupees("Detention", MAX_RATE),

    dimensions: z.object({
      length: feet,
      width: feet,
      height: feet,
    }),

    status: z.enum(LOADING_SLIP_STATUSES),

    remarks: text(1000),
  })
  .refine((slip) => slip.advance <= slip.totalFreight + slip.detention, {
    message: "Advance is more than the whole hire",
    // Reported against the box the clerk would fix, not against the object.
    path: ["advance"],
  });

export type LoadingSlipInput = z.infer<typeof loadingSlipSchema>;

/**
 * The slip book's filters, read off the query string.
 *
 * They live in the URL for the same reason the register's do: a filtered book
 * is a link, and it survives a reload. Everything is optional and everything
 * has a default, because a bare `/loading-slips` is the whole book, newest
 * first.
 */
export const slipBookQuerySchema = z.object({
  /** Free text across the slip number, the party, the lorry and the route. */
  q: z.string().trim().max(120).default(""),
  status: z.enum(LOADING_SLIP_STATUSES).or(z.literal("all")).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type SlipBookQuery = z.infer<typeof slipBookQuerySchema>;
