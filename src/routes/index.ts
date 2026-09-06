import { Router } from "express";
import { authRouter } from "./auth.routes.ts";
import { companyRouter } from "./company.routes.ts";
import { tripRouter } from "./trip.routes.ts";
import { userRouter } from "./user.routes.ts";

/** Every application route hangs off here; app.ts mounts it under /api. */
export const apiRouter: Router = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/companies", companyRouter);
apiRouter.use("/users", userRouter);

// Beside the companies rather than under one. The daybook is the only book
// both firms work, so it is the only one not addressed through a firm — see
// trip.routes.ts.
apiRouter.use("/trips", tripRouter);
