# Testing — how to verify software actually works

Scope: the minimum testing discipline that ships reliable software — pyramid layering, unit/integration/contract/E2E, property-based, mutation, fuzz, snapshot/visual, load/stress/soak, TDD/BDD, test doubles, flaky-test discipline, coverage, and CI strategy.

## Test pyramid — put each behavior at the cheapest layer that sees it fail

- [ ] You can state the economic rule: each behavior lives at the cheapest layer able to observe its failure; tests migrate down from E2E whenever the failure signal is preserved.
- [ ] You can place each behavior: deterministic domain logic in unit tests, cross-module collaboration against real seams in integration tests, wire/API compatibility in contract tests, critical assembled user journeys in E2E (checked 2026-09-30).
- [ ] Unit tests are deterministic and touch no network, filesystem, wall-clock time, or unseeded randomness; any violation is seeded, injected, or moved up the pyramid.
- [ ] E2E tests cover only critical user journeys, not exhaustive input combinations — the count stays small enough to run on every PR without strangling the merge queue.

## Unit vs integration vs contract vs E2E

- [ ] You can decide integration vs contract: integration proves your code works against a real seam (database, queue, filesystem, container); contract proves two sides agree on the wire (schemas, routing, status codes, error mapping).
- [ ] Integration tests use the real dependency or a faithful container, not a mock of the thing being integrated; mocks belong at the boundary, never across it.
- [ ] Contract tests run on both provider and consumer and fail when either side changes serialization, routing, or status/error mapping without agreement.
- [ ] E2E tests assert user-visible outcomes against a production-like assembled stack, never internal implementation state.

## Property-based testing

- [ ] Properties assert invariants — round-trip, idempotence, commutativity, conservation, monotonicity, differential equivalence against a reference implementation — not hand-picked examples.
- [ ] Generators model the real input domain including edge values; a failing property shrinks to a minimal reproducible counterexample and the seed is recorded so the regression is stable.
- [ ] You can explain what property testing found that example tests missed, by pointing at the generator's coverage of the input space rather than a curated case list.

## Mutation testing

- [ ] You can explain the mechanism: each mutant carries one syntactic change (operator swap, boundary flip, statement deletion); a surviving mutant means a weak or missing assertion — coverage only proves the code executed (checked 2026-09-30, Wikipedia: Mutation testing).
- [ ] Mutation runs target high-risk modules (auth, billing, concurrency, migrations) with a kill-rate threshold the suite must meet, rather than mutating the whole repo on every commit.
- [ ] You can classify each surviving mutant as equivalent (behavior-preserving, marked and excluded) or a genuine test gap that gets a new test — surviving mutants are never ignored silently.

## Fuzzing

- [ ] Coverage-guided fuzzing targets parsers, deserializers, and protocol handlers — the surfaces where malformed input meets an interpreter.
- [ ] Fuzzing starts from a corpus of valid inputs and runs with sanitizers (ASan/UBSan/MSan) where the toolchain supports them.
- [ ] Every unique crash is minimized, preserved as a reproducer, and converted into a regression test; the corpus grows monotonically.
- [ ] Fuzz targets run continuously (nightly CI or OSS-Fuzz-style), not as a one-off exercise before release.

## Snapshot and visual regression testing

- [ ] Snapshots are reviewed as diffs at creation, never blindly accepted; a snapshot that passes by construction is a lie, not a test.
- [ ] Snapshot scope is limited to stable deterministic output (serialized state, API payloads); time, randomness, and ordering are normalized before capture, or snapshots are not used.
- [ ] Visual regression diffs screenshots against versioned baselines with a small pixel-diff threshold; baselines are treated like test data and promoted only on deliberate design change.
- [ ] Flaky visual diffs are fixed by masking dynamic regions and pinning viewports and fonts — never by raising thresholds until everything passes.

## Load, stress, and soak testing

