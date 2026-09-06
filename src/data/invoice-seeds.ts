import { BILTY_SEEDS } from "./bilty-seeds.ts";
import type { CompanySlug } from "./company-seeds.ts";
import type { InvoiceInput } from "../schemas/invoice.schema.ts";
import type { InvoiceStatus } from "../types/invoice.types.ts";

/**
 * The two bill books as they stood when the register ran on static data.
 *
 * Carried over from scm-frontend/src/lib/invoice-data.ts, which is where these
 * bills were written and where they were held against the paper. As there,
 * every freight line is looked up out of that same firm's L.R. book rather
 * than retyped, so a bill and the bilty behind it can never disagree on the
 * lorry, the weight or the rate — and a bill can only ever cite a challan its
 * own firm booked. A spec naming an L.R. that is not in the register fails at
 * import rather than seeding a bill that refers to nothing.
 *
 * The dates run up to the same `SEED_ANCHOR` the L.R. book does, and
 * prisma/seed.ts moves both books by the same number of days — so the bills
 * and the challans they cite stay in step.
 */

export interface InvoiceSeed extends InvoiceInput {
  company: CompanySlug;
}

/** A lump-sum line: detention, halting, extra labour. */
type Charge = { particulars: string; amount: number };

type BillSpec = {
  bill: number;
  /** ISO yyyy-mm-dd */
  date: string;
  /** L.R. numbers billed together — same party, same route. */
  lrs: number[];
  /** The party's own invoice number for the goods. */
  partyInvoiceNo: string;
  charges?: Charge[];
  status: InvoiceStatus;
  paidOn?: string;
  remarks?: string;
};

// ---------------------------------------------------------------------------
// Sewak Cargo Movers
// ---------------------------------------------------------------------------

/**
 * Kept off Prettier: one spec is one row of the book, written on one line so
 * the seed reads as a table rather than a wall of object literals.
 */
// prettier-ignore
const SCM_SPECS: BillSpec[] = [
  { bill: 588, date: "2026-07-20", lrs: [3010], partyInvoiceNo: "1184", status: "Paid", paidOn: "2026-07-29" },
  { bill: 589, date: "2026-07-21", lrs: [3011], partyInvoiceNo: "742", charges: [{ particulars: "Detention — 2 days at Narela", amount: 3000 }], status: "Paid", paidOn: "2026-08-03" },
  { bill: 590, date: "2026-07-24", lrs: [3014], partyInvoiceNo: "3307", status: "Paid", paidOn: "2026-08-05" },
  { bill: 591, date: "2026-07-27", lrs: [3017], partyInvoiceNo: "884", charges: [{ particulars: "Halting charge", amount: 1500 }], status: "Paid", paidOn: "2026-08-04" },
  { bill: 592, date: "2026-07-28", lrs: [3015], partyInvoiceNo: "219", status: "Raised" },
  { bill: 593, date: "2026-07-30", lrs: [3020], partyInvoiceNo: "4472", charges: [{ particulars: "Detention — 1 day", amount: 2500 }], status: "Raised" },
  { bill: 594, date: "2026-08-01", lrs: [3022], partyInvoiceNo: "3341", status: "Raised" },
  { bill: 595, date: "2026-08-02", lrs: [3024], partyInvoiceNo: "901", status: "Raised", remarks: "Solvent drums — bill sent with the delivery challan copy." },
  { bill: 596, date: "2026-08-03", lrs: [3026], partyInvoiceNo: "4498", charges: [{ particulars: "Detention — 2 days at Howrah", amount: 4000 }, { particulars: "Extra labour on unloading", amount: 1200 }], status: "Raised" },
  { bill: 597, date: "2026-08-04", lrs: [3019, 3032], partyInvoiceNo: "662", status: "Draft", remarks: "Both trips on the Bhiwandi run — hold until L.R. 3032 is delivered." },
  { bill: 598, date: "2026-08-04", lrs: [3021], partyInvoiceNo: "5510", status: "Draft" },
  { bill: 599, date: "2026-08-04", lrs: [3013], partyInvoiceNo: "7712", status: "Cancelled", remarks: "Party disputed the rate. Withdrawn — to be re-raised at the agreed figure." },
];

/**
 * Bill 531, copied off the paper so the screen can be held against the print.
 * Its challan is older than anything in the register, so the line is written
 * out rather than looked up — bills do outlive the book they were booked in.
 */
const INDIANO_CHROME: InvoiceSeed = {
  company: "sewak-cargo-movers",
  billNo: "531",
  billDate: "2026-02-17",
  party: {
    name: "Indiano Chrome Pvt. Ltd.",
    address: "Khurdha (Odisha)",
    gstNo: "21AAFCI9440L1ZG",
  },
  from: "Ahmedabad",
  to: "Khurdha (Odisha)",
  partyInvoiceNo: "110",
  lines: [
    {
      kind: "Freight",
      challanNo: "2959",
      date: "2026-02-17",
      particulars: "OD05W 5037",
      rate: 5100,
      weight: 25,
      amount: 127500,
    },
    {
      kind: "Charge",
      challanNo: "",
      date: "",
      particulars: "Detention",
      rate: 0,
      weight: 0,
      amount: 2500,
    },
  ],
  status: "Paid",
  paidOn: "2026-03-06",
  remarks: "",
};

