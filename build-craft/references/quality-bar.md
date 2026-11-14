# Quality Bar — the target project's CONSTRAINTS.md contract

Scope: setting up, enforcing, and guarding a per-project quality contract that outlives any single session — the floor, numbered thresholds with their verdict commands, ratchets, time-boxed exceptions, the diff review that catches a lowered bar, circularity ranking, and placement budgets. Checked 2026-11-15.

## Contents

- The contract, and what it is not
- Writing CONSTRAINTS.md
- Every constraint names its command
- The floor: the bar only moves up
- Ratchets over invented targets
- Exceptions: owner, reason, expiry
- Floor-guard: diff review for the five gaming moves
- Circularity: rank the checks
- Placement budgets: cost decides where a check runs
- Escalation: three levels of teeth
- Sane defaults when nobody has a number
- Verification and red flags
- Sources

## The contract, and what it is not

- [ ] The bar lives in one file, `CONSTRAINTS.md`, at the target project's repo root: plain markdown, readable by any agent on any harness, and visible as an ordinary file in every review that touches it.
- [ ] Scope is the project being built, not the build run: build-craft's own `craft-gate` checks the artifacts of one run (plan, grill, report), while `CONSTRAINTS.md` checks the product that run leaves behind, on every later change by any author.
- [ ] Prose advice does not survive a session; a checked file does. Standards held in a chat transcript, a reviewer's head, or a wiki page nobody opens are treated as unwritten until they land in this file with numbers attached.
- [ ] One pointer line goes into the project's `AGENTS.md` and `CLAUDE.md`: read `CONSTRAINTS.md` before writing code, and never weaken it to make a change pass. A contract no entry point references will not be read.
- [ ] The file carries a `Last reviewed:` date and a named reviewer; a contract with no review date is assumed stale and gets re-measured before it is enforced on new work.
- [ ] Out of scope: one-off scripts, spikes, and throwaway prototypes get the floor only (next section), never the full numbered setup; a project that already has a working `CONSTRAINTS.md` is read and followed, not re-interviewed.

## Writing CONSTRAINTS.md

- [ ] Detect before asking: read the stack from the manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`), the test runner and linter configs, any existing coverage output, and the CI definitions, then ask only about what the repo cannot answer.
- [ ] Cap the setup interview at four questions, each shipped with a default so an unsure answer still yields a working file: which dimensions to enforce, block versus warn on failure, measured numbers versus named targets, and the slowest task-end check the team will tolerate.
- [ ] In a non-interactive run (CI, a loop, an autonomous build) never invent answers to that interview: apply the floor, note in the run record that the floor-only fallback was used, and flag the numbered dimensions for a human decision.
- [ ] Keep three sections distinct inside the file: the floor (always enforced, no setup), the enforced table (a number plus its command), and a measured table (today's value plus a direction, not yet a gate). Mixing the three is how advisory numbers get quoted as gates.
- [ ] Picking a dimension means installing its checker in the same change: a dimension recorded before its tool runs is decoration, and a hand-rolled checker is rejected where a widely used tool already defines the rule format for that ecosystem.
- [ ] Commands live in two places by design: the `Checked by` column is canonical because it sits next to the reason, and the project's script wrappers (`check:fast`, `check:task`, `check:full` or the local equivalent) mirror it; on any drift between the two, the file wins and the script gets fixed.

## Every constraint names its command

- [ ] The enforced table has five columns and no row ships without all five filled: Dimension, Rule, Checked by, Runs at, and the reason the number was chosen.
- [ ] Rule of thumb, applied without exceptions: a threshold without a command is a wish. The command is the exact invocation a reviewer can paste into a terminal, flags included, that prints the measured value and exits non-zero on breach.
- [ ] A report is not a verdict: a tool that only emits a file (a coverage report, a scanner JSON dump) needs a small gate step that reads the report and fails on the threshold, on unknown severities, and on an incomplete or unreadable scan.
- [ ] Scanner failure never reads as success: a checker that cannot run, cannot parse its input, or scans nothing exits as an error distinct from a clean pass, and CI treats that error as a block, never as a pass.

| Dimension | Rule | Checked by | Runs at |
|---|---|---|---|
| Types | Zero type errors | `tsc --noEmit` | per edit |
| Secrets | No secrets in source | `gitleaks dir . --redact` | per edit |
| Coverage | Changed lines at or above 80% covered | test run plus coverage report intersected with the diff | task end, CI |
| Dependencies | No vulnerability at high or above | `osv-scanner scan source -r .` | CI |
| Accessibility | Zero critical or serious findings | axe run against a running preview URL | preview deploy |
| Performance | LCP at or below 2500 ms, CLS at or below 0.1 | Lighthouse run against a running preview URL | preview deploy |

- [ ] Secret scanning always runs redacted: the finding reports the rule and the location, never the matched value, because an unredacted value lands in transcripts, logs, and summaries.
- [ ] Dimensions that need a running app (page performance, accessibility) state their URL source explicitly; on a project with no URL to hit (a CLI, a library, a desktop app) the dimension is dropped and the drop is recorded, not replaced by a check that cannot run.
- [ ] Before any row is called enforced, prove it both ways: run its command against a deliberate violation and confirm it fails, then against a clean control and confirm it passes; for a severity threshold, also confirm a below-threshold finding passes.

## The floor: the bar only moves up

- [ ] The floor needs no interview, no installs, and no numbers; it is enforced from the first commit and on projects too small for the full contract.
- [ ] No new suppressions: no added `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `biome-ignore`, `# noqa`, or `# type: ignore` lines, in any file, for any reason short of a tracked exception.
- [ ] No new skipped tests: no added skip, todo, or x-marked test, and no deleted test file or deleted test case, without the reason written into the commit message where a reviewer will see it.
- [ ] No new stubs: no `throw` of a not-implemented error, no empty `catch` block that turns a failure into silence, and no `TODO` comment standing where the implementation was supposed to be.
- [ ] No secrets in source, and no weakening edit: `CONSTRAINTS.md` itself never gets edited down inside the change that was failing it; a threshold change is its own change, reviewed on its own merits.
- [ ] Direction is one-way: tightening a floor rule or a threshold is routine and needs no ceremony, while loosening one needs a stated reason, a reviewer, and (where the loosening is temporary) an exception row with an expiry.

