import { createApp } from "./app.ts";
import { env } from "./config/env.ts";
import { logger } from "./lib/logger.ts";
import { prisma } from "./lib/prisma.ts";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

/**
 * Stop accepting connections, let in-flight requests finish, then close the
 * database pool. Without this, a container restart cuts active requests and
 * leaves Postgres connections to time out on their own.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down`);

  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });

  // Don't wait forever on a hung keep-alive connection.
  setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// A rejection nobody handled left the process in an unknown state; log it and
// let the supervisor restart rather than serving from a half-broken app.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", reason);
  process.exit(1);
});
