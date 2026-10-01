# System Design — distributed systems checklist

Production patterns for scalable, resilient distributed systems: partitioning, consistency, replication, caching, streaming, load balancing, service mesh, multi-region, tail latency, resilience, observability. Companion to `system-design-deep.md`, which owns the HLD/LLD design *process* (requirements, capacity math, class modeling, interview flow) — this file owns the pattern *mechanics*.

## Scalability and partitioning

- [ ] Every app instance is **stateless** — session/auth state lives in a shared external store, never in-memory or on local disk.
- [ ] Horizontal-scaling path exists: N≥2 instances behind a redundant load balancer with documented scale triggers (CPU / RPS / queue depth) and measured per-instance throughput.
- [ ] Shard key is chosen for **even distribution AND the dominant access pattern**: hash sharding for uniform point lookups; range sharding for range scans with a hot-range mitigation named; directory/lookup sharding for flexible multi-tenant assignment at lookup-cost.
- [ ] Consistent hashing with virtual nodes is used where membership changes often (cache clusters, DHTs); plain `hash % N` is rejected where nodes join/leave; only ~K/N keys move per membership change (K=keys, N=nodes).
- [ ] Hot-key plan exists: celebrity keys get suffix-splitting or fronting cache — even hash partitioning cannot fix a single skewed key.
- [ ] Cross-shard operations are banned by default or explicitly enumerated; joins and transactions stay within one shard.
- [ ] Read-scale plan: read replicas with a measured, bounded replication lag. Write-scale plan: sharding strategy in place *before* tables approach single-node capacity.
- [ ] Capacity headroom documented: target ≤ 70% utilization at peak so surge traffic and failover land somewhere.
- [ ] Static/edge-cacheable content sits behind a CDN with cache-control headers and a purging runbook; dynamic traffic is routed to the nearest region only where a latency SLO demands it.

## Consistency, replication, and CAP/PACELC

- [ ] A consistency model is **explicitly documented per dataset/operation** — never assumed globally.
- [ ] PACELC is stated for each critical data flow: behavior under partition (A vs C) **and** behavior in normal operation (L vs C, with a staleness budget in milliseconds).
- [ ] No component claims "CA" in a real distributed deployment; partitions are treated as inevitable, not exceptional.
- [ ] Quorum parameters are explicit where tunable: W + R > N for read/write overlap, with R/W/N stated per dataset (low R/high W for write-heavy, high R/low W for read-heavy).
- [ ] Leader-based replication (Raft: etcd, Consul, Kafka KRaft) is used for metadata/coordination; leaderless Dynamo-style replication (Cassandra, DynamoDB) only where write availability outweighs strong consistency — with a named conflict-resolution strategy.
- [ ] Failover cannot lose committed writes: synchronous replication or acknowledged quorum for critical writes; async replication carries a measured, documented loss window in seconds.
- [ ] Consensus clusters are sized to tolerate f failures (2f+1 nodes); election timeouts (Raft ~150–300 ms, randomized) and split-brain behavior on partition are understood.
- [ ] Payment/ledger/inventory use CP semantics — fail/queue on partition rather than serve stale balances; sessions/counters/feeds use AP with documented conflict resolution.
- [ ] No two services share one database; cross-service reads go through APIs/events, not shared tables.

## Cross-service workflows (sagas)

- [ ] No distributed two-phase commit across services: 2PC couples every participant's availability to the coordinator and blocks participants when the coordinator fails — cross-service workflows use sagas instead.
- [ ] Orchestrated sagas for auditable multi-step flows: a durable orchestrator (explicit state machine, outbox-backed) drives the step sequence, each step a local transaction plus an event; failures trigger compensating transactions in reverse order.
- [ ] Every step has an idempotent forward action and a compensating action that is safe to run more than once — at-least-once delivery applies to compensations too; orchestration state is persisted so a crashed orchestrator resumes where it left off.
- [ ] Choreography (event-only, no orchestrator) is reserved for simple flows where the implicit coupling is acceptable and documented; every saga has an end-to-end timeout plus a dead-letter/alert path for sagas stuck in compensation.

## Caching

- [ ] Cache layers are named explicitly: CDN/edge, local in-process, distributed (Redis/Memcached); every entry has an explicit TTL or documented invalidation strategy.
- [ ] Strategy matches the write pattern: **cache-aside** as the default for read-heavy; **write-through** where reads must reflect latest writes; **write-behind** only for data affordable to lose; **write-around** for write-heavy, rarely-read data.
- [ ] On write, the key is **deleted/invalidated rather than updated in place** — concurrent writers can interleave updates so the cache permanently holds the older value.
- [ ] TTL is a staleness **bound** and size control, not a correctness mechanism; correctness comes from invalidation, aligned with the dataset's consistency model.
- [ ] Cache-stampede mitigation exists: singleflight/request coalescing on hot misses, jittered or probabilistic-early TTL expiry, and a cache-down fallback path that degrades to the origin instead of erroring.
- [ ] Cache hit ratio, eviction rate, and origin load on miss are emitted as metrics with alert thresholds.

