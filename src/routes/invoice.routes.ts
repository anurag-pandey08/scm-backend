import { Router } from "express";
import { invoiceController } from "../controllers/invoice.controller.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
import { bulkDeleteSchema } from "../schemas/bulk-delete.schema.ts";
import { invoiceSchema } from "../schemas/invoice.schema.ts";

/**
 * One firm's bill book. Mounted under `/api/companies/:slug/invoices`, with
 * `mergeParams` so `:slug` is still readable here — the book a bill belongs to
 * is part of its address, not a detail of the parent route.
 *
 * Open for now, the same as the register, and gated the same way when auth
 * lands.
 */
export const invoiceRouter: Router = Router({ mergeParams: true });

invoiceRouter.get("/", invoiceController.list);

// Before "/:id", or Express reads "next-bill" as an id and looks for a bill
// with that one.
invoiceRouter.get("/next-bill", invoiceController.nextBillNo);

invoiceRouter.post("/", validateBody(invoiceSchema), invoiceController.create);

// The ticked rows, in one request. A POST because the list is a body and a
// DELETE that carries one is not reliably carried — see the controller. Its
// own path rather than a DELETE on "/", so there is no route that empties the
// book by being called with nothing.
invoiceRouter.post(
  "/bulk-delete",
  validateBody(bulkDeleteSchema),
  invoiceController.removeMany,
);

invoiceRouter.get("/:id", invoiceController.getById);
invoiceRouter.patch(
  "/:id",
  validateBody(invoiceSchema),
  invoiceController.update,
);
invoiceRouter.delete("/:id", invoiceController.remove);
