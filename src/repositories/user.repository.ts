import { prisma } from "../lib/prisma.ts";
import type { UserModel } from "../generated/prisma/models.ts";
import type { SafeUser } from "../types/user.types.ts";

/**
 * The only place that talks to `prisma.user`. Everything above this file gets
 * a `SafeUser`; the one method that returns the password hash says so in its
 * name, so a leak has to be deliberate.
 */

// An explicit column list rather than `omit: { password: true }` — a column
// added to the schema stays invisible to the API until it is listed here,
// which is the safer direction to fail in.
const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userRepository = {
  findById(id: number): Promise<SafeUser | null> {
    return prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  },

  /** Full row, password hash included — for signin verification only. */
  findByEmailWithPassword(email: string): Promise<UserModel | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  existsByEmail(email: string): Promise<boolean> {
    return prisma.user
      .findUnique({ where: { email }, select: { id: true } })
      .then((row) => row !== null);
  },

  create(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<SafeUser> {
    return prisma.user.create({ data, select: safeUserSelect });
  },
};
