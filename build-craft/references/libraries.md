# Libraries — Best Picks, in Detail

Which library to reach for per job, plus the health checks that justify the pick — all versions and statuses checked 2026-09-30. Project conventions always win over this list.

## Library selection rubric — adopt vs build vs skip

- [ ] You build only when the problem is core IP or a <200-line surface: everything else is adopted — hand-rolled HTTP clients, validators, auth, and ORMs are how outages are born.
- [ ] You skip when the stdlib covers it: `asyncio`, `argparse` for single-file tools, `node:test`, and global `fetch` beat a dependency you will maintain forever.
- [ ] Commit recency, download trends, and issue velocity: a release or meaningful commit in the last 6 months, downloads not trending down, and issues answered — a "stable" README with no commits in 18 months is a risk flag, not a feature.
- [ ] Maintainer count and bus factor: one-maintainer projects (esbuild is the classic example) get pinned versions and a documented exit plan, never blind adoption.
- [ ] OpenSSF Scorecard checked for security-sensitive deps (auth, crypto, parsers): branch protection, signed releases, and no critical findings before adopting.
- [ ] You evaluated the deprecation lane: ioredis (stable but best-effort maintenance — Redis Inc. points new projects at node-redis) and Express (legacy, no new services) are the 2026 cautionary tales.
- [ ] License verified for your use: copyleft (AGPL/GPL) libraries stay out of closed-source products — check the license file, not the marketing page.

## Supply-chain discipline

- [ ] Exactly one lockfile is committed per project (`uv.lock`, `pnpm-lock.yaml`) and CI installs frozen (`uv sync --frozen`, `pnpm install --frozen-lockfile`) — the full audit loop lives in `security.md` §Supply chain / dependency scanning.
- [ ] Vulnerabilities and licenses are audited in CI: `uv audit` (built into uv 0.11+) for Python, `npm audit`/`pnpm audit` for JS, plus a license/dependency report on major bumps — a failing audit blocks the merge, not a quarterly ticket.
- [ ] Dependency footprint is minimal and justified: every direct dep earns its place; prefer the stdlib or a focused module (valibot over zod on the edge) when the job is small.
- [ ] Transitive dependency depth is gated: you checked what the dep pulls in (`pnpm why`, `uv tree`, `npm ls`) and prefer single-purpose zero-dependency packages (`picocolors`, `node:util`) over heavy utility chains (e.g. `lodash`) when only a few helpers are used.
- [ ] Dual-package hazard checked for Node deps: the `exports` field provides both `import` and `require` entries — a CJS-only package used in an SSR or bundled app becomes a hydration or runtime crash.
- [ ] Package manager is pinned: `packageManager` field + corepack for Node (`pnpm@11.x`), `.python-version` + `uv.lock` for Python — no "works on my machine" drift.
- [ ] Docker builds pin base-image digests and install from the lockfile in a separate layer — never `pip install` unpinned latest at build time.

## Python

### Web & APIs
- [ ] **FastAPI 0.141+** (0.141.1, Jul 2026; stays on 0.x by design) — async-first API framework on Starlette 1.x with automatic OpenAPI docs; the default for new services.
- [ ] **uvicorn[standard]** — ASGI server for FastAPI/Starlette; run behind a process manager in prod, never `app.run()` directly.
- [ ] **Flask** — minimal WSGI framework; pick only for tiny services or webhooks where FastAPI's machinery is genuinely unwanted.
- [ ] **Django** — batteries-included (ORM, admin, auth, migrations); pick for content-heavy apps and admin panels, skip when you only need an API.

### Data validation & config
- [ ] **pydantic v2** (2.13.x; there is no v3) — runtime validation at every trust boundary: request bodies, env vars, config files, LLM outputs; pair with **pydantic-settings** (`BaseSettings`) for env-driven config instead of raw `os.environ`.

