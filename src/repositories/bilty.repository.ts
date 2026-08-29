import { prisma } from "../lib/prisma.ts";
import type { BiltyModel } from "../generated/prisma/models.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import type { BiltyColumns, RegisterFilter } from "../types/bilty.types.ts";

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
};