## Ratchets over invented targets

- [ ] Default to measuring, not naming: when nobody holds a defensible target number, run the check once, record today's measured value in the measured table, and hold that line. An invented target set above today's reality produces a permanently red build, and a permanently red build trains everyone to ignore red builds.
- [ ] Each measured row states three things only: the metric, today's value with its date, and its direction (`must not fall` for scores and coverage, `must not grow` for size, latency, and counts of bad things). The comparison is against the recorded value, never against an aspiration.
- [ ] When a measured value improves, update the recorded value in the same change that improved it, so the gain becomes the new floor; when it drops past the recorded value, the drop itself is the finding, whatever the absolute number looks like.
- [ ] Allow a small stated tolerance for measurement noise (0.5% is a workable default) and write the tolerance next to the metric; an unstated tolerance gets renegotiated on every borderline run.
- [ ] Promote a measured row into the enforced table only when the team can state the target and its reason in one sentence each; promotion is a deliberate edit to the file, not a side effect of a good week.
- [ ] Watch the failure mode the ratchet exists for: slow drift that no single change notices (coverage sliding a point a month, bundle growing a few kilobytes a release) is invisible to per-change review and visible only against a recorded baseline.

## Exceptions: owner, reason, expiry

- [ ] An exception is a row, not a conversation: ID, the rule it suspends, the exact path or glob it covers, the reason, a named owner, and an expiry date. A row missing the owner or the expiry is not an exception; it is a hole, and the floor-guard flags it as one.
- [ ] Scope stays narrow: the path column names the legacy module or generated directory that needs relief, never the whole repo, and the rule column names one rule, never a whole dimension.
- [ ] Default lifetime is 90 days: long enough to schedule the real fix, short enough that the reason is still remembered. An expiry more than a year out is rejected at setup as a permanent waiver wearing a date.
- [ ] Expired exceptions fail the check: the gate compares each expiry against the run date and blocks on any lapsed row, so renewal is a conscious re-decision (new date, re-stated reason) rather than silent drift.
- [ ] The unblocking rule, stated to every author once: an exception with an owner and a date unblocks one change for a bounded time; deleting or loosening the constraint unblocks everyone forever, so the second move always needs the heavier review.
- [ ] Review the exceptions table on the same cadence as the file's `Last reviewed:` date; a table nobody re-reads fills with rows whose owners have left and whose reasons no longer hold.

## Floor-guard: diff review for the five gaming moves

