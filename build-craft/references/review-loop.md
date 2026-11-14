# Review Loop — fresh-reviewer gates, bounded fixes, and proof before claims

Scope: the per-task review discipline for delegated work: how to package a diff for a fresh reviewer, how to run the fix loop without letting it spin forever, and how to verify a result before anyone claims it is done. Read this file whenever an implementer hands work back for acceptance. Checked 2026-11-15.

## Ground rules

- [ ] Every task gets its own fresh reviewer: a reviewer who did not write the code, working from the diff and the brief alone, never from the implementer's confidence.
- [ ] Implementer self-review never replaces the task review: both happen, in that order, and only the task review is a gate.
- [ ] A review that returns only one verdict is incomplete: spec compliance and code quality are separate questions and both need an explicit answer.
- [ ] Nothing is dropped silently in this loop: a finding is fixed, parked with a written ruling, or carried into the final review list, and each outcome leaves a ledger line.
- [ ] The controller never fixes findings in its own session: fixes go back to an implementer so the fix itself passes through review.
- [ ] Evidence travels as files, not as pasted prompt text: briefs, reports, and diff packages are handed over by path so the controller context stays lean.

## Before dispatch: record the base

- [ ] You recorded BASE before dispatching the implementer, with `git rev-parse HEAD`, and wrote the value into the ledger next to the task number.
- [ ] BASE is the commit the task started from, not a commit you reconstruct later from memory or from the implementer's report.
- [ ] If the dispatch failed and you retry the task, you recorded a fresh BASE for the new attempt instead of reusing the stale one.
- [ ] You noted the implementer's identity or session handle at dispatch time, so fix rounds 1 to 3 can resume the same agent with its context intact.

## The review package: one file, full range

- [ ] When the implementer reports done, you built the review package for the range BASE..HEAD, where HEAD is the current `git rev-parse HEAD`.
- [ ] The package is a single file on disk containing three parts in order: the commit list for the range, the stat summary, and the full diff with generous context.
- [ ] You generated the three parts with `git log --oneline BASE..HEAD`, `git diff --stat BASE..HEAD`, and `git diff -U10 BASE..HEAD`, redirected into one uniquely named file.
- [ ] You handed the reviewer the file path, never the file contents pasted into the dispatch prompt: pasted diffs bloat the controller context and get truncated without warning.
- [ ] You never used `HEAD~1` as the base: a task that landed in several commits would lose every commit except the last, and the reviewer would grade a fraction of the work.
- [ ] You never dispatched a reviewer without a package file: a reviewer told to fetch its own diff will fetch a different range than the one you intended.
- [ ] The package file lives in the plan workspace alongside the brief and the report, so a later session can rebuild exactly what the reviewer saw.

## Dispatching the reviewer

- [ ] The reviewer received exactly three paths: the task brief (the same file the implementer worked from), the implementer's report file, and the review package file.
- [ ] The dispatch named BASE and HEAD explicitly, so the reviewer can confirm the package matches the range it was asked to judge.
- [ ] The dispatch stated the model tier explicitly, scaled to the size and risk of the diff: a small mechanical diff takes a cheaper tier, a concurrency or contract change takes a stronger one.
- [ ] The reviewer works read-only: it inspects with show, diff, and log, and it never mutates the working tree, the index, or HEAD on the shared checkout.
- [ ] The reviewer does all of the review itself: it never spawns a second reviewer or splits the diff across helpers, because a spawned seat duplicates the gate at full cost and its verdict counts for nothing.
- [ ] The reviewer reads the diff file once as its primary view: it reopens a changed file separately only when a hunk is cut off mid-function, and it says so in the report when it does.
- [ ] The reviewer looks outside the diff only to chase a named, concrete risk (a changed contract, a lock-order change, shared mutable state), and it names both the risk and what it checked.

## Two verdicts, every time

- [ ] **Verdict 1, spec compliance:** does the diff do what the brief asked, no more and no less: nothing requested is missing, nothing unrequested was added, nothing was built the wrong way.
- [ ] **Verdict 2, code quality:** is the work well built on its own terms: clear separation of concerns, errors handled rather than swallowed, edge cases covered, tests that assert real behavior.
- [ ] A batched task is checked file by file against the brief's list: a listed file the diff never touches is a missing finding, however clean the rest of the batch looks.
- [ ] The reviewer treated the implementer's report as unverified claims: a stated rationale in the report never lowers the severity of a finding the code itself earns.
- [ ] The reviewer graded by actual severity: Critical blocks the task, Important means the task cannot be trusted until fixed, Minor is polish or broader coverage and never enters the fix loop.
- [ ] Findings cite `file:line` with what is wrong, why it matters, and how to fix it when the fix is not obvious: a vague finding cannot be fixed or re-reviewed.
- [ ] The reviewer named strengths specifically before listing issues: accurate praise is calibration data, not courtesy.

## The attention lens: global constraints verbatim

