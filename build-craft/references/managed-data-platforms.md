# Managed Data Platforms — Choosing and Operating a Managed Database in 2026

How to pick and operate a managed Postgres/MySQL/SQLite platform without surprise bills, cold-start surprises, or lock-in. Prices and tiers are approximate, checked 2026-09-30 — re-verify before quoting.

## Decide the engine and shape first

- [ ] You chose Postgres, MySQL, or SQLite deliberately: Postgres for the extension ecosystem (pgvector, PostGIS, pg_cron) and JSON support; MySQL only when the app or team is already MySQL-native; SQLite for single-writer edge/local workloads, not write-heavy OLTP.
- [ ] You chose the operational shape from the traffic pattern, not the brand: scale-to-zero/serverless for bursty or mostly-idle workloads; provisioned/always-on for steady load. The crossover point is computed with your real numbers, not assumed.
- [ ] You did not pick Vitess-sharded MySQL unless you expect tens of billions of rows — sharding changes the data model (foreign keys off by default, no multi-shard transactions) for scale you don't have yet.
- [ ] Compliance and data-residency requirements are written down before shortlisting: managed platforms give you region choice but not sovereign control.
- [ ] The team can state who pages when it breaks: on a managed platform that's the vendor's status page plus your runbook; on self-hosted that's you — and the choice is explicit.

## The platforms — 2026 snapshot

- [ ] **Neon** — serverless Postgres: scale-to-zero (compute suspends after ~5 min idle; wake ~300–500 ms, occasionally 1–3 s on the first request), instant copy-on-write database branching, built-in PgBouncer pooling, PITR up to ~30 days on paid plans, an HTTP/WebSocket driver (`@neondatabase/serverless`) for edge runtimes, and Neon Auth in 2026 (~60K MAU free). Free tier: 0.5 GB storage per project with a ~100 CU-hour/mo allowance, no card required, throttles at hard limits instead of billing overages. Paid: Launch ~$19/mo (~300 compute-hours included), Scale ~$69/mo; overages ~$0.106–0.222/CU-hour, storage ~$0.35/GB-mo (cut 80% in late 2025 after the Databricks acquisition). No bundled storage/realtime — bring S3/R2.
- [ ] **Supabase** — Postgres plus auth, storage, realtime, and Edge Functions in one vendor. Supavisor connection pooling built in, Row Level Security for multi-tenant access control, Git-integrated database branching (preview branches billed ~$0.32/hr each with a compute add-on — not covered by Spend Cap). Free tier: 500 MB DB, 2 projects, pauses after ~7 days of inactivity and needs manual resume — unsuitable for customer-facing prod. Pro ~$25/mo per project, including a $10/mo compute credit that covers the default Micro instance; larger compute is billed separately (Small ~+$10, Medium ~+$50, XL ~+$200/mo). PITR is an optional 7-day window on paid plans; backups run daily with 7-day retention on Pro.
- [ ] **PlanetScale** — restructured pricing in 2026: the old Hobby/Scaler/Scaler-Pro plans are gone, and there is no free tier. Two engines: Vitess MySQL (horizontal sharding, online non-blocking schema changes via deploy requests) and native Postgres (EBS clusters; Metal GA from ~$50/mo). Cheapest entry points: Postgres single-node (PS-5) ~$5/mo, Postgres HA 3-node from ~$15/mo, Vitess from ~$39/mo (PS-10). The Postgres sharding layer (Neki) is still proprietary and in development — treat PlanetScale Postgres as single-node for now. Row-read metering can surprise unindexed/scan-heavy workloads.
- [ ] **Turso** (libSQL/SQLite) — edge-replicated SQLite: free tier approx. 500M row reads/mo, 10M writes/mo, 5 GB storage, 500 databases, no card required; Developer ~$4.99/mo. HTTP API plus embedded local replicas give sub-50 ms edge reads. Pick it for read-heavy globally distributed apps and database-per-tenant designs — not for write-heavy relational workloads. Scale-to-zero was deprecated for new users in 2026; treat it as always-on.
- [ ] **CockroachDB Cloud** — distributed SQL, PostgreSQL wire-compatible: Basic (serverless) is free for 10 GiB + 50M Request Units/mo, then ~$0.50/GB-mo storage + ~$0.20/1M RU; provisioned Standard starts ~$0.50/vCPU-hour with multi-AZ HA. Pick it when multi-region survivability and serializable-by-default transactions matter; not for a simple CRUD app, where the subtle dialect differences add cost without benefit.
- [ ] **RDS / Aurora / Cloud SQL** — classic provisioned Postgres/MySQL. Aurora Serverless v2 floors at ~$43–45/mo (0.5 ACU minimum) plus ~$0.10/GB-mo storage and per-million I/O charges; plain RDS t4g.micro ~$13–15/mo; RDS free tier covers 750 hrs/mo for 12 months on new accounts (Aurora excluded). Pick when you're already deep in AWS/GCP (VPC peering, IAM auth, existing spend) — otherwise the platforms above cost less in engineering hours.

