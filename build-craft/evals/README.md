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
