import { userRepository } from "../repositories/user.repository.ts";
import type {
  AuthResult,
  SigninInput,
  SignupInput,
} from "../types/auth.types.ts";
import { AppError } from "../utils/app-error.ts";
import { hashPassword, verifyPassword } from "../utils/hash.ts";
import { signAccessToken } from "../utils/jwt.ts";

/**
 * A real cost-12 bcrypt hash of a random string nobody holds. Signin compares
 * against it when the email is unknown, so the "no such user" path costs the
 * same ~250ms as the "wrong password" path — otherwise response timing tells
 * an attacker which emails are registered.
 *
 * Must stay at the same cost as SALT_ROUNDS in src/utils/hash.ts.
 */
const DUMMY_HASH =
  "$2b$12$IdYOknl2nih.3fkbOy02YOL1qG6qKc/Ly2.TV9sBzcn2p3yx13cLe";

export const authService = {
  async signup(input: SignupInput): Promise<AuthResult> {
    // A check-then-insert race can still let two concurrent signups past this
    // point; the unique index on User.email is what actually holds the line,
    // and the controller maps its violation to the same 409.
    if (await userRepository.existsByEmail(input.email)) {
      throw AppError.conflict("An account with this email already exists");
    }

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: await hashPassword(input.password),
    });

    return {
      user,
      accessToken: signAccessToken({ sub: user.id, email: user.email }),
    };
  },

  async signin(input: SigninInput): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithPassword(input.email);

    // Same generic message and comparable timing for both failure modes:
    // whether the email exists is not something an unauthenticated caller
    // gets to learn from this endpoint.
    const passwordMatches = await verifyPassword(
      input.password,
      user?.password ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password",
      );
    }

    const { password: _password, ...safeUser } = user;

    return {
      user: safeUser,
      accessToken: signAccessToken({ sub: user.id, email: user.email }),
    };
  },
};
