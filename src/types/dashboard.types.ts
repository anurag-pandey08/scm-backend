import type { Bilty, PaymentType } from "./bilty.types.ts";

/**
 * What the dashboard reports.
 *
 * Every figure here is one firm's, taken from that firm's book — the same rule
 * the register is built on. Nothing sums the two firms, because there is no
 * question the office asks that both books answer at once.
 *
 * The shapes are figures, not sentences: `lrFrom`/`lrTo` rather than
 * "LR 3010–3038", `month` rather than "Aug 2026". The screen writes the
 * sentence, in the reader's own locale — which is also why the month labels
 * are not built here.
 */

/**
 * The days the figures cover, as the API worked them out.
 *
 * Reported rather than assumed, because the header prints it: a dashboard that
 * says "last 30 days" without saying which thirty is a figure with no date on
 * it.
 */
export interface DashboardWindow {
  days: number;
  /** ISO yyyy-mm-dd, inclusive. */
  start: string;
  /** ISO yyyy-mm-dd — today, in the office's own day. */
  end: string;
}

/**
 * The four tiles across the top.
 *
 * Cancelled L.R.s are counted and then left out of every rupee figure. They
 * stay in the count and in the number range so the book reads unbroken; they
 * were never money.
 */
export interface Kpis {
  biltiesBooked: number;
  cancelled: number;
  /** Lowest and highest number written in the window, "" on an empty one. */
  lrFrom: string;
  lrTo: string;
  /** Gross of every charge head, advances not deducted. */
  freightBooked: number;
  /** What is still collectable — To Pay and TBB, less the advances taken. */
  receivable: number;
  receivableCount: number;
  inTransit: number;
  delivered: number;
  awaitingDispatch: number;
}

/** One bar of the freight trend. */
export interface MonthPoint {
  /** yyyy-mm */
  month: string;
  freight: number;
}

export interface PaymentSlice {
  type: PaymentType;
  count: number;
  freight: number;
  /** Percent of the window's freight. 0 on a book with nothing in it. */
  share: number;
}

export interface RoutePoint {
  /** "Ahmedabad → Jaipur" */
  route: string;
  destination: string;
  trips: number;
  freight: number;
}

export interface Dashboard {
  window: DashboardWindow;
  kpis: Kpis;
  /** Twelve months ending with this one, months with no bookings included. */
  monthly: MonthPoint[];
  paymentSplit: PaymentSlice[];
  topRoutes: RoutePoint[];
  /** The top of the book — the latest entries, window or no window. */
  recent: Bilty[];
}

/** A destination's row, as Postgres groups it. */
export interface RouteTotal {
  destination: string;
  trips: number;
  freight: number;
}

/** A month's row, as Postgres groups it. Only months with bookings appear. */
export interface MonthTotal {
  month: string;
  freight: number;
}
