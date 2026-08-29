import type { CompanySeed } from "../types/company.types.ts";

/**
 * The letterheads as transcribed off each firm's own book.
 *
 * The database row is what the app actually prints; this file is the paper it
 * started from. It is kept for exactly two jobs — seeding a fresh database,
 * and putting a firm back to its printed details after someone has edited them
 * — so it must stay faithful to the book rather than tracking whatever the
 * office has since typed in.
 *
 * Mirrors src/lib/companies.ts in scm-frontend, which keeps the same
 * transcription so the app can render a letterhead before the API answers.
 */

/** The firms the office keeps books for, in sidebar order. */
export const COMPANY_SLUGS = [
  "sewak-cargo-movers",
  "sewak-union-roadways",
] as const;

export type CompanySlug = (typeof COMPANY_SLUGS)[number];

export function isCompanySlug(value: string): value is CompanySlug {
  return (COMPANY_SLUGS as readonly string[]).includes(value);
}

export const COMPANY_SEEDS: Record<CompanySlug, CompanySeed> = {
  "sewak-cargo-movers": {
    slug: "sewak-cargo-movers",
    name: "Sewak Cargo Movers",
    monogram: "SCM",
    tagline: "Transport Contractors & Fleet Owner",
    lrTagline: "Transport Contractors & Fleet Owner",
    billTagline: "Transport Contractors and Fleetowner",
    address:
      "40, Sarthi Complex, First Floor, Nr. Bileshwar Complex, Opp. G.V.M.M., Odhav, Ahmedabad-382415",
    officeLine: "Odhav, Ahmedabad-382415",
    emailLr: "sewakcargomovers@gmail.com",
    // The bill book carries the older union roadways address. Worth checking
    // with the client whether the bill book belongs to this firm at all now
    // that the two are kept apart.
    emailBill: "sewakunionroadways@gmail.com",
    phones: ["9376150604", "9376050604", "8460050604"],
    pan: "AQAPP2502L",
    jurisdiction: "Subject to Ahmedabad Jurisdiction",
    bankName: "IDFC First Bank",
    bankBranch: "Naroda, Ahmedabad-382330",
    bankAccountNo: "10190035994",
    bankIfsc: "IDFB0040314",
    origin: "Ahmedabad",
    bookingOffices: [
      "Odhav, Ahmedabad",
      "Naroda, Ahmedabad",
      "Rakhial, Ahmedabad",
    ],
    accentClass: "bg-chart-1",
    detailsConfirmed: true,
    // The book in use runs from 3010; the floor is where its numbering starts.
    lrFloor: 3000,
  },

  // Letterhead taken off this firm's own L.R. book: the same Odhav premises as
  // Sewak Cargo Movers, but its own PAN, its own two numbers and its own bank.
  "sewak-union-roadways": {
    slug: "sewak-union-roadways",
    name: "Sewak Union Roadways",
    monogram: "SUR",
    tagline: "Transport Contractors & Fleet Owner",
    lrTagline: "Transport Contractors & Fleet Owner",
    billTagline: "Transport Contractors and Fleetowner",
    address:
      "40, Sarthi Complex, First Floor, Nr. Bileshwar Complex, Opp. G.V.M.M., Odhav, Ahmedabad-382415",
    officeLine: "Odhav, Ahmedabad-382415",
    emailLr: "sewakunionroadways@gmail.com",
    emailBill: "sewakunionroadways@gmail.com",
    // Two numbers on this book, not the three Sewak Cargo Movers prints.
    phones: ["9376150604", "9376050604"],
    pan: "BDSPP5578G",
    jurisdiction: "Subject to Ahmedabad Jurisdiction",
    bankName: "ICICI Bank",
    bankBranch: "Vastral Metro Branch, Ahmedabad",
    bankAccountNo: "720505000304",
    bankIfsc: "ICIC0007205",
    origin: "Ahmedabad",
    // The L.R. leaves "Booking Office" blank for the clerk to write in, so the
    // book names no branches — these stay the same premises as the other firm.
    bookingOffices: [
      "Odhav, Ahmedabad",
      "Naroda, Ahmedabad",
      "Rakhial, Ahmedabad",
    ],
    accentClass: "bg-chart-2",
    detailsConfirmed: true,
    // A separate book, numbering in its own range — the two never collide.
    lrFloor: 7400,
  },
};

export const COMPANY_SEED_LIST: CompanySeed[] = COMPANY_SLUGS.map(
  (slug) => COMPANY_SEEDS[slug],
);
