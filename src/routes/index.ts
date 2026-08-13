import { Router } from "express";
import { authRouter } from "./auth.routes.ts";
import { userRouter } from "./user.routes.ts";

/** Every application route hangs off here; app.ts mounts it under /api. */
export const apiRouter: Router = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
