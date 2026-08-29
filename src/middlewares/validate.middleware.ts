import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodError, ZodType } from "zod";
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
      next(AppError.badRequest("Validation failed", fieldErrors(result.error)));
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Groups a Zod error's issues by the field they are about, addressed the way
 * the client addresses it.
 *
 * Zod's own `flattenError` only reaches one level down: a bad `emails.lr` is
 * reported against `emails`, which a form cannot put next to the input that
 * caused it. These paths are written out in full and dotted — `emails.lr`,
 * `charges.freight`, `lines.0.rate` — which is exactly the notation
 * react-hook-form uses to name a field, so the client can set the error
 * straight onto the input without translating anything.
 *
 * An issue at the root of the body has no path; those go under `_form`, the
 * usual name for an error about the whole form rather than one input.
 */
function fieldErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length === 0 ? "_form" : issue.path.join(".");
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}
