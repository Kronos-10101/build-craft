# Optimization — profile-first performance engineering checklist

Stack-general performance playbook: measure before changing, optimize algorithms before micro-tuning, cache deliberately, gate releases on numbers. Language internals are delegated: Python (GIL, runtimes, profiling ladder) → `references/python-internals.md`; C++ (cache layout, SIMD, allocation-free paths) → `references/cpp-modern.md`; schema/index depth → `references/databases.md`.

## Profile-first discipline

- [ ] **Numeric baseline recorded before any change**: p50/p95/p99 latency, throughput, CPU%, memory, GC time — "it feels faster" is not evidence.
- [ ] Bottleneck identified with a **sampling profiler, not instrumentation** — sampling is ~1% overhead and safe near production; instrumentation skews the numbers it measures.
- [ ] Profiler matched to the stack (all verified current 2026-09-30): native/Rust `perf record -g` + flame graph, or **Samply** (`samply record ./app`, Firefox Profiler UI, cross-platform, off-CPU samples on macOS/Windows); Java **async-profiler** (`asprof -e cpu/alloc/lock/wall -f out.html <pid>`, ~1% overhead) or **JFR** (`jdk.ExecutionSample`, `jdk.ObjectAllocationSample`, `jdk.JavaMonitorEnter`); Go `go tool pprof` on `/debug/pprof` (CPU + heap + goroutine); Node `node --cpu-prof` + Chrome DevTools, `clinic doctor/flame`, or `0x`; browser Chrome DevTools Performance panel.
- [ ] **Always-on continuous profiling in production** considered (Pyroscope/Parca, <1% overhead): time-travel to "CPU during yesterday's 14:05 spike" and diff profile of deploy A vs deploy B beats re-attaching to a live box.
- [ ] **Amdahl's-law check**: max speedup = `1 / (1 − f)`; write down *f* and the target speedup; skip work that cannot reach the target.
- [ ] One change at a time, re-measured; benchmarks run **≥5 times**, interleaved A/B, warm-ups discarded, production flags, representative data, production-like concurrency.
- [ ] Latency reported as **distribution (p50/p95/p99/max), never averages alone**; the SLA is the p99, not the mean.
- [ ] Regression guard: every win captured in a benchmark or CI perf assertion; every perf feature ships instrumented (a cache without hit-ratio metrics regresses silently).

## Algorithmic review (Big-O first)

- [ ] Hot paths have a **documented Big-O review against the largest realistic *n***; no unbounded O(n²)+ on unbounded input.
- [ ] Membership tests in loops use hash sets (O(1)), not list scans; string building accumulates fragments and joins once; sort/index computed once, not per access.
- [ ] Right structure per access pattern: hash map (point lookups), tree (ranges), heap (top-K), bitmap (dense membership).
- [ ] An O(n²)→O(n) fix shipped before any micro-optimization — it beats interpreter tricks by orders of magnitude.
- [ ] List endpoints paginate with a capped max page size; **keyset/cursor pagination for large tables — no deep OFFSET**; bulk work batched (bulk insert, `executemany`).

## Caching strategy

- [ ] Cache justified by a profile (recompute cost, call rate, key distribution documented). Caching a fixable slow query is a smell — fix the query first.
- [ ] Layers chosen by freshness budget: browser/CDN → edge/reverse-proxy → in-process LRU → distributed Redis → DB result cache. Never cache per-request unique data, secrets, or unscoped PII.
- [ ] Every key **scoped and versioned**: `{namespace}:{version}:{entity}:{id}` including tenant id, user/role scope, locale, API version; unbounded inputs hashed.
- [ ] Every key has a **TTL from product-owner staleness budgets** (static assets `max-age=31536000, immutable` with content hashing; reference data minutes–hours); **±10–20% TTL jitter** to avoid mass-expiry spikes.
- [ ] Invalidation designed before shipping: default **cache-aside + delete-on-write** (commit to DB first, then *delete* — not update — the key).
- [ ] Stampede protection on every hot key with >100 ms recompute or >100 concurrent readers: single-flight lock, probabilistic early refresh, or `stale-while-revalidate`.
- [ ] **Negative results cached** with shorter TTL; cache bounded with an explicit eviction policy; instrumented: hit ratio (target ≥80%, alert <70% with high evictions), miss latency, evictions.
- [ ] Graceful degradation: if Redis is down, fall through to source of truth — never treat ephemeral cache as primary state.

