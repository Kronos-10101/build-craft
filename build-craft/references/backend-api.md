# Backend API — production checklist

Covers REST/HTTP semantics, versioning and compatibility, input validation, authentication/JWT hardening, authorization, rate limiting, pagination, idempotency, outbound webhooks, caching, RFC 9457 error responses, observability, health checks, long-running operations, and deployment hygiene.

## REST & HTTP semantics

- [ ] Resource URIs are plural nouns, never verbs (`/orders`, not `/getOrders`); genuine non-CRUD actions modeled as sub-resources (`POST /orders/{id}/cancellation`).
- [ ] Nesting capped at 2–3 levels (`/users/{id}/orders`); multi-word paths in lowercase kebab-case.
- [ ] Method semantics follow RFC 9110: `GET`/`HEAD`/`OPTIONS` are safe and idempotent; `PUT`/`DELETE` idempotent but not safe; `POST` neither; `PATCH` neither (RFC 5789) — no state change behind `GET`.
- [ ] `PUT` = full resource replace (idempotent), `PATCH` = partial update with an explicit media type (`application/merge-patch+json` per RFC 7386 or `application/json-patch+json` per RFC 6902), `DELETE` = remove.
- [ ] Status codes mean what they say: `201` + `Location` on create, `202` for accepted-but-not-done, `204` with no body, `200` never carries a failure, `400` malformed vs `422` semantically invalid, `401` vs `403` kept distinct, `409` conflict, `412` precondition failed, `410 Gone` for retired resources (never `404` for a sunset endpoint).
- [ ] `503` used only for genuine service unavailability with `Retry-After`; client throttling always returns `429`, never `503`.
- [ ] Response collections wrapped in an envelope object (never bare top-level arrays) so pagination metadata and links can be added later without a breaking change.
- [ ] JSON key casing consistent across every endpoint; `Content-Type` always matches the body; `Cache-Control` set explicitly on every response.

## Versioning & compatibility

- [ ] Exactly one versioning strategy everywhere from day one: URL path (`/v1/`) for public APIs (default), date-pinning header (`Stripe-Version: 2024-06-20`, Stripe/GitHub/Shopify model) only when API stability is the product, versioned `Accept` media type only for internal/hypermedia APIs — never mixed.
- [ ] New versions ship only for breaking changes (field removed/renamed, type changed, optional→required, default changed); additive changes (new fields, new endpoints, new optional params) ship in place with no version bump; retired version numbers never reused.
- [ ] Every deprecated endpoint emits `Deprecation: @<unix-timestamp>` (RFC 9745, published March 2025 — Structured Field date, not `true`, not HTTP-date) and, when a removal date is set, `Sunset: <HTTP-date>` (RFC 8594) plus `Link: <docs>; rel="deprecation"` and `rel="successor-version"` (RFC 8288 link relations).
- [ ] Sunset date never precedes the deprecation date; after the sunset date the endpoint returns `410 Gone`, not `404`; OpenAPI marks retiring operations `deprecated: true`.
- [ ] Old and new versions run side by side while consumers migrate; per-version traffic metrics tracked; retirement happens only when the old version is quiet — mobile clients on stale app versions cannot be force-upgraded.
- [ ] If the version lives outside the URL (header or `Accept`), responses include `Vary` on the versioning dimension so CDNs never serve one version's body to another's clients.
- [ ] OpenAPI spec generated from code, not hand-maintained (3.1.x aligns schemas with JSON Schema 2020-12; 3.2.0 released September 2025 adds streaming, hierarchical tags, arbitrary HTTP methods); CI fails on unintentional contract drift (e.g. oasdiff).

## Input validation & SSRF