### Databases — clients and drivers (platform choice lives in `managed-data-platforms.md`)
- [ ] **asyncpg** (0.31+) — async Postgres driver, the fastest option (~2× psycopg3 in 2026 benchmarks); pick for pure-async services and bulk COPY workloads.
- [ ] **psycopg 3** — sync + async in one package, SQLAlchemy's recommended backend; pick when you need both modes or DB-API familiarity.
- [ ] **SQLAlchemy 2.0** (2.0.51+; 2.1 in beta) — ORM/SQL toolkit; use the typed `Mapped[...]`/`mapped_column()` API, never 1.x `Column()` patterns.
- [ ] **Alembic** — migrations for SQLAlchemy; every schema change is a versioned migration, never manual SQL in prod.
- [ ] **aiosqlite / aiomysql** — async drivers for SQLite/MySQL behind SQLAlchemy; sync drivers stay out of async code paths.
- [ ] **redis-py** — Redis client for caching, queues, rate limits, sessions.

### HTTP clients & async
- [ ] **httpx** (0.28+) — sync + async HTTP client with timeouts and connection pooling; the default over `requests` for anything async, HTTP/2, or timeout-sensitive. `requests` is for throwaway scripts only.
- [ ] **asyncio** — stdlib async runtime; learn it before reaching for frameworks.
- [ ] **anyio** — asyncio/trio-compatible structured concurrency; pick for libraries that must run on any backend.

### CLI
- [ ] **Typer** (0.24+) — type-hint-driven CLI framework built on Click; the default for new CLIs (less boilerplate, full mypy compatibility, Rich output for free).
- [ ] **Click** (8.3+) — pick when you need its plugin ecosystem or maximum control; Typer is a thin layer over it, so you can drop down freely.
- [ ] **rich** — terminal rendering (tables, progress, highlighting); machine-readable output goes to stdout, human status to stderr.

### Testing & quality
- [ ] **pytest** — the default test runner; add `pytest-cov` with a `--cov-fail-under=80` gate and `pytest-asyncio` for async code (the full strategy is in `testing.md`).
- [ ] **ruff** — linter + formatter in one binary; supersedes flake8/black/isort/pylint/bandit; one config, 10–100× faster.

### Packaging & distribution
- [ ] **uv** (Astral) — the 2026 default: one Rust binary replacing pip, venv, pyenv, and pipx; `uv init` / `uv add` / `uv sync`, `uv.lock` committed, PEP 621 `pyproject.toml`.
- [ ] **hatchling** — build backend for new packages; never setuptools for greenfield.
- [ ] **Python 3.13+** (3.14 preferred) — declared in `.python-version`; libraries still requiring older Pythons are a health flag.

## JavaScript / TypeScript

### Runtimes & package managers
- [ ] **Node.js 24 LTS** ("Krypton", supported through April 2028) — the default runtime; Node 22 is maintenance-only until April 2027, Node 20 reached EOL 2026-04-30.
- [ ] **pnpm 11** — the default package manager: content-addressed store, strict resolution (no phantom deps), first-class workspaces; pin via `packageManager` + corepack.
- [ ] **Bun** (1.3+) — fastest runtime/installer/bundler combo for greenfield; verify native-module compatibility before committing a team to it.
- [ ] **Deno** — secure-by-default runtime; pick when the permission model or Deno Deploy is the target.

### The TypeScript 7 transition — 2026's biggest toolchain fact
- [ ] **TypeScript 7.0** (GA 2026-07-08) is a Go-native port of `tsc` (~10× faster) published as the same `typescript` npm package — `strict` is now the default and legacy module formats/flags were removed.
- [ ] You stay on **TypeScript 6.x** if your toolchain imports the compiler API: `typescript-eslint`'s peer range excludes TS 7 and type-aware linting crashes on it — verify eslint/IDE plugin support before bumping.
- [ ] New projects set `"strict": true` explicitly (harmless on 7, required on 6) so the config is correct on both sides of the transition.

### Build tools — the 2026 toolchain wars, settled
- [ ] **Vite 8 + Rolldown** (Rolldown 1.0, May 2026) — the default for new frontends: Rust bundler, Rollup-plugin compatible, unified dev/build engine.
- [ ] **Turbopack** — ships as the default inside Next.js 16; it is not a standalone tool, so there is no "Vite vs Turbopack" decision outside Next.js.
- [ ] **Rspack** — the only config-compatible webpack replacement (~29× faster in benchmarks); pick for large webpack apps you cannot rewrite.
- [ ] **esbuild** — pick for libraries and CLI bundles where you need raw transform speed and no dev server; note the bus factor (effectively one maintainer).
- [ ] **webpack** — legacy maintenance only; its own ecosystem guidance now points at Rspack for active builds.

