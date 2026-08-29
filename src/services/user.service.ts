import { userRepository } from "../repositories/user.repository.ts";
import type { SafeUser } from "../types/user.types.ts";
import { AppError } from "../utils/app-error.ts";

export const userService = {
  async getById(id: number): Promise<SafeUser> {
    const user = await userRepository.findById(id);

    if (!user) {
      // Reachable on a valid token whose user was deleted since it was issued.
      throw AppError.notFound("User not found");
    }

    return user;
  },
};
