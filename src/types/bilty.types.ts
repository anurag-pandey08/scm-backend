import type { Prisma } from "../generated/prisma/client.ts";
import type {
  BiltyStatus as DbBiltyStatus,
  PaymentType as DbPaymentType,
} from "../generated/prisma/enums.ts";

/**
 * The shapes a bilty travels in.
 *
 * The database keeps the parties and the charge column as flat columns,
 * because a column is a column. The API nests them, because the printed L.R.
 * nests them: "Consignor" is a block on the page with a name, an address and a
 * GST number in it, and the charge column is a block of rupee lines that get
 * added up. The screens render those blocks, so they are handed blocks.
 *
 * `src/services/bilty.service.ts` owns the translation between the two.
 */

export const PAYMENT_TYPES = ["Paid", "To Pay", "TBB"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const BILTY_STATUSES = [
  "Booked",
  "In Transit",
  "Delivered",
  "Cancelled",
] as const;
export type BiltyStatus = (typeof BILTY_STATUSES)[number];

export const RISK_TYPES = ["Owner's Risk", "Carrier's Risk"] as const;
export type RiskType = (typeof RISK_TYPES)[number];

export interface Party {
  name: string;
  address: string;
  gstNo: string;
}

/** The charge column of the L.R., rupee amounts. */
export interface BiltyCharges {
  freight: number;
  /** A.O.C. — any other charges */
  aoc: number;
  /** Loading / unloading labour */
  hamali: number;
  /** St. Charges — statistical / station charges */
  stCharges: number;
  otherCharges: number;
  /** Collected at booking, deducted from the gross total */
  advance: number;
}

export interface Insurance {
  company: string;
  policyNo: string;
  /** ISO yyyy-mm-dd, or "" where the party declared none. */
  date: string;
  amount: number;
}

/** A bilty as the API reports it — the printed L.R., field for field. */
export interface Bilty {
  id: string;
  /** L.R. No. — the number printed on the book */
  lrNo: string;
  /** ISO yyyy-mm-dd */
  lrDate: string;
  lorryNo: string;
  from: string;
  to: string;
  deliveryAt: string;
  bookingOffice: string;
  consignor: Party;
  consignee: Party;
  packages: number;
  /** "Said to contain" — declared by the consignor, not verified */
  contents: string;
  /** Kilograms */
  actualWeight: number;
  chargedWeight: number;
  declaredValue: number;
  /** Freight rate per quintal */
  rate: number;
  charges: BiltyCharges;
  paymentType: PaymentType;
  status: BiltyStatus;
  invoiceNo: string;
  eWayBillNo: string;
  risk: RiskType;
  insurance: Insurance;
  remarks: string;
}

/**
 * Every column of a bilty except the ones the database fills in itself.
 *
 * Taken from Prisma's *input* type rather than its model, because the two
 * differ exactly where it matters here: a Decimal column reads back as a
 * Decimal but is written with a plain number, and everything above this layer
 * deals in numbers.
 */
export type BiltyColumns = Omit<
  Prisma.BiltyUncheckedCreateInput,
  "id" | "companyId" | "createdAt" | "updatedAt"
>;

/**
 * The register's filters, in the words the database uses.
 *
 * The query string carries the printed words ("To Pay"); the columns hold
 * identifiers (TO_PAY). The service translates between them, so what reaches
 * the repository is already in the database's own vocabulary — which is why
 * this type exists separately from the query schema it is built from.
 */
export interface RegisterFilter {
  /** Free text across the L.R. number, the parties, the lorry and the route. */
  q: string;
  status: DbBiltyStatus | "all";
  payment: DbPaymentType | "all";
  page: number;
  pageSize: number;
}

/**
 * What a page of the register comes to.
 *
 * The footer of the printed register carries a total, and so does this one —
 * but of the whole filtered set, not of the rows on screen. A clerk filtering
 * to one party's To Pay consignments wants what that party owes altogether,
 * which is not the same as the sum of the twenty rows they can see.
 *
 * Cancelled L.R.s are left out of both figures. The numbering keeps them so it
 * stays unbroken; the money never counted them.
 */
export interface RegisterTotals {
  /** Gr. Total — every charge line, added up. */
  gross: number;
  /** What is still collectable, the advances already taken off. */
  balance: number;
}

export interface BiltyPage {
  bilties: Bilty[];
  meta: {
    page: number;
    pageSize: number;
    /** Rows matching the filters, across every page. */
    total: number;
    totalPages: number;
    /** Rows in the firm's whole book — the "of 29" in "12 of 29 bilties". */
    bookTotal: number;
    totals: RegisterTotals;
  };
}
