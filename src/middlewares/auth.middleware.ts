import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME } from "../utils/auth-cookie.ts";
import { AppError } from "../utils/app-error.ts";
import { verifyAccessToken } from "../utils/jwt.ts";

/**
 * Rejects the request unless it carries a valid access token, and attaches the
 * token payload to `req.user` when it does.
 *
 * The token is read from the httpOnly auth cookie, with `Authorization:
 * Bearer <token>` accepted as a fallback so non-browser clients (curl, tests,
 * a future mobile app) can authenticate without a cookie jar.
 *
 * This only proves the token was signed by us and has not expired — it does
 * not confirm the user still exists. Handlers that need the live row load it
 * by `req.user.sub`.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = readToken(req);

  if (!token) {
    next(AppError.unauthorized());
    return;
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    next(AppError.unauthorized("Invalid or expired session"));
    return;
  }

  req.user = payload;
  next();
}

function readToken(req: Request): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const fromCookie = cookies?.[AUTH_COOKIE_NAME];
  if (typeof fromCookie === "string" && fromCookie.length > 0) {
    return fromCookie;
  }

  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const value = header.slice("Bearer ".length).trim();
    if (value.length > 0) return value;
  }

  return null;
}
