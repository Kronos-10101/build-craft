# Optimization — production checklist

Covers profile-first discipline, algorithmic review, caching, query optimization, frontend budgets, load testing, and measurable per-component targets.

## Profile-before-optimizing discipline

- [ ] **Numeric baseline first**: p50/p95/p99 latency, throughput, CPU%, memory, GC time — recorded before any change. "It feels faster" is not evidence.
- [ ] Bottleneck identified with a **profiler** (`pprof`, `py-spy`, async-profiler/JFR, `perf`, Chrome DevTools, APM traces) — target the ~20% of code consuming ~80% of time.
- [ ] **Amdahl's-law check**: max speedup = `1 / (1 − f)`; write down *f* and the target speedup; skip work that can't reach the target.
- [ ] One change at a time, re-measured; benchmarks run **≥5 times**, interleaved A/B; discard warm-ups; production flags, representative data, production concurrency.
- [ ] Latency reported as **distribution (p50/p95/p99/max), never averages alone**; optimize p99.
- [ ] Regression guard: the win captured in a benchmark test or CI perf assertion (e.g. k6 `thresholds`); every performance feature ships instrumented (a cache without hit-ratio metrics regresses silently).

## Algorithmic complexity review

- [ ] Hot paths have a documented Big-O review against largest realistic *n*; no unbounded O(n²)+ on unbounded input.
- [ ] Membership tests in loops use hash sets (O(1)), not list scans; string building accumulates fragments and joins once; sorting/indexing computed once, not per access.
- [ ] Right structure per access pattern: hash map (point lookups), tree (ranges), heap (top-K), bitmap (dense membership).
- [ ] List endpoints paginate with a capped max page size; keyset/cursor pagination for large tables — no deep OFFSET; bulk work batched (bulk insert, `executemany`).

## Caching strategy

- [ ] Cache justified by a profile (recompute cost, call rate, key distribution documented). Caching a fixable slow query is a smell — fix the query first.
- [ ] Layers chosen by freshness budget: browser/CDN → edge/reverse-proxy → in-process LRU → distributed Redis → DB result cache. Never cache per-request unique data, secrets, or unscoped PII.
- [ ] Every key **scoped and versioned**: `{namespace}:{version}:{entity}:{id}` including tenant id, user/role scope, locale, API version; unbounded inputs hashed.
- [ ] Every key has a **TTL** from product-owner staleness budgets (static assets `max-age=31536000, immutable` with content hashing; reference data minutes–hours); ±10–20% **TTL jitter**.
- [ ] Invalidation designed before shipping: default **cache-aside + delete-on-write** (commit to DB first, then *delete* — not update — the key).
- [ ] Stampede protection (single-flight lock, probabilistic early refresh, or stale-while-revalidate) on every hot key with >100 ms recompute or >100 concurrent readers.
- [ ] **Negative results cached** with shorter TTL; bounded cache with explicit eviction policy; instrumented: hit ratio (target ≥80%, alert <70% with high evictions), miss latency, evictions.
- [ ] Cache degrades gracefully: if Redis is down, fall through to source of truth — never treat ephemeral cache as primary state.

## Database query optimization

- [ ] Slow query capture enabled in production, reviewed with `pg_stat_statements` / `pt-query-digest`; backlog ranked by (mean_exec_time × calls).
- [ ] Every slow query read with **EXPLAIN ANALYZE**: Seq Scan on a large table → missing index; Nested Loop on a large outer set → Hash Join; plan/actual divergence → stale stats.
- [ ] Indexes on WHERE/JOIN/ORDER BY incl. all FKs; composite order per leftmost-prefix rule; covering indexes for hot queries; balanced against write cost.
- [ ] No `SELECT *` on hot paths; no N+1 on list endpoints; anti-patterns absent (functions on indexed columns without functional indexes, implicit casts, leading-wildcard LIKE, correlated subqueries, cartesian products).
- [ ] Writes batched; `ANALYZE` after big loads; connections pooled; prepared statements for repeated queries; fixes verified by re-running EXPLAIN ANALYZE.

