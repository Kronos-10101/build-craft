# API versioning — deprecation and compatibility discipline

Deep companion to the Versioning & compatibility section in `references/backend-api.md`: choosing a strategy, classifying breaking changes, writing a deprecation policy as a contract, and migrating consumers without breaking them. Checked 2026-10-13.

## Choosing a versioning strategy

- [ ] Exactly one strategy across the whole API surface from day one — never mixed, never per-resource versioning (one version for the entire surface, so consumers reason about one number).
- [ ] URL path (`/v1/`) is the default for public APIs: visible in logs and docs, trivially routable, cache-friendly; cost is URI pollution and clients hardcoding paths.
- [ ] Date-pinning header (`Stripe-Version: 2024-06-20`, the Stripe/GitHub/Shopify model) only when API stability is the product: URIs stay clean and the API evolves continuously, but versions are invisible (harder debugging, worse DX for casual integrators) and responses must carry `Vary` on the versioning dimension.
- [ ] Versioned `Accept` media type only for internal or hypermedia APIs where content negotiation is already the norm — never for a public developer API.
- [ ] Decision inputs recorded: public vs partner vs internal consumers; mobile clients (stale app versions cannot be force-upgraded → longer support windows); CDN/proxy behavior per strategy.
- [ ] Unversioned requests have a documented behavior — explicit is better: reject with `400` + a `Link` to versioning docs, or pin to a named default version; never silently serve "latest" (that turns every additive change into a potential surprise).

## Breaking-change taxonomy

- [ ] Breaking (ships only in a new version): field or endpoint removed/renamed; field type changed; optional field becomes required; default value changed; error code or error semantics changed; validation tightened (previously accepted input now rejected); pagination defaults or sort order changed; auth requirements added.
- [ ] Non-breaking (ships in place, no version bump): new endpoints; new optional request fields; new optional query parameters; new response headers; relaxed validation (longer max lengths, wider enums on input); new webhook event types (receivers must ignore unknown types — see `backend-api.md`).
- [ ] The enum trap: adding a value to a response enum is "additive" on the wire but breaks clients with exhaustive switches — treat as potentially breaking: announce it in the changelog and prefer additive-safe shapes (new fields over new enum values) for high-churn dimensions.
- [ ] Additive-only evolution is the default posture; versions exist for the unavoidable remainder, not as a release train — versioning every change trains consumers to pin and never upgrade.

## Deprecation policy (the contract)

- [ ] The policy is written and published before v1 ships: support window (e.g. 12 months or 2 major versions), notice periods, and communication channels (changelog, status page, direct email for breaking changes).
- [ ] Lifecycle states are explicit and never skipped: `current` → `deprecated` (fully supported, migration path published) → `sunset` (410 Gone). No endpoint goes from current to gone.
- [ ] Wire protocol per `backend-api.md`: `Deprecation: @<unix-timestamp>` (RFC 9745), `Sunset: <HTTP-date>` (RFC 8594) once a removal date is set, `Link` headers with `rel="deprecation"` and `rel="successor-version"` (RFC 8288); OpenAPI marks retiring operations `deprecated: true`.
- [ ] Sunset date never precedes the deprecation date; both are contractual — moving a sunset date earlier is itself a breaking change and gets the full notice period again.
- [ ] Retirement is traffic-gated, not calendar-gated: per-version request metrics tracked; sunset happens when the old version is quiet, with an explicit exception process (who approves extensions, how they are tracked) for enterprise contracts.
- [ ] Version numbers are never reused; retired versions stay documented in the changelog permanently so old client errors remain diagnosable.

## Migration patterns

- [ ] Expand-contract for APIs (mirrors the database pattern in `references/databases.md`): add the new field/endpoint → dual-serve old and new → migrate consumers → remove the old. The API is never in a state where a supported client has nowhere to go.
- [ ] Every breaking change ships a migration guide with before/after request/response pairs, not just a changelog line; SDK majors ship codemods where the change is mechanical.
- [ ] Dual-write periods are bounded and dated in the policy; unbounded "we support both forever" is how you end up maintaining v1 through v9.

## Testing versioned APIs

- [ ] Contract tests run per supported version, not just latest — a green suite on v3 says nothing about v1 still honoring its contract.
- [ ] CI fails on unintentional contract drift (oasdiff against the published spec per `backend-api.md`); intentional breaks require the new version to exist first.
- [ ] Deprecation headers asserted in tests for every deprecated operation; a scheduled CI check fails when a sunset date passes without the version being removed (dead versions rot into security surface).
- [ ] Client-compatibility fixtures: recorded traffic from the oldest supported client version replayed against new deploys.

## Common failures

- [ ] Versioning eagerly (every change bumps a version → consumers pin v1 forever and never migrate) or never versioning (breaking changes smuggled in as "minor improvements").
- [ ] Sunsetting by calendar without measuring traffic — then discovering a mobile app version from 2024 still calling v1.
- [ ] Mixed strategies across services on one platform (gateway on `/v2/`, billing on a date header) — consumers cannot build one version-handling code path.
- [ ] Announcing deprecation only in docs nobody reads: headers + changelog + direct notice for breaking changes, all three.
- [ ] Treating internal and public APIs identically: internal APIs can move faster with shorter windows, but the policy must say so explicitly — "internal, 30-day notice" beats silent breakage.

## Sources

- https://www.rfc-editor.org/rfc/rfc9745 (Deprecation header field)
- https://www.rfc-editor.org/rfc/rfc8594 (Sunset header field)
- https://www.rfc-editor.org/rfc/rfc8288 (Link relations)
- https://docs.stripe.com/api/versioning
- https://docs.github.com/en/rest/about-the-rest-api/api-versions
- https://semver.org/ (analogy only — library versioning is not API versioning: consumers cannot `npm update` an API)
