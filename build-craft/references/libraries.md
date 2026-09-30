# Libraries — Best Picks, in Detail

What to reach for, per job — each entry states its purpose and when to pick it over the alternative. Checked 2026-09-30. Project conventions always win over this list.

## Python

### Web frameworks
- [ ] **FastAPI** — async-first API framework with automatic OpenAPI docs. Pick for new APIs and services; pick over Flask when you want validation, typing, and docs for free.
- [ ] **Flask** — minimal WSGI micro-framework. Pick for tiny services, webhooks, or when you need full control with no opinions.
- [ ] **Django** — batteries-included (ORM, admin, auth, migrations). Pick for content-heavy apps and admin panels; skip when you only need an API.

### Data, HTTP, DB
- [ ] **pydantic** — runtime validation + serialization with type inference. Pick for every trust boundary (request bodies, env vars, config); v2 is the fast Rust-core version.
- [ ] **httpx** — modern HTTP client (sync + async). Pick over `requests` for async code and HTTP/2; `requests` is fine for throwaway scripts.
- [ ] **SQLAlchemy 2.0** — the Python ORM / SQL toolkit. Pick for relational data with migrations; use the 2.0-style typed API, not legacy patterns.
- [ ] **Alembic** — database migrations for SQLAlchemy. Pick alongside SQLAlchemy; every schema change is a versioned migration, never manual SQL in prod.
- [ ] **pytest** — test framework. The default; add `pytest-cov` with a `--cov-fail-under=80` gate.
- [ ] **ruff** — linter + formatter in one binary. Pick over flake8/black/isort/pylint; one tool, one config, 10–100× faster.

### Async
- [ ] **asyncio** — stdlib async runtime. The default for async Python; learn it before reaching for frameworks.
- [ ] **anyio** — asyncio/trio-compatible structured concurrency. Pick for libraries that must run on any backend, or when you want Trio's ergonomics.

## JavaScript / TypeScript

### Runtimes
- [ ] **Node.js 20+ LTS** — the safe default runtime. Pick for mature ecosystems and anything touching native modules.
- [ ] **Bun** — fast all-in-one runtime/bundler/package manager, runs TS natively. Pick for greenfield services where install/startup speed matters; verify native-module compat first.
- [ ] **Deno** — secure-by-default runtime with built-in TS. Pick when the permission model or the deploy target (Deno Deploy) fits.

### Backend frameworks
- [ ] **Fastify** — high-throughput REST with schema-driven serialization. Pick for JSON APIs where performance and explicit schemas matter.
- [ ] **Hono** — lightweight, standards-based (Web API) framework. Pick for edge runtimes (Cloudflare Workers, Bun, Deno) and tiny services.
- [ ] **NestJS** — DI-heavy, opinionated enterprise framework. Pick for large teams that want modularity and structure enforced.
- [ ] **tRPC** — end-to-end type-safe APIs without codegen. Pick for internal APIs in a TypeScript monorepo where client and server share types; keep REST for public third-party APIs.
- [ ] **Express** — legacy only. Do not start new services on it.

