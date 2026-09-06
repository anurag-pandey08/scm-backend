import { loadingSlipRepository } from "../repositories/loading-slip.repository.ts";
import { companyService } from "./company.service.ts";
import type { LoadingSlipModel } from "../generated/prisma/models.ts";
import type { LoadingSlipStatus as DbLoadingSlipStatus } from "../generated/prisma/enums.ts";
import type {
  LoadingSlip,
  LoadingSlipColumns,
  LoadingSlipPage,
  LoadingSlipStatus,
} from "../types/loading-slip.types.ts";
import type {
  LoadingSlipInput,
  SlipBookQuery,
} from "../schemas/loading-slip.schema.ts";
import { AppError } from "../utils/app-error.ts";

/**
 * The slip book, one firm at a time.
 *
 * The same translations the other two books keep in their own services —
 * Postgres enum names ↔ the words printed on the page, Decimal ↔ number, and
 * one group that is three columns in the database and one box on the paper.
 *
 * The balance is worked out here rather than stored. It is the hire plus the
 * detention allowed at the loading point, less what the driver already took —
 * three columns that are all on the row, so a stored fourth would only be a
 * chance for the four to disagree.
 */

// --- Enums ------------------------------------------------------------------
//
// Written as literal pairs rather than derived, so adding a status to one enum
// without the other is a compile error rather than a runtime one.

const STATUS_OUT: Record<DbLoadingSlipStatus, LoadingSlipStatus> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  LOADED: "Loaded",
  CANCELLED: "Cancelled",
};

/** Inverts the map above, so the pair above is the only thing to keep. */
function invert<Db extends string, Api extends string>(
  map: Record<Db, Api>,
): Record<Api, Db> {
  return Object.fromEntries(
    Object.entries(map).map(([db, api]) => [api, db]),
  ) as Record<Api, Db>;
}

const STATUS_IN = invert(STATUS_OUT);

// --- Scalars ----------------------------------------------------------------

/**
 * A Decimal column as a plain number.
 *
 * Rupees, tonnes and feet all fit a double with room to spare at the sizes a
 * slip book deals in, and the screens, the totals and the printed slip all
 * want a number. The precision that matters is in the column.
 */
function toNumber(value: unknown): number {
  return Number(value);
}

/** A date column as the ISO day the slip carries, with no clock on it. */
function toIsoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/**
 * An ISO day as a date column.
 *
 * Parsed as UTC midnight rather than local, so the day written on the slip is
 * the day stored.
 */
function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

// --- Shape ------------------------------------------------------------------

/** A row, as the printed slip lays it out. */
function toDto(row: LoadingSlipModel): LoadingSlip {
  return {
    id: row.id,
    slipNo: row.slipNo,
    slipDate: toIsoDate(row.slipDate),
    party: row.party,
    vehicleNo: row.vehicleNo,
    from: row.from,
    to: row.to,
    rate: toNumber(row.rate),
    weight: toNumber(row.weight),
    totalFreight: toNumber(row.totalFreight),
    advance: toNumber(row.advance),
    detention: toNumber(row.detention),
    dimensions: {
      length: toNumber(row.bedLength),
      width: toNumber(row.bedWidth),
      height: toNumber(row.bedHeight),
    },
    status: STATUS_OUT[row.status],
    remarks: row.remarks,
  };
}

/** A validated request body, as columns. */
function toColumns(input: LoadingSlipInput): LoadingSlipColumns {
  return {
    slipNo: input.slipNo,
    slipDate: toDate(input.slipDate),
    party: input.party,
    vehicleNo: input.vehicleNo,
    from: input.from,
    to: input.to,
    rate: input.rate,
    weight: input.weight,
    totalFreight: input.totalFreight,
    advance: input.advance,
    detention: input.detention,
    bedLength: input.dimensions.length,
    bedWidth: input.dimensions.width,
    bedHeight: input.dimensions.height,
    status: STATUS_IN[input.status],
    remarks: input.remarks,
  };
}

