import { z } from "zod";
import { INVOICE_STATUSES, LINE_KINDS } from "../types/invoice.types.ts";

/**
 * The request shapes for the invoice endpoints.
 *
 * The rules are the printed bill book's. A bill means nothing without a
 * number, a date, a party to raise it on, somewhere it ran to and at least one
 * line in the charge column — and beyond those five, most of the page can be
 * left for later.
 *
 * Money and weights are plain numbers here and Decimals in the database. The
 * caps below are what the columns can hold: a figure past one would be
 * silently rounded by Postgres, which on a freight bill is the wrong way to
 * fail.
 */

/** Decimal(14,2) — a hair under a thousand crore. */
const MAX_MONEY = 999_999_999_999.99;
/** Decimal(12,2) — rupees per tonne. */
const MAX_RATE = 9_999_999_999.99;
/** Decimal(12,3) in tonnes. */
const MAX_WEIGHT = 999_999_999.999;

const text = (max: number) => z.string().trim().max(max);

/** An ISO date as the form sends it, with "" meaning the box was left blank. */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "must be a real date");

const optionalIsoDate = isoDate.or(z.literal(""));

/**
 * One row of the charge column.
 *
 * A charge line's challan, date, rate and weight are all blank on the paper,
 * but they are still sent — the form keeps one shape for both kinds and the
 * service blanks them on the way in, so a line that changes kind cannot leave
 * a stale lorry number behind it.
 */
const lineSchema = z.object({
  kind: z.enum(LINE_KINDS),
  challanNo: text(20),
  date: optionalIsoDate,
  particulars: text(160).min(1, "Every line needs a perticulars entry"),
  rate: z.number().nonnegative("Rate cannot be negative").max(MAX_RATE),
  weight: z.number().nonnegative("Weight cannot be negative").max(MAX_WEIGHT),
  amount: z
    .number()
    .nonnegative("Amount cannot be negative")
    .max(MAX_MONEY, "Larger than the bill book can hold"),
});

export const invoiceSchema = z
  .object({
    // Digits as written on the book, kept a string for the same reason the
    // L.R. number is: a book that has ever used a suffix would otherwise have
    // nowhere to put it.
    billNo: z
      .string()
      .trim()
      .min(1, "Bill number is required")
      .max(20)
      .regex(/^[A-Za-z0-9/-]+$/, "must be a bill number"),
    billDate: isoDate,

    party: z.object({
      name: text(160).min(1, "Party is required"),
      address: text(300),
      // Length only. The office writes down what the party gave it, and a
      // refused bill helps nobody.
      gstNo: text(15).toUpperCase(),
    }),

    from: text(120),
    to: text(120).min(1, "Destination is required"),

    partyInvoiceNo: text(60),

    // A bill with no lines is a blank sheet with a number on it. The cap is
    // not the book's rule but the request's: a bill runs to a page.
    lines: lineSchema.array().min(1, "A bill needs at least one line").max(100),

    status: z.enum(INVOICE_STATUSES),
    paidOn: optionalIsoDate,

    remarks: text(1000),
  })
  .refine((invoice) => invoice.status !== "Paid" || invoice.paidOn !== "", {
    message: "Record the date the party settled",
    // Reported against the box the clerk would fix, not against the object.
    path: ["paidOn"],
  });

export type InvoiceInput = z.infer<typeof invoiceSchema>;

/**
 * The bill book's filters, read off the query string.
 *
 * They live in the URL for the same reason the register's do: a filtered book
 * is a link, and it survives a reload. Everything is optional and everything
 * has a default, because a bare `/invoices` is the whole book, newest first.
 */
export const billBookQuerySchema = z.object({
  /** Free text across the bill number, the party, the route and the challans. */
  q: z.string().trim().max(120).default(""),
  status: z.enum(INVOICE_STATUSES).or(z.literal("all")).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type BillBookQuery = z.infer<typeof billBookQuerySchema>;