- [ ] You can state the difference: load validates SLOs at expected peak traffic; stress finds the breaking point and how the system fails; soak runs moderate load for hours to surface leaks, drift, and resource exhaustion (checked 2026-09-30).
- [ ] Load tests gate releases; stress and soak are scheduled (nightly/weekly) or triggered before capacity decisions and major events, not run on every commit.
- [ ] Traffic shape matches production — request mix, cache-hit rate, data distribution — not just concurrent-user count.
- [ ] Every perf run asserts p95/p99 latency and error rate against an SLO (never averages alone) and is compared to a baseline; failures block the gate they belong to.

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

## Flaky-test discipline

- [ ] A suspect test is reproduced before it is "fixed": rerun locally many times, shuffle execution order, and run with parallel siblings to classify timing, order-dependence, shared state, or a genuine product race.
- [ ] Sleeps and unconditional retries are never the fix; async work is awaited, clocks are mocked, randomness is seeded, and shared resources are isolated per test.
- [ ] A test that cannot be fixed immediately is quarantined with a linked issue, an owner, and an expiry — it keeps running visibly in a non-blocking job, never silently deleted or retried into greenness.

## Coverage as a signal, not a target

- [ ] You can explain why 100% line coverage proves nothing: execution is not assertion — a test that calls a function without asserting its result kills zero mutants.
- [ ] Coverage gates use a low global floor to block test deletion plus high thresholds only on critical paths (auth, money); the real verification signal is the mutation score.
- [ ] New code is judged by whether its behavior is asserted, not by whether the coverage number moved.

## CI test strategy

- [ ] The pipeline is ordered by cost: lint + unit on every push (seconds), integration on PR, sharded E2E + visual on the merge queue, full suite plus perf and security scans on a nightly schedule.
- [ ] Slow suites are sharded across CI workers with balanced slices; tests are designed parallel-safe (isolated databases/schemas, dynamic ports, no shared temp dirs, no order reliance).
- [ ] Checks are explicitly required (block merge: deterministic, fast, trusted) or advisory (report only); a new check earns required status only after proving stable in advisory mode.
- [ ] Every run stores artifacts — logs, traces, screenshots, coverage reports — so a CI failure is debuggable without a "reproduce locally" cycle.
- [ ] Path filters skip irrelevant suites (docs-only changes skip E2E); the truly slow moves off the critical path to a schedule, keeping the merge gate under ~10 minutes.

## Sources

- http://en.wikipedia.org/wiki/Mutation_testing
- https://github.com/bsene/skills/blob/HEAD/testing/references/martin-fowler-testing.md
- https://github.com/mejbaurbahar/software-tester-skills/blob/HEAD/skills/property-based-testing/SKILL.md
- https://github.com/dev-toolbelt/dev-team-agents/blob/HEAD/skills/testing/mutation-testing/SKILL.md
- https://github.com/shyuan/skills/blob/HEAD/skills/complete-test-code/references/fuzzing-and-malformed-input.md
- https://github.com/davesnx/setup/blob/HEAD/agents/skills/tdd/SKILL.md
- https://github.com/nnennandukwe/skills/blob/HEAD/skills/tdd-bdd/SKILL.md
- https://github.com/dayfinggg/claude-code-codex-skills/blob/HEAD/codex/skills/tdd/references/test-doubles.md
- https://github.com/choiyounggi/dev-llm-wiki/blob/HEAD/wiki/testing/flaky/diagnosing-flaky-tests.md
- https://github.com/j4flmao/agent-skills/blob/HEAD/skills/quality/visual-testing/SKILL.md
- https://github.com/juanmelendres/cracking-code-interviews/blob/HEAD/cheat-sheets/performance-and-load-testing-methodology.md
- https://github.com/zihangg/ai/blob/HEAD/skills/engineering/ci-cd-and-automation/SKILL.md
- https://github.com/qishu321/ops-admin/blob/HEAD/.agents/skills/ci-cd-integration/SKILL.md
- https://github.com/itsc0c0/the-ultimate-antislop-md/blob/HEAD/the-ultimate-antislop-md/03-frameworks-and-domains/testing-qa.md