## Choose X when…

- [ ] Choose **Neon** when the app is serverless/edge (Vercel, Cloudflare Workers), you want branch-per-PR database copies for preview environments, traffic is bursty, and auth/storage are handled separately.
- [ ] Choose **Supabase** when you want auth + storage + realtime bundled, you're migrating off Firebase, you need RLS-based multi-tenancy, or you want the fastest full-stack prototype from one vendor.
- [ ] Choose **PlanetScale** when you specifically need Vitess MySQL at real scale (billions of rows), or want the cheapest entry-point managed Postgres with a branching workflow; not as a default Postgres.
- [ ] Choose **Turso** when the app is read-heavy, globally distributed, SQLite-shaped data fits, and per-tenant databases are the isolation model.
- [ ] Choose **CockroachDB** when you need multi-region active-active with serializable transactions and automatic failover, without operating your own cluster.
- [ ] Default for a new Postgres-backed side project in 2026: Neon if you bring your own auth, Supabase if you want the bundle. Revisit at real scale, with measured numbers.

## Connection pooling — non-negotiable on serverless

- [ ] Serverless/edge functions use the **pooled** connection string only: Neon's `-pooler` endpoint (with `pgbouncer=true`), Supabase's transaction pooler on port 6543, Turso's HTTP client — never a direct TCP connection per invocation.
- [ ] Direct (non-pooled) connections are for migrations and admin only — one connection per migration run, held for the shortest time possible.
- [ ] In transaction-pooling mode, prepared statements are disabled or explicitly supported (Prisma `pgbouncer: true`, Drizzle `prepare: false`): pooled connections can't hold server-side prepared statements, and this breaks silently otherwise.
- [ ] Pool wait timeouts and statement timeouts are set and alerted on; a persistently saturated pool means fix the queries (missing indexes, N+1 selects), not just add connections.
- [ ] Transaction pooling never carries session state across queries — `SET`, advisory locks, and `LISTEN` inside a pooled path are verified or removed.

## Branching for dev and preview

- [ ] Neon branches are instant copy-on-write clones — branch-per-PR is wired so every preview deployment gets production-like data, and branches are deleted when the PR closes (stale branches are a cost and data-leak surface).
- [ ] Schema migrations are applied and load-tested on a branch copy before touching production; never test a migration on prod first.
- [ ] Supabase preview branches are costed explicitly (~$0.32/hr per branch with a compute add-on, approximate) — 10 forgotten branches is ~$100+/mo and Spend Cap doesn't cover them.
- [ ] PlanetScale deploy requests (Vitess) are used for zero-downtime MySQL schema changes; on Postgres platforms the expand/contract pattern from `databases.md` handles breaking changes.
- [ ] Branch data retention is defined: branches containing production data inherit the same access controls and deletion policy as production.

## Backups and PITR

- [ ] The platform's PITR window (Neon: up to ~30 days on paid; Supabase: optional 7-day on paid) covers your stated RPO — written down, not assumed.
- [ ] A backup you never restored is not a backup: a restore drill runs to a scratch branch/project on schedule and verifies row counts, not just "restore succeeded".
- [ ] For critical data there is an off-platform copy (`pg_dump` on a schedule to object storage you control) — platform snapshots don't protect against account-level loss.
- [ ] Free-tier backup limits are known before relying on them: Neon free keeps roughly a 6-hour restore window plus one manual snapshot; Supabase free has daily DB backups but no Storage-object backups.
- [ ] Backup encryption and who holds the keys are confirmed for regulated data — "the platform encrypts at rest" is not an answer to key custody.

## Connection strings per platform

