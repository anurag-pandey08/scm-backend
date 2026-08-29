import type { Request, Response } from "express";
import { z } from "zod";
import { dashboardService } from "../services/dashboard.service.ts";
import { dashboardQuerySchema } from "../schemas/dashboard.schema.ts";
import { AppError } from "../utils/app-error.ts";
import { pathParam } from "../utils/path-param.ts";

/**
 * Mounted under `/api/companies/:slug/dashboard`. One firm, one request: every
 * figure on the screen is read in a single query batch, so nothing on it can
 * disagree with anything else on it.
 */
export const dashboardController = {
  async summary(req: Request, res: Response): Promise<void> {
    const parsed = dashboardQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      // Same rule as the register's filters: a window that cannot be read is
      // said so, rather than quietly answered for some other period.
      throw AppError.badRequest(
        "That is not a window we can report on",
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const dashboard = await dashboardService.summary(
      pathParam(req, "slug"),
      parsed.data,
    );

    res.status(200).json({ success: true, data: { dashboard } });
  },
};
