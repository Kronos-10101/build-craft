# Audit Methodology — how to audit a codebase or system to production standard

Scope: scoping, ordering, techniques, and reporting for read-only audits of code and systems — what to check, in what order, and how to write findings that get fixed. Auditing and fixing are separate mandates. Checked 2026-09-30.

## Ground rules

- [ ] Every finding cites `file:line` plus a minimal quoted snippet — evidence or it doesn't exist.
- [ ] Conviction over volume: a few high-conviction findings beat long nit lists. Grade uncertainty honestly: confirmed / probable / needs verification.
- [ ] The repo's own conventions (`AGENTS.md` / `CLAUDE.md`) outrank these checklists.
- [ ] Silence is not clearance — every category ends with findings or an explicit "reviewed-clean" note.
- [ ] Record claim → evidence → decision for anything non-obvious: what you claim, the snippet that proves it, and the severity call you made from it.
- [ ] Google's bar: approve a change once it definitely improves overall code health — the audit's job is net improvement, not perfection.

## Scoping: pick the review type first

OWASP's Secure Code Review distinguishes two review types — pick one before reading code:

- [ ] **Baseline review** (whole codebase): for new apps, major releases, legacy onboarding, post-incident. Requires architecture mapping, dependency audit, and security-incident history before line-by-line work.
- [ ] **Diff-based review** (PR/branch/commit): highest yield per hour, cheapest to fix while fresh. Identify modified files, assess impact on existing security controls, name new attack vectors the diff introduces, verify no security regression at modified trust boundaries.
- [ ] Establish the perimeter: in-scope modules, out-of-scope areas, users, data handled (PII / credentials / financial / health), trust boundaries (internet-facing? internal? multi-tenant?).
- [ ] Name the crown jewels: auth/authz, sessions, secrets, payment paths, personal-data flows.
- [ ] Size then strategize: small repos (<50 files / <10k LOC) get a full audit; large repos get one subsystem, a recent diff, or an explicitly scoped pass.
- [ ] Large-codebase sampling: inventory pass first (entry points, dependency graph, trust boundaries), then go deep on auth/authz, input boundaries, payment/PII paths, largest modules, highest-churn code.

## Order of operations

Security depends on trust boundaries; correctness destroys value while performance only slows it; maintainability gates future risk; polish changes no risk posture. Audit in this order:

- [ ] **1.** **Threat model & surface enumeration** — trust boundaries, entry points (HTTP routes, CLI, consumers, crons), sensitive assets, attacker personas. Classify every endpoint Public / User-scoped / Elevated before reading implementation.
- [ ] **2.** **Security** — auth, injection, secrets, crypto (`references/security.md`).
- [ ] **3.** **Correctness** — behavioral pre-mortem per critical path: concurrency races, partial failure (3rd of 5 side effects fails — is the system coherent? idempotent?), boundary values (empty / zero / negative / max / unicode / timezone / clock skew), out-of-order or duplicate events, state-machine holes, resource exhaustion (unbounded queues, unpaginated queries, missing timeouts, FD leaks).
- [ ] **4.** **Performance** — hot paths, N+1, missing caches, over/under-fetching, missing indexes, concurrency defaults, schema basics (`references/optimization.md`, `references/databases.md`).
- [ ] **5.** **Maintainability** — divergent implementations of the same concern, circular deps, god modules, shared mutable state, drifted duplication, naming/contract drift, dead code, type discipline.
- [ ] **6.** **Polish** — docs accuracy, logging hygiene, UI consistency — last (`references/design-polish.md`).

## Review techniques (use all four)

From OWASP's Secure Code Review methodology — automated tools surface candidates; these techniques settle them:

