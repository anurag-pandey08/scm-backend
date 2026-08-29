import { COMPANY_SEED_LIST } from "../src/data/company-seeds.ts";
import { companyRepository } from "../src/repositories/company.repository.ts";
import { prisma } from "../src/lib/prisma.ts";
import { logger } from "../src/lib/logger.ts";

/**
 * Writes the firms' printed letterheads into the database.
 *
 * Upserts rather than creates, so running it twice is not an error — but note
 * that it therefore *overwrites* a letterhead the office has edited, putting
 * every firm back to its book. That is the same thing the restore button does,
 * only for all firms at once, and it is why this is a command someone runs
 * rather than something the server does at startup.
 */
async function main(): Promise<void> {
  for (const seed of COMPANY_SEED_LIST) {
    const company = await companyRepository.upsert(seed);
    logger.info(`Seeded ${company.slug} — ${company.name}`);
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
