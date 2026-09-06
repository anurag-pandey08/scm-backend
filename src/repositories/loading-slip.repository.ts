import { prisma } from "../lib/prisma.ts";
import type { LoadingSlipModel } from "../generated/prisma/models.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type {
  LoadingSlipColumns,
  SlipBookFilter,
} from "../types/loading-slip.types.ts";

/**
 * The only place that talks to `prisma.loadingSlip`.
 *
 * Every method is scoped to one firm's book by `companyId`, with no way to ask
 * for a slip without saying whose it is — the same rule the register and the
 * bill book are kept under, and for the same reason: there is no
 * `findById(id)` here to reach for.
 */

/** The slip book is read newest first, and both firms number upward by date. */
const NEWEST_FIRST: Prisma.LoadingSlipOrderByWithRelationInput[] = [
  { slipDate: "desc" },
  // Same-day slips fall back to the number on the book. A string sort is right
  // while every slip number in a book has the same number of digits, which is
  // true of both books and stays true until one passes 9999.
  { slipNo: "desc" },
];

/** The columns free-text search looks through — what is legible on a row. */
function searchFilter(query: string): Prisma.LoadingSlipWhereInput | undefined {
  if (!query) return undefined;

  const contains = { contains: query, mode: "insensitive" } as const;

  return {
    OR: [
      { slipNo: contains },
      { party: contains },
      { vehicleNo: contains },
      { from: contains },
      { to: contains },
      { remarks: contains },
    ],
  };
}

function where(
  companyId: number,
  query: SlipBookFilter,
): Prisma.LoadingSlipWhereInput {
  return {
    companyId,
    ...searchFilter(query.q),
    ...(query.status === "all" ? {} : { status: query.status }),
  };
}

export const loadingSlipRepository = {
  /**
   * One page of a firm's slip book, plus the counts and sums the footer needs.
   *
   * All four queries go in one transaction. Not for atomicity — nothing is
   * being written — but so the page, its counts and its sums are all taken
   * against the same snapshot: a slip written at the next desk mid-request
   * would otherwise show up in the count and not in the rows.
   */
  async page(companyId: number, query: SlipBookFilter) {
    const filter = where(companyId, query);

    const [rows, total, bookTotal, sums] = await prisma.$transaction([
      prisma.loadingSlip.findMany({
        where: filter,
        orderBy: NEWEST_FIRST,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.loadingSlip.count({ where: filter }),
      prisma.loadingSlip.count({ where: { companyId } }),

      // Summed in Postgres rather than over the rows above, because the footer
      // reports the whole filtered set and the rows are one page of it.
      // Cancelled slips are excluded here and only here — they stay in the
      // count so the numbering reads unbroken, but a lorry that never loaded
      // was never hired.
      //
      // Combined with AND rather than spread over `filter`: both this and the
      // clerk's own filter constrain `status`, and spreading would silently
      // drop theirs — a book filtered to Issued would show the total for every
      // status.
      prisma.loadingSlip.aggregate({
        where: { AND: [filter, { status: { not: "CANCELLED" } }] },
        _sum: { totalFreight: true, advance: true, detention: true },
      }),
    ]);

    return { rows, total, bookTotal, sums };
  },

  findById(companyId: number, id: string): Promise<LoadingSlipModel | null> {
    // findFirst, not findUnique: the id alone is unique, but asking by id
    // alone would let one firm read the other's book by guessing an id.
    return prisma.loadingSlip.findFirst({ where: { id, companyId } });
  },

  findBySlipNo(
    companyId: number,
    slipNo: string,
  ): Promise<LoadingSlipModel | null> {
    return prisma.loadingSlip.findUnique({
      where: { companyId_slipNo: { companyId, slipNo } },
    });
  },

  create(
    companyId: number,
    data: LoadingSlipColumns,
  ): Promise<LoadingSlipModel> {
    return prisma.loadingSlip.create({ data: { ...data, companyId } });
  },

  /**
   * Writes a slip, refusing if it is not this firm's.
   *
   * The company is in the `where` rather than checked beforehand, so the guard
   * is the same statement as the write and nothing can slip between the two. A
   * miss updates no rows, which Prisma reports as P2025.
   */
  async update(
    companyId: number,
    id: string,
    data: LoadingSlipColumns,
  ): Promise<LoadingSlipModel | null> {
    const { count } = await prisma.loadingSlip.updateMany({
      where: { id, companyId },
      data,
    });

    return count === 0
      ? null
      : loadingSlipRepository.findById(companyId, id);
  },

  async delete(companyId: number, id: string): Promise<boolean> {
    const { count } = await prisma.loadingSlip.deleteMany({
      where: { id, companyId },
    });
    return count > 0;
  },

  /** Every slip number in a firm's book, for working out the next one. */
  async slipNumbers(companyId: number): Promise<string[]> {
    const rows = await prisma.loadingSlip.findMany({
      where: { companyId },
      select: { slipNo: true },
    });

    return rows.map((row) => row.slipNo);
  },
};