- [ ] On every change, before merge, scan the full diff for the five moves below: tracked changes against the merge base, staged work, and untracked new files. A guard that reads only the unstaged diff misses exactly the files most likely to carry a stub or a suppression.
- [ ] Exit discipline mirrors the checkers: clean exits 0, a floor violation exits 1 and blocks, and a guard that could not run (no merge base, not a repo) exits 2 and is reported as an error, never folded into the clean result.
- [ ] Findings report the rule and the `file:line` location only; matched secret values and full matched lines containing them are never printed into the review or the log.
- [ ] **1. Threshold moved.** A number in `CONSTRAINTS.md` changed in the loosening direction (a minimum lowered, a maximum raised), a rule row deleted, or a check dropped from a faster stage to a slower one. Compare the file against its state at the branch point, rule by rule; a number whose direction cannot be read from its wording is flagged on any change.
- [ ] **2. Test eased.** A skip or todo marker added, a test file deleted, or an assertion line removed from a test file that otherwise survived. Deleting a whole file and stripping assertions from a kept file are the same move at different scales and get the same block.
- [ ] **3. Checker silenced.** A new suppression comment of any spelling, with four spellings called out by name because each one disables a checker the bar relies on: `istanbul ignore` (drops code from coverage instead of testing it), `Stryker disable` comments (hide a surviving mutant from mutation testing), `nosemgrep` (suppresses a Semgrep security finding inline), and `gitleaks:allow` (waives a secret-scanning hit inline). The generic spellings from the floor section count here too.
- [ ] **4. Stub left in place.** A not-implemented throw, an empty `catch`, or a placeholder body merged where the task's done-condition promised working behavior. A stub behind a tracked exception is visible debt; a stub with no exception row is an unfinished change claiming to be finished.
- [ ] **5. Exception appeared.** A new row in the exceptions table that nobody discussed, or any new row lacking an owner or an expiry. The check is mechanical (row added, two cells non-empty, date in the future) precisely so it needs no judgement call at review time.
- [ ] Keep the guard deliberately shallow: pattern matching over the diff catches the cheap road to green, which is the road actually taken under deadline pressure. It is not built to catch a determined author hiding a change, and claiming otherwise oversells it.
- [ ] Tightening stays silent through all five checks: a raised minimum, a lowered maximum, a deleted exception, and an added assertion produce no findings. Only loosening is loud; a guard that nags on improvements gets switched off.
- [ ] Exempt paths, where a generated or vendored tree legitimately trips a pattern, go in a tracked ignore file (one glob per line, reviewed like code), never in a loosened pattern: a visible exemption list is auditable, a widened regex is not.

## Circularity: rank the checks

- [ ] Rank every enforced check by one question: could an author make this pass by writing code that does not work? The answer sorts the check into one of three tiers, and the tier is recorded next to the dimension.
- [ ] **External checks rank first:** tooling whose verdict comes from outside the project (a vulnerability database, a WCAG ruleset in an accessibility scanner, a real browser measuring a real page). The project cannot edit the yardstick, so this tier carries the most weight.
- [ ] **Project checks rank second:** the project's own lint rules, type strictness settings, and architecture boundary rules. A human owns those config files, so gaming them is a visible config change, but the yardstick still lives inside the repo.
- [ ] **Suite checks rank last:** the project's own test suite grading the project's own code, including coverage and mutation scores derived from it. This tier is the most useful day to day and the only genuinely circular one, because the same author writes both the code and its judge.
- [ ] Require at least one external check in the enforced table before the contract is called complete; a bar built entirely from the suite tier proves only that the project agrees with itself.
- [ ] When tiers disagree (suite green, external check red), the higher tier wins and the change blocks; resolving the conflict by editing the external check's threshold is a threshold move and goes through the floor-guard like any other.

## Placement budgets: cost decides where a check runs

| Stage | What runs | Budget |
|---|---|---|
| Per edit | Types, lint, secrets, and the floor on the changed files only | under 5 s |
| Task end | Related tests plus coverage on changed lines | under 90 s |
| Review | The full enforced table plus the floor-guard diff review | minutes, no edit-loop budget |
| CI and ship | Everything, plus direction checks against the ratchets | unbounded |

