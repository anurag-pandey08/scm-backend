import type { CompanySlug } from "./company-seeds.ts";
import type { LoadingSlipInput } from "../schemas/loading-slip.schema.ts";
import type { LoadingSlipStatus } from "../types/loading-slip.types.ts";

/**
 * The two slip books as they stood when the register ran on static data.
 *
 * Carried over from scm-frontend/src/lib/loading-slip-data.ts, which is where
 * these slips were written and held against the paper. The lorries and the
 * routes are the ones each firm actually runs, so a slip and the register
 * behind it read as the same fleet.
 *
 * Nothing here is looked up out of the L.R. book, unlike the bills — a loading
 * slip goes out before there is a bilty to look up, and often for a lorry that
 * is never booked at all. The overlap in lorry numbers is the fleet, not a
 * relation.
 *
 * The dates run up to the same `SEED_ANCHOR` the other books do, and
 * prisma/seed.ts moves them as a block.
 */

export interface LoadingSlipSeed extends LoadingSlipInput {
  company: CompanySlug;
}

type SlipSpec = {
  no: number;
  /** ISO yyyy-mm-dd */
  date: string;
  party: string;
  vehicle: string;
  to: string;
  /** Rupees per tonne. Omitted where the trip went on a lump-sum hire. */
  rate?: number;
  /** Tonnes. */
  weight: number;
  freight: number;
  advance?: number;
  detention?: number;
  /** Feet, L X W X H. Omitted where the slip book was left at zeros. */
  bed?: [number, number, number];
  status: LoadingSlipStatus;
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
const SCM_SPECS: SlipSpec[] = [
  { no: 2381, date: "2026-07-22", party: "Gaal Cargo Movers", vehicle: "GJ-01-BT-4471", to: "Mumbai", rate: 1400, weight: 9, freight: 12600, advance: 4000, bed: [22, 7.5, 7], status: "Loaded" },
  { no: 2382, date: "2026-07-25", party: "Shreeji Polymers Pvt. Ltd.", vehicle: "GJ-18-Z-3345", to: "Delhi", rate: 3100, weight: 8.5, freight: 26350, advance: 10000, detention: 1500, bed: [32, 8, 7], status: "Loaded", remarks: "Two days at Narela allowed. Detention agreed at the loading point." },
  { no: 2383, date: "2026-07-29", party: "Maruti Engineering Works", vehicle: "MH-04-GH-2210", to: "Pune", rate: 3400, weight: 5.1, freight: 17340, advance: 5000, bed: [20, 7.5, 7], status: "Loaded" },
  { no: 2384, date: "2026-08-01", party: "Balaji Chemicals & Solvents", vehicle: "GJ-01-CT-7788", to: "Kolkata", weight: 16, freight: 62000, advance: 20000, bed: [32, 8, 7], status: "Issued", remarks: "Lump-sum hire for the trip — no rate per tonne agreed." },
  { no: 2385, date: "2026-08-02", party: "Navkar Plastics", vehicle: "GJ-06-AB-5521", to: "Indore", rate: 2850, weight: 2.6, freight: 7410, advance: 2500, status: "Issued" },
  { no: 2386, date: "2026-08-03", party: "Gaal Cargo Movers", vehicle: "GJ-27-AX-9012", to: "Hathras", rate: 3600, weight: 6, freight: 21600, advance: 8000, bed: [32, 8, 7], status: "Issued", remarks: "Placed against their order. Documents to go with the bearer." },
  { no: 2387, date: "2026-08-04", party: "Shakti Pumps & Spares", vehicle: "GJ-01-BT-4471", to: "Rajkot", rate: 3000, weight: 1.8, freight: 5400, status: "Draft" },
  { no: 2388, date: "2026-08-04", party: "Aarav Steel Traders", vehicle: "GJ-18-Z-3345", to: "Jaipur", rate: 3300, weight: 4, freight: 13200, advance: 4000, status: "Cancelled", remarks: "Party released the load to another carrier before the lorry reached the gate." },
];

// ---------------------------------------------------------------------------
// Sewak Union Roadways
// ---------------------------------------------------------------------------

/**
 * Kept off Prettier: one spec is one row of the book, written on one line so
 * the seed reads as a table rather than a wall of object literals.
 */
// prettier-ignore
const SUR_SPECS: SlipSpec[] = [
  { no: 1142, date: "2026-07-23", party: "Vishwa Forgings Pvt. Ltd.", vehicle: "GJ-01-EX-2214", to: "Delhi", rate: 3300, weight: 5.7, freight: 18810, advance: 6000, bed: [32, 8, 7], status: "Loaded" },
  { no: 1143, date: "2026-07-26", party: "Girnar Marble & Granite", vehicle: "RJ-19-GA-4402", to: "Udaipur", rate: 2250, weight: 12, freight: 27000, advance: 9000, detention: 2500, bed: [22, 7.5, 7], status: "Loaded", remarks: "One day held at Madri. Detention allowed at the loading point." },
  { no: 1144, date: "2026-07-30", party: "Ambica Paper Mills", vehicle: "CH-01-DL-2208", to: "Chandigarh", rate: 4000, weight: 6, freight: 24000, advance: 7000, bed: [32, 8, 7], status: "Loaded" },
  { no: 1145, date: "2026-08-01", party: "Ratna Agro Industries", vehicle: "GJ-04-AL-8830", to: "Jaipur", rate: 2350, weight: 9, freight: 21150, advance: 7000, status: "Issued" },
  { no: 1146, date: "2026-08-02", party: "Shubham Cables Pvt. Ltd.", vehicle: "PB-10-CT-9945", to: "Ludhiana", rate: 3900, weight: 3.6, freight: 14040, advance: 5000, bed: [20, 7.5, 7], status: "Issued" },
  { no: 1147, date: "2026-08-03", party: "Gaal Cargo Movers", vehicle: "MP-09-HK-3320", to: "Bhopal", weight: 7.2, freight: 19440, advance: 6000, status: "Issued", remarks: "Placed against their order. Lump-sum hire for the trip." },
  { no: 1148, date: "2026-08-04", party: "Jay Hardware Stores", vehicle: "GJ-27-BB-1176", to: "Rajkot", rate: 1400, weight: 6.4, freight: 8960, status: "Draft" },
  { no: 1149, date: "2026-08-04", party: "Tirupati Fasteners", vehicle: "GJ-12-BM-5567", to: "Indore", rate: 2750, weight: 8.8, freight: 24200, advance: 7000, status: "Cancelled", remarks: "Lorry not placed in time — the order went elsewhere." },
];

// ---------------------------------------------------------------------------

function buildSlips(
  company: CompanySlug,
  origin: string,
  specs: SlipSpec[],
): LoadingSlipSeed[] {
  return specs.map((spec): LoadingSlipSeed => {
    const [length, width, height] = spec.bed ?? [0, 0, 0];

    return {
      company,
      slipNo: String(spec.no),
      slipDate: spec.date,
      party: spec.party,
      vehicleNo: spec.vehicle,
      from: origin,
      to: spec.to,
      rate: spec.rate ?? 0,
      weight: spec.weight,
      totalFreight: spec.freight,
      advance: spec.advance ?? 0,
      detention: spec.detention ?? 0,
      dimensions: { length, width, height },
      status: spec.status,
      remarks: spec.remarks ?? "",
    };
  });
}

export const LOADING_SLIP_SEEDS: LoadingSlipSeed[] = [
  // Both firms place lorries out of the same Odhav premises, so both books
  // read "From: Ahmedabad" — the letterhead's own origin.
  ...buildSlips("sewak-cargo-movers", "Ahmedabad", SCM_SPECS),
  ...buildSlips("sewak-union-roadways", "Ahmedabad", SUR_SPECS),
];
