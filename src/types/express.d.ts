import type { AccessTokenPayload } from "./auth.types.ts";

/**
 * Adds the authenticated caller to `Request`. Only `requireAuth`
 * (src/middlewares/auth.middleware.ts) sets it, so it is optional here and
 * narrowed to non-null by that middleware's own type guard.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