// ---------------------------------------------------------------------------
// Sewak Union Roadways
// ---------------------------------------------------------------------------

/**
 * Kept off Prettier: one spec is one row of the book, written on one line so
 * the seed reads as a table rather than a wall of object literals.
 */
// prettier-ignore
const SUR_SPECS: BillSpec[] = [
  { bill: 214, date: "2026-07-20", lrs: [7401], partyInvoiceNo: "3312", status: "Paid", paidOn: "2026-07-30" },
  { bill: 215, date: "2026-07-22", lrs: [7405], partyInvoiceNo: "1147", charges: [{ particulars: "Detention — 1 day at Madri", amount: 2500 }], status: "Paid", paidOn: "2026-08-04" },
  { bill: 216, date: "2026-07-25", lrs: [7406], partyInvoiceNo: "808", status: "Paid", paidOn: "2026-08-02" },
  { bill: 217, date: "2026-07-27", lrs: [7407], partyInvoiceNo: "556", status: "Raised" },
  { bill: 218, date: "2026-07-29", lrs: [7409], partyInvoiceNo: "2290", status: "Raised" },
  { bill: 219, date: "2026-07-31", lrs: [7410], partyInvoiceNo: "4471", charges: [{ particulars: "Extra labour on unloading", amount: 1000 }], status: "Raised" },
  { bill: 220, date: "2026-08-01", lrs: [7411], partyInvoiceNo: "915", status: "Raised", remarks: "Cable drums — bill sent with the delivery challan copy." },
  { bill: 221, date: "2026-08-03", lrs: [7404], partyInvoiceNo: "677", status: "Raised" },
  { bill: 222, date: "2026-08-04", lrs: [7402, 7414], partyInvoiceNo: "1902", status: "Draft", remarks: "Both Jaipur trips on the one account — hold until the July statement goes out." },
  { bill: 223, date: "2026-08-04", lrs: [7403], partyInvoiceNo: "244", status: "Cancelled", remarks: "Rate disputed by the party. Withdrawn — to be re-raised at the agreed figure." },
];

// ---------------------------------------------------------------------------

/** What a freight line comes to before anyone rounds it off. */
function freightAmount(rate: number, weight: number): number {
  return Math.round(rate * weight);
}

function buildInvoices(
  company: CompanySlug,
  specs: BillSpec[],
  loose: InvoiceSeed[] = [],
): InvoiceSeed[] {
  const byLr = new Map(
    BILTY_SEEDS.filter((seed) => seed.company === company).map((seed) => [
      seed.lrNo,
      seed,
    ]),
  );

  const lookup = (bill: number, lr: number) => {
    const bilty = byLr.get(String(lr));
    if (!bilty) {
      throw new Error(
        `${company}: bill ${bill} refers to L.R. ${lr}, which is not in its register`,
      );
    }
    return bilty;
  };

  const built = specs.map((spec): InvoiceSeed => {
    const first = lookup(spec.bill, spec.lrs[0] as number);

    const freight = spec.lrs.map((lr) => {
      const bilty = lookup(spec.bill, lr);
      // The L.R. quotes a rate per quintal against a weight in kilograms; the
      // bill quotes the same money per tonne against a weight in tonnes.
      const rate = bilty.rate * 10;
      const weight = bilty.chargedWeight / 1000;

      return {
        kind: "Freight" as const,
        challanNo: bilty.lrNo,
        date: bilty.lrDate,
        particulars: bilty.lorryNo,
        rate,
        weight,
        amount: freightAmount(rate, weight),
      };
    });

    const charges = (spec.charges ?? []).map((charge) => ({
      kind: "Charge" as const,
      challanNo: "",
      date: "",
      particulars: charge.particulars,
      rate: 0,
      weight: 0,
      amount: charge.amount,
    }));

    return {
      company,
      billNo: String(spec.bill),
      billDate: spec.date,
      party: first.consignor,
      from: first.from,
      to: first.to,
      partyInvoiceNo: spec.partyInvoiceNo,
      // Freight first, then whatever was added on — the order the paper bill
      // prints them in, and the order they are stored in.
      lines: [...freight, ...charges],
      status: spec.status,
      paidOn: spec.paidOn ?? "",
      remarks: spec.remarks ?? "",
    };
  });

  return [...built, ...loose];
}

export const INVOICE_SEEDS: InvoiceSeed[] = [
  ...buildInvoices("sewak-cargo-movers", SCM_SPECS, [INDIANO_CHROME]),
  ...buildInvoices("sewak-union-roadways", SUR_SPECS),
];
