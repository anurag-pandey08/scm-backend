import { Router } from "express";
import { loadingSlipController } from "../controllers/loading-slip.controller.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
import { loadingSlipSchema } from "../schemas/loading-slip.schema.ts";

/**
 * One firm's slip book. Mounted under `/api/companies/:slug/loading-slips`,
 * with `mergeParams` so `:slug` is still readable here — the book a slip
 * belongs to is part of its address, not a detail of the parent route.
 *
 * Open for now, the same as the register and the bill book, and gated the same
 * way when auth lands.
 */
export const loadingSlipRouter: Router = Router({ mergeParams: true });

loadingSlipRouter.get("/", loadingSlipController.list);

// Before "/:id", or Express reads "next-slip" as an id and looks for a slip
// with that one.
loadingSlipRouter.get("/next-slip", loadingSlipController.nextSlipNo);

loadingSlipRouter.post(
  "/",
  validateBody(loadingSlipSchema),
  loadingSlipController.create,
);

loadingSlipRouter.get("/:id", loadingSlipController.getById);
loadingSlipRouter.patch(
  "/:id",
  validateBody(loadingSlipSchema),
  loadingSlipController.update,
);
loadingSlipRouter.delete("/:id", loadingSlipController.remove);
