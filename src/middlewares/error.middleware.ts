import type { NextFunction, Request, Response } from "express";
import { isProduction } from "../config/env.ts";
import { logger } from "../lib/logger.ts";
import { AppError } from "../utils/app-error.ts";

/** Uniform error body, so clients can branch on `error.code`. */
interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

/** Anything that reaches here matched no route. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}

/**
 * Terminal error handler. Must keep all four parameters — Express identifies
 * error middleware by arity, and dropping `next` turns this into an ordinary
 * handler that never runs.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Headers already sent means a response is mid-flight; only Express's
  // default handler can close it correctly from here.
  if (res.headersSent) {
    next(err);
    return;
  }

  const { status, body } = describe(err);

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} failed`, err);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${status}`, body.error.message);
  }

  res.status(status).json(body);
}

function describe(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details === undefined ? {} : { details: err.details }),
        },
      },
    };
  }

  // A concurrent signup can beat the existence check and hit the unique index
  // on User.email. Report it as the 409 the caller would have gotten anyway.
  if (isUniqueViolation(err)) {
    return {
      status: 409,
      body: {
        success: false,
        error: {
          code: "CONFLICT",
          message: "That value is already taken",
        },
      },
    };
  }

  // Express's own body-parser errors — malformed JSON, oversized payloads —
  // arrive as plain Errors carrying a status. Those are the client's fault.
  const status = statusOf(err);
  if (status >= 400 && status < 500) {
    return {
      status,
      body: {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Bad request",
        },
      },
    };
  }

  // Unrecognised: assume it carries internals (a query, a path, a secret) and
  // say nothing specific. The full error is in the logs above.
  return {
    status: 500,
    body: {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong",
        ...(isProduction || !(err instanceof Error)
          ? {}
          : { details: err.message, stack: err.stack }),
      },
    },
  };
}

function statusOf(err: unknown): number {
  if (typeof err !== "object" || err === null) return 500;

  const { status, statusCode } = err as {
    status?: unknown;
    statusCode?: unknown;
  };

  if (typeof status === "number") return status;
  if (typeof statusCode === "number") return statusCode;

  return 500;
}

// P2002 is Prisma's unique-constraint violation. Matched structurally rather
// than with `instanceof PrismaClientKnownRequestError`, which would pull the
// generated client into the middleware layer.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}