### Lint & format
- [ ] **oxlint** (Rust, 50–100× faster than ESLint; `tsgolint` for type-aware rules) — pick as the primary linter for speed-first or agent-driven workflows.
- [ ] **Biome 2.x** — one-binary formatter + linter; a defensible all-in-one pick, and a common 2026 split is Biome for formatting + oxlint for linting.
- [ ] **ESLint 9+ (flat config) + typescript-eslint** — still the mainstream choice when you need the deepest rule ecosystem; pin `typescript<7` until its peer range allows TS 7.
- [ ] **Prettier** — still the mainstream formatter if you keep ESLint; never hand-format what a formatter owns.

### Backend frameworks & API styles
- [ ] **Hono** — lightweight, standards-based (Web API) framework; the 2026 default for edge runtimes (Cloudflare Workers, Bun, Deno) and lean services.
- [ ] **Fastify** — high-throughput REST with schema-driven serialization; pick for JSON APIs where explicit schemas and performance matter.
- [ ] **NestJS** — DI-heavy enterprise framework; pick for large teams that want structure enforced, not for small services.
- [ ] **tRPC v11** (v11.16 line) — end-to-end type-safe APIs without codegen; pick for internal APIs in a TS monorepo where client and server share types; keep REST for public third-party APIs.
- [ ] **Express** — legacy only; do not start new services on it.
- [ ] **Effect** — typed functional-effects framework for TS services; pick when you want railway-oriented error handling and testability as a first-class design, not an afterthought.

### Validation
- [ ] **zod v4** — the ecosystem default (React Hook Form, tRPC, Next.js); the v4 rewrite fixed the old tree-shaking complaints.
- [ ] **valibot** — modular, ~2 KB tree-shakeable; pick for edge runtimes, strict client budgets, or libraries others import.
- [ ] **ArkType** — native-TS-syntax validation, fastest parser; pick when measured parse throughput is on the hot path.

### ORM / database clients
- [ ] **Drizzle** (0.45.x stable, 1.0 in beta; core team hired by PlanetScale Mar 2026) — type-safe, SQL-close ORM; the 2026 consensus pick for SQL-literate teams and edge runtimes.
- [ ] **Prisma 7** — productive schema-first ORM; the Rust engine was removed (Nov 2025) for a TS/WASM compiler and driver adapters are now mandatory; pick for team velocity and Studio, accept the heavier footprint.
- [ ] **Kysely** (0.29+) — type-safe query builder only (own your migrations); pick for maximum SQL control with types.
- [ ] **pg / postgres.js** — raw Postgres drivers; pick when you own the types and want exact control; never hand-concatenate SQL.
- [ ] **@neondatabase/serverless** — HTTP/WebSocket Postgres driver for edge/serverless runtimes with no persistent TCP.
- [ ] **node-redis** — the officially recommended Redis client for new projects; `ioredis` is stable but best-effort maintenance only.

### Testing
- [ ] **vitest** — the default test runner: TS/ESM native, Jest-compatible API; pair with Testing Library for components.
- [ ] **Playwright** — E2E and browser testing; pick over Cypress for cross-browser reliability and speed.
- [ ] **node:test + node:assert** — stdlib testing; pick for zero-dependency libraries.

## React / Next.js ecosystem

