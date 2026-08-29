import { prisma } from "../lib/prisma.ts";
import type { CompanyModel } from "../generated/prisma/models.ts";
import type { CompanySeed } from "../types/company.types.ts";

/**
 * The only place that talks to `prisma.company`.
 *
 * Rows come out whole: unlike a user there is nothing on a company the API may
 * not show — the letterhead is printed on every document the firm hands out,
 * so there is no column here to keep back.
 */
export const companyRepository = {
  findAll(): Promise<CompanyModel[]> {
    // Sidebar order is the order the books are kept in, which is the order they
    // were seeded in. `id` holds that; `name` would reorder them on a rename.
    return prisma.company.findMany({ orderBy: { id: "asc" } });
  },

  findBySlug(slug: string): Promise<CompanyModel | null> {
    return prisma.company.findUnique({ where: { slug } });
  },

  /** Writes the editable columns. `slug` and the safeguards are not among them. */
  update(
    slug: string,
    data: Omit<
    CompanySeed,
    "slug" | "accentClass" | "detailsConfirmed" | "lrFloor"
  >,
  ): Promise<CompanyModel> {
    return prisma.company.update({ where: { slug }, data });
  },

  /**
   * Writes a whole row, creating it if the slug is new.
   *
   * Both the seed and "restore" go through here, and both mean the same thing:
   * make the row say exactly what the book says. `slug` is dropped from the
   * update half because it is the thing being matched on.
   */
  upsert(seed: CompanySeed): Promise<CompanyModel> {
    const { slug, ...rest } = seed;
    return prisma.company.upsert({
      where: { slug },
      create: seed,
      update: rest,
    });
  },
};
