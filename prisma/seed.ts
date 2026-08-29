import { BILTY_SEEDS } from "../src/data/bilty-seeds.ts";
import { COMPANY_SEED_LIST } from "../src/data/company-seeds.ts";
import { biltyService } from "../src/services/bilty.service.ts";
import { companyRepository } from "../src/repositories/company.repository.ts";
import { prisma } from "../src/lib/prisma.ts";
import { logger } from "../src/lib/logger.ts";

/**
 * Writes the firms' printed letterheads and their L.R. books into the database.
 *
 * Companies are upserted, so running it twice is not an error — but note that
 * it therefore *overwrites* a letterhead the office has edited, putting every
 * firm back to its book. That is the same thing the restore button does, only
 * for all firms at once, and it is why this is a command someone runs rather
 * than something the server does at startup.
 *
 * The bilties are only written into an empty book. A seed that overwrote a
 * register would be a data-loss button dressed up as a setup step, and unlike a
 * letterhead there is nothing printed to restore a consignment from.
 */
async function main(): Promise<void> {
  for (const seed of COMPANY_SEED_LIST) {
    const company = await companyRepository.upsert(seed);
    logger.info(`Seeded ${company.slug} — ${company.name}`);
  }

  for (const slug of new Set(BILTY_SEEDS.map((seed) => seed.company))) {
    const book = BILTY_SEEDS.filter((seed) => seed.company === slug);
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

    logger.info(`Seeded ${book.length} bilties into ${slug}`);
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
