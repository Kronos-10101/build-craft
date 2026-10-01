# Testing — how to verify software actually works

Scope: the full testing discipline that ships reliable software — suite shape (pyramid, trophy, Google test sizes), unit/integration/contract/E2E, consumer-driven contracts with Pact, API testing, property-based, mutation, fuzzing, snapshot/visual, load/stress/soak, chaos engineering, TDD/BDD, test doubles, test data management, shift-left, ephemeral environments, flaky-test discipline, coverage, and CI strategy (checked 2026-09-30).

## Suite shape — pyramid, trophy, and Google test sizes

- [ ] You can state the three models and when each wins: the pyramid (Cohn/Fowler — many fast unit, fewer integration, few E2E) optimizes for speed and fault localization; the testing trophy (Kent C. Dodds — static analysis at the base, integration as the widest layer, some unit, few E2E) optimizes for confidence per test because most real bugs live in the wiring; Google's small/medium/large sizes (one process / one machine / anything touching the network) classify by resource boundary, which is what actually determines speed and determinism.
- [ ] The default shape: typechecker and linter as the free base layer, the bulk of tests at the module/API boundary against real-ish infrastructure (handler → service → containerized or in-memory DB), unit tests for pure logic with real branching (parsers, pricing, date math), and a handful of E2E smoke journeys — a library inverts toward unit, a thin CRUD app leans almost all integration.
- [ ] You can name the anti-pattern — the ice-cream cone (mostly E2E, few unit tests): an hour-long suite that fails for unrelated reasons and points at a screenshot instead of a line of code.
- [ ] The economic rule still holds across all three models: each behavior lives at the cheapest layer able to observe its failure, and tests migrate down from E2E whenever the failure signal is preserved.

## Unit vs integration vs contract vs E2E

- [ ] Unit tests are deterministic and touch no network, filesystem, wall-clock time, or unseeded randomness; any violation is seeded, injected, or moved up the stack.
- [ ] Integration tests use the real dependency or a faithful container (Testcontainers, real database), not a mock of the thing being integrated; mocks belong at the boundary, never across it.
- [ ] Contract tests run on both provider and consumer and fail when either side changes serialization, routing, or status/error mapping without agreement.
- [ ] E2E tests assert user-visible outcomes against a production-like assembled stack — critical journeys only, never internal implementation state — and stay few enough to run on every merge without strangling the queue.

## Consumer-driven contract testing with Pact

- [ ] You can explain the flow: the consumer writes tests declaring the requests it sends and the responses it expects; running them generates a pact file (JSON contract); the pact is published to a Pact Broker; the provider verifies the pact against its real code in its own CI — no shared staging environment needed to catch breaking changes.
- [ ] Provider verification runs on every provider PR and fails the build when a change breaks any consumer's expectations (renamed field, changed type, removed endpoint); the `can-i-deploy` check gates releases on the broker's compatibility matrix.
- [ ] You can state when OpenAPI-based contracts fit better: the spec is the contract and tools (Schemathesis, Dredd) validate both sides against it — good when a maintained OpenAPI spec already exists, but it only works with discipline to keep the spec current with the implementation.
- [ ] Contract tests cover error shapes and status codes, not just the happy path — most integration breakage hides in error mapping.

## API testing

- [ ] Every endpoint has tests for the status-code contract (2xx/4xx/5xx boundaries), response schema validation, and auth behavior (no token, bad token, expired token, wrong role).
- [ ] Pagination, filtering, and sorting are tested at the boundaries (empty page, last page, invalid cursor); idempotency keys are tested by replaying the same request twice.
- [ ] Rate limits are tested by exceeding them and asserting 429 with a `Retry-After` header, not just by reading the config.
- [ ] GraphQL endpoints get query-depth, complexity, and batching abuse tests in addition to functional ones (see `offensive-security.md`).

## Property-based testing

- [ ] Properties assert invariants — round-trip, idempotence, commutativity, conservation, monotonicity, differential equivalence against a reference implementation — not hand-picked examples.
- [ ] Generators model the real input domain including edge values (Hypothesis for Python, fast-check for JS/TS, proptest for Rust); a failing property shrinks to a minimal reproducible counterexample and the seed is recorded so the regression is stable.
- [ ] You can explain what property testing found that example tests missed, by pointing at the generator's coverage of the input space rather than a curated case list.

## Mutation testing

- [ ] You can explain the mechanism: each mutant carries one syntactic change (operator swap, boundary flip, statement deletion); a surviving mutant means a weak or missing assertion — coverage only proves the code executed.
- [ ] Mutation runs target high-risk modules (auth, billing, concurrency, migrations) with a kill-rate threshold the suite must meet (Stryker, mutmut, cargo-mutants), rather than mutating the whole repo on every commit.
- [ ] You can classify each surviving mutant as equivalent (behavior-preserving, marked and excluded) or a genuine test gap that gets a new test — surviving mutants are never ignored silently.

## Fuzzing

