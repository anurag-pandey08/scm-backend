import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type Express,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import helmetDefault, { type HelmetOptions } from "helmet";
import morgan from "morgan";
import { env } from "./config/env.ts";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.ts";
import { apiRouter } from "./routes/index.ts";

/**
 * Vercel builds src/app.ts against helmet's CommonJS declarations, where the
 * default import types as the module object rather than the middleware
 * factory, so the call below fails to compile there but not locally. The
 * runtime value is the factory under either resolution.
 */
const helmet = helmetDefault as unknown as (
  options?: Readonly<HelmetOptions>,
) => RequestHandler;

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

/**
 * Vercel's Express preset binds to this file and invokes its default export,
 * which has to be the app itself rather than the factory. src/server.ts uses
 * the same instance so a local run and a deployment serve identical wiring.
 */
export default createApp();
