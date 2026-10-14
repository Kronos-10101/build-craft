# Critical Path — the MUST-tier rules

Checked 2026-10-14. Distilled from all 34 reference chapters: the rules that
prevent the most production incidents. Read this file FIRST on every build or
audit task, before the routed domain chapters — it is the non-skippable subset.

Hard rule: under time pressure, cut scope — never cut these. Each skipped item
is a named incident class. Any item that genuinely does not apply must be
recorded as a waiver with a one-line reason, never silently dropped.

## Plan (7)

- [ ] Every task carries a binary, tool-checkable done-condition naming the exact command, endpoint, or gate — never "works" or "looks right".
  Why: vague done-conditions let agents declare victory without proof. (planning-grill.md: Atomic acceptance criteria)
- [ ] The plan documents a rollback path before any implementation begins (revert commit, migration down, feature flag).
  Why: deploys without an undo path become incidents. (planning-grill.md: Implementation plan template)
- [ ] Run a pre-mortem assuming the plan already failed; harvest silent failures independently before debate.
  Why: surfaces ~30% more real failure causes (Klein, HBR 2007). (planning-grill.md: Pre-mortem)
- [ ] Identify the riskiest assumption and validate it first; classify one-way vs two-way doors for extra scrutiny.
  Why: late discovery of fatal assumptions wastes the whole build. (planning-grill.md: Task planning and allocation)
- [ ] Name the blast radius up front: every endpoint, table, job, and UI surface the change touches, who is hurt, and how breakage is detected within one deploy.
  Why: unlisted dependencies regress silently in production. (planning-grill.md: Implementation plan template)
- [ ] List non-functional requirements with concrete numbers: p95/p99 targets, nines, peak QPS, RPO, cost ceiling.
  Why: vague NFRs produce architectures that fail at real scale. (system-design-deep.md: Requirements)
- [ ] Identify and mitigate every single point of failure: no lone load balancer, no single database without a replica.
  Why: one failed component ends the whole system. (system-design-deep.md: HLD)

## Build (12)

- [ ] Deny-by-default server-side authorization on every route, with object-level ownership checks on each read/update/delete, tested by ID-swapping.
  Why: prevents IDOR/BOLA, the top API breach class. (security.md: OWASP Top 10:2025 A01)
- [ ] Parameterize every query; forbid string-built SQL; keep untrusted input out of every injection sink (SQL, OS, LDAP, XPath, template).
  Why: injection is a trivial path to full data theft. (security.md: OWASP Top 10:2025 A05)
- [ ] Pin the JWT algorithm server-side and reject `none`; validate iss/aud/exp/nbf on every request; never store tokens in localStorage.
  Why: forged tokens mean instant impersonation. (security.md: Auth — JWT hardening)
- [ ] Keep secrets out of git, logs, URLs, error messages, and telemetry; commit only `.env.example`; pre-commit scanning blocks secret commits.
  Why: a leaked key in history is immediate account takeover. (security.md: Secrets management)
- [ ] Never deserialize untrusted input with a type-constructing deserializer (pickle, unserialize, native); use data-only formats.
  Why: insecure deserialization is unauthenticated remote code execution. (security.md: OWASP Top 10:2025 A08)
- [ ] Strict CORS (never `*` with credentials), strict CSP without `unsafe-inline`/`unsafe-eval`, `Secure; HttpOnly; SameSite` session cookies.
  Why: stops cross-origin and XSS-driven session theft. (security.md: A02 / Cookie hardening)
- [ ] Never bind request bodies directly onto persistence models; allow-list bindable fields per endpoint and project response DTOs.
  Why: mass assignment lets callers grant themselves admin flags. (offensive-security.md: BOPLA; python.md: pydantic extra="forbid")
- [ ] Zero-downtime migrations via expand/contract; never edit a deployed migration or hand-run SQL in prod; set `lock_timeout = '3s'` before DDL.
  Why: schema changes take the site down or silently drift it. (databases.md: Migrations discipline)
- [ ] Use SERIALIZABLE for money, inventory, and uniqueness, with a mandatory bounded retry on serialization failure.
  Why: prevents double-spends and lost updates under concurrency. (databases.md: Transactions)
