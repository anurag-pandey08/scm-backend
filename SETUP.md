# Setting up an Express + TypeScript + Prisma backend

A from-scratch manual setup guide. Follow the steps in order — several of them break
later steps if done out of sequence.

Verified against:

| Tool       | Version  |
| ---------- | -------- |
| Node       | 24.18.0  |
| npm        | 11.16.0  |
| TypeScript | 7.0.2    |
| Express    | 5.2.1    |
| Prisma     | 7.9.1    |

---

## 0. Decide three things up front

Everything downstream depends on these, and changing them later is the expensive path:

- **ESM or CommonJS** — use ESM (`"type": "module"`)
- **Where the generated Prisma client lands** — inside `src/`, or at the repo root
- **Which Postgres driver** — `pg` via `@prisma/adapter-pg`

---

## 1. Scaffold

```bash
mkdir myapp && cd myapp
git init
npm init -y
```

---

## 2. Set `"type": "module"` immediately

In `package.json`, before writing a single `.ts` file:

```json
{ "type": "module" }
```

**Why this must come first:** with `"module": "nodenext"`, TypeScript decides
CommonJS-vs-ESM *per file* by reading the nearest `package.json`. No `type` field means
CommonJS, and `verbatimModuleSyntax` then rejects every `import` statement:

```
error TS1295: ECMAScript imports and exports cannot be written in a CommonJS file
under 'verbatimModuleSyntax'.
```

---

## 3. TypeScript toolchain

```bash
npm i -D typescript @types/node tsx
```

Write `tsconfig.json` by hand — `tsc --init` dumps a hundred commented lines you'll
never read:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "rootDir": "src",
    "outDir": "dist",
    "sourceMap": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Two fields that commonly bite:

- **`rootDir` + `outDir` are not optional** if you intend to build. Without them `tsc`
  scatters output next to your sources.
- **Never leave `"noEmit": true`** alongside a `"build": "tsc"` script. That combination
  silently produces nothing, and `node dist/app.js` then has nothing to run.

`rewriteRelativeImportExtensions` lets you write `./lib/prisma.ts` in imports and have
TypeScript rewrite it to `.js` on emit. Under `nodenext` ESM, relative imports **require**
an explicit extension — omitting it gives you:

```
error TS2834: Relative import paths need explicit file extensions in ECMAScript imports
when '--moduleResolution' is 'node16' or 'nodenext'.
```

---

## 4. Express

```bash
npm i express
npm i -D @types/express
```

**Keep the major versions aligned.** `express@5` needs `@types/express@5`. A v5 types
package installed over a v4 runtime typechecks completely clean and then misbehaves at
runtime, because the types describe an API the installed code doesn't have.

---

## 5. Prisma

```bash
npm i -D prisma
npm i @prisma/client
npx prisma init --datasource-provider postgresql
```

This creates:

| Path                                | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `prisma/schema.prisma`              | Schema, **with a working generator block** |
| `prisma.config.ts`                  | CLI config (loads `dotenv`)              |
| `.env`                              | `DATABASE_URL`                           |
| `.gitignore`                        | Basic ignores                            |
| `.agents/`, `.claude/`, `.windsurf/` | Prisma's agent skills (see step 12)      |
| `skills-lock.json`                  | Manifest pinning those skills by hash    |

On npm 11.6+ you'll see `npm warn allow-scripts` here, because npm no longer runs
dependency install scripts by default. Approve Prisma's so its setup actually runs:

```bash
npm approve-scripts prisma @prisma/engines --allow-scripts-pin
```

`--allow-scripts-pin` records `pkg@version` entries, so a version bump re-prompts instead
of silently inheriting approval.

---

## 6. Driver adapter — required in v7

```bash
npm i @prisma/adapter-pg pg
npm i -D @types/pg
```

Prisma 7 dropped the bundled query engine binary in favor of driver adapters. There is no
adapter-free path.

---

## 7. Keep three paths in sync

The generator's `output`, your import path, and your `.gitignore` entry all describe the
same directory — and **nothing cross-checks that they agree.** This is the easiest thing
in the whole setup to get wrong.

