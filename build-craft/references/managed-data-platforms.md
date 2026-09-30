# Managed Data Platforms — What an Agent Should Know

Self-hosted Postgres vs the managed platforms, and how to choose. Prices and tiers checked 2026-09-30 — re-verify before quoting them.

## The platforms

- [ ] **Self-hosted Postgres** (Docker / Fly.io / RDS): full superuser, every extension, any version. You own backups, pooling (PgBouncer), HA, and upgrades. Pick when compliance, custom C extensions, or steady predictable load make the operational cost worth it.
- [ ] **Neon** — serverless Postgres: scale-to-zero (wake in ~300–500 ms), instant copy-on-write database branching, built-in PgBouncer pooling, PITR up to ~30 days, `@neondatabase/serverless` HTTP/WebSocket driver for edge functions. Generous free tier; paid plans scale with compute. No bundled auth/storage — bring Auth.js/Clerk and your own object store.
- [ ] **Supabase** — Postgres plus auth, storage, realtime, and Edge Functions in one vendor. Supavisor connection pooling built in, Row Level Security for multi-tenant data access, PITR up to ~30 days on paid plans. Free tier pauses after inactivity (unsuitable for customer-facing prod); Pro around $25/mo. Database branching exists but is newer and GitHub-workflow based.
- [ ] **PlanetScale** — originally serverless MySQL on Vitess (horizontal sharding, deploy-request workflows for zero-downtime schema changes); now also offers single-node Postgres aimed at dev/prototyping. No free tier (dropped 2024); MySQL paid plans start higher than the Postgres options. Note: MySQL has no DB-enforced foreign keys in the Vitess model — a different data-modeling mindset.

## Choose X when…

- [ ] Choose **Neon** when the app is serverless/edge (Vercel, Cloudflare), you want branch-per-PR database copies for preview environments, traffic is bursty, and you're fine handling auth separately.
- [ ] Choose **Supabase** when you want auth + storage + realtime bundled, you're migrating off Firebase, you need RLS-based multi-tenancy, or you want the fastest full-stack prototype with one vendor.
- [ ] Choose **PlanetScale** when you specifically need MySQL, or you expect Vitess-scale sharding (tens of billions of rows); otherwise prefer Postgres.
- [ ] Choose **self-hosted** when you need superuser/extensions the platforms block, have compliance constraints, run steady high load where per-compute pricing hurts, or want zero platform risk.
- [ ] Default for a new Postgres-backed side project in 2026: Neon if you bring your own auth, Supabase if you want the bundle. Revisit at real scale.

## Connection pooling — non-negotiable on serverless

- [ ] Serverless/edge functions must use the **pooled** connection string, never a direct one: Neon's `-pooler` endpoint (with `pgbouncer=true`), Supabase's transaction pooler on port 6543.
- [ ] Direct (non-pooled) connections are for migrations and admin only — one connection per migration run.
- [ ] In transaction-pooling mode, prepared statements must be disabled or configured correctly (most ORMs have a `prepare: false` / `pgbouncer: true` flag) — silent breakage otherwise.
- [ ] Pool wait timeouts and statement timeouts set; a persistently saturated pool means fix the queries, not just add connections.

## Branching for dev and preview

- [ ] Neon branches are instant copy-on-write clones — wire branch-per-PR so every preview deployment gets production-like data; delete branches when the PR closes.
- [ ] Schema migrations are tested on a branch copy before touching production (Neon and PlanetScale both support this workflow); never test a migration on prod first.
- [ ] Supabase branching is newer — verify the current workflow in its docs before depending on it for preview environments.

## Backups and PITR

- [ ] Know the platform's PITR retention window (Neon/Supabase: up to ~30 days on paid tiers) and confirm it covers your RPO.
- [ ] A backup you never restored is not a backup: run a restore drill to a scratch branch/project on schedule and verify row counts.
- [ ] For critical data keep an off-platform copy (`pg_dump` on a schedule to object storage you control) — platform snapshots don't protect against account-level loss.
- [ ] PlanetScale's deploy requests give zero-downtime schema changes on MySQL; on Postgres platforms use the expand/contract pattern from `databases.md`.

