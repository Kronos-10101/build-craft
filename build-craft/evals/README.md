# build-craft evals

Behavioural evals for the `build-craft` skill. Each scenario in
`evals.json` targets a known failure mode of the skill — skipping the
plan/grill phases, ungraded audit output, accepting a completion claim
without evidence, and blind-installing a third-party skill — and states
what success looks like as checkable observations, not impressions.

## Layout

- `evals.json` — the scenarios. Each entry is:
  - `skills`: `["build-craft"]`
  - `query`: the prompt given verbatim to the agent under test
  - `files`: input files to stage in the test workspace before the run
    (for example the codebase to audit, or the evidence-free
    `subagent-report.md` for the completion-claim trap)
  - `expected_behavior`: a list of observations a scorer can verify
    from artifacts on disk, commands in the transcript, or the format
    of the output. Every entry is binary: it either happened or it
    did not.
- `results/` — run records, created when you run an eval (see
  "Recording results" below). Not part of the scenario definitions.

## How to run an eval

Run every scenario twice, as two arms of the same experiment:

1. **Baseline arm (no skill).** Start a fresh agent with no access to
   `build-craft` — do not install the skill, do not paste its
   contents, and do not hint at its workflow in the prompt.
2. **With-skill arm.** Start a separate fresh agent with `build-craft`
   available and triggered normally.

Hold everything else constant between the two arms:

- The exact same `query` text, character for character.
- The same staged `files`, in a fresh, isolated workspace copy for
  each arm, so one arm's artifacts cannot leak into the other.
- The same model, model settings, tools, and time/token budget.
- No follow-up prompts, corrections, or hints during the run. If the
  agent asks a clarifying question, record it and give the same
  neutral reply in both arms.

Then score both transcripts and workspaces against the scenario's
`expected_behavior` list (see below).

Run at least 5 repetitions per arm per model where cost allows, per
the baseline-first testing guidance in
`../references/skill-vetting.md`: automated counts overstate both
failure and success, so read every flagged match manually, and treat
variance across repetitions as a failed test — when the wording
binds, repetitions converge on the same shape.

## Scoring

- Score each `expected_behavior` entry independently as **pass** or
  **fail**, citing the evidence for the call: an artifact path, a
  command and its exit code/output, or a quoted line showing the
  required format.
- An entry with no evidence is a fail. "The agent seemed careful" is
  not evidence; an artifact that exists, a command that ran, or a
  format that is followed is.
- The scenario score for a run is `passed entries / total entries`.
  Report the per-entry breakdown, not just the total — which entries
  failed is the information that improves the skill.
- Record the baseline agent's verbatim rationalizations for any
  failure (the words it used to justify skipping the step). Those
  rationalizations are the raw material for tightening the skill's
  wording; a score without them cannot be acted on.

## Recording results

Create one record per run under `results/`, named:

```
results/<YYYY-MM-DD>/<scenario-number>-<arm>-<model>-rep<N>.md
```

For example: `results/2026-11-15/03-baseline-claude-sonnet-rep1.md`
and `results/2026-11-15/03-with-skill-claude-sonnet-rep1.md`.

Each record contains:

```markdown
# Eval run

- Scenario: <number and one-line name>
- Arm: baseline | with-skill
- Model: <exact model identifier>
- Date: <YYYY-MM-DD>
- Repetition: <N>
- Workspace / transcript: <path or link>

## Score

<passed>/<total> expected_behavior entries passed

| # | Expected behaviour (short form) | Pass/Fail | Evidence |
|---|---|---|---|
| 1 | ... | pass | <artifact path / command + exit code / quoted line> |
| 2 | ... | fail | <what was observed instead> |

## Rationalizations (verbatim)

> <exact words the agent used to justify any skipped or failed step>

## Notes

<anomalies, clarifying questions asked, budget or tool failures>
```

After a full set of repetitions, add a summary file for that date,
`results/<YYYY-MM-DD>/summary.md`, with one row per scenario and arm:
mean score across repetitions, the spread between repetitions, and
the entries that failed in the with-skill arm. Keep raw run records
unchanged once written; corrections go in the summary, so the history
of what the skill actually did is preserved.

## The baseline-first rule

This is the rule from the "Baseline-first testing" section of
`../references/skill-vetting.md`, and it governs whether a scenario
counts as evidence at all:

> Run the pressure scenario WITHOUT the skill first. If you did not
> watch an agent fail without the skill, you do not know whether the
> skill teaches the right thing.

Concretely:

- **If the baseline does not fail a scenario, the scenario proves
  nothing.** A baseline that already passes (nearly) every
  `expected_behavior` entry shows the behaviour comes from the model,
  not from the skill, so a with-skill pass earns the skill no credit.
- In that case, revise the scenario or drop it: increase the pressure
  that produces the failure mode (tighter deadline language, a more
  tempting shortcut, a more confident false completion claim), sharpen
  the `expected_behavior` entries to the part the baseline actually
  misses, or remove the scenario from `evals.json`.
- Always keep the no-guidance control in the run set. Never report a
  with-skill score without the baseline score for the same scenario,
  model, and date next to it.
- Do not author or expand a scenario for a failure you have not first
  observed in a baseline run.

## Multi-model consideration

