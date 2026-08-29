import { biltyRepository } from "../repositories/bilty.repository.ts";
import { companyService } from "./company.service.ts";
import type { BiltyModel } from "../generated/prisma/models.ts";
import type {
  BiltyStatus as DbBiltyStatus,
  PaymentType as DbPaymentType,
  RiskType as DbRiskType,
} from "../generated/prisma/enums.ts";
import type {
  Bilty,
  BiltyColumns,
  BiltyPage,
  BiltyStatus,
  PaymentType,
  RiskType,
} from "../types/bilty.types.ts";
import type { BiltyInput, RegisterQuery } from "../schemas/bilty.schema.ts";
import { AppError } from "../utils/app-error.ts";

/**
 * The L.R. book, one firm at a time.
 *
 * Three translations live here and nowhere else:
 *
 *   flat columns ↔ the nested blocks the printed L.R. is laid out in
 *   Postgres enum names ↔ the words printed on the page
 *   Decimal ↔ number
 *
 * All three exist because the database and the paper disagree about shape, not
 * about meaning. Keeping the disagreement in one file means the repository can
 * think in columns, the API can answer in documents, and neither has to know
 * about the other.
 */

// --- Enums ------------------------------------------------------------------
//
// Postgres holds the printed words (see the @map in the schema) but Prisma's
// client speaks in identifiers, so the two have to be introduced. Written as
// literal pairs rather than derived, so adding a status to one enum without
// the other is a compile error rather than a runtime one.

const PAYMENT_OUT: Record<DbPaymentType, PaymentType> = {
  PAID: "Paid",
  TO_PAY: "To Pay",
  TBB: "TBB",
};

