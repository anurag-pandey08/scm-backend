import type { Request, Response } from "express";
import { biltyService } from "../services/bilty.service.ts";
import {
  registerQuerySchema,
  type BiltyInput,
} from "../schemas/bilty.schema.ts";
import { AppError } from "../utils/app-error.ts";
import { pathParam } from "../utils/path-param.ts";
import { z } from "zod";

/**
 * Every route here is mounted under `/api/companies/:slug/bilties`, so the
 * firm whose book is being read is in the path and read back out of it on each
 * request. A bilty is never addressed without its book.
 */

export const biltyController = {
  /** GET — one page of the register, filtered as the query string asks. */
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

    const page = await biltyService.page(
      pathParam(req, "slug"),
      parsed.data,
    );

    res.status(200).json({ success: true, data: page });
  },

  /**
   * GET /next-lr — the number a new L.R. should carry.
   *
   * Declared before `/:id` in the router, or "next-lr" would be read as an id.
   */
  async nextLrNo(req: Request, res: Response): Promise<void> {
    const lrNo = await biltyService.nextLrNo(pathParam(req, "slug"));

    res.status(200).json({ success: true, data: { lrNo } });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const bilty = await biltyService.getById(
      pathParam(req, "slug"),
      pathParam(req, "id"),
    );

    res.status(200).json({ success: true, data: { bilty } });
  },

  async create(req: Request, res: Response): Promise<void> {
    const bilty = await biltyService.create(
      pathParam(req, "slug"),
      req.body as BiltyInput,
    );

    res.status(201).json({ success: true, data: { bilty } });
  },

  async update(req: Request, res: Response): Promise<void> {
    const bilty = await biltyService.update(
      pathParam(req, "slug"),
      pathParam(req, "id"),
      req.body as BiltyInput,
    );

    res.status(200).json({ success: true, data: { bilty } });
  },

  async remove(req: Request, res: Response): Promise<void> {
    await biltyService.remove(pathParam(req, "slug"), pathParam(req, "id"));

    // 200 with the id rather than a bare 204: the register removes the row it
    // names, and an empty body leaves the client matching the response to the
    // request it sent.
    res
      .status(200)
      .json({ success: true, data: { id: pathParam(req, "id") } });
  },
};
