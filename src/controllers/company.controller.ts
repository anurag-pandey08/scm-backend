import type { Request, Response } from "express";
import { companyService } from "../services/company.service.ts";
import type { LetterheadInput } from "../schemas/company.schema.ts";
import { pathParam } from "../utils/path-param.ts";

export const companyController = {
  /** GET /api/companies — every firm the office keeps books for. */
  async list(_req: Request, res: Response): Promise<void> {
    const companies = await companyService.list();

    res.status(200).json({ success: true, data: { companies } });
  },

  /** GET /api/companies/:slug — one firm's letterhead. */
  async getBySlug(req: Request, res: Response): Promise<void> {
    const company = await companyService.getBySlug(pathParam(req, "slug"));

    res.status(200).json({ success: true, data: { company } });
  },

  /** PATCH /api/companies/:slug — save the letterhead the office typed. */
  async updateLetterhead(req: Request, res: Response): Promise<void> {
    // validateBody has already replaced req.body with the parsed letterhead.
    const company = await companyService.updateLetterhead(
      pathParam(req, "slug"),
      req.body as LetterheadInput,
    );

    res.status(200).json({ success: true, data: { company } });
  },

  /** POST /api/companies/:slug/restore — back to the printed letterhead. */
  async restore(req: Request, res: Response): Promise<void> {
    const company = await companyService.restore(pathParam(req, "slug"));

    res.status(200).json({ success: true, data: { company } });
  },
};
