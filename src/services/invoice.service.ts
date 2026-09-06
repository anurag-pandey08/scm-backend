import {
  invoiceRepository,
  type InvoiceRow,
} from "../repositories/invoice.repository.ts";
import { companyService } from "./company.service.ts";
import type { InvoiceLineModel } from "../generated/prisma/models.ts";
import type {
  InvoiceStatus as DbInvoiceStatus,
  LineKind as DbLineKind,
} from "../generated/prisma/enums.ts";
import type {
  Invoice,
  InvoiceColumns,
  InvoiceLine,
  InvoiceLineColumns,
  InvoicePage,
  InvoiceStatus,
  LineKind,
} from "../types/invoice.types.ts";
import type {
  BillBookQuery,
  InvoiceInput,
} from "../schemas/invoice.schema.ts";
import { AppError } from "../utils/app-error.ts";

/**
 * The bill book, one firm at a time.
 *
 * The same three translations the L.R. register keeps in its own service, for
 * the same reason — the database and the paper disagree about shape, not about
 * meaning:
 *
 *   flat columns ↔ the "M/s" block the printed bill lays the party out in
 *   Postgres enum names ↔ the words printed on the page
 *   Decimal ↔ number
 *
 * And one the register does not have: a charge line's `position`. On paper the
 * order of the column is the document — a bill that reprints its lines in a
 * different order is a different bill — so the list's own order is written
 * into a column on the way in and used to sort on the way out. Nothing above
 * this layer ever sees it; the API carries a list, and a list is already in
 * order.
 */

// --- Enums ------------------------------------------------------------------
//
// Written as literal pairs rather than derived, so adding a status to one enum
// without the other is a compile error rather than a runtime one.

const STATUS_OUT: Record<DbInvoiceStatus, InvoiceStatus> = {
  DRAFT: "Draft",
  RAISED: "Raised",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

const KIND_OUT: Record<DbLineKind, LineKind> = {
  FREIGHT: "Freight",
  CHARGE: "Charge",
};

/** Inverts one of the maps above, so the pair above is the only thing to keep. */
function invert<Db extends string, Api extends string>(
  map: Record<Db, Api>,
): Record<Api, Db> {
  return Object.fromEntries(
    Object.entries(map).map(([db, api]) => [api, db]),
  ) as Record<Api, Db>;
}

const STATUS_IN = invert(STATUS_OUT);
const KIND_IN = invert(KIND_OUT);

// --- Scalars ----------------------------------------------------------------

/**
 * A Decimal column as a plain number.
 *
 * Rupees and tonnes both fit a double with room to spare at the sizes a bill
 * book deals in, and the screens, the totals and the printed bill all want a
 * number. The precision that matters is in the column.
 */
function toNumber(value: unknown): number {
  return Number(value);
}

/** A date column as the ISO day the bill carries, with no clock on it. */
function toIsoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/**
 * An ISO day as a date column.
 *
 * Parsed as UTC midnight rather than local, so the day written on the bill is
 * the day stored.
 */
function toDate(value: string): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

// --- Shape ------------------------------------------------------------------

function lineToDto(row: InvoiceLineModel): InvoiceLine {
  return {
    id: row.id,
    kind: KIND_OUT[row.kind],
    challanNo: row.challanNo,
    date: toIsoDate(row.date),
    particulars: row.particulars,
    rate: toNumber(row.rate),
    weight: toNumber(row.weight),
    amount: toNumber(row.amount),
  };
}

/** A row, as the printed bill lays it out. */
function toDto(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    billNo: row.billNo,
    billDate: toIsoDate(row.billDate),
    party: {
      name: row.partyName,
      address: row.partyAddress,
      gstNo: row.partyGstNo,
    },
    from: row.from,
    to: row.to,
    partyInvoiceNo: row.partyInvoiceNo,
    // Already sorted by `position` — the repository asks for them that way,
    // because the order is the document.
    lines: row.lines.map(lineToDto),
    status: STATUS_OUT[row.status],
    paidOn: toIsoDate(row.paidOn),
    remarks: row.remarks,
  };
}

/** A validated request body, as columns. */
function toColumns(input: InvoiceInput): InvoiceColumns {
  return {
    billNo: input.billNo,
    // Non-null: the schema requires a real date on every bill.
    billDate: toDate(input.billDate) as Date,
    partyName: input.party.name,
    partyAddress: input.party.address,
    partyGstNo: input.party.gstNo,
    from: input.from,
    to: input.to,
    partyInvoiceNo: input.partyInvoiceNo,
    status: STATUS_IN[input.status],
    // A settlement date on a bill that is not settled is a leftover from
    // before the clerk changed the status back, not a fact. Only a paid bill
    // keeps one.
    paidOn: input.status === "Paid" ? toDate(input.paidOn) : null,
    remarks: input.remarks,
  };
}

