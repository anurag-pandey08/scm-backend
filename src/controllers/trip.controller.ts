import type { Request, Response } from "express";
import { tripService } from "../services/trip.service.ts";
import {
  registerQuerySchema,
  type TripInput,
} from "../schemas/trip.schema.ts";
import { AppError } from "../utils/app-error.ts";
import { pathParam } from "../utils/path-param.ts";
import { z } from "zod";

/**
 * Mounted at `/api/trips`, not under a company.
 *
 * Every other book in this API is addressed through the firm that keeps it —
 * `/api/companies/:slug/bilties` and so on — because there is no register that
 * is not one company's. The daybook is the exception: one book, both firms, so
 * there is no slug in the path and none to read back out of it.
 */

export const tripController = {
  /** GET — one page of the daybook, filtered as the query string asks. */
  async list(req: Request, res: Response): Promise<void> {
    const parsed = registerQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      // The filters come off a URL the clerk may have edited or a link someone
      // pasted, so a bad one is a 400 with the offending parameter named
      // rather than a silent fall back to the whole book.
      throw AppError.badRequest(
        "Those filters are not valid",
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const page = await tripService.page(parsed.data);

    res.status(200).json({ success: true, data: page });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const trip = await tripService.getById(pathParam(req, "id"));

    res.status(200).json({ success: true, data: { trip } });
  },

  async create(req: Request, res: Response): Promise<void> {
    const trip = await tripService.create(req.body as TripInput);

    res.status(201).json({ success: true, data: { trip } });
  },

  async update(req: Request, res: Response): Promise<void> {
    const trip = await tripService.update(
      pathParam(req, "id"),
      req.body as TripInput,
    );

    res.status(200).json({ success: true, data: { trip } });
  },

  async remove(req: Request, res: Response): Promise<void> {
    await tripService.remove(pathParam(req, "id"));

    // 200 with the id rather than a bare 204: the register removes the row it
    // names, and an empty body leaves the client matching the response to the
    // request it sent.
    res.status(200).json({ success: true, data: { id: pathParam(req, "id") } });
  },
};
