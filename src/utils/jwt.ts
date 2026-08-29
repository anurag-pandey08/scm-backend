import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.ts";
import type { AccessTokenPayload } from "../types/auth.types.ts";

const ISSUER = "myapp";

/**
 * The user id travels in the standard `sub` claim, which JWT defines as a
 * string — so it is stringified on the way out and parsed back on the way in,
 * and the rest of the app only ever sees the numeric id.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    // env.ts validates this against the `ms` duration grammar, so the cast
    // onto jsonwebtoken's template-literal type is checked, just not by tsc.
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: ISSUER,
    subject: String(payload.sub),
  };

  return jwt.sign({ email: payload.email }, env.JWT_SECRET, options);
}

/**
 * Returns the payload for a valid token, or `null` for anything else —
 * expired, tampered with, signed by a different secret, or simply malformed.
 * Callers treat all of those the same way, so the distinction is dropped here
 * rather than forcing every caller into a try/catch.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER });

    if (typeof decoded === "string") return null;

    const { sub, email } = decoded;
    if (typeof sub !== "string" || typeof email !== "string") return null;

    const id = Number(sub);
    if (!Number.isInteger(id)) return null;

    return { sub: id, email };
  } catch {
    return null;
  }
}
