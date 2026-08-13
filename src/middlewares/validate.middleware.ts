import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { z } from "zod";
import { AppError } from "../utils/app-error.ts";

/**
 * Parses `req.body` with `schema` and replaces it with the parsed result, so
 * downstream handlers see coerced, trimmed, fully typed data rather than the
 * raw JSON.
 *
 * Rejections become a 400 whose `details` map field paths to messages:
 *   { "email": ["must be a valid email address"] }
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        AppError.badRequest(
          "Validation failed",
          z.flattenError(result.error).fieldErrors,
        ),
      );
      return;
    }

    req.body = result.data;
    next();
  };
}
