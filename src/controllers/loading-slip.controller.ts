import type { Request, Response } from "express";
import { loadingSlipService } from "../services/loading-slip.service.ts";
import {
  slipBookQuerySchema,
  type LoadingSlipInput,
} from "../schemas/loading-slip.schema.ts";
import { AppError } from "../utils/app-error.ts";
import { pathParam } from "../utils/path-param.ts";
import { z } from "zod";

/**
 * Every route here is mounted under `/api/companies/:slug/loading-slips`, so
 * the firm whose book is being read is in the path and read back out of it on
 * each request. A slip is never addressed without its book.
 */

export const loadingSlipController = {
  /** GET — one page of the slip book, filtered as the query string asks. */
  async list(req: Request, res: Response): Promise<void> {
    const parsed = slipBookQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      // The filters come off a URL the clerk may have edited or a link someone
      // pasted, so a bad one is a 400 with the offending parameter named
      // rather than a silent fall back to the whole book.
      throw AppError.badRequest(
        "Those filters are not valid",
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const page = await loadingSlipService.page(
      pathParam(req, "slug"),
      parsed.data,
    );

    res.status(200).json({ success: true, data: page });
  },

  /**
   * GET /next-slip — the number a new slip should carry.
   *
   * Declared before `/:id` in the router, or "next-slip" would be read as an id.
   */
  async nextSlipNo(req: Request, res: Response): Promise<void> {
    const slipNo = await loadingSlipService.nextSlipNo(pathParam(req, "slug"));

    res.status(200).json({ success: true, data: { slipNo } });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const slip = await loadingSlipService.getById(
      pathParam(req, "slug"),
      pathParam(req, "id"),
    );

    res.status(200).json({ success: true, data: { slip } });
  },

  async create(req: Request, res: Response): Promise<void> {
    const slip = await loadingSlipService.create(
      pathParam(req, "slug"),
      req.body as LoadingSlipInput,
    );

    res.status(201).json({ success: true, data: { slip } });
  },

  async update(req: Request, res: Response): Promise<void> {
    const slip = await loadingSlipService.update(
      pathParam(req, "slug"),
      pathParam(req, "id"),
      req.body as LoadingSlipInput,
    );

    res.status(200).json({ success: true, data: { slip } });
  },

  async remove(req: Request, res: Response): Promise<void> {
    await loadingSlipService.remove(
      pathParam(req, "slug"),
      pathParam(req, "id"),
    );

    // 200 with the id rather than a bare 204: the book removes the row it
    // names, and an empty body leaves the client matching the response to the
    // request it sent.
    res.status(200).json({ success: true, data: { id: pathParam(req, "id") } });
  },
};
