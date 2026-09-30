# Backend API — production checklist

Covers REST conventions, validation, auth, rate limiting, pagination, idempotency, logging, errors, health checks, graceful shutdown, and 12-factor basics.

## REST conventions

- [ ] Resource URIs are plural nouns, never verbs (`/orders`, not `/getOrders`); actions via HTTP methods only.
- [ ] Nesting max 2–3 levels (`/users/{id}/orders`); multi-word paths in lowercase kebab-case.
- [ ] API versioned from day one (URL path `/v1/…` or versioned `Accept` media type) — one strategy everywhere.
- [ ] `GET`/`HEAD`/`OPTIONS` never mutate; `PUT` = full replace, `PATCH` = partial, `DELETE` = remove.
- [ ] Correct status codes: `201` + `Location` on create, `204` no body, `400`/`401`/`403`/`404`/`409`/`422`/`429`/`500` as appropriate — never 200-for-everything, never `503` for client throttling.
- [ ] Consistent JSON key casing across all endpoints; `Content-Type` matches the body.
- [ ] Backward compatible: fields added, never renamed/removed in place — deprecate, then remove after consumers migrate.
- [ ] OpenAPI spec generated from code/schemas (not hand-maintained); CI detects contract drift.

## Input validation

- [ ] Every input (body, query, path params, headers) validated server-side against schemas (pydantic/zod/JSON Schema) before business logic; client input never trusted.
- [ ] Unknown/extra fields and unknown query parameters rejected with `400` (strict schema mode).
- [ ] Resource bounds enforced: max body size, string lengths, numeric ranges, enums; file uploads have type/size caps.
- [ ] Mass assignment prevented: explicit allowlist of updatable fields per endpoint.
- [ ] No injection: parameterized queries/ORM only; user-controlled outbound URLs validated against allowlists with internal-IP ranges blocked (SSRF).

## Auth (OAuth2 / JWT)

- [ ] OAuth2/OIDC or asymmetric signed JWTs — never custom crypto, hand-rolled tokens, or homegrown password hashing.
- [ ] JWT verifier pins a server-side algorithm allowlist (RS256/ES256/EdDSA); `alg:none` rejected.
- [ ] Claims validated per request: signature, `exp`, `iss`, `aud`, `nbf`; no PII/secrets in the payload.
- [ ] Short-lived access tokens (5–15 min) with single-use rotating refresh tokens; reuse triggers revocation of the token family.
- [ ] Object-level authorization on every handler (caller owns the addressed object — no BOLA/IDOR); function-level authorization inside handlers for admin/privileged endpoints, not only in middleware.
- [ ] Signing keys and credentials in a secret manager/env, rotated on schedule; never in code, logs, error bodies, or URLs.

## Rate limiting

- [ ] Limits at multiple scopes (per user/tenant and per IP), stricter on auth/expensive endpoints, backed by a shared store (Redis) when multi-instance.
- [ ] Rejections use `429` with `Retry-After`; quota headers (`RateLimit` / `RateLimit-Policy`) on every response.
- [ ] Health/readiness endpoints exempted; rate-limit events logged.

## Pagination

- [ ] Every list endpoint paginated: server-enforced default (20–50) and hard max (100) — no unbounded result sets.
- [ ] Cursor/keyset pagination by default at scale: opaque cursors, deterministic `ORDER BY` with a unique tiebreaker; offset only for small frozen admin lists.
- [ ] Filterable/sortable fields allowlisted and index-backed (verified with `EXPLAIN`); empty collection returns `200` with `[]`, never `404`.

## Idempotency

- [ ] All non-idempotent writes (`POST`/`PATCH`) accept an `Idempotency-Key` header (client-generated UUIDv4, unique per operation).
- [ ] Replay contract: same key + same payload → original response replayed; same key + different payload → `422`; concurrent retry in flight → `409`.
- [ ] `(key → request fingerprint → response)` stored persistently with TTL, fingerprint check, and in-progress lock; keys scoped per tenant/user; expiration policy published.

## Structured logging & errors

- [ ] Logs are structured JSON event streams to stdout (12-factor); every entry carries request/correlation ID, route, status, latency.
- [ ] No PII/passwords/tokens in logs; security events (auth failures, 429s, admin actions) always logged.
- [ ] One error envelope everywhere (RFC 7807 `application/problem+json` or `{error: {code, message, details, requestId}}`); body status matches HTTP status; machine-readable code stable over time.
- [ ] Production errors return generic messages only — no stack traces, internal paths, or DB internals.

## Health checks & graceful shutdown

- [ ] `/livez` checks only the process itself (never downstream deps); `/readyz` checks deps (e.g. DB `SELECT 1`) and returns `503` when not ready; probes sub-second and wired to the orchestrator.
- [ ] `SIGTERM` handled: stop accepting connections, fail readiness immediately, drain in-flight requests within the grace period, flush telemetry, exit 0.
- [ ] Startup fast (<30s target); background jobs idempotent and cancellation-aware.

## 12-factor basics

- [ ] Config in the environment, never in code: credentials, URLs, feature flags; same artifact in every environment.
- [ ] Backing services treated as attached resources via config URLs; processes stateless and share-nothing.
- [ ] Build/release/run strictly separated; immutable releases; migrations as one-off admin processes.
- [ ] Dependencies explicitly declared with a lockfile; dev/prod parity via containers/IaC; service exports via port binding.

## Sources

- https://www.rfc-editor.org/rfc/rfc7807.html · https://www.rfc-editor.org/rfc/rfc8725.html
- https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/03/
- https://12factor.net/ · https://github.com/owasp/devsecopsguideline (API Security)
