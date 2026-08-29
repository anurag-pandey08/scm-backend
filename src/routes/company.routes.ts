import { Router } from "express";
import { companyController } from "../controllers/company.controller.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
import { letterheadSchema } from "../schemas/company.schema.ts";

/**
 * Open for now, reads and writes alike.
 *
 * The frontend has no sign-in screen yet, so gating the two writes would leave
 * the settings screen with no way to save. When auth lands, `requireAuth` goes
 * on the PATCH and the POST — the two lines that let one office change what
 * every other office prints.
 */
export const companyRouter: Router = Router();

companyRouter.get("/", companyController.list);
companyRouter.get("/:slug", companyController.getBySlug);

companyRouter.patch(
  "/:slug",
  validateBody(letterheadSchema),
  companyController.updateLetterhead,
);

companyRouter.post("/:slug/restore", companyController.restore);