## Edge delivery, CDN & transport

- [ ] Hashed, content-addressed filenames for all static assets; served with `Cache-Control: public, max-age=31536000, immutable` so a new deploy is a new URL and invalidation is instant.
- [ ] Edge cacheability verified per path: HTML/API default-dynamic at most CDNs — an explicit cache rule (not just origin headers) is what makes edge caching happen.
- [ ] Cache headers differentiate the layers: `max-age` (browser), `s-maxage` (shared/CDN edge); `stale-while-revalidate` only where the CDN honors it (at Cloudflare `s-maxage` implies `proxy-revalidate`, making SWR a no-op — check the CDN's semantics, don't assume).
- [ ] ETag/Last-Modified on revalidatable content; `304 Not Modified` confirms revalidation is working (bodyless, cheap).
- [ ] Tag-based purge (Surrogate-Key per entity) for selective invalidation instead of full purges on data changes.
- [ ] **HTTP/3 (QUIC) terminated at the CDN edge** for browser/mobile traffic (faster on lossy high-latency links; no app code changes; advertised via `Alt-Svc`); hold off where corporate proxies block UDP/443 or for server-to-server traffic.
- [ ] **TLS 1.3 minimum**; assets pre-compressed with Brotli (gzip fallback); `preconnect` to known origins; Early Hints where the CDN offers them.

## Database query optimization (operational loop)

- [ ] Slow query capture enabled in production (`pg_stat_statements` / slow log), reviewed on a schedule; backlog ranked by **(mean_exec_time × calls)**, not anecdotes.
- [ ] Every slow query read with **`EXPLAIN (ANALYZE, BUFFERS)`**: Seq Scan on a large table → missing index; Nested Loop on a large outer set → consider Hash Join; plan/actual row divergence → stale stats (`ANALYZE`).
- [ ] Indexes built with **`CREATE INDEX CONCURRENTLY`** in production (no long write locks); verified by re-running EXPLAIN; covering (`INCLUDE`) and partial indexes for hot skewed paths.
- [ ] Unused-index audit on a cadence (`idx_scan = 0` over >30 days → drop candidate) — each index taxes every write.
- [ ] No `SELECT *` on hot paths; no N+1 on list endpoints (JOIN or batched `WHERE id = ANY($1)`); prepared statements for repeated queries; writes batched.
- [ ] Anti-patterns absent: functions on indexed columns without functional indexes, implicit type casts (param type ≠ column type), leading-wildcard `LIKE '%x'`, correlated subqueries, cartesian products.
- [ ] Full index design, N+1 detection, and plan anatomy live in `references/databases.md` — this file keeps only the measure-fix-verify loop.

## Concurrency & connection pooling