- [ ] **Code pattern analysis** — focus manual effort on high-risk patterns first: input processing/validation, query construction, file/path handling, auth/session logic, access-control checks, crypto operations, error handling/logging, config and env loading.
- [ ] **Data-flow analysis** — trace every untrusted input from source (user input, uploads, API calls, DB reads, env vars) through processing (validation, transformation, caching) to sinks (queries, file writes, rendered output, logs, outbound requests); verify the right control at every trust-boundary crossing, and that sensitive data gets appropriate protection at each hop.
- [ ] **Threat-based review** — map the code against STRIDE (spoofing, tampering, repudiation, information disclosure, DoS, elevation of privilege); sketch attack trees for the crown jewels; write abuse cases ("how would I misuse this feature as designed?"); verify defense-in-depth rather than single controls.
- [ ] **Business-logic review** — state transitions validated at every step; race conditions in concurrent workflows; transaction atomicity with real rollback; resource limits and quotas enforced; business rules unbypassable via direct API access; authorization checked at each workflow step, not just the entry point.

## Change review: Google's dimension order

For diff-based reviews, check in this priority order — design first, style last:

- [ ] **Design** — does the change make sense in the overall system; does it belong in this codebase; is it the right approach, not just a working one.
- [ ] **Functionality** — does it do what the author intended, and is that good for users; edge cases handled, not just the happy path.
- [ ] **Complexity** — could it be simpler; no speculative generality, no cleverness that the next reader won't follow.
- [ ] **Tests** — correct, well-designed automated tests in the same change; tests that actually fail when the code breaks.
- [ ] **Naming / comments / docs** — names clear without opening the implementation; comments explain why, not what.
- [ ] **Style / consistency** — matches the codebase's conventions; personal taste is `Nit:` only, never blocking; pre-existing debt gets a separate ticket, never blocks this change.

## Review craft: comment labels, sizing, and remedies

Producing the review itself: how comments are labelled, how big a change may be before it is unreviewable, and what a structural comment must offer. Distinct from the finding severity table below, which grades the defect; these labels grade the comment.

- [ ] **Comment severity prefixes, on every comment:** unmarked means a required change that must be addressed before merge; `Critical:` blocks merge (security, data loss, broken function); `Nit:` is minor and optional, safe to ignore; `Optional:` / `Consider:` is a suggestion worth weighing, not a requirement; `FYI` is information only, no action needed.
- [ ] Unlabelled feedback reads as all-mandatory: authors waste hours on optional points, or discount required ones as taste. If everything in a review carries the same weight, the review has failed to triage itself.
- [ ] **Change sizing, changed lines:** ~100 lines is good and reviewable in one sitting; ~300 is acceptable when it is a single logical change; ~1000 is too large, split it (stack, by file group, horizontal stubs first, or vertical slices).
- [ ] **Total file size is a separate signal:** ~1000 lines in one file is a finding in its own right, even when the diff is small. A change that materially grows an already-large file triggers the question first: extract helpers, subcomponents, or modules before adding more.
- [ ] Large changes stay acceptable only where the reviewer verifies intent rather than every line: complete file deletions, automated refactoring. Refactoring and feature work are two changes; submit them separately.
- [ ] **Verify tests by experiment, not by reading:** invert one condition the change adds (drop a negation, swap `&&` for `||`), run the suite, then restore the file. A mutation that stays green is a finding, and the finding names the test case that is missing.
- [ ] **Dependency-upgrade discipline:** one dependency per change; read the changelog, not the version number (semver is a promise the maintainer may not have kept; for a major bump, read the migration notes); green suite before AND after the bump; review the lockfile diff, not just the manifest, because one direct bump can pull in dozens of transitive changes; never hand-edit the lockfile.
- [ ] A bulk "bump deps" change is unreviewable by construction: when it breaks, no one can name which package did it, and the revert is no longer clean.
- [ ] **Name the structural remedy, not just the problem:** replace a chain of conditionals with a typed model or an explicit dispatcher; collapse duplicate branches into one flow; separate orchestration from business logic; move feature-specific logic out of a shared module into its owning package; reuse the canonical helper instead of a near-duplicate; make a type boundary explicit so downstream branching disappears; delete a pass-through wrapper that adds indirection without clarifying the API; extract a helper or split a large file into focused modules.
- [ ] Prefer the remedy that removes moving pieces. A refactor that leaves the reader holding the same number of concepts has relocated complexity, not reduced it.
- [ ] **Presumptive blockers:** surface each of these and propose the simpler design; escalate to a required change only when the change actively makes structure worse: a refactor that relocates complexity instead of reducing it; a change that pushes a file past the size boundary with no decomposition; feature logic added to a shared module; a near-duplicate of an existing canonical helper; a silent fallback that hides an unclear invariant.
- [ ] **Dead code is listed and asked about, never silently deleted:** after a refactor, enumerate the orphaned functions, components, and constants explicitly, with the replacement named for each, then ask whether to remove them. Unreferenced is evidence, not proof: dynamic calls, reflection, and external consumers do not show up in a grep.

