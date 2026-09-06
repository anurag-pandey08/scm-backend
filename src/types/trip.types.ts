import type { Prisma } from "../generated/prisma/client.ts";

/**
 * The shapes a trip travels in.
 *
 * Flat both sides, and nothing nested: the ledger is a spread of twenty-two
 * columns read left to right, and the screens render it as one. There is no
 * block on the paper to group anything into.
 *
 * The one thing worth saying twice is what is *not* here — a company. The
 * daybook is worked by both firms and both see the same rows, so nothing in
 * this file, the repository, the service or the routes takes a slug. See the
 * note on `Trip` in prisma/schema.prisma.
 *
 * `src/services/trip.service.ts` owns the Decimal ↔ number and Date ↔ ISO-day
 * translation.
 */

/**
 * What the register can be narrowed to.
 *
 * Not a status — a trip has none. These are the two questions the daybook is
 * actually opened to answer: who still owes us, and who are we still to pay.
 */
export const TRIP_FILTERS = ["all", "party-owes", "lorry-owed"] as const;
export type TripFilter = (typeof TRIP_FILTERS)[number];

/**
 * A trip as the API reports it.
 *
 * The money columns split into two blocks on the paper, and they run in
 * opposite directions:
 *
 *   - `advance`, `balance` and `toPay` are what the office owes the lorry.
 *   - `partyPayment` and the two `…Receive` columns are what the party owes
 *     the office, and what has come in against it.
 *
 * `commission` is what the office keeps out of the middle.
 */
export interface Trip {
  id: string;
  /** ISO yyyy-mm-dd */
  date: string;
  truckNo: string;
  partyName: string;
  /** Blank on a trip the office placed itself, without a broker in the middle. */
  brokerName: string;
  from: string;
  to: string;
  goods: string;
  /** Rupees per tonne. */
  rate: number;
  /** Tonnes. */
  weight: number;
  /** Handed to the driver at the loading point. */
  advance: number;
  /** Left to pay the lorry once it has run. */
  balance: number;
  /** Freight to be collected at the delivery end rather than booked here. */
  toPay: number;
  /** ISO yyyy-mm-dd, or "" until it has happened. */
  receiveDate: string;
  paidDate: string;
  /** L.R. No. — the bilty raised for the trip, where one was. */
  lrNo: string;
  /** What the office keeps on the trip. */
  commission: number;
  remarks: string;
  /** What the party is to pay the office for the trip. */
  partyPayment: number;
  /** Come in from the party against the advance, and the day it came. */
  advanceReceiveRs: number;
  advanceDate: string;
  /** …and the same against the balance. */
  balanceReceiveRs: number;
  balanceDate: string;
}

/**
 * Every column of a trip except the ones the database fills in itself.
 *
 * Taken from Prisma's *input* type rather than its model, for the reason given
 * in bilty.types.ts: a Decimal column reads back as a Decimal but is written
 * with a plain number.
 */
export type TripColumns = Omit<
  Prisma.TripUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt"
>;

/** The daybook's filters, as the repository takes them. */
export interface RegisterFilter {
  /** Free text across the lorry, the parties, the route, the goods and the L.R. */
  q: string;
  filter: TripFilter;
  page: number;
  pageSize: number;
}

/**
 * What a page of the daybook comes to.
 *
 * Of the whole filtered set, not of the rows on screen. Every one of these is
 * an expression rather than a column — the hire is rate × weight, what is due
 * from a party is its bill less the two receipts, and what is due to a lorry
 * counts only the trips nobody has been paid for yet. None of them is stored,
 * because all of them can be read off the row and a stored copy is only a
 * chance to disagree with it.
 */
export interface RegisterTotals {
  /** Rate × weight across the filtered rows — the hire the money is drawn on. */
  freight: number;
  /** What the office kept. */
  commission: number;
  /** What the parties have actually paid in, across both receipts. */
  received: number;
  /** Still to come in. Overpayments are floored at zero rather than netted off
   *  against another party's debt. */
  dueFromParty: number;
  /** Still to go out, on the trips with no paid date against them. */
  dueToLorry: number;
}

export interface TripPage {
  trips: Trip[];
  meta: {
    page: number;
    pageSize: number;
    /** Rows matching the filters, across every page. */
    total: number;
    totalPages: number;
    /** Rows in the whole daybook — the "of 15" in "4 of 15 rows". */
    bookTotal: number;
    totals: RegisterTotals;
  };
}
