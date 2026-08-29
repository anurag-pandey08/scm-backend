import { prisma } from "../lib/prisma.ts";
import type { BiltyModel } from "../generated/prisma/models.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type { BiltyColumns, RegisterFilter } from "../types/bilty.types.ts";
import type { MonthTotal, RouteTotal } from "../types/dashboard.types.ts";

/**
 * The only place that talks to `prisma.bilty`.
 *
 * Every method is scoped to one firm's book by `companyId`, with no way to ask
 * for a bilty without saying whose it is. That is the one rule the two books
 * are kept apart by, and putting it in the signature means it cannot be
 * forgotten a layer up: there is no `findById(id)` to reach for.
 */

/** The register is read newest first, and both firms number upward by date. */
const NEWEST_FIRST: Prisma.BiltyOrderByWithRelationInput[] = [
  { lrDate: "desc" },
  // Same-day bookings fall back to the number on the book. A string sort is
  // right while every L.R. number in a book has the same number of digits,
  // which is true of both books and stays true until one passes 9999.
  { lrNo: "desc" },
];

/** The columns free-text search looks through — what is legible on a row. */
function searchFilter(query: string): Prisma.BiltyWhereInput | undefined {
  if (!query) return undefined;

  const contains = { contains: query, mode: "insensitive" } as const;

  return {
    OR: [
      { lrNo: contains },
      { lorryNo: contains },
      { from: contains },
      { to: contains },
      { consignorName: contains },
      { consigneeName: contains },
      { contents: contains },
      { invoiceNo: contains },
      { eWayBillNo: contains },
    ],
  };
}

function where(companyId: number, query: RegisterFilter): Prisma.BiltyWhereInput {
  return {
    companyId,
    ...searchFilter(query.q),
    ...(query.status === "all" ? {} : { status: query.status }),
    ...(query.payment === "all" ? {} : { paymentType: query.payment }),
  };
}

/** The window the dashboard's figures are taken over, and how many it wants. */
export interface SummaryWindow {
  /** Inclusive at both ends. */
  start: Date;
  end: Date;
  /** First day of the earliest month the freight trend covers. */
  monthsStart: Date;
  /** Destinations the lanes chart plots. */
  routeLimit: number;
  /** Rows "latest bookings" shows. */
  recentLimit: number;
}

/**
 * The charge column, added across — the Gr. Total of the printed L.R.
 *
 * Written once and interpolated into both raw queries, because the lanes are
 * ordered by it and the trend is bucketed on it, and two copies of an addition
 * is one copy too many.
 */
const GROSS = Prisma.sql`("freight" + "aoc" + "hamali" + "stCharges" + "otherCharges")`;

/**
 * A day, as Postgres should read it.
 *
 * `lrDate` is a DATE. Compared against a JS Date it would be compared against
 * a timestamp, which Postgres resolves using the server's own timezone — not
 * the office's, and not necessarily either of the two. The raw queries hand it
 * a date literal instead, so the window has the same edges wherever the server
 * happens to be running.
 */
