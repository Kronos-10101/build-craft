# System Design — production checklist

Covers scalability, CAP trade-offs, load balancing, monolith vs microservices, resilience, and observability.

## Scalability

- [ ] Every app instance is **stateless** — no in-memory session or local-disk state; session/auth state lives in a shared external store.
- [ ] Horizontal-scaling path exists: N≥2 instances behind a load balancer with documented scale triggers (CPU / RPS / queue depth); the LB layer itself is redundant.
- [ ] Caching at ≥2 levels: CDN for static/edge-cacheable responses, application cache (Redis/Memcached) for hot reads; every entry has an explicit TTL or documented invalidation strategy.
- [ ] Thundering-herd mitigation for hot cache misses (singleflight / request coalescing, jittered TTLs).
- [ ] Read-scale plan: read replicas with a measured, bounded replication lag. Write-scale plan beyond one node (sharding strategy) for tables projected past single-node capacity.
- [ ] All slow/bursty/fire-and-forget work offloaded to an async queue (Kafka/SQS/RabbitMQ), not the request path; queues have bounded depth with an overflow policy plus a dead-letter queue after N retries.
- [ ] Cache hit ratio, queue depth, and queue age emitted as metrics with alert thresholds.

## CAP trade-offs

- [ ] A consistency model is **explicitly documented per dataset/operation** (strong for ledger/payments, eventual for feeds/sessions) — never assumed globally.
- [ ] Partition tolerance assumed mandatory; documented behavior for a network partition (which ops block, which serve stale).
- [ ] Payment/ledger/inventory use CP semantics — fail/queue on partition rather than serve possibly-stale balances; sessions/counters/feeds use AP with documented conflict resolution.
- [ ] No component claims "CA" in a real distributed deployment. PACELC considered even without partitions: read paths carry explicit staleness budgets.
- [ ] No two services share one database; cross-service reads go through APIs/events, not shared tables.

## Load balancing

- [ ] Documented LB algorithm per workload: round-robin (homogeneous stateless), least-connections / power-of-two-choices (heterogeneous/latency-sensitive), consistent hashing (only where cache affinity is needed); backend capacity differences encoded via weights.
- [ ] Active health checks on an explicit interval (≤ 10s) against a dedicated endpoint validating dependencies; unhealthy backends removed within one interval, re-added only after N consecutive passing checks.
- [ ] Passive health checking (error/timeout counters) plus connection draining for deploys/scale-down; TLS terminated at the edge; sticky sessions avoided (documented as an exception if used).

## Microservices vs monolith

- [ ] Start from a **modular monolith baseline**; every service boundary has a named, concrete reason to be a network boundary.
- [ ] A boundary exists only if ≥1 extraction criterion is met: distinct team needs deploy/on-call autonomy; ≥10× scaling asymmetry; blast-radius isolation (payments, untrusted code); genuine runtime/technology mismatch; compliance isolation (PCI).
- [ ] One team owns each service; monolith while < ~10–20 engineers. "It's getting big" (LOC) rejected as a splitting criterion.
- [ ] Microservices prerequisites verified before splitting: per-service CI/CD, distributed tracing, per-service runbooks, on-call coverage. Migration via strangler-fig, one boundary at a time.

## Resilience

- [ ] Every synchronous call has an **explicit timeout** sized from the caller's latency budget; deadlines propagate downstream; missing timeout = defect.
- [ ] Retries **bounded** (≤ 3–5 attempts), exponential backoff **with jitter**, a **retry budget** (≤ 10% of traffic); retries only on idempotent ops and retryable errors (never 4xx); honor `Retry-After`.
- [ ] Circuit breaker (closed → open → half-open) wraps every hangable external dependency, with explicit thresholds, open cooldown, and half-open probing.
- [ ] **Bulkheads**: isolated resource pools per dependency/tenant with explicit caps; saturation is a metric with an alert.
- [ ] Load shedding at the edge under saturation (429/503 + `Retry-After`); graceful-degradation paths **decided in advance per feature** with owners, metrics, and alerts.
- [ ] All retryable mutating endpoints accept a **client-generated idempotency key**; at-least-once delivery assumed everywhere; exactly-once never claimed.
- [ ] RTO/RPO documented per data store; backups automated to match RPO; ≥1 copy isolated from the primary blast radius; **restore tested on schedule**; PITR exists (replication is not backup).

## Observability

- [ ] Every request-driven service emits RED per endpoint (**Rate, Errors, Duration** p50/p95/p99); every resource emits USE (**Utilization, Saturation, Errors**).
- [ ] Structured JSON logs with consistent keys (`timestamp, level, service, trace_id, request_id, message`); trace ID propagated across all boundaries; PII redacted at source.
- [ ] Distributed tracing end-to-end (OpenTelemetry, W3C Trace Context); spans named `{service}.{operation}`; sampling explicit (100% errors, 1–10% successes).
- [ ] SLIs/SLOs per critical user journey; **error budget** tracked; budget exhaustion freezes feature work. Alerts fire on **SLO burn rate**, not raw infra thresholds; every alert is actionable — non-actionable alerts deleted, not muted.
- [ ] Metric labels bounded-cardinality (no user/request IDs in labels).

## Sources

- https://en.wikipedia.org/wiki/CAP_theorem · https://www.ibm.com/think/topics/cap-theorem
- https://github.com/swestash/swe-workflow-skills/blob/HEAD/skills/resilience-engineering/SKILL.md
- https://github.com/otavioola/maang-system-design-playbook/blob/HEAD/04-patterns-and-paradigms/01-microservices-vs-monolith.md
