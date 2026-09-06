import type { Prisma } from "../generated/prisma/client.ts";
import type { LoadingSlipStatus as DbLoadingSlipStatus } from "../generated/prisma/enums.ts";

/**
 * The shapes a loading slip travels in.
 *
 * Only one group is nested on the way out: the bed the order asked for, which
 * is three columns in Postgres and one box on the paper — "32.00 X 8.00 X
 * 7.00" under the heading "Length". The screens render it as a group, so they
 * are handed a group.
 *
 * Everything else stays flat both sides, because a slip is flat: one lorry,
 * one route, one agreed hire. There is no party block here as there is on the
 * L.R., because the paper carries a single line for it.
 *
 * `src/services/loading-slip.service.ts` owns the translation.
 */

export const LOADING_SLIP_STATUSES = [
  "Draft",
  "Issued",
  "Loaded",
  "Cancelled",
] as const;
export type LoadingSlipStatus = (typeof LOADING_SLIP_STATUSES)[number];

/** Feet. The bed the party asked for, printed L X W X H on the slip. */
export interface SlipDimensions {
  length: number;
  width: number;
  height: number;
}

/** A slip as the API reports it — the printed slip, field for field. */
export interface LoadingSlip {
  id: string;
  /** No. — the number printed on the slip book. */
  slipNo: string;
  /** ISO yyyy-mm-dd */
  slipDate: string;
  /** To M/s. — whoever ordered the lorry. */
  party: string;
  vehicleNo: string;
  from: string;
  to: string;
  /** Rupees per tonne, where the trip was quoted by weight rather than lump sum. */
  rate: number;
  /** Tonnes. */
  weight: number;
  /** Lorry hire agreed for the trip, the figure the slip is really about. */
  totalFreight: number;
  /** Handed to the driver at the loading point. */
  advance: number;
  /** Detention allowed at the loading point, in rupees. */
  detention: number;
  dimensions: SlipDimensions;
  status: LoadingSlipStatus;
  remarks: string;
}

/**
 * Every column of a slip except the ones the database fills in itself.
 *
 * Taken from Prisma's *input* type rather than its model, for the reason given
 * in bilty.types.ts: a Decimal column reads back as a Decimal but is written
 * with a plain number.
 */
export type LoadingSlipColumns = Omit<
  Prisma.LoadingSlipUncheckedCreateInput,
  "id" | "companyId" | "createdAt" | "updatedAt"
>;

/**
 * The slip book's filters, in the words the database uses.
 *
 * The query string carries the printed words ("Cancelled"); the column holds
 * an identifier (CANCELLED). The service translates, so what reaches the
 * repository is already in the database's own vocabulary.
 */
export interface SlipBookFilter {
  /** Free text across the slip number, the party, the lorry and the route. */
  q: string;
  status: DbLoadingSlipStatus | "all";
  page: number;
  pageSize: number;
}

/**
 * What a page of the slip book comes to.
 *
 * Of the whole filtered set, not of the rows on screen — a clerk filtering to
 * one party's slips wants what is owed on all of them.
 *
 * Cancelled slips are in none of the three figures. A lorry that never loaded
 * was never hired; the numbering keeps the slip only so the book reads
 * unbroken.
 */
export interface SlipBookTotals {
  /** The agreed hire on every slip still standing. */
  hire: number;
  /** What has already gone to the drivers. */
  advance: number;
  /** What is left to pay the lorries — hire plus detention, less the advance. */
  balance: number;
}

export interface LoadingSlipPage {
  slips: LoadingSlip[];
  meta: {
    page: number;
    pageSize: number;
    /** Slips matching the filters, across every page. */
    total: number;
    totalPages: number;
    /** Slips in the firm's whole book — the "of 8" in "3 of 8 slips". */
    bookTotal: number;
    totals: SlipBookTotals;
  };
}