## Queues and event streaming

- [ ] All slow/bursty/fire-and-forget work is offloaded to an async queue/stream, not the request path; queues have bounded depth with an overflow policy plus a dead-letter queue after N retries.
- [ ] **At-least-once delivery** is assumed end-to-end; exactly-once is never claimed (Kafka transactions only shrink the window for Kafka-to-Kafka); consumers are idempotent via client-generated idempotency keys or dedup windows.
- [ ] Stream platform is chosen deliberately (checked 2026-09-30): Kafka 4.x with KRaft metadata (no ZooKeeper); Redpanda for Kafka-API compatibility in one binary with tighter p99 (BSL license); Pulsar for native multi-tenancy and geo-replication at higher ops cost; NATS JetStream for lightweight sub-ms edge/IoT streaming; RabbitMQ for routing-rich workloads with quorum queues; managed options (Kinesis, Pub/Sub, Event Hubs) where ops capacity is thin.
- [ ] Partition key is chosen for parallelism **and** ordering: ordering is guaranteed only within a partition/key; partition count is fixed before scale-out (adding partitions does not repartition existing data).
- [ ] Backpressure is end-to-end: producers throttle or shed by policy before queues blow memory; consumer lag is measured and alerted.
- [ ] Poison messages route to the DLQ after bounded retries and never block a partition forever.

## Load balancing and service mesh

- [ ] Documented LB algorithm per workload: round-robin (homogeneous stateless), least-connections / power-of-two-choices (heterogeneous/latency-sensitive), consistent hashing (only where cache affinity is needed); backend capacity differences encoded via weights.
- [ ] Active health checks on an explicit interval (≤ 10s) against a dedicated endpoint validating dependencies; unhealthy backends removed within one interval, re-added only after N consecutive passing checks.
- [ ] Passive health checking (error/timeout counters) plus connection draining for deploys/scale-down; TLS terminated at the edge; sticky sessions avoided (documented as an exception if used).
- [ ] A service mesh is adopted only for a named problem (mTLS at scale, L7 traffic shaping) — not because it is modern. 2026 options (checked 2026-09-30): Istio for the richest L7 control (ambient mode removes the per-pod sidecar); Linkerd for simplicity (~20 MB Rust proxy, zero-config mTLS); Cilium for sidecarless eBPF, best when already on the Cilium CNI.
- [ ] Mesh data-plane overhead is measured and budgeted, not assumed: per-pod sidecar CPU/memory/latency cost is in capacity planning, and ambient/sidecarless modes are evaluated against it.

## Multi-region and cell-based architecture

- [ ] Region strategy is named: single region + AZs (the default); active-passive (cheaper, pays failover RTO); active-active (lower latency, conflict complexity).
- [ ] Active-active is avoided for contended records (global counters, inventory) without CRDTs or deterministic ownership — every write has one true owner region.
- [ ] Above the blast-radius threshold, a **cell-based architecture** is used: independent stacks per tenant cohort, with shuffle sharding so one bad cell cannot take down all customers.
- [ ] Cross-region replication lag is measured and alerted; per-region RPO/RTO are documented and the failover is actually drilled — an undrilled failover does not exist.
- [ ] Data residency is explicit: per-region tenant assignment, egress controls, per-region keys — decided before an audit forces a re-architecture.

## Tail latency

- [ ] SLOs are stated at p99/p99.9, never mean/median; fan-out multiplies tail exposure — the slowest of N backends dominates the request.
- [ ] **Hedged requests**: race a delayed duplicate at ~p95 of expected latency, cancel the loser; hedges capped at ~5% extra load with a self-limiting budget so a broad slowdown does not become a re-issue storm.
- [ ] **Tied requests** where applicable: replicas aware of each other cancel the queued duplicate (tail latency is mostly queueing, not processing).
- [ ] Latency budgets are allocated per hop from the end-to-end SLO; independent fan-out is parallelized, never serialized (10 serial intra-DC RPCs cost ~5 ms of network before any work happens).
- [ ] Graceful degradation is agreed with product in advance per feature: partial results vs error at deadline, with owners and metrics.

## Resilience

