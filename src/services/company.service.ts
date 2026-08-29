import { COMPANY_SEEDS, isCompanySlug } from "../data/company-seeds.ts";
import { companyRepository } from "../repositories/company.repository.ts";
import type { CompanyModel } from "../generated/prisma/models.ts";
import type {
  CompanyDto,
  CompanySeed,
  Letterhead,
} from "../types/company.types.ts";
import type { LetterheadInput } from "../schemas/company.schema.ts";
import { AppError } from "../utils/app-error.ts";

/**
 * Companies, and the one thing that makes them more than a CRUD table: a firm
 * can always be put back to the letterhead printed on its own book.
 *
 * That is why the seed stays in the code after seeding. The row is what the
 * app prints; the seed is what the paper says; `isEdited` is the difference
 * between them, and `restore` closes it.
 */
export const companyService = {
  async list(): Promise<CompanyDto[]> {
    const rows = await companyRepository.findAll();
    return rows.map(toDto);
  },

  async getBySlug(slug: string): Promise<CompanyDto> {
    // Checked before the query so an unknown slug reads as "no such firm"
    // rather than as an empty result that might mean an unseeded database.
    if (!isCompanySlug(slug)) {
      throw AppError.notFound(`No firm is kept under "${slug}"`);
    }

    const row = await companyRepository.findBySlug(slug);

    if (!row) {
      // The slug names a firm we keep books for, but no row exists — the
      // database has not been seeded. Say so, rather than 404ing as though the
      // firm were made up.
      throw new AppError(
        503,
        "NOT_SEEDED",
        `"${slug}" has no row yet — run \`npm run db:seed\``,
      );
    }

    return toDto(row);
  },

  /** Writes the letterhead the office typed over the printed one. */
  async updateLetterhead(
    slug: string,
    input: LetterheadInput,
  ): Promise<CompanyDto> {
    // Proves the firm exists (and the database is seeded) before writing, so a
    // PATCH to an unknown slug fails the same way a GET does rather than as a
    // bare Prisma "record not found".
    await companyService.getBySlug(slug);

    const row = await companyRepository.update(slug, toColumns(input));
    return toDto(row);
  },

  /** Puts a firm back to the letterhead transcribed from its own book. */
  async restore(slug: string): Promise<CompanyDto> {
    if (!isCompanySlug(slug)) {
      throw AppError.notFound(`No firm is kept under "${slug}"`);
    }

    const row = await companyRepository.upsert(COMPANY_SEEDS[slug]);
    return toDto(row);
  },
};

/** Flattens a letterhead back into columns. */
function toColumns(
  input: Letterhead,
): Omit<CompanySeed, "slug" | "accentClass" | "detailsConfirmed"> {
  return {
    name: input.name,
    monogram: input.monogram,
    tagline: input.tagline,
    lrTagline: input.lrTagline,
    billTagline: input.billTagline,
    address: input.address,
    officeLine: input.officeLine,
    emailLr: input.emails.lr,
    emailBill: input.emails.bill,
    phones: input.phones,
    pan: input.pan,
    jurisdiction: input.jurisdiction,
    bankName: input.bank.name,
    bankBranch: input.bank.branch,
    bankAccountNo: input.bank.accountNo,
    bankIfsc: input.bank.ifsc,
    origin: input.origin,
    bookingOffices: input.bookingOffices,
  };
}

/** The letterhead half of a row, grouped as the printed page groups it. */
function toLetterhead(row: CompanySeed): Letterhead {
  return {
    name: row.name,
    monogram: row.monogram,
    tagline: row.tagline,
    lrTagline: row.lrTagline,
    billTagline: row.billTagline,
    address: row.address,
    officeLine: row.officeLine,
    emails: { lr: row.emailLr, bill: row.emailBill },
    phones: row.phones,
    pan: row.pan,
    jurisdiction: row.jurisdiction,
    bank: {
      name: row.bankName,
      branch: row.bankBranch,
      accountNo: row.bankAccountNo,
      ifsc: row.bankIfsc,
    },
    origin: row.origin,
    bookingOffices: row.bookingOffices,
  };
}

function toDto(row: CompanyModel): CompanyDto {
  return {
    ...toLetterhead(row),
    slug: row.slug,
    accentClass: row.accentClass,
    detailsConfirmed: row.detailsConfirmed,
    isEdited: isEdited(row),
  };
}

/**
 * Whether the row still says what the book says.
 *
 * Compared as JSON over the letterhead half only: the safeguards and the
 * timestamps are not the office's to change, and comparing them would report
 * every firm as edited the moment it was seeded. `toLetterhead` fixes the key
 * order on both sides, so this is a fair comparison rather than a lucky one.
 */
function isEdited(row: CompanyModel): boolean {
  if (!isCompanySlug(row.slug)) return true;

  const printed = toLetterhead(COMPANY_SEEDS[row.slug]);
  return JSON.stringify(toLetterhead(row)) !== JSON.stringify(printed);
}
