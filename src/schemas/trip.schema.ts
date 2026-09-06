import { z } from "zod";
import { TRIP_FILTERS } from "../types/trip.types.ts";

/**
 * The request shapes for the trip endpoints.
 *
 * The rules are the ledger's, and the ledger is forgiving: a row is entered
 * when the lorry leaves and the money columns are filled in over the following
 * fortnight, so almost everything can be blank. What is required is what
 * identifies the trip — the day, the lorry, the party and where it went.
 *
 * Money and weights are plain numbers here and Decimals in the database. The
 * caps below are what the columns can hold: a figure past one would be
 * silently rounded by Postgres, which in a money ledger is the wrong way to
 * fail.
 */

/** Decimal(14,2) — a hair under a thousand crore. */
const MAX_MONEY = 999_999_999_999.99;
/** Decimal(12,2) — every other rupee column. */
const MAX_RUPEES = 9_999_999_999.99;
/** Decimal(12,3) in tonnes. */
const MAX_WEIGHT = 999_999_999.999;

const text = (max: number) => z.string().trim().max(max);

const rupees = (label: string, max: number = MAX_RUPEES) =>
  z
    .number()
    .nonnegative(`${label} cannot be negative`)
    .max(max, `${label} is larger than the register can hold`);

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "must be a real date");

/** A day the ledger has not reached yet is written as an empty box. */
const optionalIsoDate = isoDate.or(z.literal(""));

export const tripSchema = z
  .object({
    date: isoDate,

    truckNo: text(20).min(1, "Truck number is required").toUpperCase(),
    partyName: text(200).min(1, "Party is required"),
    brokerName: text(200),
    from: text(120),
    to: text(120).min(1, "Destination is required"),
    goods: text(300),

    rate: rupees("Rate"),
    weight: z.number().nonnegative("Weight cannot be negative").max(MAX_WEIGHT),

    advance: rupees("Advance"),
    balance: rupees("Balance"),
    toPay: rupees("To Pay"),

    receiveDate: optionalIsoDate,
    paidDate: optionalIsoDate,

    lrNo: text(20),

    commission: rupees("Commission"),
    remarks: text(1000),

    partyPayment: rupees("Party payment", MAX_MONEY),
    advanceReceiveRs: rupees("Advance received"),
    advanceDate: optionalIsoDate,
    balanceReceiveRs: rupees("Balance received"),
    balanceDate: optionalIsoDate,
  })
  .refine(
    // Only checked where a hire was quoted at all. A trip entered before the
    // rate is agreed has rate × weight of zero, and an advance against it is
    // not an overpayment — it is a row that is not finished yet.
    (trip) => {
      const freight = Math.round(trip.rate * trip.weight);
      return freight === 0 || trip.advance <= freight;
    },
    {
      message: "Advance is more than the whole hire",
      // Reported against the box the clerk would fix, not against the object.
      path: ["advance"],
    },
  );

export type TripInput = z.infer<typeof tripSchema>;

/**
 * The daybook's filters, read off the query string.
 *
 * They live in the URL for the same reason every other register's do: a
 * filtered book is a link, and it survives a reload. Everything is optional
 * and everything has a default, because a bare `/trips` is the whole daybook,
 * newest first.
 */
export const registerQuerySchema = z.object({
  /** Free text across the lorry, the parties, the route, the goods and the L.R. */
  q: z.string().trim().max(120).default(""),
  filter: z.enum(TRIP_FILTERS).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type RegisterQuery = z.infer<typeof registerQuerySchema>;