const STATUS_OUT: Record<DbBiltyStatus, BiltyStatus> = {
  BOOKED: "Booked",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const RISK_OUT: Record<DbRiskType, RiskType> = {
  OWNERS_RISK: "Owner's Risk",
  CARRIERS_RISK: "Carrier's Risk",
};

/** Inverts one of the maps above, so the pair above is the only thing to keep. */
function invert<Db extends string, Api extends string>(
  map: Record<Db, Api>,
): Record<Api, Db> {
  return Object.fromEntries(
    Object.entries(map).map(([db, api]) => [api, db]),
  ) as Record<Api, Db>;
}

const PAYMENT_IN = invert(PAYMENT_OUT);
const STATUS_IN = invert(STATUS_OUT);
const RISK_IN = invert(RISK_OUT);

// --- Scalars ----------------------------------------------------------------

/**
 * A Decimal column as a plain number.
 *
 * Rupees and kilograms both fit a double with room to spare at the sizes a
 * freight register deals in, and the screens, the totals and the printed L.R.
 * all want a number. The precision that matters is in the column, which is
 * where the figure is added up and stored.
 */
function toNumber(value: unknown): number {
  return Number(value);
}

/** A date column as the ISO day the L.R. carries, with no clock on it. */
function toIsoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/**
 * An ISO day as a date column.
 *
 * Parsed as UTC midnight rather than local, so the day written on the L.R. is
 * the day stored. `new Date("2026-08-04")` already does this; the explicit
 * suffix says it is deliberate rather than a habit.
 */
function toDate(value: string): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

// --- Shape ------------------------------------------------------------------

/** A row, as the printed L.R. lays it out. */
function toDto(row: BiltyModel): Bilty {
  return {
    id: row.id,
    lrNo: row.lrNo,
    lrDate: toIsoDate(row.lrDate),
    lorryNo: row.lorryNo,
    from: row.from,
    to: row.to,
    deliveryAt: row.deliveryAt,
    bookingOffice: row.bookingOffice,
    consignor: {
      name: row.consignorName,
      address: row.consignorAddress,
      gstNo: row.consignorGstNo,
    },
    consignee: {
      name: row.consigneeName,
      address: row.consigneeAddress,
      gstNo: row.consigneeGstNo,
    },
    packages: row.packages,
    contents: row.contents,
    actualWeight: toNumber(row.actualWeight),
    chargedWeight: toNumber(row.chargedWeight),
    declaredValue: toNumber(row.declaredValue),
    rate: toNumber(row.rate),
    charges: {
      freight: toNumber(row.freight),
      aoc: toNumber(row.aoc),
      hamali: toNumber(row.hamali),
      stCharges: toNumber(row.stCharges),
      otherCharges: toNumber(row.otherCharges),
      advance: toNumber(row.advance),
    },
    paymentType: PAYMENT_OUT[row.paymentType],
    status: STATUS_OUT[row.status],
    invoiceNo: row.invoiceNo,
    eWayBillNo: row.eWayBillNo,
    risk: RISK_OUT[row.risk],
    insurance: {
      company: row.insuranceCompany,
      policyNo: row.insurancePolicyNo,
      date: toIsoDate(row.insuranceDate),
      amount: toNumber(row.insuranceAmount),
    },
    remarks: row.remarks,
  };
}

/** A validated request body, as columns. */
function toColumns(input: BiltyInput): BiltyColumns {
  return {
    lrNo: input.lrNo,
    // Non-null: the schema requires a real date on every L.R.
    lrDate: toDate(input.lrDate) as Date,
    lorryNo: input.lorryNo,
    from: input.from,
    to: input.to,
    deliveryAt: input.deliveryAt,
    bookingOffice: input.bookingOffice,
    consignorName: input.consignor.name,
    consignorAddress: input.consignor.address,
    consignorGstNo: input.consignor.gstNo,
    consigneeName: input.consignee.name,
    consigneeAddress: input.consignee.address,
    consigneeGstNo: input.consignee.gstNo,
    packages: input.packages,
    contents: input.contents,
    actualWeight: input.actualWeight,
    chargedWeight: input.chargedWeight,
    declaredValue: input.declaredValue,
    rate: input.rate,
    freight: input.charges.freight,
    aoc: input.charges.aoc,
    hamali: input.charges.hamali,
    stCharges: input.charges.stCharges,
    otherCharges: input.charges.otherCharges,
    advance: input.charges.advance,
    paymentType: PAYMENT_IN[input.paymentType],
    status: STATUS_IN[input.status],
    risk: RISK_IN[input.risk],
    invoiceNo: input.invoiceNo,
    eWayBillNo: input.eWayBillNo,
    insuranceCompany: input.insurance.company,
    insurancePolicyNo: input.insurance.policyNo,
    insuranceDate: toDate(input.insurance.date),
    insuranceAmount: input.insurance.amount,
    remarks: input.remarks,
  };
}

// --- The service -------------------------------------------------------------

export const biltyService = {
  /** One page of a firm's register, filtered as the query string asks. */
  async page(slug: string, query: RegisterQuery): Promise<BiltyPage> {
    const company = await companyService.getRow(slug);
    const { rows, total, bookTotal, sums } = await biltyRepository.page(
      company.id,
      // The filters arrive in the words printed on the L.R. and are put into
      // the database's own before they go any further, so the repository never
      // has to know the two vocabularies differ.
      {
        ...query,
        status: query.status === "all" ? "all" : STATUS_IN[query.status],
        payment: query.payment === "all" ? "all" : PAYMENT_IN[query.payment],
      },
    );

    const sum = (value: unknown) => toNumber(value ?? 0);
    const gross =
      sum(sums._sum.freight) +
      sum(sums._sum.aoc) +
      sum(sums._sum.hamali) +
      sum(sums._sum.stCharges) +
      sum(sums._sum.otherCharges);

    return {
      bilties: rows.map(toDto),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        // A filtered register with nothing in it still has one page — the one
        // saying so. Without the floor the client would render "page 1 of 0".
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        bookTotal,
        totals: { gross, balance: gross - sum(sums._sum.advance) },
      },
    };
  },

  async getById(slug: string, id: string): Promise<Bilty> {
    const company = await companyService.getRow(slug);
    const row = await biltyRepository.findById(company.id, id);

    if (!row) throw AppError.notFound("No such bilty in this book");

    return toDto(row);
  },

  /**
   * The next number off the firm's book.
   *
   * The highest number in use plus one — not the count, which would reissue a
   * number the moment anything was deleted. An empty book starts from the
   * firm's own floor, so a fresh database numbers from where the paper did
   * rather than from 1.
   */
  async nextLrNo(slug: string): Promise<string> {
    const company = await companyService.getRow(slug);
    const numbers = await biltyRepository.lrNumbers(company.id);

    const highest = numbers.reduce(
      (max, lrNo) => Math.max(max, Number(lrNo) || 0),
      company.lrFloor,
    );

    return String(highest + 1);
  },

  async create(slug: string, input: BiltyInput): Promise<Bilty> {
    const company = await companyService.getRow(slug);

    await assertLrNoFree(company.id, input.lrNo, null);

    const row = await biltyRepository.create(company.id, toColumns(input));
    return toDto(row);
  },

  async update(slug: string, id: string, input: BiltyInput): Promise<Bilty> {
    const company = await companyService.getRow(slug);

    await assertLrNoFree(company.id, input.lrNo, id);

    const row = await biltyRepository.update(company.id, id, toColumns(input));

    if (!row) throw AppError.notFound("No such bilty in this book");

    return toDto(row);
  },

  async remove(slug: string, id: string): Promise<void> {
    const company = await companyService.getRow(slug);
    const deleted = await biltyRepository.delete(company.id, id);

    if (!deleted) throw AppError.notFound("No such bilty in this book");
  },
};

/**
 * Refuses a number already written on another L.R. in the same book.
 *
 * The unique index would refuse it anyway, and does — this is here for the
 * message. A clerk who has just typed 3037 into a book that already has one
 * needs to be told which number is taken, not handed "duplicate key value
 * violates unique constraint".
 *
 * `exceptId` is the record being edited, which is allowed to keep its own
 * number.
 */
async function assertLrNoFree(
  companyId: number,
  lrNo: string,
  exceptId: string | null,
): Promise<void> {
  const existing = await biltyRepository.findByLrNo(companyId, lrNo);

  if (existing && existing.id !== exceptId) {
    throw AppError.conflict(`L.R. ${lrNo} is already in this register`);
  }
}