To put the client inside `src/` so `tsc` compiles it under `rootDir: "src"`:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "esm"
}
```

- `output` is relative to **the schema file**, not the project root. `../src/generated/prisma`
  from `prisma/schema.prisma` resolves to `src/generated/prisma`.
- The matching import is `../generated/prisma/client.ts` (from `src/lib/`).
- The matching ignore rule is `/src/generated/`.

Change one, change all three.

Add `moduleFormat = "esm"` to match `"type": "module"` from step 2.

---

## 8. Models, then migrate

**Append your models to `schema.prisma`. Do not replace the file.**

Pasting example models from the docs over the whole file is the most common way to
silently delete the `generator` block. When that happens, `prisma generate` reports:

```
info You don't have any generators defined in your schema.prisma, so nothing will be
generated.
```

...and every import of the client fails, because it was never written.

```bash
npx prisma migrate dev --name init
```

---

## 9. Load `.env` in the app, not just the CLI

`prisma.config.ts` imports `dotenv/config`, but **that only covers CLI commands.** Your
application still has no environment variables.

`src/config/env.ts`:

```ts
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
};
```

Skip this and `process.env.DATABASE_URL!` typechecks perfectly, then fails on the first
query with:

```
Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

...which says nothing about the actual cause. The `!` non-null assertion is precisely what
hides the problem. **Validate at startup instead of asserting.**

---

## 10. Client singleton

`src/lib/prisma.ts`:

```ts
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.ts";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

The `globalThis` cache exists so `tsx watch` doesn't open a fresh connection pool on every
reload and exhaust the database.

---

## 11. Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "prisma generate && tsc",
    "start": "node dist/app.js",
    "postinstall": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

`prisma generate` belongs in **both** `build` and `postinstall`, because the generated
client is gitignored — without them, a fresh clone won't compile.

---

## 12. `.gitignore`

```
node_modules/
dist/
*.log
.env
.env.*
!.env.example
.DS_Store

# Generated from prisma/schema.prisma — run `prisma generate`
/src/generated/

