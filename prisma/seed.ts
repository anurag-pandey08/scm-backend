import { BILTY_SEEDS, SEED_ANCHOR, type BiltySeed } from "../src/data/bilty-seeds.ts";
import { COMPANY_SEED_LIST } from "../src/data/company-seeds.ts";
import { INVOICE_SEEDS, type InvoiceSeed } from "../src/data/invoice-seeds.ts";
import {
  LOADING_SLIP_SEEDS,
  type LoadingSlipSeed,
} from "../src/data/loading-slip-seeds.ts";
import { TRIP_SEEDS, type TripSeed } from "../src/data/trip-seeds.ts";
import { biltyService } from "../src/services/bilty.service.ts";
import { invoiceService } from "../src/services/invoice.service.ts";
import { loadingSlipService } from "../src/services/loading-slip.service.ts";
import { tripService } from "../src/services/trip.service.ts";
import { companyRepository } from "../src/repositories/company.repository.ts";
import { prisma } from "../src/lib/prisma.ts";
import { logger } from "../src/lib/logger.ts";
import {
  addDays,
  daysBetween,
  isoDay,
  officeToday,
} from "../src/utils/office-day.ts";

/**
 * Writes the firms' printed letterheads, their three books — the L.R.
 * register, the bill book and the slip book — and the one daybook they share
 * into the database.
 *
 * Companies are upserted, so running it twice is not an error — but note that
 * it therefore *overwrites* a letterhead the office has edited, putting every
 * firm back to its book. That is the same thing the restore button does, only
 * for all firms at once, and it is why this is a command someone runs rather
 * than something the server does at startup.
 *
 * The three books are only written into when empty. A seed that overwrote a
 * register would be a data-loss button dressed up as a setup step, and unlike
 * a letterhead there is nothing printed to restore a consignment from.
 */

/**
 * How far a book has to move so it ends on the day it should.
 *
 * The dashboard reads the last thirty days off the clock, so a book with dates
 * fixed in the file is a book that quietly empties the screen as the months
 * pass — a fresh database seeded in December would open on a dashboard with
 * nothing on it. Every date moves by the same number of days, so the shape of
 * the book is untouched: the same numbers on the same lorries, the same gaps
 * between bookings, just ending where it should instead of on the day it was
 * transcribed.
 *
 * Only the dates move. Nothing else about a seeded consignment or bill differs
 * from what was verified against the paper.
 */
function shiftTo(lastDay: string): number {
  return daysBetween(SEED_ANCHOR, lastDay);
}

/** A day moved by `shift`, leaving a blank box blank. */
function moved(iso: string, shift: number): string {
  return iso ? addDays(iso, shift) : "";
}

function biltiesEnding(book: BiltySeed[], shift: number): BiltySeed[] {
  if (shift === 0) return book;

  return book.map((seed) => ({
    ...seed,
    lrDate: moved(seed.lrDate, shift),
    insurance: {
      ...seed.insurance,
      // Left blank where the party declared no insurance — an empty box is not
      // a date to move.
      date: moved(seed.insurance.date, shift),
    },
  }));
}

/**
 * The bill book, moved to sit on the register rather than on the clock.
 *
 * Three dates to a bill: the day it was raised, the day the party settled it,
 * and the challan date on each freight line — and the last of those is a copy
 * of the bilty's own `lrDate`, so it has to land on the day the register
 * actually puts that consignment.
 *
 * Which is why the shift is taken from the register rather than from today.
 * The two books are seeded independently, and a database whose register was
 * seeded last month would otherwise get bills dated today citing challans
 * dated four weeks ago — the bill and the consignment behind it disagreeing
 * about when it ran. See `registerEndsOn`.
 */
function invoicesEnding(book: InvoiceSeed[], shift: number): InvoiceSeed[] {
  if (shift === 0) return book;

  return book.map((seed) => ({
    ...seed,
    billDate: moved(seed.billDate, shift),
    paidOn: moved(seed.paidOn, shift),
    lines: seed.lines.map((line) => ({
      ...line,
      date: moved(line.date, shift),
    })),
  }));
}

/**
 * The slip book, moved by the same shift as the rest.
 *
 * One date to a slip, and no relation to anything in the register — a slip
 * goes out before there is a bilty to point at. It is anchored to the register
 * anyway, so that the three books on the sidebar read as one office's month
 * rather than three timelines that happen to share a database.
 */
function slipsEnding(
  book: LoadingSlipSeed[],
  shift: number,
): LoadingSlipSeed[] {
  if (shift === 0) return book;

  return book.map((seed) => ({
    ...seed,
    slipDate: moved(seed.slipDate, shift),
  }));
}