- [ ] Coverage-guided fuzzing targets parsers, deserializers, and protocol handlers — the surfaces where malformed input meets an interpreter — starting from a corpus of valid inputs and running with sanitizers (ASan/UBSan/MSan) where the toolchain supports them.
- [ ] Every unique crash is minimized, preserved as a reproducer, and converted into a regression test; the corpus grows monotonically.
- [ ] Fuzz targets run continuously (nightly CI or OSS-Fuzz-style), not as a one-off exercise before release.

## Pairwise and combinatorial testing

- [ ] You reach for combinatorial testing when parameters multiply: N config options with M values each makes the full matrix impossible, but most field failures are triggered by a single factor or a 2-way interaction (the NIST covering-array studies) — pairwise (all-pairs) coverage exercises every value-pair with a fraction of the runs.
- [ ] The case set is generated by a tool (PICT-style or any covering-array generator), never hand-picked, and the generated matrix is checked into the repo so it is reproducible and reviewable.
- [ ] Invalid combinations are modeled as constraints in the generator, not filtered by eye after the fact — every excluded combination has a stated reason.
- [ ] You escalate to 3-way/4-way coverage on the highest-risk parameter subset only; full n-way over the whole matrix defeats the purpose of the technique.
- [ ] Each generated case carries a real assertion, not just "runs without crashing" — pairwise tells you which combinations to run, not what the right answer is; pair it with property-based invariants where the oracle is cheap.

## Snapshot and visual regression testing

- [ ] Snapshots are reviewed as diffs at creation, never blindly accepted; a snapshot that passes by construction is a lie, not a test.
- [ ] Snapshot scope is limited to stable deterministic output (serialized state, API payloads); time, randomness, and ordering are normalized before capture, or snapshots are not used.
- [ ] Visual regression diffs screenshots against versioned baselines with a small pixel-diff threshold; baselines are treated like test data and promoted only on deliberate design change; flaky diffs are fixed by masking dynamic regions and pinning viewports and fonts — never by raising thresholds until everything passes.

## Load, stress, and soak testing

- [ ] You can state the difference: load validates SLOs at expected peak traffic; stress finds the breaking point and how the system fails; soak runs moderate load for hours to surface leaks, drift, and resource exhaustion.
- [ ] Traffic shape matches production — request mix, cache-hit rate, data distribution — not just concurrent-user count; every run asserts p95/p99 latency and error rate against an SLO (never averages alone) and is compared to a baseline.
- [ ] Load tests gate releases; stress and soak are scheduled (nightly/weekly) or triggered before capacity decisions and major events, not run on every commit.

## Chaos engineering and resilience testing

- [ ] You can state the discipline: form a steady-state hypothesis (e.g. "p99 stays under 300 ms"), inject a real-world failure (kill pods, sever a dependency, add latency, fill a disk), and compare — the point is to disprove the hypothesis in a controlled blast radius, not to break things randomly.
- [ ] Blast radius is bounded first: start in staging or with a tiny production slice, with an abort switch and automatic rollback; game days are scheduled, announced, and have an owner.
- [ ] The failures injected match the system's actual risks: dependency outage, network partition, clock skew, DNS failure, certificate expiry, and resource exhaustion — each mapped to the fallback or degradation path it is supposed to exercise.
- [ ] Every experiment ends with a written result: hypothesis confirmed or refuted, what the fallback actually did, and the fix or runbook change it produced (LitmusChaos, Chaos Mesh, Gremlin are the usual tooling).

## TDD and BDD done properly

- [ ] TDD follows red → green → refactor: a failing test first (failing for the right reason, not a typo), minimal code to pass, then design cleanup with the suite green — the refactor step is never skipped.
- [ ] BDD scenarios are written Given/When/Then in stakeholder language, one observable behavior per scenario, and drive integration/E2E tests — BDD is not a replacement for TDD unit tests.
- [ ] You can explain what "done properly" excludes: implementation-coupled tests that break on refactor, tautological tests that pass by construction, and horizontal slicing (all tests first, then all implementation).
- [ ] Every bug fix starts with a failing regression test that reproduces the bug before the fix lands.

## Test doubles — mocks, stubs, fakes, spies, dummies

- [ ] You can name all five and when each is right: dummy (parameter filler), stub (canned indirect input), fake (lightweight working implementation), spy (records indirect output), mock (verifies expected interactions).
- [ ] State verification is preferred over interaction verification; mocks are reserved for cases where the interaction itself is the contract or the boundary is expensive or nondeterministic.
- [ ] Fakes honor the real seam's semantics (e.g. an in-memory repository enforcing uniqueness constraints); a fake that silently disagrees with the real implementation is a liability.
- [ ] You never mock the unit under test's own internals or private methods — that couples the test to the implementation and punishes refactoring.

## Test data management

- [ ] Test data is built with factories/builders, not hand-written fixtures copied between files; each test constructs exactly the data it needs and nothing more.
- [ ] Production data never enters test environments unmasked — PII is anonymized or synthesized, and dumps are access-controlled; a test that needs realistic volume uses generated data at the right distribution.
- [ ] Database-backed tests isolate state: one database or schema per test worker, transactional rollback or truncation between tests, migrations tested forward and back (expand/contract) rather than assumed.
- [ ] Seed data is versioned alongside the schema; a test that depends on ambient seed state instead of its own setup is a latent flake.