- [ ] Accept an `Idempotency-Key` on every non-idempotent write; same key + same payload replays, same key + different payload rejects.
  Why: prevents double charges and duplicate inserts on retries. (backend-api.md: Idempotency)
- [ ] Give every outbound call an explicit timeout; wrap hangable dependencies in circuit breakers that fail fast.
  Why: one sick dependency must not cascade into a full outage. (backend-api.md: Resilience)
- [ ] Commit exactly one lockfile per project; CI installs frozen; vulnerability audits in CI block the merge.
  Why: untested dependency versions and known CVEs ship silently. (libraries.md: Supply-chain discipline)

## Verify (10)

- [ ] Every API endpoint has tests for the auth matrix (no/bad/expired token, wrong role), status-code contract, and response schema.
  Why: auth behavior drift is a security regression. (testing.md: API testing)
- [ ] Critical paths (auth, money) get high coverage plus a mutation kill-rate target; execution without assertions proves nothing.
  Why: weak assertions hide untested logic. (testing.md: Coverage; Mutation testing)
- [ ] Every bug fix starts with a failing regression test that reproduces the bug before the fix lands.
  Why: without reproduction the fix may miss the defect. (testing.md: TDD done properly)
- [ ] Integration tests use the real dependency or a faithful container (Testcontainers), never a mock of the thing being integrated.
  Why: mocks across integration seams hide real breakage. (testing.md: Unit vs integration)
- [ ] Load tests assert p95/p99 latency and error rate against an SLO — never averages — using production-shaped traffic; load gates the release.
  Why: averages hide the tail failures real users feel. (testing.md: Load testing)
- [ ] Fuzzing runs continuously on parsers, deserializers, and protocol handlers; every unique crash becomes a regression test.
  Why: malformed input is where attackers find memory corruption. (testing.md: Fuzzing)
- [ ] Native code builds and runs tests under ASan + UBSan with zero reports (TSan in a separate build).
  Why: memory-safety bugs corrupt or hijack production. (c-language.md: Sanitizers)
- [ ] Every audit finding cites `file:line` plus a minimal snippet, with a severity grade and honest confidence.
  Why: uncited, ungraded findings can't be trusted or fixed. (audit-methodology.md: Ground rules)
- [ ] On re-audit, re-test every fixed finding against shipped code yourself; each fix ships its PoC as a regression test.
  Why: partial fixes stay exploitable and silently regress. (audit-methodology.md: Re-audit)
- [ ] Run `scripts/audit-repo.sh` and `readiness-audit.mjs --ci`; no critical blockers ship.
  Why: the automated sweep catches what review misses. (SKILL.md: P-4)

## Ship and operate (7)

- [ ] Roll out progressively only: blue-green or canary (1%→10%→50%→100%) with automatic halt on error-rate/latency regression.
  Why: big-bang deploys maximize blast radius. (project-structure.md: Rollout strategies)
- [ ] Roll back by redeploying the previous immutable image digest — never a rebuild; set automated rollback triggers before the first deploy.
  Why: guarantees fast, bit-identical recovery. (hosting.md: Deployment basics)
- [ ] Run scheduled restore drills: restore a real production backup into an isolated staging database and verify integrity.
  Why: an untested backup is not a backup. (backend-api.md: Test backup restore)
- [ ] Split health checks into liveness (process up) and readiness (can serve traffic); route only to ready instances; drain before terminating.
  Why: traffic must never reach instances that can't serve it. (hosting.md: Deployment basics)
- [ ] Auto-renew TLS via ACME with expiry alerts at 30 and 7 days; drop DNS TTL to ≤300s 48h before any migration.
  Why: expired certs and cached DNS cause silent outages. (hosting.md: Request lifecycle)
- [ ] Set billing alerts and hard caps on anything with per-request pricing; price the second year, not the intro rate.
  Why: uncapped metered billing turns an incident into a money incident. (hosting.md: Workload chooser)
- [ ] Track the error budget with an enforced policy: an exhausted budget freezes features until reliability recovers.
  Why: reliability erodes silently until a real outage forces it. (system-design.md: SLOs)

## Sources

No external source list: this file distills the MUST-tier rules from the other reference chapters in this skill — every item cites its source chapter and section inline (e.g. "planning-grill.md: Pre-mortem"). For primary sources behind those rules, see the `## Sources` section of the cited chapter.
