import type { z } from "zod";
import type { signinSchema, signupSchema } from "../schemas/auth.schema.ts";
import type { SafeUser } from "./user.types.ts";

/**
 * Input types are inferred from the zod schemas rather than written by hand,
 * so the validated payload and the service signature cannot drift apart.
 * Note these are the *output* types: `email` has already been trimmed and
 * lowercased by the time a service sees it.
 */
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;

/** Claims carried in the access token. `sub` is the user id. */
export interface AccessTokenPayload {
  sub: number;
  email: string;
}

/** What signup and signin hand back to the controller. */
export interface AuthResult {
  user: SafeUser;
  accessToken: string;
}
