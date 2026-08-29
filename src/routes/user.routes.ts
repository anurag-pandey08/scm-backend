import { Router } from "express";
import { userController } from "../controllers/user.controller.ts";
import { requireAuth } from "../middlewares/auth.middleware.ts";

export const userRouter: Router = Router();

userRouter.get("/me", requireAuth, userController.getMe);