- [ ] Every input (body, query, path params, headers) validated server-side against schemas (pydantic/zod/JSON Schema) before business logic; client input never trusted.
- [ ] Unknown/extra fields and unknown query parameters rejected with `400` (strict schema mode); field-level validation failures returned in an `errors[]` array with JSON Pointers (RFC 6901) locating each offending field.
- [ ] Resource bounds enforced: max body size, string lengths, numeric ranges, enums, array element counts; file uploads capped by type (sniffed content type, not extension) and size.
- [ ] Mass assignment prevented: explicit allowlist of writable fields per endpoint (OWASP API3:2023 BOPLA); read responses return only properties the caller is entitled to see.
- [ ] No injection anywhere: parameterized queries/ORM only; user-controlled outbound URLs validated against an allowlist with private and link-local ranges (e.g. `169.254.169.254`) blocked; cloud metadata services require IMDSv2 (OWASP API7:2023 SSRF).
- [ ] Third-party/upstream API responses treated as untrusted input: validated and sanitized before use, TLS enforced on integration traffic, redirects never followed blindly (OWASP API10:2023 Unsafe Consumption of APIs).

## Authentication & JWT hardening

- [ ] OAuth2/OIDC with authorization-code flow + PKCE (S256) for all clients; implicit and ROPC grants banned (RFC 9700 OAuth Security BCP, January 2025).
- [ ] JWT verifier pins a server-side algorithm allowlist (RS256/ES256/EdDSA); `alg:none` rejected; RS256→HS256 confusion impossible — one verifier per key type, never reading `alg` from the token header to select the verifier (RFC 8725 §2.1).
- [ ] Every request validates signature, `exp`, `iss`, `aud`, `nbf`; `typ` checked so an ID token cannot be replayed as an access token; `kid` resolved only against the issuer's published JWKS (pinned TLS, cached with short TTL, `kid` uniqueness enforced) — no `jku`/`x5u` from untrusted domains.
- [ ] Payloads carry `sub`, `iss`, `aud`, `exp`, `iat`, `jti`, scopes only — no PII, emails, or secrets (JWTs are signed, not encrypted); HS256 only when issuer and verifier are the same service, with a ≥32-byte random secret.
- [ ] Short-lived access tokens (5–15 min) with single-use rotating refresh tokens; presenting a consumed refresh token revokes the entire token family (theft detection).
- [ ] Sender-constrained tokens (DPoP per RFC 9449, or mTLS for service-to-service) where a stolen Bearer <redacted> is the primary threat; refresh tokens one-time-use or sender-constrained per RFC 9700.
- [ ] Tokens never appear in URLs or query strings; browser storage is HttpOnly + Secure + SameSite cookies (with CSRF protection) or short-lived memory — never localStorage or sessionStorage.
- [ ] Signing keys live in a secret manager, rotated on a schedule with overlapping `kid`s during rollover; never in code, logs, error bodies, or URLs.

## Authorization