// --- The service -------------------------------------------------------------

export const loadingSlipService = {
  /** One page of a firm's slip book, filtered as the query string asks. */
  async page(slug: string, query: SlipBookQuery): Promise<LoadingSlipPage> {
    const company = await companyService.getRow(slug);

    const { rows, total, bookTotal, sums } = await loadingSlipRepository.page(
      company.id,
      // The filter arrives in the words printed on the slip and is put into
      // the database's own before it goes any further, so the repository never
      // has to know the two vocabularies differ.
      {
        ...query,
        status: query.status === "all" ? "all" : STATUS_IN[query.status],
      },
    );

    // Null where the filter matched nothing at all, which is zero rupees.
    const sum = (value: unknown) => toNumber(value ?? 0);
    const hire = sum(sums._sum.totalFreight);
    const advance = sum(sums._sum.advance);
    const detention = sum(sums._sum.detention);

    return {
      slips: rows.map(toDto),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        // A filtered book with nothing in it still has one page — the one
        // saying so. Without the floor the client would render "page 1 of 0".
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        bookTotal,
        totals: {
          hire,
          advance,
          // The same sum the row's own Balance box makes, taken across the
          // filtered set: detention is owed on top of the hire, and the
          // advance has already gone to the driver.
          balance: hire + detention - advance,
        },
      },
    };
  },

  async getById(slug: string, id: string): Promise<LoadingSlip> {
    const company = await companyService.getRow(slug);
    const row = await loadingSlipRepository.findById(company.id, id);

    if (!row) throw AppError.notFound("No such slip in this book");

    return toDto(row);
  },

  /**
   * The next number off the firm's slip book.
   *
   * The highest number in use plus one — not the count, which would reissue a
   * number the moment anything was deleted. An empty book starts from the
   * firm's own floor, so a fresh database numbers from where the paper did
   * rather than from 1.
   */
  async nextSlipNo(slug: string): Promise<string> {
    const company = await companyService.getRow(slug);
    const numbers = await loadingSlipRepository.slipNumbers(company.id);

    const highest = numbers.reduce(
      (max, slipNo) => Math.max(max, Number(slipNo) || 0),
      company.slipFloor,
    );

    return String(highest + 1);
  },

  async create(slug: string, input: LoadingSlipInput): Promise<LoadingSlip> {
    const company = await companyService.getRow(slug);

    await assertSlipNoFree(company.id, input.slipNo, null);

    const row = await loadingSlipRepository.create(
      company.id,
      toColumns(input),
    );
    return toDto(row);
  },

  async update(
    slug: string,
    id: string,
    input: LoadingSlipInput,
  ): Promise<LoadingSlip> {
    const company = await companyService.getRow(slug);

    await assertSlipNoFree(company.id, input.slipNo, id);

    const row = await loadingSlipRepository.update(
      company.id,
      id,
      toColumns(input),
    );

    if (!row) throw AppError.notFound("No such slip in this book");

    return toDto(row);
  },

  async remove(slug: string, id: string): Promise<void> {
    const company = await companyService.getRow(slug);
    const deleted = await loadingSlipRepository.delete(company.id, id);

    if (!deleted) throw AppError.notFound("No such slip in this book");
  },
};

/**
 * Refuses a number already written on another slip in the same book.
 *
 * The unique index would refuse it anyway, and does — this is here for the
 * message. A clerk who has just typed 2389 into a book that already has one
 * needs to be told which number is taken, not handed "duplicate key value
 * violates unique constraint".
 *
 * `exceptId` is the record being edited, which is allowed to keep its own
 * number.
 */
async function assertSlipNoFree(
  companyId: number,
  slipNo: string,
  exceptId: string | null,
): Promise<void> {
  const existing = await loadingSlipRepository.findBySlipNo(companyId, slipNo);

  if (existing && existing.id !== exceptId) {
    throw AppError.conflict(`Slip ${slipNo} is already in this book`);
  }
}