function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const biltyRepository = {
  /**
   * One page of a firm's register, plus the three counts the footer needs.
   *
   * All four queries go in one transaction. Not for atomicity — nothing is
   * being written — but so the page, its total and its sum are all taken
   * against the same snapshot: a bilty booked at the next desk mid-request
   * would otherwise show up in the count and not in the rows.
   */
  async page(
    companyId: number,
    query: RegisterFilter,
  ): Promise<{
    rows: BiltyModel[];
    total: number;
    bookTotal: number;
    sums: Prisma.GetBiltyAggregateType<{
      _sum: {
        freight: true;
        aoc: true;
        hamali: true;
        stCharges: true;
        otherCharges: true;
        advance: true;
      };
    }>;
  }> {
    const filter = where(companyId, query);

    const [rows, total, bookTotal, sums] = await prisma.$transaction([
      prisma.bilty.findMany({
        where: filter,
        orderBy: NEWEST_FIRST,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.bilty.count({ where: filter }),
      prisma.bilty.count({ where: { companyId } }),
      // Summed in Postgres rather than over the rows above, because the footer
      // reports the whole filtered set and the rows are only one page of it.
      // Cancelled L.R.s are excluded here and only here — they stay in the
      // count so the numbering reads unbroken, but they were never money.
      //
      // Combined with AND rather than spread over `filter`: both this and the
      // clerk's own filter constrain `status`, and spreading would silently
      // drop theirs — a register filtered to In Transit would show the total
      // for every status.
      prisma.bilty.aggregate({
        where: { AND: [filter, { status: { not: "CANCELLED" } }] },
        _sum: {
          freight: true,
          aoc: true,
          hamali: true,
          stCharges: true,
          otherCharges: true,
          advance: true,
        },
      }),
    ]);

    return { rows, total, bookTotal, sums };
  },

  findById(companyId: number, id: string): Promise<BiltyModel | null> {
    // findFirst, not findUnique: the id alone is unique, but asking by id
    // alone would let one firm read the other's book by guessing an id.
    return prisma.bilty.findFirst({ where: { id, companyId } });
  },

  findByLrNo(companyId: number, lrNo: string): Promise<BiltyModel | null> {
    return prisma.bilty.findUnique({
      where: { companyId_lrNo: { companyId, lrNo } },
    });
  },

  create(companyId: number, data: BiltyColumns): Promise<BiltyModel> {
    return prisma.bilty.create({ data: { ...data, companyId } });
  },

  /**
   * Writes a bilty, refusing if it is not this firm's.
   *
   * The company is in the `where` rather than checked beforehand, so the guard
   * is the same statement as the write and nothing can slip between the two.
   * A miss updates no rows, which Prisma reports as P2025.
   */
  async update(
    companyId: number,
    id: string,
    data: BiltyColumns,
  ): Promise<BiltyModel | null> {
    const { count } = await prisma.bilty.updateMany({
      where: { id, companyId },
      data,
    });

    return count === 0 ? null : biltyRepository.findById(companyId, id);
  },

  async delete(companyId: number, id: string): Promise<boolean> {
    const { count } = await prisma.bilty.deleteMany({ where: { id, companyId } });
    return count > 0;
  },

  /** Every L.R. number in a firm's book, for working out the next one. */
  async lrNumbers(companyId: number): Promise<string[]> {
    const rows = await prisma.bilty.findMany({
      where: { companyId },
      select: { lrNo: true },
    });

    return rows.map((row) => row.lrNo);
  },

  /**
   * Everything the dashboard reports, taken against one snapshot.
   *
   * Six queries in one transaction, for the same reason the register's four
   * are: the tiles, the trend, the split and the lanes are read as one page,
   * and a bilty booked at the next desk halfway through would otherwise land
   * in the count and not in the total.
   *
   * What comes back is Prisma's own shapes — Decimals, enum identifiers and
   * grouped counts. The return type is left inferred rather than restated,
   * because the service is where those become rupees and printed words.
   */
  async summary(companyId: number, window: SummaryWindow) {
    const inWindow: Prisma.BiltyWhereInput = {
      companyId,
      lrDate: { gte: window.start, lte: window.end },
    };

    const live: Prisma.BiltyWhereInput = {
      ...inWindow,
      status: { not: "CANCELLED" },
    };

    // Declared before the transaction rather than inside the array, so each
    // one keeps the shape Prisma infers for it. A query built inline in the
    // array comes back widened to "some grouping of a bilty", and the service
    // would be reading `_sum` off a maybe.
    //
    // Nothing runs yet: a Prisma promise does not go to the database until it
    // is awaited, which is the whole reason $transaction can take a list.

    // Cancelled L.R.s are counted here with the rest. The tiles report how
    // many were struck out, and the number range only reads unbroken if the
    // struck-out ones are inside it.
    const statuses = prisma.bilty.groupBy({
      by: ["status"],
      where: inWindow,
      _count: { _all: true },
      // Prisma asks a groupBy to say how it is ordered. Neither of these two
      // is read in order — the service looks its rows up by status and by
      // term — so the ordering is only here to be an answer.
      orderBy: { status: "asc" },
    });

    const lrSpan = prisma.bilty.aggregate({
      where: inWindow,
      _min: { lrNo: true },
      _max: { lrNo: true },
    });

    // One query, two figures: the split the pie draws, and the receivable
    // tile — which is the To Pay and TBB slices with their advances taken
    // off. Cancelled consignments are out of both; they were never money.
    const payment = prisma.bilty.groupBy({
      by: ["paymentType"],
      where: live,
      _count: { _all: true },
      orderBy: { paymentType: "asc" },
      _sum: {
        freight: true,
        aoc: true,
        hamali: true,
        stCharges: true,
        otherCharges: true,
        advance: true,
      },
    });

    // Ordered by the gross, which is five columns added together — so the
    // ordering and the limit are Postgres's, not this file's. Sorting in here
    // would mean fetching every destination in the book to keep six.
    const routes = prisma.$queryRaw<RouteTotal[]>`
      SELECT "to" AS destination,
             COUNT(*)::int AS trips,
             COALESCE(SUM(${GROSS}), 0)::float8 AS freight
      FROM "Bilty"
      WHERE "companyId" = ${companyId}
        AND "lrDate" BETWEEN ${day(window.start)}::date
                         AND ${day(window.end)}::date
        AND "status" <> 'CANCELLED'
      GROUP BY "to"
      ORDER BY freight DESC, destination ASC
      LIMIT ${window.routeLimit}
    `;

    // Bucketed by month in Postgres. Prisma cannot group by the month of a
    // date column, and pulling a year of consignments back to bucket them here
    // would be fetching a book to add up its footer. Only months something was
    // booked in come back; the service fills in the quiet ones.
    const monthly = prisma.$queryRaw<MonthTotal[]>`
      SELECT to_char("lrDate", 'YYYY-MM') AS month,
             COALESCE(SUM(${GROSS}), 0)::float8 AS freight
      FROM "Bilty"
      WHERE "companyId" = ${companyId}
        AND "lrDate" BETWEEN ${day(window.monthsStart)}::date
                         AND ${day(window.end)}::date
        AND "status" <> 'CANCELLED'
      GROUP BY month
      ORDER BY month
    `;

    // The latest entries in the book, not the latest inside the window: the
    // card is the top of the register, and a firm that has booked nothing this
    // month should still see what it booked last month rather than an empty
    // table.
    const recent = prisma.bilty.findMany({
      where: { companyId },
      orderBy: NEWEST_FIRST,
      take: window.recentLimit,
    });

    const [statusRows, lrRow, paymentRows, routeRows, monthRows, recentRows] =
      await prisma.$transaction([
        statuses,
        lrSpan,
        payment,
        routes,
        monthly,
        recent,
      ]);

    return {
      statuses: statusRows,
      lrSpan: lrRow,
      payment: paymentRows,
      routes: routeRows,
      monthly: monthRows,
      recent: recentRows,
    };
  },
};
