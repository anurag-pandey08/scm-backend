import { z } from "zod";

/**
 * Request-body shapes for the auth endpoints. These are the single source of
 * truth: `src/types/auth.types.ts` infers its input types from them, so a
 * field cannot be added to a schema without the service seeing it.
 */

// Emails are lowercased at the edge so `A@x.com` and `a@x.com` cannot become
// two accounts — the DB unique index is case-sensitive.
const email = z
  .email("must be a valid email address")
  .trim()
  .toLowerCase()
  .max(254);

const password = z
  .string()
  .min(8, "must be at least 8 characters")
  // bcrypt silently ignores bytes past 72; reject instead of truncating.
  .max(72, "must be at most 72 characters");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "must be at least 2 characters").max(80),
  email,
  password,
});

export const signinSchema = z.object({
  email,
  // No shape rules on signin: the stored password predates any rule change,
  // and echoing policy back here just tells an attacker what to guess.
  password: z.string().min(1, "is required"),
});