- [ ] Object-level authorization on every handler (OWASP API1:2023 BOLA — the #1 API risk): the caller owns the addressed object, ownership derived from the server-side session, never from a client-supplied claim; IDs non-sequential (UUIDv7) so they cannot be enumerated.
- [ ] Function-level authorization inside handlers for admin/privileged endpoints (OWASP API5:2023 BFLA); deny-by-default; authorization logic centralized, not reimplemented per handler.
- [ ] Sensitive business flows (purchase, signup, booking, account recovery) get business-logic-aware throttling plus step-up verification and bot/device detection — not just per-endpoint rate limits (OWASP API6:2023).
- [ ] Every endpoint covered by authorization tests that differ only in token identity (owner vs non-owner vs anonymous), asserting `403`/`404` — no handler ships with only "happy path" tests.
- [ ] Continuous API inventory across every environment: shadow, zombie, and deprecated endpoints discovered and retired on schedule, each with host, version, auth posture, and data flow documented (OWASP API9:2023).

## Rate limiting & resource consumption

- [ ] Limits enforced at multiple scopes (per user/tenant and per IP), stricter on auth and expensive endpoints, backed by a shared store (Redis) when multi-instance; the algorithm (token bucket / sliding window) is documented and load-tested.
- [ ] Rejections use `429` with `Retry-After` (RFC 6585); `RateLimit` / `RateLimit-Policy` quota headers emitted defensively — the IETF rate-limit draft (`draft-ietf-httpapi-ratelimit-headers`, active v11 as of 2026-05-23, not published) means clients must behave correctly with those headers absent.
- [ ] Cost-based limits bound worst-case work: request-size caps, max page size, query-depth/complexity caps, execution timeouts; billing alerts on metered downstream calls (SMS, email, cloud egress) to block cost-based DoS (OWASP API4:2023).
- [ ] Health/readiness endpoints exempted from limits; every rate-limit event logged with scope, key, and rule name.
- [ ] Burst behavior verified under synthetic load — limits hold before the database does, not after.

## Pagination, filtering & sorting

- [ ] Every list endpoint paginated: server-enforced default (20–50) and hard max (100); no unbounded result sets; total counts returned only when cheap or cached separately, never via full-scan `COUNT(*)` per request.
- [ ] Cursor/keyset pagination by default at scale: opaque cursors, deterministic `ORDER BY` with a unique tiebreaker so pages stay stable under concurrent writes; offset allowed only for small frozen admin lists.
- [ ] Navigation exposed via RFC 8288 `Link` headers (`rel="next"`, `rel="prev"`); cursors never leak internal row IDs or implementation details.
- [ ] Filterable/sortable fields from an explicit allowlist, all backed by indexes (verified with `EXPLAIN`); unknown filter/sort params rejected with `400`; empty collection returns `200` with `[]`, never `404`.
- [ ] Filter operators bounded (no arbitrary expression languages on the wire); date ranges and text search get dedicated, indexed parameters.

## Idempotency & safe retries

- [ ] All non-idempotent writes (`POST`/`PATCH`) accept an `Idempotency-Key` header (client-generated UUIDv4, unique per operation); the `(key, route, tenant) → (request fingerprint, response)` record is stored persistently with a TTL, an in-progress lock, and a published expiration policy (Stripe: 24h).
- [ ] Replay contract: same key + same payload → original response replayed verbatim (status code included); same key + different payload → `422`; concurrent retry while the first is in flight → `409`.
- [ ] Fingerprint = SHA-256 over raw request bytes (no JSON canonicalization); error responses (4xx/5xx) are never cached under a key; keys are scoped per tenant/user.
- [ ] The IETF idempotency-key draft (`draft-ietf-httpapi-idempotency-key-header`) expired 2026-04-18 and was never published — treat the header as a de facto convention (per Stripe's implementation) and document the exact server contract, including the mismatch status code.
- [ ] Clients retry only on 429/5xx/timeouts with exponential backoff + jitter (no tight loops); every outbound call carries a timeout and deadline; a retry storm against a degraded dependency is prevented by client-side budgets.

## Webhooks (outbound delivery)

- [ ] Delivery follows the Standard Webhooks scheme (checked 2026-09-30: adopted by OpenAI, Anthropic, Google, Kong, Svix, Supabase, Twilio): `webhook-id`, `webhook-timestamp`, `webhook-signature` headers; signature = HMAC-SHA256 over `{id}.{timestamp}.{body}` with the secret decoded from the `whsec_`-prefixed base64 value.
- [ ] Inbound verification runs against the raw request body bytes (never parsed-then-reserialized) with constant-time comparison; timestamps outside a 5-minute window are rejected (replay protection); failed verification returns `400` — use the provider's official verification library rather than hand-rolled crypto.
- [ ] Receivers acknowledge fast: `2xx` within the provider's timeout (typically ≤15s), heavy work pushed async — anything else, including `3xx`, is treated as a failure and retried.
- [ ] Receivers deduplicate by message ID (delivery is at-least-once), never assume event ordering (compare event time / resource `updated_at` before overwriting), and ignore unknown event types so new types deploy without breaking consumers.
- [ ] Producers retry with exponential backoff + jitter to a terminal state, then park in a dead-letter queue with full payload, headers, and failure reason for replay; a circuit breaker auto-disables endpoints after sustained failure and fires an operational alert (never one abandoned endpoint generating traffic forever).
- [ ] Endpoint registration rejects non-HTTPS URLs and private/link-local destinations; signing secrets are per-endpoint, rotatable, stored server-side, and never placed in the URL.
- [ ] Outbound workers run where they cannot reach internal services (SSRF egress filtering); every event type versioned with a documented payload contract and changelog.

## Caching & conditional requests

- [ ] `ETag` emitted on cacheable GETs; `If-None-Match` returns `304 Not Modified`; `If-Match` on `PUT`/`PATCH`/`DELETE` returns `412 Precondition Failed` on lost update (optimistic concurrency per RFC 9110 §13).
- [ ] `Cache-Control` explicit on every response: `private` + bounded `max-age` for user-specific data; `no-store` for secrets and credentials — not `no-cache`, which still permits storage (RFC 9111).
- [ ] CDN/proxy cache keys include every dimension that varies the response (version headers, `Accept`, auth) via `Vary`; never cache authenticated responses on a shared cache key.

## Errors (RFC 9457 problem details)

- [ ] All 4xx/5xx responses use `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`; `type` is a stable, absolute, resolvable URI naming the problem category (default `about:blank` only when no type is defined); `title` never changes between occurrences.
- [ ] The `status` member always matches the actual HTTP status code (the body is advisory — generic HTTP software still needs the right code); a plain status code suffices when it is self-explanatory (RFC 9457: don't invent problem types you don't need).
- [ ] `detail` helps the client fix the problem — never stack traces, internal paths, SQL, or internal IDs; machine-readable specifics go in documented extension members (e.g. an `errors[]` array), and clients ignore unknown extensions.
- [ ] Problem types registered in an internal catalog with title, status code, and human docs at the `type` URI; a `type` URI is never recycled for a different meaning (that would be a breaking change).
- [ ] Validation failures return one problem with per-field entries (`errors[]` with `detail` + JSON Pointer per RFC 6901), not a bare string the client must parse.
- [ ] Production responses are generic; full context is logged server-side keyed by the `instance`/request ID for support lookup.

## Observability

- [ ] Logs are structured JSON event streams to stdout; every entry carries request/correlation ID (propagated via W3C `traceparent`), route, status, latency; no PII, passwords, tokens, or secrets in logs.
- [ ] Security events always logged and alerted on: auth failures, 429 spikes, admin actions, webhook verification failures, token-family revocations; anomaly alerts wired to an on-call path.
- [ ] RED metrics per endpoint (request rate, error rate, duration p50/p95/p99) with SLOs and burn-rate alerts; distributed tracing spans cross every service boundary.
- [ ] Request-scoped context (tenant, user, correlation ID) propagated through queues and background jobs — never lost at the HTTP boundary.

## Health checks & graceful shutdown

- [ ] `/livez` checks only the process itself (never downstream deps); `/readyz` checks deps (e.g. DB `SELECT 1`) and returns `503` when not ready; probes are sub-second and wired to the orchestrator.
- [ ] `SIGTERM` handled: stop accepting new connections, fail readiness immediately, drain in-flight requests within the grace period, flush telemetry, exit 0; startup completes in <30s.
- [ ] Every outbound call (DB, cache, upstream APIs) has a timeout; circuit breakers fail fast on unhealthy downstreams instead of queueing behind them.
- [ ] Background jobs are idempotent and cancellation-aware; scheduled work uses a distributed lock so only one instance runs it.

## Long-running operations

- [ ] A `POST` that cannot finish within the request timeout returns `202 Accepted` + `Content-Location` pointing at an operation resource (`/jobs/{id}`) shaped as `{name, done, metadata, response | error}`; clients poll with backoff or subscribe via webhooks/SSE instead of polling.
- [ ] Completed operations return the result directly or `303 See Other` + `Location` to the result resource; failed operations carry an RFC 9457 problem in the `error` field.
- [ ] Operation resources carry a published TTL (~30 days) and are idempotent to poll; creation is itself idempotency-keyed so a retried `POST` doesn't launch the job twice.

## Backend resilience — the 20 core rules (ops checklist)

Rules already covered in depth above are marked; the rest are filled in here. Rate limiting, pagination, idempotency, caching, health checks, error responses, and webhooks live in their own sections — this section closes the remaining gaps.

### Database & queries

- [ ] **Rule 1 — Optimize DB queries**: eliminate N+1 queries with eager loading (`include` in Prisma, `with` in Drizzle, `select_related`/`prefetch_related` in Django, joins in raw SQL); audit slow queries with `EXPLAIN (ANALYZE, BUFFERS)` (PostgreSQL) / `EXPLAIN ANALYZE` (MySQL); never use unqualified `SELECT *` in production code — select only the columns the client view needs.
- [ ] **Rule 2 — Add DB indexes**: index every foreign key (PostgreSQL does not auto-index FKs); index columns in `WHERE`, `ORDER BY`, `GROUP BY`, and `JOIN` clauses; composite index column order follows the query pattern (equality filters first, then range/sort); audit missing indexes on any table over ~1,000 rows. Index candidates verified with `EXPLAIN` per the Pagination section.
- [ ] **Rule 3 — Paginate large results**: covered above (every list endpoint paginated, hard max 100, cursor/keyset at scale); the resilience test is that no query path can return an unbounded result set even when filters are broad.

### Assets, uploads & responses

- [ ] **Rule 4 — Compress files & responses**: enable Gzip/Brotli for text responses (HTML, CSS, JS, JSON) at the reverse proxy or edge (Nginx, Cloudflare, Next.js); automatically transcode user-uploaded media to modern formats (AVIF/WebP images, H.264/WebM video) via Sharp or a transformation pipeline (Cloudinary, Cloudflare Images) — never serve raw camera uploads.
- [ ] **Rule 5 — Limit upload size**: enforce caps at two layers — reverse proxy (`client_max_body_size 10M;` in Nginx, edge limits) so oversized payloads die before hitting app servers, and backend middleware (e.g. `multer({ limits: { fileSize: 10 * 1024 * 1024 } })`, `bodyParser({ limit: '10mb' })`); check `file.size` client-side first for a fast, friendly error.

### Cost control & safety

- [ ] **Rule 10 — Set spending caps**: configure billing alert triggers at 50%, 80%, and 100% of monthly budget (AWS, GCP, Vercel, Supabase); configure hard cost killswitches — automated budget actions or programmatic disablement of expensive resources on unexpected spikes; set hard monthly token caps on every LLM provider dashboard (OpenAI, Anthropic). Cost-based DoS is a billing incident as well as an availability one — alerts on metered downstream calls (SMS, email, egress) per the Resource consumption section.
- [ ] **Rule 9 — Tier quotas & concurrency caps**: per-tenant usage quotas (e.g. 10,000 API requests/month on the free tier) and concurrent-request caps per tenant so one tenant cannot monopolize the worker pool; covered at the HTTP layer above, extended to the tenant model here.

### Error handling & UI states (Rules 11–13)

- [ ] **Rule 11 — Error handling**: frontend error boundaries (top-level and per-component) catch uncaught render errors and show a graceful fallback with a reload action; backend error middleware centralizes handling, catches all unhandled rejections, and returns a consistent sanitized error format (see the RFC 9457 section above) — never stack traces to clients.
- [ ] **Rule 12 — Loading states**: skeletons must match the dimensions and geometry of the content they replace to prevent layout shift (CLS); clicked buttons disable and show an inline spinner or progress bar during async operations; every async state has visible feedback.
- [ ] **Rule 13 — Empty states**: never a stark blank container — an action-oriented empty state with an illustration or icon, an encouraging headline, and a clear primary button ("Create your first project", "Upload your first file").

### Monitoring & network resilience

- [ ] **Rule 7 — Uptime monitoring**: provide lightweight synthetic health endpoints (`/livez` for the process itself, `/readyz` for dependency connectivity) per the Health checks section; add external pingers (BetterStack, UptimeRobot, Pingdom) at ~1-minute intervals with pager escalation (PagerDuty/SMS/Slack) — orchestrator probes are not enough on their own.
- [ ] **Rule 6 — Cache repeat requests (multi-layer)**: HTTP caching (`Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, `ETag`) for public cacheable endpoints; application-layer caching of expensive computations and DB queries in Redis or in-memory stores with sensible TTLs and explicit eviction keys; stale-while-revalidate so users never wait on a cold cache. (See the Caching section above for conditional requests.)
- [ ] **Rule 15 — Timeout discipline**: every outbound call (DB, cache, upstream APIs) carries an explicit timeout — nothing may run indefinitely. In JS, use `AbortController` with a deadline (e.g. 8s) and clear the timer on completion:
  ```ts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s cap
  try {
    const res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  ```
  Timeouts on incoming requests too; circuit breakers fail fast on unhealthy downstreams instead of queueing behind them; timeouts plus backoff prevent hung workers and connection-pool starvation (see the Idempotency section's retry policy: retry only on 429/5xx/timeouts, exponential backoff + jitter, client-side retry budgets).
- [ ] **Rule 14 — Handle failed requests**: automatic retry with exponential backoff + full jitter for idempotent requests (GET) on 502/503/504 or network drops — `T_retry = min(T_max, T_base × 2^attempt) ± jitter`; every failure surface gives the user an explicit manual retry ("Try Again") alongside the automatic policy.

- [ ] **Rule 16 — Error logging**: forward all unhandled server exceptions and client errors to centralized telemetry (Sentry, Datadog, LogRocket); attach git commit SHA / release version, environment (`production`), route name, and a hashed/anonymized user ID — never PII (passwords, card numbers) in log fields; PII is scrubbed before shipping (see the Observability section above for log structure).

### State concurrency & disaster recovery

- [ ] **Rule 17 — Prevent duplicate submissions**: disable the submit button on first click (already covered above); additionally issue a **form idempotency token** — a unique client-side UUID generated when the form loads, submitted with the payload so a double-click or replayed request cannot double-insert.
- [ ] **Rule 18 — Prevent duplicate payments**: already covered above (`Idempotency-Key` on payment creation, unique transaction references, webhook dedup) — the resilience audit confirms the payment path is keyed server-side, not just button-disabled client-side.
- [ ] **Rule 19 — Test simultaneous users**: run load and stress tests (k6, Artillery, Locust) simulating peak concurrent traffic; verify connection-pool behavior under saturation, identify locking bottlenecks and slow queries under load, confirm rate limiters trigger as expected, and establish the system's actual breaking point before users do. Minimal k6 smoke:
  ```js
  import http from 'k6/http';
  import { check } from 'k6';
  export const options = { stages: [
    { duration: '2m', target: 50 },   // ramp up
    { duration: '5m', target: 50 },   // steady state
    { duration: '2m', target: 200 },  // spike
    { duration: '2m', target: 0 },    // ramp down
  ]};
  export default function () {
    const res = http.get('https://staging.example.com/api/v1/orders?limit=20');
    check(res, { 'status is 200': (r) => r.status === 200 });
  }
  ```
  Acceptance criteria for the test: p95 latency within SLO at steady state; no connection-pool exhaustion or 5xx during the spike; rate limiters (429) engage before the database degrades; error logs show no retry-storm amplification.
- [ ] **Rule 20 — Test backup restore**: schedule monthly or quarterly restoration drills — restore an automated production backup snapshot into an isolated staging database and run automated integrity-verification queries against it (row counts on critical tables, checksum spot-checks, app-level smoke queries). An untested backup cannot be trusted in an emergency; backup/restore verification is a runbooked, rehearsed procedure (see `project-structure.md`, Deployment parity).

### The 20 rules — self-audit scorecard

When auditing an existing backend, walk this table top to bottom and mark each rule ✅ / ⚠️ / 🚫. The section links jump to the detailed checks.

| # | Rule | Detailed in |
| :--- | :--- | :--- |
| 1 | Optimize DB queries (no N+1, EXPLAIN, no `SELECT *`) | This section |
| 2 | Add DB indexes (FKs, filters, composites) | This section |
| 3 | Paginate large results (hard max 100, cursor at scale) | Pagination, filtering & sorting |
| 4 | Compress files & responses (Gzip/Brotli, AVIF/WebP) | This section |
| 5 | Limit upload size (proxy + middleware) | This section |
| 6 | Cache repeat requests (HTTP + Redis/in-memory) | Caching & conditional requests |
| 7 | Uptime monitoring (external pingers, pager escalation) | Health checks & graceful shutdown |
| 8 | Rate limiting (scopes, 429 + Retry-After) | Rate limiting & resource consumption |
| 9 | API limits & quotas (per-tenant, concurrency caps) | This section |
| 10 | Spending caps (billing alerts 50/80/100%, killswitches, LLM token caps) | This section |
| 11 | Error handling (boundaries, middleware, sanitized errors) | Errors (RFC 9457) |
| 12 | Loading states (skeleton geometry, spinners) | This section |
| 13 | Empty states (action-oriented, never blank) | This section |
| 14 | Failed requests (backoff + jitter, manual retry) | This section |
| 15 | API timeouts (AbortController deadlines, circuit breakers) | This section |
| 16 | Error logging (centralized telemetry, PII scrubbed) | Observability |
| 17 | Duplicate submissions (button disable + form idempotency tokens) | This section |
| 18 | Duplicate payments (Idempotency-Key, webhook dedup) | Idempotency & safe retries |
| 19 | Load testing (k6/Artillery/Locust, breaking point) | This section |
| 20 | Backup-restore drills (rehearsed restores, integrity checks) | This section |

## Deployment & security posture

- [ ] Config in the environment, never in code: credentials, URLs, feature flags; the same immutable artifact ships to every environment; build/release/run strictly separated.
- [ ] TLS 1.2+ on every hop; HSTS enabled; security headers set (CSP where a browser surface exists); CORS uses an explicit origin allowlist — never `*` with credentials; debug endpoints disabled in production.
- [ ] Dependencies explicitly declared with a lockfile and patched on a schedule; an SBOM is available for supply-chain review (OWASP Top 10:2025 web list, finalized January 2026, adds A03 Software Supply Chain Failures).
- [ ] Staging and internal APIs are not internet-exposed; every public surface is covered by the inventory check above — no forgotten endpoints with weaker auth.
- [ ] Secrets rotation is a runbooked, rehearsed procedure (signing keys, DB credentials, webhook secrets) with no restart-the-world flag day.

## Sources

- https://www.rfc-editor.org/rfc/rfc9457
- https://github.com/standard-webhooks/standard-webhooks/blob/HEAD/skills/receiving-webhooks/SKILL.md
- https://orca.security/resources/blog/owasp-api-security-top-10/
- https://medium.com/@danielvalev/the-owasp-api-top-10-translated-into-bugs-youve-actually-written-8542b967a364
- https://github.com/robotijn/ctoc/blob/HEAD/./skills/devex/api-deprecation-checker/SKILL.md
- https://github.com/camcima/nestjs-deprecation/blob/HEAD/README.md
- https://en.wikipedia.org/wiki/OpenAPI_Specification
- https://spec.openapis.org/oas/
- https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- https://github.com/nguyen-mau-anh/springboot-kb/blob/HEAD/02.api-design/22-api-versioning-strategies.md
- https://github.com/seahal/umaxica-apps-jit-global/blob/HEAD/adr/api-versioning-and-client-conventions.md
- https://github.com/austintheriot/dotfiles/blob/HEAD/.claude/rules/api-design.md
- https://github.com/kariemseiam/playbooks/blob/HEAD/software-engineering/rest-api-design.md
