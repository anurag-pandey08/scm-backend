import { tripRepository } from "../repositories/trip.repository.ts";
import type { TripModel } from "../generated/prisma/models.ts";
import type { Trip, TripColumns, TripPage } from "../types/trip.types.ts";
import type { RegisterQuery, TripInput } from "../schemas/trip.schema.ts";
import { AppError } from "../utils/app-error.ts";

/**
 * The office daybook.
 *
 * The thinnest of the four services, because the ledger and the database
 * disagree about less than the other books do: the columns are flat on both
 * sides, there is no enum to translate, and nothing is nested. What is left is
 * Decimal ↔ number and date ↔ ISO day.
 *
 * And no company. Every other service starts by turning a slug into a
 * `companyId`; this one has no slug to turn, because the daybook is one book
 * that both firms work. See the note on `Trip` in prisma/schema.prisma.
 */

// --- Scalars ----------------------------------------------------------------

/**
 * A Decimal column as a plain number.
 *
 * Rupees and tonnes both fit a double with room to spare at the sizes a
 * daybook deals in, and the screens and the totals all want a number. The
 * precision that matters is in the column.
 */
function toNumber(value: unknown): number {
  return Number(value);
}

/** A date column as the ISO day the ledger carries, with no clock on it. */
function toIsoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/**
 * An ISO day as a date column, and an empty box as null.
 *
 * Parsed as UTC midnight rather than local, so the day written in the ledger
 * is the day stored.
 */
function toDate(value: string): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

// --- Shape ------------------------------------------------------------------

/** A row, as the ledger lays it out. */
function toDto(row: TripModel): Trip {
  return {
    id: row.id,
    date: toIsoDate(row.date),
    truckNo: row.truckNo,
    partyName: row.partyName,
    brokerName: row.brokerName,
    from: row.from,
    to: row.to,
    goods: row.goods,
    rate: toNumber(row.rate),
    weight: toNumber(row.weight),
    advance: toNumber(row.advance),
    balance: toNumber(row.balance),
    toPay: toNumber(row.toPay),
    receiveDate: toIsoDate(row.receiveDate),
    paidDate: toIsoDate(row.paidDate),
    lrNo: row.lrNo,
    commission: toNumber(row.commission),
    remarks: row.remarks,
    partyPayment: toNumber(row.partyPayment),
    advanceReceiveRs: toNumber(row.advanceReceiveRs),
    advanceDate: toIsoDate(row.advanceDate),
    balanceReceiveRs: toNumber(row.balanceReceiveRs),
    balanceDate: toIsoDate(row.balanceDate),
  };
}

/** A validated request body, as columns. */
function toColumns(input: TripInput): TripColumns {
  return {
    // Non-null: the schema requires a real date on every row.
    date: toDate(input.date) as Date,
    truckNo: input.truckNo,
    partyName: input.partyName,
    brokerName: input.brokerName,
    from: input.from,
    to: input.to,
    goods: input.goods,
    rate: input.rate,
    weight: input.weight,
    advance: input.advance,
    balance: input.balance,
    toPay: input.toPay,
    receiveDate: toDate(input.receiveDate),
    paidDate: toDate(input.paidDate),
    lrNo: input.lrNo,
    commission: input.commission,
    remarks: input.remarks,
    partyPayment: input.partyPayment,
    advanceReceiveRs: input.advanceReceiveRs,
    advanceDate: toDate(input.advanceDate),
    balanceReceiveRs: input.balanceReceiveRs,
    balanceDate: toDate(input.balanceDate),
  };
}

// --- The service -------------------------------------------------------------

export const tripService = {
  /** One page of the daybook, filtered as the query string asks. */
  async page(query: RegisterQuery): Promise<TripPage> {
    const { rows, total, bookTotal, totals } = await tripRepository.page(query);

    return {
      trips: rows.map(toDto),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        // A filtered book with nothing in it still has one page — the one
        // saying so. Without the floor the client would render "page 1 of 0".
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        bookTotal,
        totals,
      },
    };
  },

  async getById(id: string): Promise<Trip> {
    const row = await tripRepository.findById(id);

    if (!row) throw AppError.notFound("No such trip in the register");

    return toDto(row);
  },

  async create(input: TripInput): Promise<Trip> {
    // No number to check and nothing to collide with: the ledger numbers
    // nothing, and the same lorry runs the same route again next week.
    const row = await tripRepository.create(toColumns(input));
    return toDto(row);
  },

  async update(id: string, input: TripInput): Promise<Trip> {
    const row = await tripRepository.update(id, toColumns(input));

    if (!row) throw AppError.notFound("No such trip in the register");

    return toDto(row);
  },

  async remove(id: string): Promise<void> {
    const deleted = await tripRepository.delete(id);

    if (!deleted) throw AppError.notFound("No such trip in the register");
  },
};
