import { Router } from "express";
import { tripController } from "../controllers/trip.controller.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
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

tripRouter.get("/:id", tripController.getById);
tripRouter.patch("/:id", validateBody(tripSchema), tripController.update);
tripRouter.delete("/:id", tripController.remove);
