import { z } from "zod";

/**
 * The request body for editing a firm's letterhead.
 *
 * This is the whole editable half, not a patch of it: the settings screen
 * loads the letterhead into a form and saves the form back, so a partial body
 * would mean a field the office cleared is indistinguishable from one it never
 * sent. Every field is required; clearing one means sending it empty, and the
 * rules below decide which may be empty at all.
 *
 * Rules are the printed page's, not a database's. A firm with no PAN on its
 * letterhead has a blank there, and the app prints the blank — so `pan` is
 * optional in content but its shape is checked when something is typed.
 */

/** Required on the page: printing a bilty without one is a broken document. */
const required = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max);

/** Present on the page but allowed to be blank. */
const optional = (max = 200) => z.string().trim().max(max);

// A phone as the office writes it: ten digits, or with a country code and the
// spaces and dashes people actually type. Stored as typed — the letterhead
// prints what was written, not a normalised form.
const phone = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[+\d][\d\s-]*$/, "must be a phone number");

// PAN is ten characters, five letters, four digits, a letter. Checked only
// because a wrong one is printed on every bill and nobody reads it twice.
const pan = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}\d{4}[A-Z]$/, "must be a valid PAN, e.g. AQAPP2502L")
  .or(z.literal(""));

// IFSC is four letters, a zero, then six alphanumerics.
const ifsc = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "must be a valid IFSC, e.g. IDFB0040314")
  .or(z.literal(""));

const email = z.email("must be a valid email address").trim().toLowerCase().max(254);

export const letterheadSchema = z.object({
  name: required("Company name", 120),
  // Three or four letters on the roundel; more does not fit the masthead.
  monogram: required("Monogram", 5),
  tagline: required("Tagline", 120),
  lrTagline: required("L.R. tagline", 120),
  billTagline: required("Bill tagline", 120),
  address: required("Address", 400),
  officeLine: required("Office line", 120),

  emails: z.object({
    lr: email,
    bill: email,
  }),

  // At least one number: the consignee end rings the office off the L.R., and
  // a bilty with no number on it is not much of a bilty.
  phones: z
    .array(phone)
    .min(1, "at least one phone number is required")
    .max(5, "at most five fit on the letterhead"),

  pan,
  jurisdiction: optional(120),

  bank: z.object({
    name: optional(120),
    branch: optional(160),
    accountNo: optional(34).regex(/^[A-Za-z0-9]*$/, "must be an account number"),
    ifsc,
  }),

  origin: required("Origin station", 80),

  // The clerk picks a booking office off this list when writing an L.R., so an
  // empty list would leave the form with nothing to offer.
  bookingOffices: z
    .array(required("Booking office", 120))
    .min(1, "at least one booking office is required")
    .max(20),
});

export type LetterheadInput = z.infer<typeof letterheadSchema>;