## Structural audit dimensions (AI-generated code)

For AI-assisted codebases, run a structural pass across these seven dimensions — each names where it is audited above, so no dimension is assumed covered just because it was generated alongside the others:

- [ ] **Architectural Coherence** — the design passes as one system: module boundaries match the data flow, no divergent implementations of the same concern, no circular dependencies or god modules (audited in Order step 5, Maintainability, and the Design-first diff review).
- [ ] **Error Handling** — every fallible path has an owner: errors propagated rather than swallowed, user-facing messages leak no internals, failure modes documented (audited in What-to-check-first error gaps and the Correctness partial-failure pre-mortem).
- [ ] **State Integrity** — state machines are total: every transition validated, idempotent retries leave the system coherent, concurrent writers cannot corrupt shared state (audited in Correctness: state-machine holes, out-of-order/duplicate events, races).
- [ ] **Scaling Limits** — the system names its ceiling: unbounded growth points (queues, queries, caches) quantified, hot paths load-tested to the stated limit (audited in Correctness resource exhaustion and Order step 4, Performance).
- [ ] **Security** — the full Security deep pass (Order step 2); for AI-generated auth/authz code, re-verify against STRIDE rather than trusting the structure.
- [ ] **Anti-Slop** — no AI median tells: no dead config, no speculative abstraction layers, no generic wrapper forests, no commented-out scaffolding left as residue — verified against the codebase's own conventions and `references/design-distinct.md`.
- [ ] **Accessibility** — user-facing changes verified against the gates in the next section; "works" includes "works with assistive tech."

## Product-quality verification gates: accessibility & Core Web Vitals

Audit gates for user-facing surfaces (added 2026-10-01; the mechanics live in `references/web-frontend.md` — this section is the gate, not a second copy):

- [ ] Accessibility gate: WCAG 2.2 AA — automated scan (axe-core / Lighthouse) returns zero critical violations; the keyboard-only path and screen-reader landmarks are verified by hand on the changed flows; a contrast failure is a finding, not a nit.
- [ ] Core Web Vitals gate: field data at the 75th percentile meets LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 (mobile and desktop assessed separately); Lighthouse lab runs gate CI but never substitute for field data.
- [ ] Both gates run on every user-facing diff; a regression against either is blocked exactly like a security regression — advisory only after proving stable.

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

