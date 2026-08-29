import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.ts";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.ts";
import { apiRouter } from "./routes/index.ts";

/**
 * Builds the Express app without starting a listener, so tests can drive it
 * directly (supertest) and src/server.ts owns the port and lifecycle.
 *
 * Middleware order matters: security headers and CORS run before anything
 * reads the body, the router runs before the 404, and the error handler is
 * last because Express only reaches it by falling off the end of the stack.
 */
export function createApp(): Express {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      // Required for the browser to send and store the auth cookie.
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // 100kb is plenty for these endpoints; the cap keeps a large body from
  // being parsed before any handler gets a say.
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));
  app.use(cookieParser());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: "ok", uptime: process.uptime() } });
  });

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
