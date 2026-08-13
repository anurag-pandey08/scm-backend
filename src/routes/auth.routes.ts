import { Router } from "express";
import { authController } from "../controllers/auth.controller.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
import { signinSchema, signupSchema } from "../schemas/auth.schema.ts";

export const authRouter: Router = Router();

authRouter.post(
  "/signup",
  validateBody(signupSchema),
  authController.signup,
);

authRouter.post(
  "/signin",
  validateBody(signinSchema),
  authController.signin,
);

authRouter.post("/signout", authController.signout);
