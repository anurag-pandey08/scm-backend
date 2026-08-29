import type { Request, Response } from "express";
import { authService } from "../services/auth.service.ts";
import type { SigninInput, SignupInput } from "../types/auth.types.ts";
import { clearAuthCookie, setAuthCookie } from "../utils/auth-cookie.ts";

/**
 * Controllers own the HTTP layer only: read the (already validated) request,
 * call a service, set cookies, shape the response. Thrown errors propagate to
 * the error middleware — Express 5 forwards rejected promises from async
 * handlers on its own, so no asyncHandler wrapper is needed.
 *
 * `req.body` is typed via the generic slot rather than asserted, because
 * validateBody has already replaced it with the schema's parsed output.
 */
export const authController = {
  async signup(
    req: Request<unknown, unknown, SignupInput>,
    res: Response,
  ): Promise<void> {
    const { user, accessToken } = await authService.signup(req.body);

    setAuthCookie(res, accessToken);
    res.status(201).json({ success: true, data: { user } });
  },

  async signin(
    req: Request<unknown, unknown, SigninInput>,
    res: Response,
  ): Promise<void> {
    const { user, accessToken } = await authService.signin(req.body);

    setAuthCookie(res, accessToken);
    res.status(200).json({ success: true, data: { user } });
  },

  /**
   * Clearing the cookie is the whole logout: the token itself stays valid
   * until it expires, since nothing server-side tracks issued tokens. A
   * revocation list or short access tokens + refresh rotation is the upgrade
   * path if that matters.
   */
  signout(_req: Request, res: Response): void {
    clearAuthCookie(res);
    res.status(200).json({ success: true, data: null });
  },
};
