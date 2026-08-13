import type { Request, Response } from "express";
import { userService } from "../services/user.service.ts";
import { AppError } from "../utils/app-error.ts";

export const userController = {
  /** GET /api/users/me — the authenticated caller's own profile. */
  async getMe(req: Request, res: Response): Promise<void> {
    // Only reachable behind requireAuth, which always sets req.user; this
    // guard exists so the route cannot be mounted without it by accident.
    if (!req.user) throw AppError.unauthorized();

    const user = await userService.getById(req.user.sub);

    res.status(200).json({ success: true, data: { user } });
  },
};
