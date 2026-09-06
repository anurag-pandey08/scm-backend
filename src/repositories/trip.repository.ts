import { prisma } from "../lib/prisma.ts";
import type { TripModel } from "../generated/prisma/models.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type {
  RegisterFilter,
  RegisterTotals,
  TripColumns,
} from "../types/trip.types.ts";

/**
 * The only place that talks to `prisma.trip`.
 *
 * Unlike every other repository here, nothing is scoped to a company. The
 * daybook is one book worked by both firms, so there is no `companyId` to
 * scope by and no risk of one firm reading the other's rows — they are the
 * same rows. See the note on `Trip` in prisma/schema.prisma.
 *
 * ## Why this one uses raw SQL
 *
 * Almost everything the register asks of the database is an expression over
 * columns rather than a column:
 *
 *   the hire            rate × weight
 *   due from a party    what they were billed, less the two receipts
 *   due to a lorry      the balance, but only where nothing has been paid
 *
 * Prisma's `where` compares a column to a value, and its `aggregate` sums a
 * column. Neither can do arithmetic across columns, so the filter that asks
 * "who still owes us" and four of the five footer figures are simply not
 * expressible through the query builder. Pulling the book back to work them
 * out in Node would be fetching a ledger to add up its own footer.
 *
 * So the filtering, the counting and the totals are Postgres's, written out
 * below. The rows themselves still come back through `findMany` — the raw
 * query returns only ids — so Decimals and dates arrive as Prisma types and
 * there is one mapper in the service rather than two.
 */

/**
 * The daybook is read newest first, with the day's entries in the order they
 * were written. Stated twice because two queries need it — the raw one that
 * pages the ids and the `findMany` that fetches them — and they have to agree
 * or a page would come back in a different order than it was chosen in.
 */
const NEWEST_FIRST_SQL = Prisma.sql`ORDER BY "date" DESC, "createdAt" DESC`;

const NEWEST_FIRST: Prisma.TripOrderByWithRelationInput[] = [
  { date: "desc" },
  { createdAt: "desc" },
];

/**
 * The hire, as Postgres works it out.
 *
 * `FLOOR(x + 0.5)` rather than `ROUND(x)` so it rounds the way the screens do:
 * JS `Math.round` takes a half upward and Postgres's `ROUND` takes it away
 * from zero. The two only differ on a negative half, which these columns
 * cannot hold — but the ledger's footer and its rows must add up to the same
 * rupee, and matching the rule outright is cheaper than arguing that the
 * difference is unreachable.
 */
const FREIGHT = Prisma.sql`FLOOR("rate" * "weight" + 0.5)`;

/** What a party still owes on one row, floored at zero. */
const DUE_FROM_PARTY = Prisma.sql`GREATEST(0, "partyPayment" - "advanceReceiveRs" - "balanceReceiveRs")`;

/** The columns free-text search looks through — what is legible on a row. */
function searchCondition(query: string): Prisma.Sql | null {
  if (!query) return null;

  const like = `%${query}%`;

  return Prisma.sql`(
    "truckNo" ILIKE ${like}
    OR "partyName" ILIKE ${like}
    OR "brokerName" ILIKE ${like}
    OR "from" ILIKE ${like}
    OR "to" ILIKE ${like}
    OR "goods" ILIKE ${like}
    OR "lrNo" ILIKE ${like}
    OR "remarks" ILIKE ${like}
  )`;
}

/**
 * The money filter.
 *
 * "Still to be paid" is read off the absence of a paid date rather than off
 * the balance alone — a lorry settled at a figure below the balance still has
 * one on the row, and the date is what says the office is done with it.
 */
function filterCondition(filter: RegisterFilter["filter"]): Prisma.Sql | null {
  switch (filter) {
    case "party-owes":
      return Prisma.sql`"partyPayment" > "advanceReceiveRs" + "balanceReceiveRs"`;
    case "lorry-owed":
      return Prisma.sql`"balance" > 0 AND "paidDate" IS NULL`;
    case "all":
      return null;
  }
}

function where(query: RegisterFilter): Prisma.Sql {
  const conditions = [
    searchCondition(query.q),
    filterCondition(query.filter),
  ].filter((condition): condition is Prisma.Sql => condition !== null);

  return conditions.length === 0
    ? Prisma.empty
    : Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export const tripRepository = {
  /**
   * One page of the daybook, plus the counts and the five footer figures.
   *
   * One interactive transaction rather than four loose queries, so the page,
   * its counts and its totals are all taken against the same snapshot: a trip
   * entered at the next desk mid-request would otherwise land in the count and
   * not in the rows.
   */
  async page(query: RegisterFilter): Promise<{
    rows: TripModel[];
    total: number;
    bookTotal: number;
    totals: RegisterTotals;
  }> {
    const filter = where(query);
    const offset = (query.page - 1) * query.pageSize;

    return prisma.$transaction(async (tx) => {
      // Ids only. The rows come back through `findMany` below, so Prisma still
      // does the Decimal and date decoding and the service keeps one mapper.
      const ids = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Trip"
        ${filter}
        ${NEWEST_FIRST_SQL}
        LIMIT ${query.pageSize} OFFSET ${offset}
      `;

      const [{ count: total }] = await tx.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int AS count FROM "Trip" ${filter}
      `;

      const [{ count: bookTotal }] = await tx.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int AS count FROM "Trip"
      `;

      // Cast to float8 rather than left as numeric: these are read as rupee
      // figures, not accumulated further, and a Decimal here would only be
      // converted a layer up.
      const [totals] = await tx.$queryRaw<[RegisterTotals]>`
        SELECT
          COALESCE(SUM(${FREIGHT}), 0)::float8 AS freight,
          COALESCE(SUM("commission"), 0)::float8 AS commission,
          COALESCE(SUM("advanceReceiveRs" + "balanceReceiveRs"), 0)::float8 AS received,
          COALESCE(SUM(${DUE_FROM_PARTY}), 0)::float8 AS "dueFromParty",
          COALESCE(
            SUM(CASE WHEN "paidDate" IS NULL THEN "balance" ELSE 0 END), 0
          )::float8 AS "dueToLorry"
        FROM "Trip"
        ${filter}
      `;

      const rows =
        ids.length === 0
          ? []
          : await tx.trip.findMany({
              where: { id: { in: ids.map((row) => row.id) } },
              orderBy: NEWEST_FIRST,
            });

      return { rows, total, bookTotal, totals };
    });
  },

  findById(id: string): Promise<TripModel | null> {
    return prisma.trip.findUnique({ where: { id } });
  },

  create(data: TripColumns): Promise<TripModel> {
    return prisma.trip.create({ data });
  },

  /** Writes a trip. A miss updates no rows, which Prisma reports as P2025. */
  async update(id: string, data: TripColumns): Promise<TripModel | null> {
    const { count } = await prisma.trip.updateMany({ where: { id }, data });

    return count === 0 ? null : tripRepository.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { count } = await prisma.trip.deleteMany({ where: { id } });
    return count > 0;
  },
};
