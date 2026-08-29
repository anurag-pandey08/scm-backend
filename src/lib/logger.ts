import { env, isProduction } from "../config/env.ts";

/**
 * Minimal leveled logger. JSON lines in production so a log collector can
 * parse them; human-readable text everywhere else.
 *
 * Deliberately dependency-free — swap the `emit` body for pino/winston if
 * structured logging ever needs more than this.
 */
type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Tests stay quiet; production drops debug noise.
const minLevel: number =
  env.NODE_ENV === "test"
    ? LEVEL_ORDER.error
    : isProduction
      ? LEVEL_ORDER.info
      : LEVEL_ORDER.debug;

function emit(level: Level, message: string, meta?: unknown): void {
  if (LEVEL_ORDER[level] < minLevel) return;

  const write = level === "error" || level === "warn" ? console.error : console.log;

  if (isProduction) {
    write(
      JSON.stringify({
        level,
        time: new Date().toISOString(),
        message,
        ...(meta === undefined ? {} : { meta }),
      }),
    );
    return;
  }

  const prefix = `[${level.toUpperCase()}]`;
  if (meta === undefined) write(prefix, message);
  else write(prefix, message, meta);
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit("debug", message, meta),
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
};
