import { Router } from "express";
import { tripController } from "../controllers/trip.controller.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
import { bulkDeleteSchema } from "../schemas/bulk-delete.schema.ts";
import { tripSchema } from "../schemas/trip.schema.ts";

/**
 * The office daybook. Mounted at `/api/trips` — top level, beside the
 * companies rather than under one.
 *
 * That is the whole difference between this router and the other three, and it
 * is deliberate: the L.R., bill and slip books each belong to a firm, and this
 * one book is worked by both. There is no `mergeParams` here because there is
 * no parent `:slug` to merge.
 *
 * Open for now, the same as the rest, and gated the same way when auth lands —
 * with rather more reason, since a write here is a write both offices see.
 */
export const tripRouter: Router = Router();

tripRouter.get("/", tripController.list);

tripRouter.post("/", validateBody(tripSchema), tripController.create);

// The ticked rows, in one request. A POST because the list is a body and a
// DELETE that carries one is not reliably carried — see the controller. Its
// own path rather than a DELETE on "/", so there is no route that empties the
// daybook by being called with nothing — which matters more here than in the
// other three, since this book is both firms'.
tripRouter.post(
  "/bulk-delete",
  validateBody(bulkDeleteSchema),
  tripController.removeMany,
);

tripRouter.get("/:id", tripController.getById);
tripRouter.patch("/:id", validateBody(tripSchema), tripController.update);
tripRouter.delete("/:id", tripController.remove);
