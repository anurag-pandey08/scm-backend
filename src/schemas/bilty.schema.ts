import { z } from "zod";
import {
  BILTY_STATUSES,
  PAYMENT_TYPES,
  RISK_TYPES,
} from "../types/bilty.types.ts";

/**
 * The request shapes for the bilty endpoints.
 *
 * The rules are the printed L.R.'s. Most of the page can be blank — a clerk
 * books a lorry before the e-way bill exists and fills the number in later —
 * so very little is required, and what is required is what makes the document
 * mean anything: a number, a date, where it is going, and who it is for.
 *
 * Money and weights are plain numbers here and Decimals in the database. The
 * conversion is the service's, and the cap below is what the column can hold:
 * a figure past it would be silently rounded by Postgres, which on a freight
 * bill is the wrong way to fail.
 */

/** Decimal(14,2) — a hair under a thousand crore. */
const MAX_MONEY = 999_999_999_999.99;
/** Decimal(12,3) in kilograms. */
const MAX_WEIGHT = 999_999_999.999;

const money = (label: string) =>
  z
    .number()
    .nonnegative(`${label} cannot be negative`)
    .max(MAX_MONEY, `${label} is larger than the register can hold`);

const weight = z.number().nonnegative().max(MAX_WEIGHT);

const text = (max: number) => z.string().trim().max(max);

/** An ISO date as the form sends it, with "" meaning the box was left blank. */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "must be a real date");

const optionalIsoDate = isoDate.or(z.literal(""));

const partySchema = z.object({
  name: text(160),
  address: text(300),
  // Fifteen characters: two state digits, ten of PAN, then three more. Only
  // checked for length, because the office writes down what the party gave it
  // and a refused booking helps nobody.
  gstNo: text(15).toUpperCase(),
});

const chargesSchema = z.object({
  freight: money("Freight"),
  aoc: money("A.O.C."),
  hamali: money("Hamali"),
  stCharges: money("Station charges"),
  otherCharges: money("Other charges"),
  advance: money("Advance"),
});

const insuranceSchema = z.object({
  company: text(160),
  policyNo: text(60),
  date: optionalIsoDate,
  amount: money("Insured amount"),
});

export const biltySchema = z
  .object({
    // Digits as written on the book. Kept a string because that is what is
    // printed on it, and because a book that has ever used a suffix ("3010-A")
    // would otherwise have nowhere to put it.
    lrNo: z
      .string()
      .trim()
      .min(1, "L.R. number is required")
      .max(20)
      .regex(/^[A-Za-z0-9/-]+$/, "must be an L.R. number"),
    lrDate: isoDate,

    lorryNo: text(20).toUpperCase(),
    from: text(80).min(1, "Origin is required"),
    to: text(80).min(1, "Destination is required"),
    deliveryAt: text(300),
    bookingOffice: text(120),

    consignor: partySchema.extend({
      name: text(160).min(1, "Consignor is required"),
    }),
    consignee: partySchema.extend({
      name: text(160).min(1, "Consignee is required"),
    }),

    packages: z.number().int().nonnegative().max(1_000_000),
    contents: text(400),
    actualWeight: weight,
    chargedWeight: weight,
    declaredValue: money("Declared value"),
    rate: money("Rate"),

    charges: chargesSchema,

    paymentType: z.enum(PAYMENT_TYPES),
    status: z.enum(BILTY_STATUSES),
    risk: z.enum(RISK_TYPES),

    invoiceNo: text(60),
    eWayBillNo: text(20),

    insurance: insuranceSchema,
    remarks: text(1000),
  })
  .refine(
    (bilty) => {
      const { freight, aoc, hamali, stCharges, otherCharges, advance } =
        bilty.charges;
      return (
        advance <= freight + aoc + hamali + stCharges + otherCharges
      );
    },
    {
      message: "Advance cannot exceed the gross total",
      // Reported against the box the clerk would fix, not against the object.
      path: ["charges", "advance"],
    },
  );

export type BiltyInput = z.infer<typeof biltySchema>;

/**
 * The register's filters, read off the query string.
 *
 * They live in the URL rather than in the page's memory, so a filtered
 * register is a link — the clerk can send "everything still to collect on the
 * Delhi run" to the next desk, and it survives a reload.
 *
 * Everything is optional and everything has a default, because a bare
 * `/bilty` is the whole book, newest first.
 */
export const registerQuerySchema = z.object({
  /** Free text across the L.R. number, the parties, the lorry and the route. */
  q: z.string().trim().max(120).default(""),
  status: z.enum(BILTY_STATUSES).or(z.literal("all")).default("all"),
  payment: z.enum(PAYMENT_TYPES).or(z.literal("all")).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  // Capped so a hand-typed pageSize cannot ask the database for the whole book
  // at once; 25 is what fits a screen without scrolling the header away.
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type RegisterQuery = z.infer<typeof registerQuerySchema>;