- [ ] Processes **stateless and share-nothing** (12-factor VI): no in-memory sessions, no local-disk state between requests, no sticky sessions — persistent state in backing services so replicas are interchangeable (enables factor VIII scale-out and IX fast restarts).
- [ ] Every DB connection goes through a pooler in production: **PgBouncer** (or protocol-aware Supavisor/pgcat) for Postgres — never one connection per app thread on many replicas.
- [ ] PgBouncer **transaction mode** for OLTP APIs; session mode only when session-level features are required (LISTEN/NOTIFY, advisory locks across txns, SET persistence, server-side prepared statements).
- [ ] Pool sized from measured concurrency, not defaults: PostgreSQL-side target ≈ `(core_count × 2) + 1` active connections; PgBouncer `default_pool_size ≈ (postgres_max_connections × 0.8 − admin/monitoring headroom) / pgbouncer_instances`; app-side pools smaller still, especially for async services where one process serves hundreds of requests.
- [ ] Prepared-statement strategy explicit for transaction mode: driver-level prepared statements disabled (`prepareThreshold=0`-style) or `DEALLOCATE ALL` on checkout — no stale-handle cascades at 2 AM.
- [ ] App pool hygiene: `pool_pre_ping` (validate before use), `pool_recycle`/`maxUses` (rotate connections), `pool_timeout`/`connectionTimeoutMillis` (fail fast, don't hang); pool errors logged and alerted.
- [ ] Zero `acquisition-timeout` failures at peak load; transactions kept short (long transactions → bloat, lock contention, replication lag).

## Frontend budgets & Core Web Vitals

- [ ] Targets (Google's published thresholds, checked 2026-09-30, unchanged since definition — **INP replaced FID in March 2024; any guide still citing FID is stale**): **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1**, evaluated at the **75th percentile of real-user field data** (CrUX), segmented mobile and desktop; **TTFB ≤ 800 ms** as a diagnostic, not a CWV metric.
- [ ] Baseline from **field data (RUM)** before optimizing: `web-vitals` JS library shipping real-user metrics; **lab (Lighthouse/DevTools) for CI gating and diagnosis, field for the grade** — never conflate the two.
- [ ] CI bundle budgets enforced and failing: entry chunk < 100 KB gzip (fail > 200 KB); total JS < 300 KB gzip (fail > 500 KB); critical CSS < 50 KB; Lighthouse CI performance score gate on PRs.
- [ ] Code splitting: route-level + heavy-component lazy loading via dynamic `import()`; heavy third-party libs never in the entry chunk; tree-shaking verified via a bundle analyzer.
- [ ] Images: AVIF first, WebP fallback; responsive `srcset`/`sizes`; `loading="lazy"` below the fold; **hero/LCP image never lazy-loaded** — preloaded with `fetchpriority="high"`; explicit `width`/`height` on all media to kill layout shift; animate `transform`/`opacity` only.
- [ ] Fonts: `font-display: swap`, ≤2–3 files, critical fonts preloaded, metric overrides (`size-adjust`); system stack considered first.
- [ ] No render-blocking resources: non-critical CSS deferred, critical CSS inlined, scripts `defer`/`async`.
- [ ] Main thread: long tasks (>50 ms) chunked (`scheduler.yield()`/`requestAnimationFrame`); heavy compute in Web Workers; long lists virtualized (>100 items); third-party scripts audited — they are the most common INP killer.

## Load & stress testing

- [ ] Tool chosen by team and stack (checked 2026-09-30): **k6 2.2.0** (JS/TS, default for CI), **Gatling 3.15.1** (JVM shops, code-as-config), **Locust 2.44.x** (Python shops, distributed master/worker), JMeter 5.6.3 (GUI-driven QA), Artillery 2.0.x (YAML), vegeta (one-command HTTP floods), autocannon (quick Node endpoint checks).
- [ ] Suite runs against a **production-representative environment** (matching hardware, realistic data volume, mixed workload with think time) — not a laptop against an empty dev DB.
- [ ] **Ramp-up, not step load**: ramp → sustained plateau → stress/spike → ramp down; measure at the plateau after warm-up.
- [ ] Coverage: smoke (5–10 users, sanity), baseline (1 user, per-endpoint timing), load (expected peak), stress (beyond peak — find the ceiling), spike (sudden 10×), soak (30+ min — leaks, pool exhaustion, disk fill).
- [ ] **Run to failure** at least once — establish the true capacity ceiling; record what breaks first and at what load.
- [ ] Percentiles gate releases, e.g. k6 `thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<250', 'p(99)<500'] }` — a failed threshold exits non-zero and breaks the build; ≥5 runs per scenario; automated in CI on critical paths.
- [ ] Never unannounced load tests against production; if production testing is required, it is scheduled, announced, and uses canary traffic with an abort switch.

## Measurable targets & CI regression gates

- [ ] Per-component targets written down and alerted on:

| Component | Target |
|---|---|
| API endpoint | p95 < 200 ms, p99 < 500 ms, error rate < 1% at sustained peak |
| DB hot query | mean exec < 50 ms; no seq scan on tables > ~10k rows; DB time < 30% of endpoint latency |
| DB list query | bounded LIMIT, keyset-paginated, no N+1, only used columns selected |
| Connection pool | `acquisition-timeout` failures = 0 at peak; size from measured concurrency, not defaults |
| Cache | hit ratio ≥ 80% (alert < 70% with high evictions); miss penalty ≤ 10% of origin cost |
| Page (field p75) | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (checked 2026-09-30) |
| Frontend bundle | entry < 100 KB gzip; total JS < 300 KB gzip; CI budget gate fails the PR |
| Memory | no growth across 30+ min soak; cache memory < ceiling with alert at 80% |
| CPU | sustained < 70% at peak; GC time < 5% of request CPU time |
| Capacity | breaking point ≥ 2× current peak traffic |

- [ ] Load-test thresholds run in CI on critical paths (non-zero exit on breach); Lighthouse CI budget/perf-score assertions on frontend PRs.
- [ ] Benchmark suites compare against main on every perf-sensitive change — a **>5–10% regression vs main fails the build** unless explicitly waived with justification.
- [ ] Post-deploy watch: p95/p99 latency, error rate, and key resource metrics reviewed after every release touching a hot path; burn-rate alerts on latency/error SLOs.
- [ ] The capacity ceiling and the last soak result recorded somewhere durable (runbook, dashboard) — capacity planning starts from measured numbers, not vibes.

## Sources

- https://github.com/mstange/samply/blob/HEAD/README.md
- https://github.com/async-profiler/async-profiler/blob/HEAD/docs/ProfilingModes.md
- https://github.com/nguyen-mau-anh/springboot-kb/blob/HEAD/08.performance/13-jvm-profiling-flight-recorder.md
- https://github.com/duynhlab/homelab/blob/HEAD/docs/observability/profiling/README.md
- https://github.com/trigpointinguk/platform/blob/HEAD/docs/infrastructure/GRAFANA_PYROSCOPE.md
- https://github.com/jayrha/agentskills/blob/HEAD/performance-profiler/references/profiling-tools.md
- https://github.com/rybbit-io/rybbit/blob/HEAD/docs/content/blog/core-web-vitals.mdx
- https://github.com/agricidaniel/claude-seo/blob/HEAD/skills/seo/references/cwv-thresholds.md
- https://thenewstack.io/http-3-in-the-wild-why-it-beats-http-2-where-it-matters-most/
- https://www.inmotionhosting.com/blog/what-is-http-3/
- https://github.com/hjemmesidekongen/ai/blob/HEAD/plugins/smedjen/skills/http-protocols/SKILL.md
- https://github.com/pszypowicz/blog/blob/HEAD/docs/PERFORMANCE.md
- https://medium.com/@meleksoysal7263/postgres-query-still-slow-with-an-index-heres-why-and-how-to-fix-it-bb5876a228d8
- https://github.com/manufarbkontrast/my-claude-setup/blob/HEAD/skills/sql-query-optimization/SKILL.md
- https://github.com/zephyrcloudio/watchtower/blob/HEAD/.agents/skills/postgres/references/pgbouncer-configuration.md
- https://github.com/pivi-odoo/pg-llm-wiki/blob/HEAD/wiki/architecture/connection-pooling-impact.md
- https://dev.to/software_mvp-factory/postgresql-connection-pooling-under-pressure-2ihm
- https://github.com/grafana/k6-docs/blob/HEAD/docs/sources/k6/v1.0.x/using-k6/thresholds.md
- https://www.vervali.com/blog/best-load-testing-tools-in-2026-definitive-guide-to-jmeter-gatling-k6-loadrunner-locust-blazemeter-neoload-artillery-and-more/
- https://tech-insider.org/k6-vs-jmeter-vs-gatling-2026/
- https://github.com/weselben/rooforge/blob/HEAD/skills/12-factor-app/SKILL.md
- https://github.com/wolfpld/tracy/blob/HEAD/profiler/src/achievements/InstrumentFrames.md