## Feature comparison

| Feature | Neon | Supabase | PlanetScale | Self-hosted |
|---|---|---|---|---|
| Engine | Postgres | Postgres | MySQL (Vitess) + single-node Postgres | Postgres / MySQL, your choice |
| Scale-to-zero | Yes (~300–500 ms wake) | No | N/A (always-on) | No |
| DB branching | Yes, instant CoW | Yes, newer GitHub-based | Yes (deploy requests) | Manual |
| Built-in pooling | Yes (PgBouncer) | Yes (Supavisor) | HTTP-based (no pool ceiling on MySQL) | You add PgBouncer |
| PITR | ~30 days (paid) | ~30 days (paid) | Yes | You set it up |
| Bundled auth/storage/realtime | No | Yes | No | No |
| Free tier | Yes, usable | Yes, pauses when idle | None | Infra cost only |
| Superuser / custom C extensions | No | No | No | Yes |

## Connection strings per platform

- [ ] Neon serverless: use the `-pooler` host with `pgbouncer=true`: `postgresql://user:pass@ep-xxx-pooler.neon.tech/db?sslmode=require&pgbouncer=true`.
- [ ] Supabase serverless: use the transaction pooler on port 6543: `postgresql://postgres.xxx:pass@aws-0-region.pooler.supabase.com:6543/postgres`.
- [ ] ORMs need the pooling flag: Prisma `?pgbouncer=true`, Drizzle `prepare: false` — verify against the driver's current docs.
- [ ] From edge runtimes (no persistent TCP), prefer HTTP/WebSocket drivers: `@neondatabase/serverless` on Neon, Supabase's REST/postgrest layer — not raw `pg`.

## Cost heuristics

- [ ] Supabase free tier pauses after inactivity — never put a customer-facing project on it; budget ~$25/mo Pro plus compute/storage overages for a small SaaS.
- [ ] Neon's free tier doesn't pause the same way (auto-suspends after minutes idle, wakes on request) — fine for side projects; watch cold-start latency on latency-sensitive paths.
- [ ] Serverless per-compute pricing punishes steady high load: once baseline usage is predictable, price self-hosted or provisioned against it.
- [ ] The surprise bills come from bandwidth/egress and runaway function invocations (webhook loops), not the database itself — cap and alert on both.

## Red flags before committing

- [ ] Cold starts measured against your latency budget: Neon's ~300–500 ms wake after idle is fine for dashboards, fatal for a 200 ms p99 API.
- [ ] Extension allowlist checked: if you need a custom C extension (not just the 50–80 bundled ones), managed platforms can't do it — self-host.
- [ ] Egress pricing understood for your data shape: serving large files through the platform's storage without a CDN gets expensive.
- [ ] Region placement confirmed: the database region matches the compute region, or every query pays cross-region latency.

## Migration path off the platform

- [ ] Prefer standard Postgres/MySQL features over proprietary ones so `pg_dump` / logical replication stays a viable exit.
- [ ] The lock-in risks, per platform: Supabase Auth (migrate to Auth.js/Clerk), Supabase Storage (migrate to S3/R2), Realtime subscriptions (replace with websockets/SSE), Neon Functions (plain JS/TS — portable), PlanetScale's Vitess-specific workflows.
- [ ] Before adopting, write down the exit: what gets exported, what gets rewritten, and roughly how long it takes. If you can't answer, you haven't evaluated the platform.

## Sources

- https://dev.to/whoffagents/neon-vs-supabase-vs-planetscale-managed-postgres-for-nextjs-in-2026-2el4
- https://pengen.diewe.workers.dev/philip_mcclarence_2ef9475/neon-postgres-review-is-serverless-postgresql-ready-for-production-1pck
- https://github.com/hossein-webdev/vibe-check/blob/HEAD/skills/database-selection/SKILL.md
- https://www.prisma.io/blog/prisma-vs-netlify
- https://dev.to/nayankyada/supabase-pricing-2026-free-tier-limits-compute-costs-when-to-upgrade-52af
