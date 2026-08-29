import type { CompanyModel } from "../generated/prisma/models.ts";

/**
 * The shapes a company travels in.
 *
 * Three, deliberately:
 *
 *   `CompanySeed`      flat, one property per column — what the seed writes
 *                      and what "restore" writes back.
 *   `Letterhead`       nested, and only the fields the office may edit — what
 *                      a PATCH carries.
 *   `CompanyDto`       nested and whole — what leaves the API.
 *
 * The nesting is not decoration. `emails` and `bank` are groups on the printed
 * page and are rendered as groups, so grouping them here means the client can
 * hand a bank straight to the bank block instead of picking four loose columns
 * out of a flat object. The columns stay flat because a column is a column.
 */

/** Every column except the ones the database fills in for itself. */
export type CompanySeed = Omit<CompanyModel, "id" | "createdAt" | "updatedAt">;

export interface CompanyEmails {
  /** On the L.R. book */
  lr: string;
  /** On the bill book */
  bill: string;
}

export interface CompanyBank {
  name: string;
  branch: string;
  accountNo: string;
  ifsc: string;
}

/**
 * The half of a firm the settings screen may rewrite.
 *
 * Left out on purpose:
 *   `slug`             the firm's identity and its URL; renaming it would
 *                      strand every bilty, bill and slip filed under it
 *   `accentClass`      the tile colour that tells the two books apart at a
 *                      glance — a safeguard, not a preference
 *   `detailsConfirmed` whether the real letterhead has landed. A firm cannot
 *                      declare its own paperwork fit to hand out by typing in
 *                      a box; that is settled in the code, against the book.
 */
export interface Letterhead {
  name: string;
  monogram: string;
  tagline: string;
  lrTagline: string;
  billTagline: string;
  address: string;
  officeLine: string;
  emails: CompanyEmails;
  phones: string[];
  pan: string;
  jurisdiction: string;
  bank: CompanyBank;
  origin: string;
  bookingOffices: string[];
}

/** A firm as the API reports it. */
export interface CompanyDto extends Letterhead {
  slug: string;
  accentClass: string;
  detailsConfirmed: boolean;
  /**
   * Whether the firm is running on details the office typed rather than the
   * ones transcribed from its book. Computed against the seed rather than
   * stored, so it cannot drift out of agreement with the row it describes.
   */
  isEdited: boolean;
}