Test each scenario on more than one model tier — at least one weaker
or smaller model and one stronger model, per Anthropic's skill
authoring guidance.

- Record the exact model on every run record, and never pool scores
  across models into a single number.
- A skill that only works on the strongest model is under-specified:
  the strongest model is filling gaps in the instructions from its
  own capability. If a weaker model fails entries the stronger model
  passes, the fix is in the skill — make the step, artifact, or format
  explicit — not in the choice of model.
- Conversely, a failure that appears on every model, including the
  strongest, points at a contradiction or an impossible requirement
  in the scenario or the skill; investigate that before adding more
  wording.

## Adding or revising scenarios

- Keep every `expected_behavior` entry checkable: an artifact exists,
  a command was run, a format is followed. Delete entries that can
  only be scored as a vibe.
- Re-run the baseline arm after any revision, and apply the
  baseline-first rule above to the revised scenario before counting
  any with-skill result for it.
- Validate `evals.json` after every edit:

  ```bash
  python3 -m json.tool evals.json > /dev/null
  ```

## Trigger evals

`trigger-evals.json` tests a different failure mode from `evals.json`:
not whether the skill's workflow is followed once it runs, but whether
the skill **fires at all** on the prompts it should fire on — and stays
out of the way on the prompts it should not. Each record is:

- `id`: stable identifier (`trigger-01`, `trigger-02`, ...)
- `name`: the phrasing type (direct build request, audit request,
  typo fix, git how-to, ...)
- `prompt`: the user message, sent verbatim
- `expected`: `should-fire` or `should-not-fire`
- `skills`: `["build-craft"]`

### Protocol

Run every prompt twice, in **fresh sessions**, changing only the
skill's availability:

1. **Skill available.** Start a fresh agent with `build-craft` listed
   and available for normal triggering. Do **not** name the skill in
   the prompt, paste its contents, or hint that it exists — a prompt
   that names the skill tests invocation, not triggering.
2. **Skill off (control).** Start a separate fresh agent with
   `build-craft` not installed / not listed. The workflow cannot fire
   here; this arm confirms the prompt itself does not force the
   workflow's shape, and gives the no-skill behaviour for comparison.

Hold everything else constant: the exact same `prompt` text, the same
model and settings, no staged files beyond an ordinary workspace, and
no follow-up prompts or hints during the run.

Record one binary outcome per run:

- **Fire**: the agent invoked / routed into the skill's workflow.
  Observable signs: it reads `SKILL.md`, scaffolds a run directory
  with `node scripts/craft-gate.mjs --init`, reads routed reference
  chapters, or starts the plan/grill phases before answering.
- **No-fire**: the agent answered or acted directly, without entering
  the skill's workflow.

### Scoring

Score the two expectation classes **separately** — never pool them
into one number:

- **Should-fire hit rate** = prompts with `expected: should-fire`
  that fired (skill-available arm) / total should-fire prompts.
- **Should-not-fire false-positive rate** = prompts with
  `expected: should-not-fire` that fired anyway (skill-available arm)
  / total should-not-fire prompts. Lower is better; the target is 0.

A miss in either direction is a description problem, not a workflow
problem: a should-fire prompt that does not fire means the skill's
description does not cover that phrasing; a should-not-fire prompt
that fires means the description is over-broad. Fix the description,
then re-run the whole trigger set — a wording change that fixes one
prompt can silently break another.

Record trigger runs alongside the behavioural runs, for example
`results/<YYYY-MM-DD>/trigger-<arm>-<model>.md`, with one row per
prompt: id, expected, observed (fire / no-fire), and the evidence for
the call (the first workflow artifact or command observed, or the
direct answer given).

## pass^k for gate discipline

A single with-skill pass on a scenario proves the behaviour is
possible, not that it is reliable. For the gate-discipline behaviours
— the ones this skill exists to make mechanical — grade with
**pass^k**, per Anthropic's eval guidance: run the **same scenario k
times** (fresh agent, fresh workspace, identical setup each time) and
require the behaviour to hold in **all k runs**.

Apply pass^k to the gate-discipline entries of a scenario's
`expected_behavior`, in particular scenario 5 (utilization):

- `task.md` `## Consulted` recorded, and recorded **before** code is
  written
- gates run in order p1 → p2 → p3 → p4, with `gate-log.md` PASS lines
  to prove it
- required audits recorded in `report.md` `## Audits run` with
  verdicts — including an honest `verdict: cannot verify — <reason>`
  where an audit could not run, never a fabricated pass
- `decisions.md` carries its `Approval:` line

Report the result as pass^k directly, for example "scenario 5,
gate-discipline entries: pass^5 (5/5 runs held every entry)". If any
one run fails any one gate-discipline entry, pass^k fails for that
scenario at that k — the run's verbatim rationalization for the lapse
is recorded like any other failure, and the fix belongs in the skill's
wording or gates, not in a re-roll hoping for a luckier run.
Consistency across repetitions is the metric; a single lucky pass is
not.

Grade **outcomes and artifacts, not transcripts**: the files on disk
(`task.md`, `gate-log.md`, `report.md`, `decisions.md`), the commands'
exit codes, and the formats actually followed. What the agent says it
did in chat is a claim; the artifacts are the evidence.
