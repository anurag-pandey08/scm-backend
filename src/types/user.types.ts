import type { UserModel } from "../generated/prisma/models.ts";

/**
 * A user row with the password hash removed — the only user shape allowed out
 * of the repository layer. Derived from the Prisma model rather than written
 * by hand, so a new column shows up here automatically and a renamed one is a
 * compile error.
 */
export type SafeUser = Omit<UserModel, "password">;