- [ ] Scope every stage to the diff first: check the files and lines the change touched, not the whole repo. Whole-repo runs belong to CI and to scheduled jobs, where their cost blocks nobody's edit loop.
- [ ] Coverage is measured on changed lines only: the percentage that matters is how much of this change is exercised, computed by intersecting the suite's coverage report with the diff. A whole-repo percentage is inherited context, reported in the measured table, and never used as the per-change gate.
- [ ] Reuse the run that already happened: read the coverage file the test suite already wrote instead of running the suite a second time to produce a number. Double-running is the fastest way to make a team resent the gate.
- [ ] Expensive checks get diff-scoped or moved, never deleted on cost grounds alone: mutation testing over the whole repo runs for hours and gets abandoned, while the same tool restricted to the changed files finishes inside the task-end budget.
- [ ] A check that stalls the loop gets switched off, and a switched-off gate is worse than no gate because the file still claims it exists; when a stage blows its budget, move the check to a slower stage in the same change and record the move in `CONSTRAINTS.md`.
- [ ] Checks that need a running app run where a URL exists (preview deploy, a locally started server) and at no earlier stage; forcing them into the per-edit stage guarantees they are skipped in practice.

## Escalation: three levels of teeth

- [ ] Level 1, written only: the file exists and authors are pointed at it. Cost is near zero, honest mistakes get caught, and compliance rests on the reader; this is the correct starting level for a new project, not a failure state.
- [ ] Level 2, scripted: the fast and task-end checks run from one project script, wired into the post-edit hook and into CI. Deterministic, no new dependency, and the level most projects should stop at.
- [ ] Level 3, tool-backed: a dedicated runner handles diff scoping, budgets, ratchets, and the floor-guard checks. Move here only when the check-running shell passes roughly thirty lines and starts drifting between CI and local runs.
- [ ] A first run may be floor-only at any level: the floor-guard is diff-scoped and needs no installs, so day one can enforce the floor while numbered dimensions land one tool at a time.
- [ ] Machine-wide security tools may run CI-only where laptops must stay clean; declare that choice in the `Runs at` column per dimension instead of letting it become an unrecorded gap between local and CI verdicts.

## Sane defaults when nobody has a number

- [ ] Coverage of changed lines at or above 80%: high enough to force a test for new behavior, low enough that a config or type-only line does not fail the change.
- [ ] Project coverage, bundle size, and similar inherited metrics: today's measured value, must not fall (or grow), per the ratchet section; no default target is offered for these on purpose.
- [ ] Mutation score, where mutation testing is used, at or above 60% to start: a realistic first line for a suite that has never been mutated; 80% is a mature-suite number and belongs in the measured table until the suite earns it.
- [ ] Dependency and code-scanning severity: nothing at high or above blocks; findings below that tier are reported, because gating on low severity drowns the gate in noise.
- [ ] Page budgets where a URL exists: LCP at or below 2500 ms and CLS at or below 0.1, the published good thresholds for those vitals; accessibility at zero critical or serious findings, with moderate and minor findings reported rather than gated.
- [ ] State every default next to its reason inside the file: a threshold whose rationale is missing gets deleted by the first author it inconveniences, while a reasoned one gets argued with, which is the healthier outcome.

## Verification and red flags

- [ ] The contract was set up correctly when: the file exists, every number in it carries a reason, the floor passes on the current codebase with no changes, every picked dimension has a tool installed and a command that runs today, and at least one enforced check is external.
- [ ] Run one trial pass on the current branch before declaring the setup done: the expected result is no failures the team disagrees with; a surprise failure means the measurement, the threshold, or the scoping is wrong, and it gets fixed in the setup change, not waived.
- [ ] Stop and reconsider on any of these: a budget the codebase already fails with no plan to reach it, a dimension written down with no tool behind it, a checker hand-rolled where a standard one exists, or slow checks landing in the per-edit stage while authors start bypassing hooks.
- [ ] Stop and reconsider when the file itself shows drift: `CONSTRAINTS.md` edited inside a feature commit, an exception with no owner, an expiry quietly extended twice, or a threshold proposal that relaxes a number instead of fixing the code that missed it.
- [ ] Revisit placement before revisiting numbers: most complaints about a quality bar are complaints about a slow check in a fast loop, and moving the check restores compliance without lowering anything.

## Sources

- Adapted, in original wording, from the constraint-driven-development skill in addyosmani/agent-skills (MIT License, Copyright (c) 2025 Addy Osmani): https://github.com/addyosmani/agent-skills — including its floor-guard reference implementation for the five diff moves and its quality-gate pattern for turning scanner reports into verdicts.
- Sibling chapters in this skill: `references/testing.md` (coverage and mutation discipline), `references/audit-methodology.md` (diff-based review order), `references/critical-path.md` (binary done-conditions naming the exact command).