### Validation
- [ ] **zod** — TS-first schema validation with inference. The default: biggest ecosystem (React Hook Form, tRPC, Next.js), v4 fixed the old tree-shaking complaints.
- [ ] **valibot** — modular, tree-shakeable validation (~2 KB vs zod's ~12 KB). Pick for edge runtimes, client bundles with strict budgets, or libraries others will import.
- [ ] **ArkType** — validation with native TS syntax, fastest parser. Pick if you prefer the functional style and measured parse throughput is on your hot path.

### ORM / database clients
- [ ] **Drizzle** — type-safe, SQL-like ORM with minimal overhead. Pick for SQL-literate teams, edge runtimes, and when you want migrations without a heavy engine.
- [ ] **Prisma** — productive ORM with strong migrations and studio. Pick for team velocity and schema-first workflows; accept the larger install footprint and query-engine overhead.
- [ ] **Kysely** — type-safe query builder only (no migrations). Pick when you want SQL control plus types, and own migrations separately.
- [ ] **postgres.js / pg** — raw drivers. Pick when you need exact control and can own the types; never hand-concatenate SQL.

### Testing
- [ ] **vitest** — the default test runner for new TS projects: TS/ESM native, Vite-shared config, Jest-compatible API (`vi` instead of `jest`).
- [ ] **Playwright** — E2E and browser testing. Pick over Cypress for cross-browser reliability and speed.
- [ ] **node:test + node:assert** — stdlib testing. Pick for zero-dependency libraries.

## React / Next.js ecosystem

- [ ] **TanStack Query** — server-state management (caching, dedup, retries, invalidation). Pick for all remote data on the client; do not hand-roll fetch + useEffect caches.
- [ ] **Zustand** — minimal client UI state. Pick for local state (toggles, wizards, selection); pick over Redux unless you need time-travel/devtools at scale.
- [ ] **React Hook Form + zod** — forms with schema validation. The default form stack; validate with a zod resolver, not hand-written checks.
- [ ] **Tailwind CSS v4** — utility-first CSS, now CSS-first config (`@theme` in CSS, no `tailwind.config.js`). Pick for speed of iteration; define brand tokens in `@theme`, not arbitrary hex.
- [ ] **shadcn/ui** — copy-paste components (not a dependency) built on Radix/Base UI primitives. Pick for accessible primitives you own and restyle; install only the components you use via the CLI.
- [ ] **Framer Motion (motion)** — animation library. Pick for orchestrated animations and gestures; respect `useReducedMotion()`.
- [ ] **Auth.js v5** — authentication for Next.js (successor to next-auth). Pick for OAuth + credentials + JWT/database sessions without hand-rolled auth.
- [ ] **next-sitemap / built-in sitemap.ts** — SEO plumbing; prefer the framework's `sitemap.ts`/`robots.ts` over extra deps.

## C / C++

- [ ] **CMake** — the build system. Target-based (`target_*`) only; no legacy global commands; `CMAKE_EXPORT_COMPILE_COMMANDS=ON`.
- [ ] **Catch2 / doctest** — unit test frameworks. Pick Catch2 for expressive BDD-style tests, doctest for the lightest single-header option.
- [ ] **fmt** — type-safe formatting library. Pick over `printf`/`iostream` for new code; it became `std::format` in C++20.
- [ ] **spdlog** — fast logging library. Pick for structured, async-capable logging in C++ services.
- [ ] **Sanitizers (ASan/UBSan/TSan/MSan)** — not libraries but mandatory tooling: CI runs tests under `-fsanitize=address,undefined`; thread code additionally under TSan.

## CSS / design

- [ ] **Tailwind CSS v4** — see above; pair with `@theme inline` to map shadcn CSS variables to utilities.
- [ ] **Radix Primitives / Base UI** — unstyled accessible components (focus trap, keyboard nav, ARIA). You rarely install these directly — shadcn wraps them — but know they are the accessibility layer.
- [ ] **Lucide** — icon set. Pick over emoji-as-icons and over icon fonts; tree-shakeable SVG React components.

## Databases

- [ ] **Postgres drivers**: `pg` (Node, battle-tested), `postgres.js` (lightweight, good for serverless), `@neondatabase/serverless` (HTTP/WebSocket driver for Neon's serverless Postgres).
- [ ] **Prisma / Drizzle** — see ORM section; Drizzle for edge + SQL control, Prisma for velocity + migrations.
- [ ] **SQLAlchemy + Alembic** — the Python relational stack (see Python section).
- [ ] **Redis clients**: `ioredis` (Node, full-featured) / `redis-py` (Python). Pick for caching, queues, rate limiting, sessions.

## Auth and security

- [ ] **Auth.js** — app-level auth (see React section).
- [ ] **jose** — JWT signing/verification done right. Pick over `jsonwebtoken` for modern runtimes; always pin the algorithm allowlist, reject `alg: none`.
- [ ] **argon2 / bcrypt** — password hashing. Argon2id is the default; bcrypt (cost ≥ 10) where Argon2 isn't available; never MD5/SHA-1/fast hashes.
- [ ] **helmet** — security headers for Express/Fastify. Pick to set CSP, HSTS, nosniff, and friends with one middleware.
- [ ] **Rate limiting**: `@upstash/ratelimit` (serverless/edge, Redis-backed) or `express-rate-limit`/`@fastify/rate-limit`. Pick Redis-backed over in-process when running more than one instance.

## Observability

- [ ] **OpenTelemetry** — vendor-neutral traces/metrics/logs. Pick for distributed tracing with W3C trace-context propagation; export to any backend.
- [ ] **Sentry** — error tracking with source maps and release tracking. Pick for client + server exception capture; it is not a metrics system.
- [ ] **Pino** — fast structured JSON logging for Node. Pick for services; pretty-print only in development.

## Infra

- [ ] **Docker** — containerization. Multi-stage builds, distroless/slim base images, non-root `USER`, pinned digests for production.
- [ ] **Caddy** — reverse proxy with automatic HTTPS. Pick over Nginx for simple setups (auto-TLS, Caddyfile); Nginx when you need its module ecosystem or raw throughput tuning.
- [ ] **Redis** — cache, sessions, rate limits, pub/sub. Managed (Upstash) for serverless, self-hosted/Docker for control.
- [ ] **BullMQ** — Redis-backed job queue for Node. Pick for background jobs with retries, delays, and priorities; backed by Redis, not the request path.

## Default stack picks

- [ ] **Default Python API stack**: FastAPI + pydantic + SQLAlchemy + Alembic + pytest + ruff + httpx — covers validation, DB, migrations, tests, lint in five deps.
- [ ] **Default Next.js stack**: Next.js 16 + TypeScript (strict) + Tailwind v4 + shadcn/ui + Drizzle (or Prisma) + Auth.js + zod + TanStack Query + Vitest + Playwright.
- [ ] **Default background-job stack**: BullMQ (Node) or Celery/ARQ (Python), both on Redis, with a dead-letter queue and bounded retries.
- [ ] **Default data stack**: Postgres (Neon/Supabase/self-hosted per `managed-data-platforms.md`) + Redis for cache/queues; add ClickHouse only when OLAP proves necessary.
- [ ] When an existing project already chose differently, its conventions win — do not re-platform without being asked.

## Sources

- https://github.com/praxstack/ai-visual-code-review/blob/HEAD/.agents/skills/praxstack/backend-pe-typescript/SKILL.md
- https://github.com/badf00d21/palm-agent-vs-code-ext/blob/HEAD/.cursor/skills/libraries-js-rules/SKILL.md
- https://dev.to/whoffagents/zod-vs-valibot-in-2026-which-typescript-validation-library-should-you-use-3e35
- https://github.com/faparicior/sessioflow/blob/HEAD/docs/adr/_reports/ADR_ALTERNATIVES_ANALYSIS.md
- https://github.com/zahidulislam2222/regenai/blob/HEAD/docs/adr/ADR-002-why-tailwind-shadcn-ownership.md