## Frontend asset optimization (Core Web Vitals, 75th percentile, mobile + desktop)

- [ ] Targets: **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1** (TTFB ≤ 800ms diagnostic). Baseline from field data before optimizing.
- [ ] CI bundle budgets enforced: entry chunk < 100 KB gzip (fail > 200 KB); total JS < 300 KB gzip (fail > 500 KB); critical CSS < 50 KB.
- [ ] Code splitting: route-level + heavy-component lazy loading via dynamic `import()`; heavy third-party libs never in the entry chunk; tree-shaking verified via bundle analyzer.
- [ ] Images: AVIF first, WebP fallback; responsive `srcset`/`sizes`; `loading="lazy"` below the fold; **hero/LCP image never lazy-loaded** — preloaded with `fetchpriority="high"`. Explicit `width`/`height` on all media; animate transform/opacity only.
- [ ] Fonts: `font-display: swap`, critical fonts preloaded, ≤2–3 files, metric overrides (`size-adjust`); system stack considered first.
- [ ] No render-blocking resources: non-critical CSS deferred, critical CSS inlined, scripts `defer`/`async`, `preconnect` to known origins.
- [ ] Main thread: heavy work chunked (`scheduler.yield()`/`requestAnimationFrame`); heavy compute in Web Workers; long lists virtualized (>100 items); listeners/intervals cleaned up on unmount.
- [ ] gzip + Brotli on text; hashed assets with `Cache-Control: public, max-age=31536000, immutable`; HTTP/2 or HTTP/3.

## Load testing

- [ ] Suite exists (k6 / Locust / Gatling / Artillery) against a **production-representative environment** (matching hardware, realistic data volume, mixed workload with think time).
- [ ] **Ramp-up, not step load** (ramp → sustained plateau → stress/spike → ramp down); measure at the plateau after warm-up.
- [ ] Coverage: baseline, load (expected peak), stress (beyond peak — find the ceiling), spike (sudden 10×), soak (30+ min — leaks, pool exhaustion, disk fill).
- [ ] **Run to failure** — establish the true capacity ceiling; record what breaks first and at what load.
- [ ] Percentiles gate releases: e.g. k6 `http_req_duration: ['p(95)<250', 'p(99)<500']`, `http_req_failed: ['rate<0.01']`; ≥5 runs per scenario; automated in CI on critical paths. Never unannounced load tests against production.

## Measurable targets per component

| Component | Target |
|---|---|
| API endpoint | p95 < 200 ms, p99 < 500 ms, error rate < 1% under sustained peak |
| DB hot query | mean exec < 50 ms; no seq scan on tables > ~10k rows; DB time < 30% of endpoint latency |
| DB list query | bounded LIMIT, keyset-paginated, no N+1, select only used columns |
| Connection pool | acquisition-timeout failures = 0 at peak; size from measured concurrency |
| Cache | hit ratio ≥ 80% (alert < 70% + high evictions); miss penalty ≤ 10% of origin cost |
| Page (field p75) | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 |
| Frontend bundle | entry < 100 KB gzip; total JS < 300 KB gzip; CI budget gate |
| Memory | no growth across 30+ min soak; cache memory < ceiling with alert at 80% |
| CPU | sustained < 70% at peak; GC time < 5% of request CPU time |
| Capacity | breaking point ≥ 2× current peak traffic |

## Sources

- https://en.wikipedia.org/wiki/Amdahl%27s_law · https://en.wikipedia.org/wiki/Big_O_notation
- https://github.com/rybbit-io/rybbit/blob/HEAD/docs/content/blog/core-web-vitals.mdx
- https://github.com/fluxonlab/skillry/blob/HEAD/plugins/performance-and-cost/skills/323-caching-strategy/SKILL.md
- https://github.com/learnmore-smart/sql-optimization/blob/HEAD/SKILL.md