/**
 * The charge column, as rows.
 *
 * `position` comes from the list's own order, which is the order the form
 * showed and the order the bill prints.
 *
 * A charge line's challan, date, rate and weight are blanked rather than
 * trusted. The form keeps one shape for both kinds of line, so a freight line
 * switched to a charge arrives still carrying the lorry number and the tonnage
 * it had a moment ago — and a printed bill with a rate against "Detention" is
 * a bill the party will query.
 */
function toLineColumns(input: InvoiceInput): InvoiceLineColumns[] {
  return input.lines.map((line, position) => {
    const freight = line.kind === "Freight";

    return {
      position,
      kind: KIND_IN[line.kind],
      challanNo: freight ? line.challanNo : "",
      date: freight ? toDate(line.date) : null,
      particulars: line.particulars,
      rate: freight ? line.rate : 0,
      weight: freight ? line.weight : 0,
      amount: line.amount,
    };
  });
}

// --- The service -------------------------------------------------------------

export const invoiceService = {
  /** One page of a firm's bill book, filtered as the query string asks. */
  async page(slug: string, query: BillBookQuery): Promise<InvoicePage> {
    const company = await companyService.getRow(slug);

    const { rows, total, bookTotal, billed, outstanding } =
      await invoiceRepository.page(company.id, {
        // The filter arrives in the words printed on the bill and is put into
        // the database's own before it goes any further, so the repository
        // never has to know the two vocabularies differ.
        ...query,
        status: query.status === "all" ? "all" : STATUS_IN[query.status],
      });

    return {
      invoices: rows.map(toDto),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        // A filtered book with nothing in it still has one page — the one
        // saying so. Without the floor the client would render "page 1 of 0".
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        bookTotal,
        totals: {
          // Null when the filter matched no lines at all, which is zero rupees.
          billed: toNumber(billed ?? 0),
          outstanding: toNumber(outstanding ?? 0),
        },
      },
    };
  },

  async getById(slug: string, id: string): Promise<Invoice> {
    const company = await companyService.getRow(slug);
    const row = await invoiceRepository.findById(company.id, id);

    if (!row) throw AppError.notFound("No such bill in this book");

    return toDto(row);
  },

  /**
   * The next number off the firm's bill book.
   *
   * The highest number in use plus one — not the count, which would reissue a
   * number the moment anything was deleted. An empty book starts from the
   * firm's own floor, so a fresh database numbers from where the paper did
   * rather than from 1.
   */
  async nextBillNo(slug: string): Promise<string> {
    const company = await companyService.getRow(slug);
    const numbers = await invoiceRepository.billNumbers(company.id);

    const highest = numbers.reduce(
      (max, billNo) => Math.max(max, Number(billNo) || 0),
      company.billFloor,
    );

    return String(highest + 1);
  },

  async create(slug: string, input: InvoiceInput): Promise<Invoice> {
    const company = await companyService.getRow(slug);

    await assertBillNoFree(company.id, input.billNo, null);

    const row = await invoiceRepository.create(
      company.id,
      toColumns(input),
      toLineColumns(input),
    );

    return toDto(row);
  },

  async update(
    slug: string,
    id: string,
    input: InvoiceInput,
  ): Promise<Invoice> {
    const company = await companyService.getRow(slug);

    await assertBillNoFree(company.id, input.billNo, id);

    const row = await invoiceRepository.update(
      company.id,
      id,
      toColumns(input),
      toLineColumns(input),
    );

    if (!row) throw AppError.notFound("No such bill in this book");

    return toDto(row);
  },

  async remove(slug: string, id: string): Promise<void> {
    const company = await companyService.getRow(slug);
    const deleted = await invoiceRepository.delete(company.id, id);

    if (!deleted) throw AppError.notFound("No such bill in this book");
  },
};

/**
 * Refuses a number already written on another bill in the same book.
 *
 * The unique index would refuse it anyway, and does — this is here for the
 * message. A clerk who has just typed 597 into a book that already has one
 * needs to be told which number is taken, not handed "duplicate key value
 * violates unique constraint".
 *
 * `exceptId` is the record being edited, which is allowed to keep its own
 * number.
 */
async function assertBillNoFree(
  companyId: number,
  billNo: string,
  exceptId: string | null,
): Promise<void> {
  const existing = await invoiceRepository.findByBillNo(companyId, billNo);

  if (existing && existing.id !== exceptId) {
    throw AppError.conflict(`Bill ${billNo} is already in this book`);
  }
}
