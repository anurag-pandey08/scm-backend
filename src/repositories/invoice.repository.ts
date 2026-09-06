import { prisma } from "../lib/prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type {
  BillBookFilter,
  InvoiceColumns,
  InvoiceLineColumns,
} from "../types/invoice.types.ts";

/**
 * The only place that talks to `prisma.invoice`.
 *
 * Every method is scoped to one firm's book by `companyId`, with no way to ask
 * for a bill without saying whose it is — the same rule the L.R. register is
 * kept under, and for the same reason: there is no `findById(id)` here to
 * reach for, so one firm's book cannot be read out of the other's screen.
 *
 * A bill is never read without its lines. A bill without its charge column is
 * a number and a party, which is not a document anything can be done with, so
 * the lines are included rather than left to a second query at the call site.
 */

/** A bill with the charge column it prints, in the order it prints it. */
const WITH_LINES = {
  lines: { orderBy: { position: "asc" } },
} as const satisfies Prisma.InvoiceInclude;

export type InvoiceRow = Prisma.InvoiceGetPayload<{
  include: typeof WITH_LINES;
}>;

/** The bill book is read newest first, and both firms number upward by date. */
const NEWEST_FIRST: Prisma.InvoiceOrderByWithRelationInput[] = [
  { billDate: "desc" },
  // Same-day bills fall back to the number on the book. A string sort is right
  // while every bill number in a book has the same number of digits, which is
  // true of both books and stays true until one passes 999.
  { billNo: "desc" },
];

/**
 * The columns free-text search looks through.
 *
 * The challan numbers are among them, and they are the reason this reaches
 * across the relation: "which bill did we put L.R. 3020 on?" is the question
 * the office actually asks of a bill book, and the L.R. number is on a line
 * rather than on the bill.
 */
function searchFilter(query: string): Prisma.InvoiceWhereInput | undefined {
  if (!query) return undefined;

  const contains = { contains: query, mode: "insensitive" } as const;

  return {
    OR: [
      { billNo: contains },
      { partyName: contains },
      { partyGstNo: contains },
      { from: contains },
      { to: contains },
      { partyInvoiceNo: contains },
      { lines: { some: { challanNo: contains } } },
      { lines: { some: { particulars: contains } } },
    ],
  };
}

function where(
  companyId: number,
  query: BillBookFilter,
): Prisma.InvoiceWhereInput {
  return {
    companyId,
    ...searchFilter(query.q),
    ...(query.status === "all" ? {} : { status: query.status }),
  };
}

/**
 * The amount column of every line on the bills a filter matches, added up.
 *
 * Aggregated over the lines rather than over the bills, because the total of a
 * bill *is* its lines — there is no total column to sum. `invoice` in the
 * where clause is the relation, so this counts only lines whose bill is in the
 * filtered set.
 */
function sumLines(filter: Prisma.InvoiceWhereInput) {
  return prisma.invoiceLine.aggregate({
    where: { invoice: filter },
    _sum: { amount: true },
  });
}

export const invoiceRepository = {
  /**
   * One page of a firm's bill book, plus the counts and totals the footer
   * needs.
   *
   * All five queries go in one transaction. Not for atomicity — nothing is
   * being written — but so the page, its counts and its sums are all taken
   * against the same snapshot: a bill raised at the next desk mid-request
   * would otherwise show up in the count and not in the rows.
   */
  async page(companyId: number, query: BillBookFilter) {
    const filter = where(companyId, query);

    const [rows, total, bookTotal, billed, outstanding] =
      await prisma.$transaction([
        prisma.invoice.findMany({
          where: filter,
          include: WITH_LINES,
          orderBy: NEWEST_FIRST,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        prisma.invoice.count({ where: filter }),
        prisma.invoice.count({ where: { companyId } }),

        // Summed in Postgres rather than over the rows above, because the
        // footer reports the whole filtered set and the rows are one page of
        // it. Cancelled bills are excluded here and only here — they stay in
        // the count so the numbering reads unbroken, but a withdrawn bill was
        // never money.
        //
        // Combined with AND rather than spread over `filter`: both this and
        // the clerk's own filter constrain `status`, and spreading would
        // silently drop theirs — a book filtered to Draft would show the total
        // for every status.
        sumLines({ AND: [filter, { status: { not: "CANCELLED" } }] }),

        // Raised, and only raised. A draft has not been sent, so nobody owes
        // it yet; a paid bill has already come in.
        sumLines({ AND: [filter, { status: "RAISED" }] }),
      ]);

    return {
      rows,
      total,
      bookTotal,
      billed: billed._sum.amount,
      outstanding: outstanding._sum.amount,
    };
  },

  findById(companyId: number, id: string): Promise<InvoiceRow | null> {
    // findFirst, not findUnique: the id alone is unique, but asking by id
    // alone would let one firm read the other's book by guessing an id.
    return prisma.invoice.findFirst({
      where: { id, companyId },
      include: WITH_LINES,
    });
  },

  findByBillNo(companyId: number, billNo: string): Promise<InvoiceRow | null> {
    return prisma.invoice.findUnique({
      where: { companyId_billNo: { companyId, billNo } },
      include: WITH_LINES,
    });
  },

  create(
    companyId: number,
    data: InvoiceColumns,
    lines: InvoiceLineColumns[],
  ): Promise<InvoiceRow> {
    return prisma.invoice.create({
      data: { ...data, companyId, lines: { create: lines } },
      include: WITH_LINES,
    });
  },

  /**
   * Writes a bill and replaces its charge column, refusing if it is not this
   * firm's.
   *
   * The company is in the `where` rather than checked beforehand, so the guard
   * is the same statement as the write and nothing can slip between the two. A
   * miss updates no rows, which Prisma reports as P2025 — caught here and
   * turned into a null for the service to phrase.
   *
   * The lines are cleared and rewritten rather than reconciled. A charge
   * column is edited as a block — rows added, removed and reordered in one
   * pass — so matching the rows that came back against the rows going out
   * would be redoing work the form has already done, and getting it wrong on
   * the third edit. The `deleteMany` and the `create` are one nested write and
   * therefore one transaction, so the bill is never briefly line-less.
   */
  async update(
    companyId: number,
    id: string,
    data: InvoiceColumns,
    lines: InvoiceLineColumns[],
  ): Promise<InvoiceRow | null> {
    try {
      return await prisma.invoice.update({
        where: { id, companyId },
        data: { ...data, lines: { deleteMany: {}, create: lines } },
        include: WITH_LINES,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return null;
      }
      throw error;
    }
  },

  async delete(companyId: number, id: string): Promise<boolean> {
    // The charge column goes with it — `onDelete: Cascade` on the relation, so
    // there are no orphaned lines to sweep up here.
    const { count } = await prisma.invoice.deleteMany({
      where: { id, companyId },
    });
    return count > 0;
  },

  /** Every bill number in a firm's book, for working out the next one. */
  async billNumbers(companyId: number): Promise<string[]> {
    const rows = await prisma.invoice.findMany({
      where: { companyId },
      select: { billNo: true },
    });

    return rows.map((row) => row.billNo);
  },
};
