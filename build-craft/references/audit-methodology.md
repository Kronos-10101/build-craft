# Audit Methodology

How to audit a codebase or system. Read-only work: auditing and fixing are separate mandates.

## Ground rules

- [ ] Every finding cites `file:line` plus a minimal quoted snippet — evidence or it doesn't exist.
- [ ] Conviction over volume: a few high-conviction findings beat long nit lists. Grade uncertainty honestly: confirmed / probable / needs verification.
- [ ] The repo's own conventions (`AGENTS.md` / `CLAUDE.md`) outrank these checklists.
- [ ] Silence is not clearance — every category ends with findings or an explicit "reviewed-clean" note.

## Scoping

- [ ] Pick the audit mode first: full audit, change review (branch diff / PR — highest yield, cheapest to fix while fresh), or architecture pass.
- [ ] Establish the perimeter: in-scope modules, out-of-scope areas, users, data handled (PII / credentials / financial / health), trust boundaries (internet-facing? internal? multi-tenant?).
- [ ] Name the crown jewels: auth/authz, sessions, secrets, payment paths, personal-data flows.
- [ ] Size then strategize: small repos (<50 files / <10k LOC) get a full audit; large repos get one subsystem, a recent diff, or an explicitly scoped pass.
- [ ] Large-codebase sampling: inventory pass first (entry points, dependency graph, trust boundaries), then go deep on auth/authz, input boundaries, payment/PII paths, largest modules, highest-churn code.

## Order of operations

Security depends on trust boundaries; correctness destroys value while performance only slows it; maintainability gates future risk; polish changes no risk posture. Audit in this order:

1. **Threat model & surface enumeration** — trust boundaries, entry points (HTTP routes, CLI, consumers, crons), sensitive assets, attacker personas. Classify every endpoint Public / User-scoped / Elevated before reading implementation.
2. **Security** — auth, injection, secrets, crypto (`references/security.md`).
3. **Correctness** — behavioral pre-mortem per critical path: concurrency races, partial failure (3rd of 5 side effects fails — is the system coherent? idempotent?), boundary values (empty / zero / negative / max / unicode / timezone / clock skew), out-of-order or duplicate events, state-machine holes, resource exhaustion (unbounded queues, unpaginated queries, missing timeouts, FD leaks).
4. **Performance** — hot paths, N+1, missing caches, over/under-fetching, missing indexes, concurrency defaults, schema basics (`references/optimization.md`, `references/databases.md`).
5. **Maintainability** — divergent implementations of the same concern, circular deps, god modules, shared mutable state, drifted duplication, naming/contract drift, dead code, type discipline.
6. **Polish** — docs accuracy, logging hygiene, UI consistency — last (`references/design-polish.md`).

## What to check first (cheap, high-yield)

- [ ] Threat surface inventory mapped and written down.
- [ ] Dependency freshness / CVEs: enumerate direct + transitive deps; run the ecosystem scanner (`npm audit`, `pip-audit`, `cargo audit`, `govulncheck`); flag unmaintained packages, install scripts, unpinned versions, missing lockfile.
- [ ] Secrets in repo: grep `api_key|secret|password|token`; check committed `.env` files and git history; check CI logs.
- [ ] Sensitive-data flow: trace personal data / credentials / payments from every untrusted input to every sink (DB, filesystem, shell, network, DOM).
- [ ] Error-handling gaps: asymmetry across paths, stack traces or secrets in error output.
- [ ] Test coverage on critical paths — untested critical paths are pre-findings.
- [ ] Config surface: env vars, CI/CD pipelines, Dockerfiles, IaC (unpinned actions/images, secrets in workflows).
- [ ] Automated SAST baseline (`bandit -r src/`, lint/type gates) — treat signal as ~30–50% false-positive; verify each manually.

## Security deep pass

Frame it adversarially: "how would I break, corrupt, escalate, or exfiltrate this?"

