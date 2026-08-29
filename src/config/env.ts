import "dotenv/config";
import { z } from "zod";

// Keys here must stay in sync with .env.example.
const envSchema = z.object({
  // Read by both the app (src/lib/prisma.ts) and the Prisma CLI
  // (prisma.config.ts), so keep the shape permissive enough for both.
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "must be a postgresql:// connection string",
  }),
  // Signing key for auth tokens. 32 chars is the floor for HS256 to be worth
  // anything — generate with `openssl rand -base64 48`.
  JWT_SECRET: z
    .string()
    .min(32, "must be at least 32 characters — use `openssl rand -base64 48`"),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  // Lifetime of the access token. Validated against the `ms` duration grammar
  // here so src/utils/jwt.ts can hand it to jsonwebtoken as-is.
  JWT_EXPIRES_IN: z
    .string()
    .regex(
      /^\d+(ms|s|m|h|d|w|y)$/,
      "must be an `ms` duration string, e.g. 15m, 12h, 7d",
    )
    .default("7d"),

  // Comma-separated browser origins allowed to send credentialed requests.
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof envSchema>;

// dotenv leaves blank keys (`PORT=`) as "", which z.coerce would turn into 0
// rather than falling back to the default — drop them first.
const raw = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = envSchema.safeParse(raw);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env: Env = parsed.data;

export const isProduction: boolean = env.NODE_ENV === "production";
