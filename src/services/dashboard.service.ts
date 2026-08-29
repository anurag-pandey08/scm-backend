import { biltyRepository } from "../repositories/bilty.repository.ts";
import { companyService } from "./company.service.ts";
import { PAYMENT_OUT, toDto as toBiltyDto } from "./bilty.service.ts";
import type { BiltyStatus as DbBiltyStatus } from "../generated/prisma/enums.ts";
import { PAYMENT_TYPES, type PaymentType } from "../types/bilty.types.ts";
import type {
  Dashboard,
  DashboardWindow,
  Kpis,
  MonthPoint,
  MonthTotal,
  PaymentSlice,
  RoutePoint,
  RouteTotal,
} from "../types/dashboard.types.ts";
import type { DashboardQuery } from "../schemas/dashboard.schema.ts";
import {
  addDays,
  isoDay,
  officeToday,
  utcDay,
} from "../utils/office-day.ts";

/**
 * The dashboard, one firm at a time.
 *
 * Everything here is arithmetic over figures Postgres has already added up —
 * the repository counts, sums and buckets, and this file decides what the
 * office is being told: which terms leave money owed, which months the trend
 * covers, and what a month nothing was booked in should look like.
 *
 * The window ends today, in the office's own day — see src/utils/office-day.ts
 * for whose day that is and why it is named rather than inferred.
 *
 * Read-only throughout. Nothing on this screen writes.
 */

/** Months on the freight trend, ending with the one in progress. */
const TREND_MONTHS = 12;
/** Destinations the lanes chart plots. */
const ROUTE_LIMIT = 6;
/** Rows in "latest bookings". */
const RECENT_LIMIT = 6;

/** Terms that leave money to collect. Freight paid at booking is already in. */
const RECEIVABLE_TERMS: PaymentType[] = ["To Pay", "TBB"];

// --- Days --------------------------------------------------------------------

/** The first of the month `back` months before the one this day falls in. */
function startOfMonth(day: Date, back: number): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - back, 1));
}

/** yyyy-mm — the key the trend is bucketed on. */
function monthKey(day: Date): string {
  return isoDay(day).slice(0, 7);
}

/**
 * The window the figures are read over, ending today.
 *
 * Inclusive at both ends, so "last 30 days" is thirty days of book rather than
 * twenty-nine and a bit: a window ending on the 4th of August starts on the
 * 6th of July.
 *
 * Carries the days both ways — as the strings the header prints and as the
 * dates the query compares against — because they are the same two edges and
 * working one out twice is how they come to disagree.
 */
function windowOf(days: number): DashboardWindow & {
  startDate: Date;
  endDate: Date;
} {
  const end = officeToday();
  const start = addDays(end, -(days - 1));

  return { days, start, end, startDate: utcDay(start), endDate: utcDay(end) };
}

// --- Figures -----------------------------------------------------------------

/**
 * The trend, with the quiet months filled in.
 *
 * Postgres only returns months something was booked in. A chart that skipped
 * the others would stand two bars side by side and let the reader take them
 * for consecutive months, so every month in the span gets one and a month with
 * no bookings gets a zero — which is the true figure for it.
 */
function trend(rows: MonthTotal[], end: Date): MonthPoint[] {
  const booked = new Map(rows.map((row) => [row.month, Number(row.freight)]));

  return Array.from({ length: TREND_MONTHS }, (_unused, index) => {
    const month = monthKey(startOfMonth(end, TREND_MONTHS - 1 - index));
    return { month, freight: booked.get(month) ?? 0 };
  });
}

/**
 * The split, in the order the L.R. lists the terms.
 *
 * Built outward from the printed words rather than inward from the rows: a
 * term nothing was booked on this month is still a term the firm deals on, and
 * the legend should read the same three lines every month rather than lose one
 * and change height.
 */