- [ ] **Next.js 16** (16.3.x) — the default full-stack React framework; Turbopack is the default bundler and `middleware.ts` became `proxy.ts`.
- [ ] **React Compiler** (Babel plugin) — adopt for automatic memoization; verify your bundler pipeline runs the Babel step it needs.
- [ ] **TanStack Query** — server-state management (caching, dedup, retries, invalidation); do not hand-roll fetch + useEffect caches.
- [ ] **Zustand** — minimal client UI state; pick over Redux unless you need time-travel/devtools at scale.
- [ ] **React Hook Form + zod** — the default form stack; validate with a zod resolver, not hand-written checks.
- [ ] **Tailwind CSS v4** — utility-first, CSS-first config (`@theme` in CSS); define brand tokens in `@theme`, not arbitrary hex.
- [ ] **shadcn/ui** — copy-paste accessible components on Radix/Base UI primitives; you own the code, install only what you use via the CLI.
- [ ] **motion** (Framer Motion's new name) — orchestrated animations and gestures; respect `useReducedMotion()`.
- [ ] **Lucide** — tree-shakeable SVG icons; pick over emoji-as-icons and icon fonts.
- [ ] **Radix Primitives / Base UI** — the unstyled accessibility layer (focus trap, keyboard nav, ARIA) underneath shadcn/ui; you rarely install these directly.

## C / C++

- [ ] **CMake** — the default build system; target-based (`target_*`) only, `CMAKE_EXPORT_COMPILE_COMMANDS=ON`; pull deps via vcpkg or Conan, never vendored tarballs.
- [ ] **Catch2 / doctest** — unit test frameworks: Catch2 for expressive BDD-style tests, doctest for the lightest single-header option.
- [ ] **fmt** — type-safe formatting; it became `std::format` in C++20, so prefer the stdlib and keep fmt for pre-C++20 or its extensions.
- [ ] **spdlog** — fast structured async-capable logging for C++ services.
- [ ] **glaze** — fastest JSON for typed, reflection-based serialization; pick when schemas are known at compile time.
- [ ] **simdjson / yyjson** — fastest DOM-style parsing of schema-less JSON; pick for untyped payloads where nlohmann's ergonomics cost too much throughput.
- [ ] **nlohmann/json** — the ergonomic default; fine for config and tests, too slow for hot paths (measured slowest in 2026 parser evaluations).
- [ ] **cpp-httplib** (0.18.x) — single-header HTTP/HTTPS server + client; pick for embedding HTTP without a dependency tree.
- [ ] **libcpr (CPR)** — "curl for people"; pick for a clean HTTP client API when libcurl is acceptable as the transport.
- [ ] **Boost.Asio / Boost.Beast** — the standard async networking foundation; pick when you need full control of sockets, HTTP, and WebSockets.
- [ ] **Sanitizers (ASan/UBSan/TSan/MSan)** — mandatory tooling, not libraries: CI runs tests under `-fsanitize=address,undefined`; threaded code additionally under TSan.

## Auth and security libraries

- [ ] **better-auth 1.x** (stable) — the 2026 default for self-hosted TS auth: framework-agnostic core, plugin model (2FA, passkeys, organizations, API keys), types derived from config.
- [ ] **Auth.js v5** — still in beta (npm `latest` = v4.24.x); its own maintainers point new projects at better-auth — do not start greenfield auth on it.
- [ ] **jose** — JWT signing/verification; pick over legacy `jsonwebtoken`; always pin the algorithm allowlist and reject `alg: none`.
- [ ] **argon2id** (`argon2-cffi` / node `argon2`) — the password-hashing default; bcrypt (cost ≥ 10) where Argon2 is unavailable; never MD5/SHA-1/fast hashes.
- [ ] **helmet** — security headers middleware (CSP, HSTS, nosniff); one middleware, no hand-rolled header lists.
- [ ] **Rate limiting** — `@upstash/ratelimit` (serverless/edge, Redis-backed) or `@fastify/rate-limit` / `express-rate-limit`; Redis-backed over in-process when running more than one instance.

## Observability

- [ ] **OpenTelemetry** — vendor-neutral traces/metrics/logs with W3C trace-context propagation; traces and metrics are stable across SDKs, logs are GA in C++/C#/Java/PHP, Beta in Go, still Development in JS/Python (status Apr 2026).
- [ ] You emit **OTLP to a Collector you own** and let it fan out to backends — the app never names a vendor; switching observability backends is a config change, not a code change.
- [ ] **GenAI semantic conventions** (`gen_ai.*`) are new in 2026 and still evolving — use them for LLM telemetry but do not hard-contract dashboards on attribute names yet.
- [ ] Cardinality is bounded: metrics use route templates, never raw URLs, user IDs, or query text as label values.
- [ ] **Sentry** — error tracking with source maps and release tracking; it is not a metrics system.
- [ ] **Pino** (Node) / **structlog** (Python, 26.x) — structured JSON logging to stdout; pretty-print only in development; every log line inside a sampled span carries trace/span IDs.
- [ ] Logs, metrics, and traces share the same service name/version/environment resource attributes so staging and prod stay separable.

## Databases — clients and drivers only

- [ ] Python: **asyncpg** (pure async, fastest) or **psycopg 3** (sync + async); `postgresql+asyncpg://` / `postgresql+psycopg://` URL schemes behind SQLAlchemy.
- [ ] Node: **pg** (battle-tested), **postgres.js** (lightweight, serverless-friendly), **@neondatabase/serverless** (HTTP/WebSocket for edge runtimes).
- [ ] Redis: **node-redis** (Node, officially recommended) / **redis-py** (Python); one long-lived client per process, not a connection per request.
- [ ] Platform choice (Neon vs Supabase vs PlanetScale vs self-hosted) and pooling rules live in `managed-data-platforms.md`; vector/embedding stores (pgvector, Qdrant, Pinecone, Weaviate) in `vector-databases.md` — this file covers clients only.

## AI / LLM libraries — brief

- [ ] **Vercel AI SDK** (`ai` package + `@ai-sdk/*` provider packages) — the default for TS apps calling LLMs: `generateText`/`streamText`/`generateObject` with zod-validated structured output, provider-swappable by import.
- [ ] **OpenAI Agents SDK** / **Claude Agent SDK** — vendor agent runtimes with hosted tools and tracing; pick when you want the vendor's loop rather than your own.
- [ ] Provider SDKs (the official `openai` / `anthropic` packages) only when you need raw API access — otherwise prefer the provider-agnostic layer above.
- [ ] Agent frameworks, memory, and evals are covered in depth in `ai-agents.md` — do not re-decide framework choice here.

## Default stack picks

- [ ] **Default Python API stack**: uv + FastAPI + pydantic (+ pydantic-settings) + SQLAlchemy 2.0 + Alembic + asyncpg + structlog + pytest + ruff + httpx.
- [ ] **Default Next.js stack**: Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + Drizzle (or Prisma 7) + better-auth + zod + TanStack Query + Vitest + Playwright + pnpm.
- [ ] **Default background-job stack**: BullMQ (Node) or Celery/ARQ (Python), both on Redis, with a dead-letter queue and bounded retries.
- [ ] **Default data stack**: Postgres (platform per `managed-data-platforms.md`) + Redis for cache/queues; add ClickHouse only when OLAP proves necessary.
- [ ] When an existing project already chose differently, its conventions win — do not re-platform without being asked.

## Sources

- https://github.com/charukeshpanjala/compliancekit/blob/HEAD/docs/adr/0006-uv-over-pip-poetry.md
- https://github.com/ku5ic/dotfiles/blob/HEAD/claude/skills/fastapi-patterns/SKILL.md
- https://github.com/builtform/launchpad/blob/HEAD/plugins/launchpad/scaffolders/fastapi-pattern.md
- https://github.com/balalaika-tools/backend-engineering-notes/blob/HEAD/fundamentals/database/02_python_drivers.md
- https://github.com/jaigouk/altoiddd/blob/HEAD/docs/research/20260222_cli_framework_comparison.md
- https://www.pkgpulse.com/guides/nodejs-22-vs-nodejs-24-2026
- https://github.com/quad4-software/ai/blob/HEAD/.agents/skills/typescript/SKILL.md
- https://devtoollab.com/blog/webpack-alternatives
- https://typescript.news/articles/2026-03-26-vite-8-rolldown-era
- https://github.com/borschetsky/webchat/blob/HEAD/docs/research/2026-08-06-client-lint-format-setup.md
- https://makerkit.dev/blog/tutorials/drizzle-vs-prisma
- https://github.com/nordeim/yoga-studio/blob/HEAD/skills/authjs-vs-better-auth/SKILL.md
- https://github.com/redis/ioredis/blob/HEAD/README.md
- https://github.com/stephenberry/glaze
- https://github.com/nilesuan/pdlc/blob/HEAD/techstacks/10-observability.md