# Vendored agent skills — restore with the installer using skills-lock.json
/.agents/skills/
/.claude/skills/
/.windsurf/skills/
```

**On the agent-skill folders:** `prisma init` installs its skills into `.agents/skills/`,
then creates `.claude/skills/` and `.windsurf/skills/` as **symlinks (junctions on
Windows) pointing into it**, so each tool finds them at its own expected path.

Git does not preserve junctions — it follows them and records real files. Committing all
three stores the same content three times (~460 KB, 200+ files, in triplicate). Ignore the
`skills/` subdirectories rather than the whole dotfolders, so a project-level
`.claude/settings.json` stays committable later.

**Do commit** `skills-lock.json` (the manifest, same role as `package-lock.json`) and
`prisma/migrations/` including `migration_lock.toml` (your schema history).

Write a `.env.example` listing required keys with empty values, so they're discoverable.

---

## Final structure

Layered, and the layers only call downward: **route → middleware → controller →
service → repository → Prisma**. A controller never touches `prisma`, and a service
never touches `req`/`res` — which is what keeps the services testable without HTTP
and the SQL in one place.

```
myapp/
├── prisma/
│   ├── migrations/
│   │   ├── 20260729052211_init/
│   │   ├── 20260810062740_add_user_auth_fields/
│   │   └── migration_lock.toml
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── env.ts               # dotenv + zod validation, fails fast
│   ├── controllers/             # HTTP in / HTTP out, no business logic
│   │   ├── auth.controller.ts
│   │   └── user.controller.ts
│   ├── generated/prisma/        # gitignored, regenerated
│   ├── lib/                     # long-lived singletons
│   │   ├── logger.ts
│   │   └── prisma.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # requireAuth
│   │   ├── error.middleware.ts  # notFoundHandler + errorHandler
│   │   └── validate.middleware.ts
│   ├── repositories/            # the only files that touch `prisma.*`
│   │   └── user.repository.ts
│   ├── routes/                  # URL → middleware chain → controller
│   │   ├── auth.routes.ts
│   │   ├── index.ts             # mounts everything under /api
│   │   └── user.routes.ts
│   ├── schemas/                 # zod request schemas (source of truth)
│   │   └── auth.schema.ts
│   ├── services/                # business rules, no req/res
│   │   ├── auth.service.ts
│   │   └── user.service.ts
│   ├── types/
│   │   ├── auth.types.ts        # inferred from schemas/
│   │   ├── express.d.ts         # req.user augmentation
│   │   └── user.types.ts        # SafeUser, derived from the Prisma model
│   ├── utils/                   # pure helpers, no app state
│   │   ├── app-error.ts
│   │   ├── auth-cookie.ts
│   │   ├── hash.ts
│   │   └── jwt.ts
│   ├── app.ts                   # createApp(): middleware + routes, no listen
│   └── server.ts                # entry point: listen + graceful shutdown
├── .env                         # gitignored
├── .env.example
├── .gitignore
├── eslint.config.ts
├── package.json
├── prisma.config.ts
├── skills-lock.json
└── tsconfig.json
```

Two conventions worth keeping:

- **No `models/` directory.** `prisma/schema.prisma` is the model layer; a parallel
  hand-written one only drifts from it. Row shapes come from the generated client
  (`SafeUser` in `types/user.types.ts` is `Omit<UserModel, "password">`).
- **`app.ts` builds, `server.ts` runs.** Because `createApp()` doesn't bind a port,
  a test can hand the app straight to supertest, and shutdown logic lives in exactly
  one place.

### Auth endpoints

| Method | Path                | Body                      | Result |
| ------ | ------------------- | ------------------------- | ------ |
| POST   | `/api/auth/signup`  | `{ name, email, password }` | 201, sets `access_token` cookie |
| POST   | `/api/auth/signin`  | `{ email, password }`     | 200, sets `access_token` cookie |
| POST   | `/api/auth/signout` | —                         | 200, clears the cookie |
| GET    | `/api/users/me`     | — (needs cookie)          | 200, the caller's profile |

Every response is either `{ success: true, data }` or
`{ success: false, error: { code, message, details? } }`.

The token is an HS256 JWT in an `httpOnly`, `sameSite=lax` cookie; `Authorization:
Bearer <token>` also works for non-browser clients. Signout only clears the cookie —
nothing server-side tracks issued tokens, so a stolen token stays valid until it
expires. Shorten `JWT_EXPIRES_IN` or add refresh-token rotation if that matters.

---

## Verify before writing features

```bash
npx tsc --noEmit           # 0 errors
npx prisma validate        # schema is valid
npx prisma migrate status  # database in sync
npm run build && npm start
```

Then run **one real query** against the database before building anything on top.

Every failure mode listed in this document — missing generator block, wrong import path,
unloaded environment variables — typechecks completely clean and only surfaces on an
actual query. **`tsc` passing is not evidence that your database layer works.**

---

## Pitfall summary

| Symptom | Cause | Fix |
| --- | --- | --- |
| `TS1295` on every import | No `"type": "module"` in `package.json` | Step 2 |
| `TS2834` missing extension | `nodenext` ESM needs explicit extensions | Write `./x.ts` |
| `npm run build` emits nothing | `"noEmit": true` with a `tsc` build script | Step 3 |
| Types disagree with runtime behavior | `@types/express` major ≠ `express` major | Step 4 |
| `nothing will be generated` | `generator` block overwritten | Step 8 |
| Client import not found | `output` / import / ignore paths disagree | Step 7 |
| `SASL: client password must be a string` | App never loaded `.env` | Step 9 |
| Connection pool exhausted in dev | No singleton; `tsx watch` reloads | Step 10 |
| Fresh clone won't compile | `prisma generate` missing from build | Step 11 |
| `npm warn allow-scripts` | npm 11.6+ blocks dependency install scripts | Step 5 |

---

## A note on what actually goes wrong

None of the failure modes above are coding mistakes. They are **consistency failures
between files that no tool cross-checks**:

- `package.json` `type` ←→ `tsconfig.json` `module`
- `@types/*` major ←→ runtime package major
- generator `output` ←→ import path ←→ `.gitignore` entry
- CLI environment loading ←→ application environment loading

Each file is individually valid. The build passes. The mismatch only appears at runtime.
When something breaks in this stack, check the seams between files before debugging the
code inside them.