- [ ] Authentication: JWT handling (alg / expiry / storage), session invalidation on logout, argon2id/bcrypt hashing, MFA, brute-force resistance, reset-token ownership; re-authentication required for sensitive operations.
- [ ] Authorization: role checks on every elevated endpoint; resource-ownership checks before read/update/delete by ID; tenant isolation; fail-safe defaults (deny by default); access-control logic centralized, not scattered. UUIDs are identifiers, not authorization.
- [ ] Injection: template literals with request data in queries; `db.raw()` / raw escape hatches; dynamic ORDER BY / LIMIT (allowlist, not parameterization).
- [ ] Input validation at the boundary: server-side always (never trust client checks); reject over coerce; allowlists over denylists; upload size/type caps; user URLs host-allowlisted before outbound fetch (SSRF).
- [ ] Session security: token entropy ≥128 bits, HttpOnly + Secure + SameSite cookie flags, concurrent-session limits.
- [ ] XSS (stored / reflected / DOM); mass assignment (`req.body` → DB update — allowlist updatable fields); insecure deserialization; weak RNG / timing attacks; missing headers (CSP, X-Frame-Options, HSTS); CORS never reflecting origins with credentials; rate limiting on expensive/auth endpoints; no secrets in logs.

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

## Receiving code review

The other seat: feedback arrives as input to verify, not as orders to execute. Technical correctness outranks social comfort, and agreement is shown by the fix, not by praise.

- [ ] **The protocol, in order:** READ the complete feedback without reacting; UNDERSTAND by restating the requirement in your own words, or asking; VERIFY each item against the codebase as it actually is; EVALUATE whether it is technically sound for this codebase; RESPOND with a technical acknowledgment or a reasoned pushback; IMPLEMENT one item at a time.
- [ ] **One unclear item stops everything:** if ANY item is unclear, clarify before implementing ANY of them. Items may be related, and a fix for one can pre-empt or contradict another; partial implementation built on partial understanding is the failure mode this rule exists to prevent.
- [ ] Stating the split is the correct move: name the items understood, name the items unclear, ask about those. Implementing the clear subset first and asking later is the wrong order.
- [ ] **External suggestions pass a five-point check before any code moves:** (1) technically correct for THIS codebase? (2) breaks existing behaviour? (3) why does the current implementation exist, and does that reason still hold (legacy target, compatibility, a deliberate trade-off)? (4) valid on all platforms and versions this code supports? (5) does the reviewer have the full context, or only the diff?
- [ ] If a suggestion cannot be verified locally, say so and name what verification would take. Proceeding anyway converts an unknown into a regression risk.
- [ ] If a suggestion conflicts with a prior architectural decision on record, stop and surface the conflict instead of silently reversing the decision.
- [ ] **Run the YAGNI check on any "implement it properly" suggestion:** grep the codebase for actual usage first. If nothing calls it, the legitimate response is pushback: propose removing the unused surface instead of building the full version. If it is used, implement it properly.
- [ ] Pushback is legitimate, and expected, when a suggestion breaks working behaviour, rests on missing context, gold-plates an unused feature, is wrong for this stack, or overrides a recorded decision. Push back with technical reasoning, specific questions, and references to working code or tests; never with defensiveness.
- [ ] **Implementation order:** blocking issues first (breakage, security), then simple fixes (typos, imports, renames), then complex fixes (refactoring, logic). Test each fix individually as it lands, then verify no regressions across the set.
- [ ] **Acknowledgment is technical; performative agreement is banned:** no "You're absolutely right!", no "Great point!", no gratitude theatre, no announcing implementation before verification. State the fix instead: what changed, and where. The code shows the feedback was heard.
- [ ] Correcting your own pushback follows the same rule: state factually what was checked and what it showed, then implement. No long apology, no defending the earlier call.

## Sources

- https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html
- https://github.com/datatalksclub/ai-dev-tools-zoomcamp/blob/HEAD/research/module4-tool-agnostic-curriculum/wiki/sources/owasp-secure-code-review.md
- https://github.com/0-draft/dev.to/blob/HEAD/articles/google-code-review-practices.md
- https://github.com/abhishekthakur7/software-factory/blob/HEAD/docs/research/raw/R6-human-review.md
- obra/superpowers (MIT) — receiving-code-review, requesting-code-review, subagent-driven-development: https://github.com/obra/superpowers
- addyosmani/agent-skills (MIT) — code-review-and-quality: https://github.com/addyosmani/agent-skills