## Shift-left: static analysis and pre-commit gates

- [ ] The cheapest tests are the ones that never run: strict typechecking, linting, and formatting catch a whole bug class at zero runtime cost and run on every file before commit.
- [ ] SAST (Semgrep, CodeQL), dependency scanning, and secret scanning run on every PR — not as a quarterly audit — with findings tracked like test failures.
- [ ] Pre-commit hooks run the fast checks (format, lint, typecheck, unit) so broken code never reaches CI; CI is the second gate, not the first feedback.

## Test environments

- [ ] Every PR gets an ephemeral preview environment (seeded, production-shaped) so reviewers and E2E tests exercise the real assembled system, torn down automatically on merge.
- [ ] Staging mirrors production topology (not just "a bigger dev box"); configuration drift between staging and prod is itself a tested property.
- [ ] Load and chaos experiments never run against shared staging without coordination — noisy-neighbor interference invalidates everyone else's results.

## Flaky-test discipline

- [ ] A suspect test is reproduced before it is "fixed": rerun locally many times, shuffle execution order, and run with parallel siblings to classify timing, order-dependence, shared state, or a genuine product race.
- [ ] Sleeps and unconditional retries are never the fix; async work is awaited, clocks are mocked, randomness is seeded, and shared resources are isolated per test.
- [ ] A test that cannot be fixed immediately is quarantined with a linked issue, an owner, and an expiry — it keeps running visibly in a non-blocking job, never silently deleted or retried into greenness.
- [ ] Flake detection is automated, not anecdotal: CI tracks pass-rate per test (and per browser) over rolling runs, and a test dropping below the green threshold gets flagged before anyone files a complaint.
- [ ] CI retries are diagnostic, never the cure: an E2E retry runs in an isolated worker with a fresh browser context and full trace/screenshot capture, capped by a small retry budget — a test that needs more retries is quarantined, not retried harder.
- [ ] The quarantine policy fires on its own: flakiness past the threshold moves the test to the non-blocking quarantine job automatically (issue and expiry still required), and promotion back to the blocking path requires a streak of consecutive green runs — no manual PR ceremony.
- [ ] Browser E2E isolation is explicit: one browser context per test, no shared server state, clocks and randomness seeded, dynamic regions masked — retrying an un-isolated test just burns CI minutes to re-flake.

## Coverage as a signal, not a target

- [ ] You can explain why 100% line coverage proves nothing: execution is not assertion — a test that calls a function without asserting its result kills zero mutants.
- [ ] Coverage gates use a low global floor to block test deletion plus high thresholds only on critical paths (auth, money); the real verification signal is the mutation score.
- [ ] New code is judged by whether its behavior is asserted, not by whether the coverage number moved.

## CI test strategy

- [ ] The pipeline is ordered by cost: lint + typecheck + unit on every push (seconds), integration and contract verification on PR, sharded E2E + visual on the merge queue, full suite plus perf, chaos, and security scans on a nightly schedule.
- [ ] Test impact analysis (or path filters) skips suites untouched by the change — docs-only changes skip E2E — keeping the merge gate under ~10 minutes; the truly slow moves off the critical path to a schedule.
- [ ] Slow suites are sharded across CI workers with balanced slices; tests are designed parallel-safe (isolated databases/schemas, dynamic ports, no shared temp dirs, no order reliance).
- [ ] Checks are explicitly required (block merge: deterministic, fast, trusted) or advisory (report only); a new check earns required status only after proving stable in advisory mode.
- [ ] Every run stores artifacts — logs, traces, screenshots, coverage reports — so a CI failure is debuggable without a "reproduce locally" cycle.

## Sources

- https://github.com/endvidous/skills/blob/HEAD/testing-strategy/SKILL.md
- https://github.com/aiocean/claude-plugins/blob/HEAD/plugins/aio-advisor/volume-09-operations-delivery/11-testing-strategies.md
- https://github.com/brunolimaff-jpg/novo-app/blob/HEAD/.agents/skills/archive/2026-04-curation/test-strategy/SKILL.md
- https://github.com/aujisti-ador/interview_prep/blob/HEAD/phase-1-core-programming/04-testing-and-quality.md
- https://www.astaqc.com/software-testing-blog/testing-microservices-2026-integration-service-isolation-contract-validation
- https://github.com/claude-dev-suite/knowledge_base/blob/HEAD/knowledge/pact-python/basics.md
- https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/microservice-contract-testing/SKILL.md
- https://github.com/ultroncore/claude-skill-vault/blob/HEAD/skills/engineering-practices/pact-contract-testing/SKILL.md
- https://github.com/josa-openlab/ahmadal-quraan_progress/blob/HEAD/week5/content/Test_pyramid_vs_testing_trophy.md