- [ ] The review request carried the plan's global constraints copied verbatim: exact values, exact formats, and stated relationships between components, character for character from the plan or spec.
- [ ] You copied the constraints, you did not paraphrase them: a paraphrase quietly loosens a bound or drops a qualifier, and the reviewer then grades against your summary instead of the requirement.
- [ ] Process rules (review method, test hygiene, severity calibration) live in the reviewer template and are not repeated in the constraints block: the block is only for what this project's spec demands.
- [ ] You added no open-ended directives without a concrete, task-specific reason: a vague instruction to check everything dilutes attention from the constraints that actually bind this task.
- [ ] You did not ask the reviewer to rerun tests the implementer already ran on the same code: the report carries that evidence, and a rerun buys repetition, not information.

## Never pre-judge the review

- [ ] The dispatch contains no instruction to ignore, excuse, or cap the severity of a specific issue: any wording that steers the reviewer away from a finding is itself a defect in the dispatch.
- [ ] If you believe a likely finding is a false positive, you let the reviewer raise it anyway and you adjudicate it in the loop, where the ruling is recorded.
- [ ] You did not defend the plan to the reviewer: when the brief itself mandates something the rubric calls a defect, the reviewer flags it as a plan-mandated finding and the human decides.
- [ ] You adjudicate findings only at the fix-loop cap, never preemptively to shorten the loop: early adjudication is pre-judging under a different name.

## Where the spec is silent

- [ ] The spec states what the software must do; it does not enumerate every input, environment, or condition the software will meet in use.
- [ ] For behavior the spec does not cover, the reviewer grades by what a reasonable person using this software would expect to happen.
- [ ] Silence is not permission: an unspecified case handled in a way that surprises or harms that reasonable user is a finding, graded by its effect on the user rather than by whether the spec mentioned the trigger.
- [ ] Typical silent-spec cases to probe: empty input, malformed input, a missing optional field, a slow or absent dependency, a second invocation while the first is still running.
- [ ] When the reasonable-person standard and the letter of the brief conflict, the reviewer flags the conflict explicitly instead of quietly picking a side.

## Declined to judge: the reviewer's blind spots, ruled on

- [ ] Before its verdicts, the reviewer emitted a Declined to judge list: every behavior it considered and set aside as outside the plan or spec, one line each, with the reason it set the item aside.
- [ ] An empty list is a valid answer only when the reviewer truly set nothing aside: the list must exist in the report even when it is empty.
- [ ] Items the reviewer could not verify from the diff alone (behavior in unchanged code, behavior spanning several tasks) belong on this list or in a cannot-verify section, never in a silent pass.
- [ ] The executor ruled on every line of the list explicitly before marking the task complete: each line ends as confirmed gap (enters the fix loop), accepted as out of scope (with a one-line reason), or deferred to the final review.
- [ ] A line with no ruling blocks completion exactly like an open finding: the point of the list is that nothing the reviewer set aside disappears without a decision.
- [ ] Rulings live in the ledger next to the task entry, so the final whole-branch review can see both what was set aside and what was decided about it.

## The bounded fix loop

- [ ] The loop triggers on any of three signals: a failed spec verdict, any Critical or Important finding, or a cannot-verify item the executor confirmed as a real gap.
- [ ] Minor findings never enter the loop: you ledger them as deferred as they arrive and point the final review at the list, so the roll-up gets triaged instead of forgotten.
- [ ] One round is one fix dispatch plus one scoped re-review: a fix without its re-review does not count as a round and does not close anything.
- [ ] The loop is capped at five rounds per task: rounds 1 to 3 resume the original implementer with the open findings sent verbatim, because its context holds the task, the code, and its own earlier choices.
- [ ] The fixer re-ran the tests covering the amended code, named the covering test files, and appended a fix report (tests run, command, output) to the same report file before the re-review was dispatched.
- [ ] You confirmed the fix report actually contains the covering tests, the command, and the output before dispatching the re-reviewer: a re-review of an undocumented fix grades guesswork.
- [ ] After each round you appended the ledger line: task number, round number out of five, how many findings were addressed, how many remain open, and the commit range the round produced.

## Escalation at rounds 4 and 5

- [ ] Rounds 4 and 5 go to a fresh fixer on a model at least one tier above the implementer that got stuck: a loop surviving three resumes usually means the implementer cannot see its own problem.
- [ ] The escalated dispatch carries the brief path, the report file path, the still-open findings, and a plain framing: a prior implementer attempted this task several times, the report file records what was tried, the new fixer owns it now.
- [ ] Escalation changes the fixer, not the standard: the same findings, the same severity bar, and the same re-review requirement apply in rounds 4 and 5.
- [ ] If your harness cannot resume a live agent for rounds 1 to 3, you dispatch a fresh implementer carrying the brief, the report file, and the findings: the report file is the persistent memory either way.

## Scoped re-review: every fix gets checked, narrowly

- [ ] Every fix round ends with a scoped re-review of the fix diff: the range runs from the head the previous review saw to the new head, packaged as a file the same way as the original review package.
- [ ] The re-reviewer verdicts each open finding as addressed or not addressed, with `file:line` evidence: attempted is not addressed, the specific defect must no longer exist.
- [ ] The re-reviewer also inspects the fix diff for new breakage the fix itself introduced: new Critical or Important breakage joins the open findings list for the next round.
- [ ] The re-reviewer does not reopen code the fix never touched: an issue found entirely outside the fix diff is logged as an out-of-scope observation for the final review, and it never extends the loop.
- [ ] Skipping the re-review because the fix looked small is forbidden: unreviewed fixes are how regressions land, and small fixes are where reviewers most often wave them through.

