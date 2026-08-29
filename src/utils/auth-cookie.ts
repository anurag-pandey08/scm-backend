import type { CookieOptions, Response } from "express";
import ms from "ms";
import { env, isProduction } from "../config/env.ts";

export const AUTH_COOKIE_NAME = "access_token";

/**
 * `httpOnly` keeps the token out of reach of page JavaScript, so an XSS bug
 * cannot read it. `sameSite: "lax"` blocks it from riding along on
 * cross-site POSTs — the CSRF vector that cookie auth otherwise opens.
 * `secure` is off outside production only because localhost is served over
 * plain HTTP; the cookie would never be sent otherwise.
 */
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions(),
    // Match the cookie's lifetime to the token's, so the browser stops
    // sending a credential the server would only reject.
    maxAge: ms(env.JWT_EXPIRES_IN as ms.StringValue),
  });
}

export function clearAuthCookie(res: Response): void {
  // The attributes must match those the cookie was set with, or the browser
  // treats it as a different cookie and leaves the original in place.
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
}
