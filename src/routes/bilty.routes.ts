import { Router } from "express";
import { biltyController } from "../controllers/bilty.controller.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
import { biltySchema } from "../schemas/bilty.schema.ts";
import { bulkDeleteSchema } from "../schemas/bulk-delete.schema.ts";

/**
 * One firm's L.R. book. Mounted under `/api/companies/:slug/bilties`, with
 * `mergeParams` so `:slug` is still readable here — the book a bilty belongs
 * to is part of its address, not a detail of the parent route.
 *
 * Open for now, the same as the company routes, and gated the same way when
 * auth lands.
 */
export const biltyRouter: Router = Router({ mergeParams: true });

biltyRouter.get("/", biltyController.list);

// Before "/:id", or Express reads "next-lr" as an id and looks for a bilty
// with that one.
biltyRouter.get("/next-lr", biltyController.nextLrNo);

biltyRouter.post("/", validateBody(biltySchema), biltyController.create);

// The ticked rows, in one request. A POST because the list is a body and a
// DELETE that carries one is not reliably carried — see the controller. Its
// own path rather than a DELETE on "/", so there is no route that empties the
// book by being called with nothing.
biltyRouter.post(
  "/bulk-delete",
  validateBody(bulkDeleteSchema),
  biltyController.removeMany,
);

biltyRouter.get("/:id", biltyController.getById);
biltyRouter.patch("/:id", validateBody(biltySchema), biltyController.update);
biltyRouter.delete("/:id", biltyController.remove);
