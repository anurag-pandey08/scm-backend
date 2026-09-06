import type { Request, Response } from "express";
import { invoiceService } from "../services/invoice.service.ts";
import {
  billBookQuerySchema,
  type InvoiceInput,
} from "../schemas/invoice.schema.ts";
import { AppError } from "../utils/app-error.ts";
import { pathParam } from "../utils/path-param.ts";
import { z } from "zod";

/**
 * Every route here is mounted under `/api/companies/:slug/invoices`, so the
 * firm whose book is being read is in the path and read back out of it on each
 * request. A bill is never addressed without its book.
 */

export const invoiceController = {
  /** GET — one page of the bill book, filtered as the query string asks. */
  async list(req: Request, res: Response): Promise<void> {
    const parsed = billBookQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      // The filters come off a URL the clerk may have edited or a link someone
      // pasted, so a bad one is a 400 with the offending parameter named
      // rather than a silent fall back to the whole book.
      throw AppError.badRequest(
        "Those filters are not valid",
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const page = await invoiceService.page(pathParam(req, "slug"), parsed.data);

    res.status(200).json({ success: true, data: page });
  },

  /**
   * GET /next-bill — the number a new bill should carry.
   *
   * Declared before `/:id` in the router, or "next-bill" would be read as an id.
   */
  async nextBillNo(req: Request, res: Response): Promise<void> {
    const billNo = await invoiceService.nextBillNo(pathParam(req, "slug"));

    res.status(200).json({ success: true, data: { billNo } });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const invoice = await invoiceService.getById(
      pathParam(req, "slug"),
      pathParam(req, "id"),
    );

    res.status(200).json({ success: true, data: { invoice } });
  },

  async create(req: Request, res: Response): Promise<void> {
    const invoice = await invoiceService.create(
      pathParam(req, "slug"),
      req.body as InvoiceInput,
    );

    res.status(201).json({ success: true, data: { invoice } });
  },

  async update(req: Request, res: Response): Promise<void> {
    const invoice = await invoiceService.update(
      pathParam(req, "slug"),
      pathParam(req, "id"),
      req.body as InvoiceInput,
    );

    res.status(200).json({ success: true, data: { invoice } });
  },

  async remove(req: Request, res: Response): Promise<void> {
    await invoiceService.remove(pathParam(req, "slug"), pathParam(req, "id"));

    // 200 with the id rather than a bare 204: the book removes the row it
    // names, and an empty body leaves the client matching the response to the
    // request it sent.
    res.status(200).json({ success: true, data: { id: pathParam(req, "id") } });
  },
};
