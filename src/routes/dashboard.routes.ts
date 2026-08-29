import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller.ts";

/**
 * One firm's dashboard. Mounted under `/api/companies/:slug/dashboard`, with
 * `mergeParams` so `:slug` is still readable here — there is no dashboard that
 * is not one firm's, the same as there is no register that is not.
 *
 * A single GET. The screen is a reading of the book, and nothing on it writes.
 */
export const dashboardRouter: Router = Router({ mergeParams: true });

dashboardRouter.get("/", dashboardController.summary);
