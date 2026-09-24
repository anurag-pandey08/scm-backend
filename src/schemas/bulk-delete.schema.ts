import { z } from "zod";

/**
 * The body every book's bulk delete takes.
 *
 * One schema for all four books rather than one each, because the request says
 * the same thing wherever it is sent: here are the rows the clerk ticked. What
 * the ids mean is the book's business; what makes them a well-formed request
 * is not.
 *
 * The ids are not checked for being cuids. An id that is not in the book
 * deletes nothing, and an id from the other firm's book is refused by the
 * `companyId` in the repository's `where` rather than by anything here — a
 * shape check would only be a second, weaker version of a guard that already
 * exists.
 */
export const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().trim().min(1))
    .min(1, "Tick at least one row to delete")
    // A page of a register holds at most 100 rows and the ticks are rows on
    // screen, so a longer list did not come off one. The cap is also what
    // keeps a hand-made request from asking Postgres to empty a book in a
    // single statement.
    .max(100, "Only 100 rows can be deleted at once")
    // The same id twice is the same row, and the count the register reports
    // back only reads honestly if what was asked for is counted in rows
    // rather than in mentions.
    .transform((ids) => [...new Set(ids)]),
});

export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
