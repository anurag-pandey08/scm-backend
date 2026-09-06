import type { TripInput } from "../schemas/trip.schema.ts";

/**
 * The daybook as it stood when the register ran on static data.
 *
 * Carried over from scm-frontend/src/lib/trip-register-data.ts, where these
 * rows were written and held against the paper.
 *
 * One book, not two. Every other seed file here is keyed by `CompanySlug` and
 * this one is not, because both firms work the same register — there is no
 * `company` on a `TripSeed` and that absence is the design. See the note on
 * `Trip` in prisma/schema.prisma.
 *
 * The dates run up to the same `SEED_ANCHOR` the other books do, and
 * prisma/seed.ts moves them as a block.
 */

export type TripSeed = TripInput;

type Row = {
  no: number;
  /** ISO yyyy-mm-dd */
  date: string;
  truck: string;
  party: string;
  /** Blank where the office placed the lorry itself. */
  broker?: string;
  to: string;
  goods: string;
  /** Rupees per tonne. */
  rate: number;
  /** Tonnes. */
  weight: number;
  advance: number;
  /** Left to pay the lorry. Defaults to hire less advance. */
  balance?: number;
  toPay?: number;
  received?: string;
  paid?: string;
  lr?: number;
  commission: number;
  /** What the party is billed for the trip. Defaults to the hire. */
  partyPayment?: number;
  advRecd?: number;
  advDate?: string;
  balRecd?: number;
  balDate?: string;
  remarks?: string;
};

/**
 * Every trip runs out of the booking office's own station. A plain constant
 * rather than a lookup: the register belongs to no one firm, so it cannot read
 * this off a `Company`.
 */
export const REGISTER_ORIGIN = "Ahmedabad";

