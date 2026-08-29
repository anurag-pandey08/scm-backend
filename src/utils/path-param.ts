import type { Request } from "express";
import { AppError } from "./app-error.ts";

/**
 * Reads a single path parameter as a string.
 *
 * Express 5 lets a route declare the same parameter twice (`/:a/:a`) and hands
 * back an array when it does, so the type of `req.params.slug` is
 * `string | string[]`. None of our routes do that, but the compiler cannot see
 * a route from a controller — so the narrowing is stated once, here, rather
 * than cast away at every call site.
 *
 * The throws are unreachable through a mounted route: a handler only runs when
 * the path matched, which means the parameter was captured. They exist so that
 * a controller called directly — from a test, or from a route someone rewrites
 * without its parameter — fails loudly instead of passing `undefined` down.
 */
export function pathParam(req: Request, name: string): string {
  const value: unknown = req.params[name];

  if (typeof value === "string" && value.length > 0) return value;

  if (Array.isArray(value)) {
    throw AppError.badRequest(`":${name}" was given more than once`);
  }

  throw AppError.badRequest(`":${name}" is missing from the path`);
}