- [ ] Neon serverless: pooled host with the pooling flag — `postgresql://user:pass@ep-xxx-pooler.neon.tech/db?sslmode=require&pgbouncer=true`.
- [ ] Supabase serverless: transaction pooler on port 6543 — `postgresql://postgres.xxx:pass@aws-0-region.pooler.supabase.com:6543/postgres`; direct on 5432 reserved for migrations.
- [ ] Turso: `libsql://db-name-org.turso.io` plus an auth token; tokens are per-database with expirations and rotated — the account root token never lives in app code.
- [ ] From edge runtimes (no persistent TCP): HTTP/WebSocket drivers only — `@neondatabase/serverless` on Neon, Supabase's PostgREST client, Turso's HTTP client — never raw `pg`.
- [ ] The pooled and direct connection strings are separate secrets, so a bug can't point app traffic at the admin endpoint.
- [ ] `sslmode=require` (or the platform's equivalent) is set explicitly — a pooled endpoint silently downgraded to plaintext is a credential leak waiting to happen.

## Cost heuristics

- [ ] Serverless per-compute pricing punishes steady high load: a 24/7 2-CU Neon workload (~$170/mo) runs roughly 2.5× a comparable RDS instance (~$70/mo) — once baseline usage is predictable, provisioned wins.
- [ ] Supabase bills per project: a realistic Pro bill with 2–3 projects is $45–75/mo before overages, not "$25" — each extra project's compute is billed separately.
- [ ] The surprise bills come from bandwidth/egress ($0.09/GB on Supabase) and runaway function invocations (webhook loops), not the database itself — both are capped and alerted.
- [ ] Neon's free tier throttles at hard limits instead of billing overages — the safest no-surprise option for demos; Supabase's free tier goes offline after 7 idle days and needs a manual resume.
- [ ] Row-read-metered platforms (PlanetScale Vitess) are benchmarked with the app's actual scan-heavy queries before committing — unindexed scans bill per row read.
- [ ] Compute add-ons are modeled as monthly commitments, not one-offs: the Supabase Micro→Small step (~+$10/mo) is the most common real-world upgrade once shared vCPUs spike under sustained load.

## Red flags before committing

- [ ] Cold starts are measured against the latency budget: Neon's ~300–500 ms wake (up to 1–3 s on first request) is fine for dashboards, fatal for a 200 ms p99 API — `min_cu` keeps an instance warm when needed.
- [ ] The extension allowlist is checked: if you need a custom C extension or one the platform lacks (TimescaleDB on Neon; confirm pg_cron's tier), managed platforms can't do it — self-host.
- [ ] Egress pricing is understood for your data shape: serving large files through the platform's storage without a CDN gets expensive fast.
- [ ] Region placement is confirmed: database region matches compute region, or every query pays cross-region latency (Turso and CockroachDB solve this differently — edge replicas vs distributed ranges — and the choice is deliberate).
- [ ] The account-lockout blast radius is assessed: one vendor holding auth + storage + database is a single point of failure — the exit plan (below) exists before adopting the bundle.
- [ ] Vendor viability is checked for smaller platforms: backing and funding (Neon's Databricks acquisition, PlanetScale's Series C) are noted, not assumed permanent.

## When to self-host Postgres

- [ ] Self-host when you need superuser or custom C extensions the platforms block, have compliance constraints they can't meet, run steady high load where per-compute pricing hurts, or want zero platform risk.
- [ ] Self-hosting means owning the whole checklist: automated backups with restore drills, PgBouncer, HA/failover (Patroni or managed primary + replica), major-version upgrades, and monitoring — budgeted as engineering time, not just instance cost.
- [ ] Crunchy Bridge / Render / Railway / Fly Postgres are evaluated as the middle path: managed ops without the serverless pricing model — compared against RDS before dismissing.
- [ ] The self-host decision is revisited annually: what was cheaper at 10 GB may not be at 500 GB, and the platform pricing that justified self-hosting will have changed.

## Migration path off the platform

- [ ] Standard Postgres/MySQL features are preferred over proprietary ones so `pg_dump` / logical replication stays a viable exit.
- [ ] Lock-in risks are written down per platform: Supabase Auth → Auth.js/Clerk; Supabase Storage → S3/R2; Realtime subscriptions → websockets/SSE; Neon Functions → plain JS/TS (portable); PlanetScale Vitess workflows → standard MySQL tooling; Turso embedded replicas → plain SQLite.
- [ ] Before adopting, the exit is documented: what gets exported, what gets rewritten, and roughly how long it takes. If you can't answer, you haven't evaluated the platform.
- [ ] Schema and data stay portable in practice, not just in theory: a periodic `pg_dump` restore into a vanilla Postgres container proves the exit still works.

## Sources

- https://dev.to/whoffagents/neon-vs-supabase-vs-planetscale-managed-postgres-for-nextjs-in-2026-2el4
- https://dev.to/nayankyada/supabase-pricing-2026-free-tier-limits-compute-costs-when-to-upgrade-52af
- https://github.com/guidodinello/claude-dotfiles/blob/HEAD/.claude/skills/db-scalability-audit/references/provider-limits.md
- https://techsy.io/en/blog/neon-vs-planetscale-vs-turso
- https://tech-insider.org/aurora-dsql-vs-cockroachdb-vs-spanner-2026/
- https://github.com/druce/dbengines/blob/HEAD/engines/planetscale.md
