import type { Prisma } from "../generated/prisma/client.ts";
import type { InvoiceStatus as DbInvoiceStatus } from "../generated/prisma/enums.ts";
import type { Party } from "./bilty.types.ts";

/**
 * The shapes a freight bill travels in.
 *
 * The same split as the L.R.'s: the database keeps the party as flat columns,
 * and the API nests it, because "M/s" is a block on the printed bill with a
 * name, an address and a GST number in it.
 *
 * The charge lines are the one place the two agree. They are a table in
 * Postgres and a list in the API, because a bill's lines are a list of unknown
 * length in both — unlike the L.R.'s charge block, which is a fixed set of
 * named boxes and is therefore flattened.
 *
 * `src/services/invoice.service.ts` owns the translation.
 */

export const INVOICE_STATUSES = [
  "Draft",
  "Raised",
  "Paid",
  "Cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/**
 * A Freight line bills a challan at a rate per tonne. A Charge line is a lump
 * sum with no challan behind it — detention, halting, extra loading — and is
 * written straight into the amount column, exactly as on the paper bill.
 */
export const LINE_KINDS = ["Freight", "Charge"] as const;
export type LineKind = (typeof LINE_KINDS)[number];

/** One row of the printed charge column, as the API reports it. */
export interface InvoiceLine {
  id: string;
  kind: LineKind;
  /** Challan No. — the L.R. this line bills. Blank on a charge line. */
  challanNo: string;
  /** ISO yyyy-mm-dd, or "" on a charge line. */
  date: string;
  /** Perticulars — the lorry on a freight line, the charge's name otherwise. */
  particulars: string;
  /** Rupees per tonne. */
  rate: number;
  /** Tonnes. */
  weight: number;
  /** The Rs. column. */
  amount: number;
}

/** A bill as the API reports it — the printed bill, field for field. */
export interface Invoice {
  id: string;
  /** Bill No. — the number printed on the book. */
  billNo: string;
  /** ISO yyyy-mm-dd */
  billDate: string;
  /** M/s — the party the bill is raised on. */
  party: Party;
  from: string;
  to: string;
  /** The party's own invoice number for the goods. */
  partyInvoiceNo: string;
  lines: InvoiceLine[];
  status: InvoiceStatus;
  /** ISO yyyy-mm-dd, or "" until the party has settled. */
  paidOn: string;
  remarks: string;
}

/**
 * Every column of a bill except the ones the database fills in itself, and
 * except the lines — those are written as their own rows, so the repository
 * takes them separately.
 *
 * Taken from Prisma's *input* type rather than its model, for the reason given
 * in bilty.types.ts: a Decimal column reads back as a Decimal but is written
 * with a plain number.
 */
export type InvoiceColumns = Omit<
  Prisma.InvoiceUncheckedCreateInput,
  "id" | "companyId" | "createdAt" | "updatedAt" | "lines"
>;

/** One line's columns. `position` is set by the service, from the list order. */
export type InvoiceLineColumns = Omit<
  Prisma.InvoiceLineUncheckedCreateInput,
  "id" | "invoiceId"
>;

/**
 * The bill book's filters, in the words the database uses.
 *
 * The query string carries the printed words ("Cancelled"); the column holds
 * an identifier (CANCELLED). The service translates, so what reaches the
 * repository is already in the database's own vocabulary.
 */
export interface BillBookFilter {
  /** Free text across the bill number, the party, the route and the challans. */
  q: string;
  status: DbInvoiceStatus | "all";
  page: number;
  pageSize: number;
}

/**
 * What a page of the bill book comes to.
 *
 * Of the whole filtered set, not of the rows on screen — a clerk filtering to
 * one party's raised bills wants what that party owes altogether.
 *
 * Cancelled bills are in neither figure. A withdrawn bill was never money, and
 * the numbering keeps it only so the book reads unbroken.
 */
export interface BillBookTotals {
  /** Every line of every bill still standing, added up. */
  billed: number;
  /** What is still to come in — the raised bills, and only those. */
  outstanding: number;
}

export interface InvoicePage {
  invoices: Invoice[];
  meta: {
    page: number;
    pageSize: number;
    /** Bills matching the filters, across every page. */
    total: number;
    totalPages: number;
    /** Bills in the firm's whole book — the "of 13" in "4 of 13 bills". */
    bookTotal: number;
    totals: BillBookTotals;
  };
}