- [ ] Every synchronous call has an **explicit timeout** sized from the caller's latency budget; deadlines propagate downstream; missing timeout = defect.
- [ ] Retries **bounded** (≤ 3–5 attempts), exponential backoff **with jitter**, a **retry budget** (≤ 10% of traffic); retries only on idempotent ops and retryable errors (never 4xx); honor `Retry-After`.
- [ ] Circuit breaker (closed → open → half-open) wraps every hangable external dependency, with explicit thresholds, open cooldown, and half-open probing.
- [ ] **Bulkheads**: isolated resource pools per dependency/tenant with explicit caps; saturation is a metric with an alert.
- [ ] Load shedding at the edge under saturation (429/503 + `Retry-After`); graceful-degradation paths **decided in advance per feature** with owners, metrics, and alerts.
- [ ] All retryable mutating endpoints accept a **client-generated idempotency key**; at-least-once delivery assumed everywhere; exactly-once never claimed.
- [ ] RTO/RPO documented per data store; backups automated to match RPO; ≥1 copy isolated from the primary blast radius; **restore tested on schedule**; PITR exists (replication is not backup).

## Observability and SLOs

- [ ] Every request-driven service emits RED per endpoint (**Rate, Errors, Duration** p50/p95/p99); every resource emits USE (**Utilization, Saturation, Errors**).
- [ ] Structured JSON logs with consistent keys (`timestamp, level, service, trace_id, request_id, message`); trace ID propagated across all boundaries; PII redacted at source.
- [ ] Distributed tracing end-to-end (OpenTelemetry, W3C Trace Context); spans named `{service}.{operation}`; sampling explicit (100% errors, 1–10% successes).
- [ ] SLI per critical user journey over a 28/30-day window (e.g. "99.9% of requests succeed within 200 ms"); SLO targets are credible against dependency SLOs — never 99.99% on 99.9% dependencies.
- [ ] Error budget is tracked **with a policy that has teeth**: < 20% remaining → risky deploys need senior approval; exhausted → feature freeze, reliability work only.
- [ ] Alerts fire on **multi-window, multi-burn-rate** (Google SRE Workbook ch. 5): 14.4× burn on 1h+5m windows = page; 6× on 6h+30m = page; 3× on 24h+2h = ticket; 1× on 3d+6h = ticket — never raw infra thresholds.
- [ ] Every alert is actionable and owned — non-actionable alerts are deleted, not muted.
- [ ] Metric labels bounded-cardinality (no user/request IDs in labels).

## Sources

- https://github.com/dinoquinten/claude-plugins/blob/HEAD/system-and-database-design/skills/design-principles/references/cap-pacelc.md
- https://github.com/ruchit07/system-architecture-catalog/blob/HEAD/docs/cap-theorem.md
- https://github.com/design-gurus/grokking-system-design/blob/HEAD/deep-dives/raft-consensus.md
- https://github.com/grndlvl/software-patterns/blob/HEAD/.claude/skills/ddia/partitioning/strategies.md
- https://github.com/uncle-taki/atlas-at-scale/blob/HEAD/docs/guide/05-consistent-hashing.md
- https://github.com/snoodleboot-io/prompticorn/blob/HEAD/./prompticorn/skills/distributed-caching-design/minimal/SKILL.md
- https://github.com/gufranco/claude-engineering-rules/blob/HEAD/standards/caching.md
- https://github.com/utkarsh5026/backend-gauntlet/blob/HEAD/projects/03-realtime-pubsub/RESEARCH.md
- https://github.com/gstookey/rr/blob/HEAD/docs/context/platform/research/event_message_bus_brief_v0.md
- https://tech-insider.org/istio-vs-linkerd-vs-cilium-service-mesh-2026/
- https://github.com/halilibrahimd27/devsecops-handbook/blob/HEAD/09-Networking/Service-Mesh-Comparison.en.md
- https://github.com/sunchit/systemdesigncrashcourse/blob/HEAD/11-cloud-architecture/03-multi-region-architecture.md
- https://github.com/priyansh19/system-design-expert-llm/blob/HEAD/data/seed_corpus/multi-region-active-active.md
- https://github.com/ritesh-18/revision-material/blob/HEAD/SRE-Complete-Handbook/Part9-Advanced/35-Multi-Region-DR.md
- https://www.devx.com/web-development-zone/how-to-reduce-latency-in-distributed-systems/
- https://github.com/awslabs/aws-s3-transfer-manager-rs/blob/HEAD/docs/design/hedging.md
- https://github.com/staffops/staffops-skills/blob/HEAD/skills/sre/error-budget-framework/SKILL.md
- https://github.com/uptimepage/uptimepage/blob/HEAD/src/marketing/content/blog/error-budgets-explained.md