// prettier-ignore
const ROWS: Row[] = [
  { no: 1,  date: "2026-07-06", truck: "GJ-01-BT-4471", party: "Shreeji Polymers Pvt. Ltd.", broker: "Gaal Cargo Movers", to: "Mumbai",     goods: "HDPE granules",      rate: 1400, weight: 9,    advance: 4000,  received: "2026-07-06", paid: "2026-07-11", lr: 3010, commission: 900,  advRecd: 4000,  advDate: "2026-07-06", balRecd: 8600,  balDate: "2026-07-14" },
  { no: 2,  date: "2026-07-07", truck: "GJ-18-Z-3345",  party: "Aarav Steel Traders",        broker: "Shree Balaji Transport", to: "Delhi", goods: "M.S. angles & flats", rate: 3100, weight: 8.5,  advance: 10000, received: "2026-07-07", paid: "2026-07-15", lr: 3011, commission: 1600, advRecd: 10000, advDate: "2026-07-07", balRecd: 16350, balDate: "2026-07-18" },
  { no: 3,  date: "2026-07-10", truck: "MH-04-GH-2210", party: "Maruti Engineering Works",   broker: "Gaal Cargo Movers", to: "Pune",       goods: "Machined castings",  rate: 3400, weight: 5.1,  advance: 5000,  received: "2026-07-10", paid: "2026-07-16", lr: 3014, commission: 1100, advRecd: 5000,  advDate: "2026-07-10", balRecd: 12340, balDate: "2026-07-19" },
  { no: 4,  date: "2026-07-11", truck: "GJ-06-AB-5521", party: "Navkar Plastics",            to: "Indore",                                  goods: "PVC fittings",       rate: 2850, weight: 2.6,  advance: 2500,  received: "2026-07-11", paid: "2026-07-15", lr: 3015, commission: 550,  advRecd: 2500,  advDate: "2026-07-11", balRecd: 4910,  balDate: "2026-07-17" },
  { no: 5,  date: "2026-07-13", truck: "GJ-01-EX-2214", party: "Vishwa Forgings Pvt. Ltd.",  broker: "Marudhar Roadlines", to: "Delhi",     goods: "Forged flanges",     rate: 3300, weight: 5.7,  advance: 6000,  received: "2026-07-13", paid: "2026-07-20", lr: 7401, commission: 1250, advRecd: 6000,  advDate: "2026-07-13", balRecd: 12810, balDate: "2026-07-23" },
  { no: 6,  date: "2026-07-16", truck: "RJ-19-GA-4402", party: "Girnar Marble & Granite",    broker: "Marudhar Roadlines", to: "Udaipur",   goods: "Granite slabs",      rate: 2250, weight: 12,   advance: 9000,  received: "2026-07-16", paid: "2026-07-22", lr: 7405, commission: 1400, advRecd: 9000,  advDate: "2026-07-16", balRecd: 18000, balDate: "2026-07-26", remarks: "One day held at Madri — detention allowed separately." },
  { no: 7,  date: "2026-07-18", truck: "CH-01-DL-2208", party: "Ambica Paper Mills",         to: "Chandigarh",                              goods: "Duplex board",       rate: 4000, weight: 6,    advance: 7000,  received: "2026-07-18", paid: "2026-07-27", lr: 7410, commission: 1300, advRecd: 7000,  advDate: "2026-07-18", balRecd: 17000, balDate: "2026-07-30" },
  { no: 8,  date: "2026-07-21", truck: "GJ-12-BM-5567", party: "Shubham Cables Pvt. Ltd.",   broker: "Gaal Cargo Movers", to: "Indore",     goods: "PVC cables",         rate: 2800, weight: 4.4,  advance: 4500,  received: "2026-07-21", paid: "2026-07-27", lr: 7406, commission: 700,  advRecd: 4500,  advDate: "2026-07-21", balRecd: 7820,  balDate: "2026-07-29" },
  { no: 9,  date: "2026-07-25", truck: "PB-10-CT-9945", party: "Tirupati Fasteners",         broker: "Satluj Carriers", to: "Ludhiana",     goods: "H.T. fasteners",     rate: 3850, weight: 4.8,  advance: 5000,  received: "2026-07-25", paid: "2026-08-01", lr: 7409, commission: 1150, advRecd: 5000,  advDate: "2026-07-25", balRecd: 13480, balDate: "2026-08-03" },
  { no: 10, date: "2026-07-28", truck: "GJ-04-AL-8830", party: "Ratna Agro Products",        to: "Jaipur",                                  goods: "Cattle feed bags",   rate: 2400, weight: 10,   advance: 8000,  received: "2026-07-28", paid: "2026-08-04", lr: 7402, commission: 1500, advRecd: 8000,  advDate: "2026-07-28", balRecd: 10000, balDate: "2026-08-06" },
  { no: 11, date: "2026-07-30", truck: "GJ-27-BB-1176", party: "Jay Hardware & Tools",       broker: "Saurashtra Roadways", to: "Rajkot",   goods: "Hand tools",         rate: 1400, weight: 6.4,  advance: 3000,  received: "2026-07-30", paid: "2026-08-04", lr: 7418, commission: 450,  advRecd: 3000,  advDate: "2026-07-30", balRecd: 5960,  balDate: "2026-08-05" },
  { no: 12, date: "2026-08-01", truck: "MP-09-HK-3320", party: "Narmada Traders",            broker: "Gaal Cargo Movers", to: "Bhopal",     goods: "Kraft paper reels",  rate: 2650, weight: 9.6,  advance: 9000,  received: "2026-08-01", paid: "",           lr: 7407, commission: 1350, advRecd: 9000,  advDate: "2026-08-01" },
  { no: 13, date: "2026-08-02", truck: "GJ-01-CT-7788", party: "Balaji Chemicals",           to: "Kolkata",                                 goods: "Solvent drums",      rate: 3900, weight: 16,   advance: 20000, toPay: 42400, received: "2026-08-02", paid: "",     lr: 3026, commission: 2800, remarks: "Freight to be collected at Howrah — party to settle the advance only." },
  { no: 14, date: "2026-08-03", truck: "GJ-18-Z-3345",  party: "Mehta Trading Corporation",  broker: "Marudhar Roadlines", to: "Delhi",     goods: "Armoured cable drums", rate: 3400, weight: 8,  advance: 9000,  received: "2026-08-03", paid: "",         lr: 7411, commission: 1450, advRecd: 9000,  advDate: "2026-08-03" },
  { no: 15, date: "2026-08-04", truck: "GJ-27-AX-9012", party: "Krishna Textile Mills",      to: "Surat",                                   goods: "Cotton bales",       rate: 1450, weight: 4.8,  advance: 2000,  received: "2026-08-04", paid: "",         lr: 3012, commission: 400 },
];

/**
 * Written oldest first, so that the seed inserts them in the order the clerk
 * wrote them and `createdAt` breaks a day's ties the same way the paper does.
 */
export const TRIP_SEEDS: TripSeed[] = ROWS.map((row): TripSeed => {
  const freight = Math.round(row.rate * row.weight);

  return {
    date: row.date,
    truckNo: row.truck,
    partyName: row.party,
    brokerName: row.broker ?? "",
    from: REGISTER_ORIGIN,
    to: row.to,
    goods: row.goods,
    rate: row.rate,
    weight: row.weight,
    advance: row.advance,
    balance: row.balance ?? freight - row.advance,
    toPay: row.toPay ?? 0,
    receiveDate: row.received ?? "",
    paidDate: row.paid ?? "",
    lrNo: row.lr ? String(row.lr) : "",
    commission: row.commission,
    remarks: row.remarks ?? "",
    partyPayment: row.partyPayment ?? freight,
    advanceReceiveRs: row.advRecd ?? 0,
    advanceDate: row.advDate ?? "",
    balanceReceiveRs: row.balRecd ?? 0,
    balanceDate: row.balDate ?? "",
  };
});