function split(
  totals: Map<PaymentType, { count: number; freight: number }>,
  freightBooked: number,
): PaymentSlice[] {
  return PAYMENT_TYPES.map((type) => {
    const row = totals.get(type) ?? { count: 0, freight: 0 };

    return {
      type,
      count: row.count,
      freight: row.freight,
      share: freightBooked > 0 ? (row.freight / freightBooked) * 100 : 0,
    };
  });
}

/**
 * The lanes, labelled from the firm's own booking station.
 *
 * Grouped by destination, because that is the axis the chart reads down and
 * the question the office asks — what are we sending to Jaipur. The arrow is
 * drawn from the firm's `origin` rather than from any one consignment's
 * `from`, that column being the station every L.R. in the book is booked at
 * and the same one the letterhead prints.
 */
function lanes(rows: RouteTotal[], origin: string): RoutePoint[] {
  return rows.map((row) => ({
    route: `${origin} → ${row.destination}`,
    destination: row.destination,
    trips: Number(row.trips),
    freight: Number(row.freight),
  }));
}

// --- The service -------------------------------------------------------------

export const dashboardService = {
  /** Every figure on one firm's dashboard, taken against one snapshot. */
  async summary(slug: string, query: DashboardQuery): Promise<Dashboard> {
    const company = await companyService.getRow(slug);
    const window = windowOf(query.days);

    const { statuses, lrSpan, payment, routes, monthly, recent } =
      await biltyRepository.summary(company.id, {
        start: window.startDate,
        end: window.endDate,
        // The trend runs back from the first of its earliest month, not from
        // the start of the window: the two answer different questions and share
        // only an end.
        monthsStart: startOfMonth(window.endDate, TREND_MONTHS - 1),
        routeLimit: ROUTE_LIMIT,
        recentLimit: RECENT_LIMIT,
      });

    const counts = new Map<DbBiltyStatus, number>(
      statuses.map((row) => [row.status, row._count._all]),
    );
    const count = (status: DbBiltyStatus) => counts.get(status) ?? 0;

    // Summed per payment term, which is the one grouping that answers both the
    // pie and the receivable tile.
    const totals = new Map<PaymentType, { count: number; freight: number }>();
    let freightBooked = 0;
    let receivable = 0;
    let receivableCount = 0;

    for (const row of payment) {
      const sum = (value: unknown) => Number(value ?? 0);
      const gross =
        sum(row._sum.freight) +
        sum(row._sum.aoc) +
        sum(row._sum.hamali) +
        sum(row._sum.stCharges) +
        sum(row._sum.otherCharges);

      const type = PAYMENT_OUT[row.paymentType];
      totals.set(type, { count: row._count._all, freight: gross });
      freightBooked += gross;

      if (RECEIVABLE_TERMS.includes(type)) {
        // The advances are already in hand, so what is still owed on these is
        // the gross less what was taken at booking.
        receivable += gross - sum(row._sum.advance);
        receivableCount += row._count._all;
      }
    }

    const kpis: Kpis = {
      biltiesBooked: count("BOOKED") + count("IN_TRANSIT") + count("DELIVERED"),
      cancelled: count("CANCELLED"),
      // Lexicographic min and max, which is numeric order while every number
      // in a book has the same digit count — the same assumption the register
      // sorts on, and true of both books until one passes 9999.
      lrFrom: lrSpan._min.lrNo ?? "",
      lrTo: lrSpan._max.lrNo ?? "",
      freightBooked,
      receivable,
      receivableCount,
      inTransit: count("IN_TRANSIT"),
      delivered: count("DELIVERED"),
      awaitingDispatch: count("BOOKED"),
    };

    return {
      window: { days: window.days, start: window.start, end: window.end },
      kpis,
      monthly: trend(monthly, window.endDate),
      paymentSplit: split(totals, freightBooked),
      topRoutes: lanes(routes, company.origin),
      recent: recent.map(toBiltyDto),
    };
  },
};