- [ ] Authentication: JWT handling (alg / expiry / storage), session invalidation on logout, argon2id/bcrypt hashing, MFA, brute-force resistance, reset-token ownership.
- [ ] Authorization: role checks on every elevated endpoint; resource-ownership checks before read/update/delete by ID; tenant isolation. UUIDs are identifiers, not authorization.
- [ ] Injection: template literals with request data in queries; `db.raw()` / raw escape hatches; dynamic ORDER BY / LIMIT (allowlist, not parameterization).
- [ ] Input validation at the boundary: reject over coerce, allowlists over denylists, upload size/type caps, user URLs host-allowlisted before outbound fetch (SSRF).
- [ ] XSS (stored / reflected / DOM); mass assignment (`req.body` → DB update — allowlist updatable fields); insecure deserialization; weak RNG / timing attacks; missing headers (CSP, X-Frame-Options, HSTS); cookie flags; CORS never reflecting origins with credentials; rate limiting on expensive/auth endpoints; no secrets in logs.

## Severity levels

| Level | Definition | Examples |
|---|---|---|
| **Critical** | Exploitable now; compromise / data loss / takeover. Fix before next release (hours). | Unauthenticated RCE; SQLi on login; auth bypass; hardcoded production cloud keys in a release artifact |
| **High** | Exploitable with a small precondition, or a severe correctness flaw. Fix in 24h–2 days. | Missing authz on an admin route; IDOR cross-user access; stored XSS; plaintext scoped secrets in repo; permissive CORS with credentials in prod |
| **Medium** | Defence-in-depth gap; exploitable combined with another bug. Fix in 1–2 weeks. | Missing rate limiting on a sensitive non-auth op; verbose errors leaking stack traces in prod; weak password hashing; sensitive hashes in API responses |
| **Low** | Hardening; no plausible exploit today. Next sprint. | Missing security header; internal IDs in logs; debug mode in prod; reset token in URL |
| **Info** | Observation, not a finding. | Style nit; outdated comment; category reviewed-clean |

Adjusters: bump one level if internet-facing, handles PII/payments/credentials, or a public exploit exists (known-weaponized CVE → Critical regardless of CVSS). Downgrade if local-only on a hardened host. Deferred severity doesn't change because the fix was deferred.

## Report format

Per finding (`SEC-01`, `PERF-01`, …): title · severity · location (`path:LINE`) · evidence (minimal quoted snippet) · description (violated trust assumption) · impact (concrete, with prerequisites) · proof-of-concept / reproduction (numbered, narrowest safe method, dry-run default) · remediation (concrete minimal fix, before/after snippet) · references (most specific CWE, OWASP category, CVE) · confidence (confirmed / probable / needs verification) · false-positive notes.

Then: scope/metadata, executive summary (posture paragraph, top 3–5 risks, severity tally, top-3 priorities), findings ordered by severity, reviewed-clean list (what was grepped), systemic observations (patterns spanning findings), open questions, and a prioritized remediation plan (Fixed / Deferred / Accepted Risk with compensating controls and re-evaluation triggers).

## Re-audit

- [ ] Every fixed finding re-tested against shipped code — re-read the files, don't trust remediation claims; downgrade if a partial fix stays exploitable.
- [ ] Each fix ships with its PoC turned into a regression test; re-run SAST/SCA.
- [ ] New dated audit written as a sibling file; prior audits untouched (the diff tells the story).
- [ ] Tracker lifecycle: Discovered → Triaged → Assigned → Remediated → Verified → Closed. Residual risk statement covers deferred/accepted findings with compensating controls and re-evaluation triggers.

## Sources

- https://en.wikipedia.org/wiki/Software_audit
- https://github.com/sciensoft/agentic-bootstrap/blob/HEAD/.docs/security/methodology.md
- https://github.com/leadcodedev/skills/blob/HEAD/skills/audit/SKILL.md
- https://github.com/specterops/skills/blob/HEAD/skills/owasp-security-code-review/SKILL.md