/**
 * The daybook, moved by the same shift as the rest.
 *
 * Five dates to a row — the trip's own, and the four the money is settled on —
 * and every one of them moves together, so a balance still lands eight days
 * after the advance it was drawn against.
 *
 * Anchored to one firm's register rather than to the clock, for the same
 * reason the bill book is: it cites L.R. numbers, and the three books on the
 * sidebar should read as one office's month. Which firm's register is
 * arbitrary — the daybook belongs to neither and cites both — so the caller
 * picks one and the choice is noted there.
 */
function tripsEnding(book: TripSeed[], shift: number): TripSeed[] {
  if (shift === 0) return book;

  return book.map((seed) => ({
    ...seed,
    date: moved(seed.date, shift),
    receiveDate: moved(seed.receiveDate, shift),
    paidDate: moved(seed.paidDate, shift),
    advanceDate: moved(seed.advanceDate, shift),
    balanceDate: moved(seed.balanceDate, shift),
  }));
}

/**
 * The day a firm's register actually ends on.
 *
 * Today for a book seeded in this run, and whenever it was seeded for one that
 * was already there. Either way it is the day the bill book has to be pinned
 * to. A firm with no register at all falls back to today — there are no
 * challans to disagree with.
 */
async function registerEndsOn(slug: string): Promise<string> {
  const { _max } = await prisma.bilty.aggregate({
    where: { company: { slug } },
    _max: { lrDate: true },
  });

  return _max.lrDate ? isoDay(_max.lrDate) : officeToday();
}

async function main(): Promise<void> {
  for (const seed of COMPANY_SEED_LIST) {
    const company = await companyRepository.upsert(seed);
    logger.info(`Seeded ${company.slug} — ${company.name}`);
  }

  for (const slug of new Set(BILTY_SEEDS.map((seed) => seed.company))) {
    // A register is seeded to end today — nothing else is anchored to it.
    const book = biltiesEnding(
      BILTY_SEEDS.filter((seed) => seed.company === slug),
      shiftTo(officeToday()),
    );
    const existing = await prisma.bilty.count({
      where: { company: { slug } },
    });

    if (existing > 0) {
      logger.info(
        `Skipped ${slug} — its book already holds ${existing} bilties`,
      );
      continue;
    }

    // Written through the service rather than straight into Prisma, so the
    // seeded rows go in as the API would write them: the same shape mapping,
    // the same enum translation, the same duplicate-number check.
    for (const { company, ...bilty } of book) {
      await biltyService.create(company, bilty);
    }

    logger.info(
      `Seeded ${book.length} bilties into ${slug} — book ends ${officeToday()}`,
    );
  }

  for (const slug of new Set(INVOICE_SEEDS.map((seed) => seed.company))) {
    // …and a bill book is seeded to sit on that register, wherever it ended up.
    const book = invoicesEnding(
      INVOICE_SEEDS.filter((seed) => seed.company === slug),
      shiftTo(await registerEndsOn(slug)),
    );
    const existing = await prisma.invoice.count({
      where: { company: { slug } },
    });

    if (existing > 0) {
      logger.info(`Skipped ${slug} — its book already holds ${existing} bills`);
      continue;
    }

    // Through the service, for the same reasons the bilties are: the same
    // shape mapping, the same enum translation, the same duplicate-number
    // check — and, here, the same blanking of a charge line's challan and rate.
    for (const { company, ...invoice } of book) {
      await invoiceService.create(company, invoice);
    }

    logger.info(`Seeded ${book.length} bills into ${slug}`);
  }

  for (const slug of new Set(LOADING_SLIP_SEEDS.map((seed) => seed.company))) {
    const book = slipsEnding(
      LOADING_SLIP_SEEDS.filter((seed) => seed.company === slug),
      shiftTo(await registerEndsOn(slug)),
    );
    const existing = await prisma.loadingSlip.count({
      where: { company: { slug } },
    });

    if (existing > 0) {
      logger.info(`Skipped ${slug} — its book already holds ${existing} slips`);
      continue;
    }

    for (const { company, ...slip } of book) {
      await loadingSlipService.create(company, slip);
    }

    logger.info(`Seeded ${book.length} slips into ${slug}`);
  }

  // One daybook, so one pass and no loop over firms. Anchored to Sewak Cargo
  // Movers' register because the rows have to sit on *a* timeline and that is
  // the older of the two books; the daybook itself belongs to neither.
  const daybook = tripsEnding(
    TRIP_SEEDS,
    shiftTo(await registerEndsOn("sewak-cargo-movers")),
  );
  const existingTrips = await prisma.trip.count();

  if (existingTrips > 0) {
    logger.info(
      `Skipped the daybook — it already holds ${existingTrips} trips`,
    );
  } else {
    for (const trip of daybook) {
      await tripService.create(trip);
    }

    logger.info(`Seeded ${daybook.length} trips into the daybook`);
  }
}

try {
  await main();
} catch (error) {
  logger.error("Seed failed", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