## At the cap: park with a ruling, never loop forever

- [ ] When the fifth round's re-review still leaves findings open, dispatching stops: past the cap, extra rounds do not converge, because the failure is structural rather than incremental.
- [ ] The executor then adjudicates each open finding personally, using the plan and cross-task context the reviewer never had.
- [ ] Each open finding gets one of three rulings, written into the ledger: the reviewer is wrong or the point is contestable (park it, with the reason the code stands); the finding is real but nothing downstream builds on it (park it as real and deferred); the finding is real and load-bearing (rule on the smallest change that unblocks dependent work and carry that ruling into the next task's dispatch).
- [ ] A parked finding is recorded, visible, and revisited at the final review: parking is a decision with a name on it, not a discard.
- [ ] A load-bearing defect is never parked silently: every dependent task would build on the flaw, so the ruling travels with the work until it is resolved.
- [ ] The task closes only when the review is clean or every open finding is parked with a ruling: the completion line states which, and how many were parked.

## Claim-time verification gate

No success claim of any kind (done, fixed, passing, complete, ready) is made until the five steps below have run in this session, on the current code, in order.

- [ ] **Step 1, identify:** name the single command whose output would prove the claim: not a related command, not a weaker proxy, the command that observes the claimed behavior directly.
- [ ] **Step 2, run:** execute that command fresh and in full: no cached result, no previous run, no partial variant, no sampling of the suite when the claim covers the suite.
- [ ] **Step 3, read:** read the complete output and the exit code, and count the failures yourself instead of trusting a summary line or a green icon.
- [ ] **Step 4, verify:** check that the output actually confirms the specific claim being made: if it does not, state the real status with the evidence, however unwelcome.
- [ ] **Step 5, claim:** only now make the claim, with the evidence attached: the command run, the exit code, and the decisive lines of output travel with the claim.
- [ ] Skipping any step voids the claim: confidence, a careful reading of the code, and a collaborator's assurance are none of them a substitute for a fresh run.
- [ ] The gate applies to paraphrases and implications too: any wording that suggests success without fresh evidence fails the gate, whatever words it uses.
- [ ] The gate applies before committing, before opening a pull request, before marking a task complete, and before handing work to the next agent: the claim moments, not just the final report.

## Claim to evidence: what actually proves it

| Claim | Evidence required | Not sufficient |
|---|---|---|
| Tests pass | Fresh test command output showing zero failures | A previous run, or an expectation that they should pass |
| Build succeeds | Build command exiting 0 | A passing linter, or logs that look clean |
| Bug fixed | A test of the original symptom now passing | Code changed in the area of the bug |
| Agent completed the task | A VCS diff check showing the claimed changes exist | The agent's own report that it succeeded |
| Requirements met | A line-by-line checklist of the spec, each line verified | Green tests alone |
| Regression test works | The red-green cycle below, observed in order | The test passing once with the fix in place |
| Linter clean | Linter output showing zero errors on the full scope | A partial check extrapolated to the whole tree |

- [ ] **Agent completed** always means you inspected the diff yourself: you confirmed the files changed, the changes match the brief, and nothing unrelated rode along, before repeating the completion claim to anyone.
- [ ] **Requirements met** always means a checklist pass: reread the plan or spec, list each requirement, verify each one against the code or a proving command, and report gaps as gaps.
- [ ] A claim resting on evidence you cannot locate or cannot read is reported as unverified, not repeated more quietly: illegible evidence is a gap to surface, not a claim to soften.

## Proving a regression test: the red-green cycle

- [ ] You wrote the regression test and ran it against the fixed code: it passes.
- [ ] You reverted the fix only (the test stays) and ran the test again: it fails, and it fails on the original symptom rather than on a setup error.
- [ ] You restored the fix and ran the test a third time: it passes again, on the same command as the first run.
- [ ] All three runs are recorded with their commands and outcomes: a regression test that was never watched failing proves only that the test passes today, not that it guards the bug.
- [ ] The same discipline covers bug-fix claims generally: reproduce the symptom first, then fix, then show the reproduction no longer triggers it.

## Red flags: stop and run the gate

- [ ] The words should, probably, or seems to appear in a status statement: each one marks a claim that has not been through the gate.
- [ ] Satisfaction is expressed before verification runs: the celebration is itself the signal that the order was reversed.
- [ ] A commit, push, or pull request is about to happen on the strength of an agent report or a partial check.
- [ ] The justification is fatigue, time pressure, or that the rule was satisfied in spirit with different wording: the gate has no exceptions for any of the three.

## Sources

- obra/superpowers (MIT License): subagent-driven development, task reviewer and re-review prompt templates, fix-loop and cannot-verify references, requesting-code-review reviewer template, and verification-before-completion. Adapted in original wording; see https://github.com/obra/superpowers
