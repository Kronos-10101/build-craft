# Planning and Grill Me — plan the work, then interrogate the plan until it survives

Scope: how to break a task down, allocate it, write an implementation plan, run a pre-mortem on it, and then grill it with hostile questions until every hole is closed. Read this file during P-1 and P-2 of the SKILL.md workflow. Checked 2026-09-30.

## Task planning and allocation

- [ ] You restated the goal in one sentence and wrote explicit non-goals — anything not in the goal sentence is a candidate non-goal until justified.
- [ ] You decomposed the work so each task has a named input, a named output, and a verifiable done-condition; no task is "work on X".
- [ ] You ordered tasks by dependency (prerequisites first), risk (riskiest unknowns earliest — spike the scary part before committing), and layering (scaffold → core → features → polish).
- [ ] You marked what can run in parallel (independent tasks, parallel research) vs what must be sequential; parallel work has no shared mutable state between streams.
- [ ] If delegating to subagents, each one got exactly one task with its own done-condition and all the context it needs — never "help with the project".
- [ ] You identified the single riskiest assumption and have a plan to validate it first, not last.
- [ ] You classified each decision as a one-way door (hard/costly to reverse — needs the full grill) or a two-way door (cheaply reversible — decide fast, adjust later); one-way doors get disproportionate scrutiny.

## The implementation plan template

Write the plan in this shape before any code:

- [ ] **Goal** — one sentence: what will exist when this is done.
- [ ] **Non-goals** — what you are explicitly not doing (prevents scope creep mid-build).
- [ ] **Design decisions** — each decision with the alternatives considered and why this one won (one line each); mark one-way vs two-way doors.
- [ ] **File-by-file changes** — every file created/modified/deleted and what changes inside it.
- [ ] **Test plan** — what you will test, at which layer (see `references/testing.md`), and what "passing" means.
- [ ] **Risks** — what could go wrong, likelihood, and the mitigation or contingency for each.
- [ ] **Blast radius** — name every existing endpoint, DB table or migration target, background job, and UI component the change touches or could regress; for each, who is hurt if it breaks and how you detect it within one deploy cycle.
- [ ] **Rollback** — how to undo this if it fails in production (revert commit, migration down, feature flag).

## Persistent state planning — survive context compaction and session restarts

- [ ] The plan of record lives in `task.md` (goal, decisions, task list with owners and done-conditions) and an append-only `progress.md` (what was done, what was learned, what is next); both are committed or kept in the shared working dir — never only in chat.
- [ ] After every task completes or every ~30 minutes of wall-clock work, you append to `progress.md`; a session restart costs at most one task, never the whole plan.
- [ ] The resume routine reads `task.md` + `progress.md` and continues from the first incomplete task — no re-planning from scratch on restart.

## Atomic acceptance criteria

- [ ] Every task's done-condition is binary and checkable by a tool, not a human judgment: `curl -f http://localhost:8000/health` returns 200; `pytest --cov-fail-under=85` passes; the Playwright scenario goes green; the PR has ≥1 approval with all required checks passing.
- [ ] No done-condition says "works", "looks right", or "is done" — each one names the exact command, endpoint, or gate that decides it.

## Pre-mortem: assume the plan already failed

Gary Klein's pre-mortem (HBR, 2007): prospective hindsight — imagining the failure has already happened — surfaces ~30% more real failure causes than asking "what could go wrong," because it gives dissent permission. Run it right after the plan feels settled, before commitment:

- [ ] You stated the failure as a foregone fact, past tense: "It is six months from now. This plan failed spectacularly. Here is the history of how."
- [ ] You wrote failure causes independently and silently first (no anchoring on the first confident voice), then harvested them all before debating any.
- [ ] You rotated through the five lenses so the exercise doesn't re-surface the one failure mode everyone already named:
  - **Adversary** — how would someone actively trying to defeat this exploit it?
  - **Resource failure** — what if time, budget, people, or a key dependency simply didn't show up?
  - **Silent failure** — what fails quietly, undetected until it's too late to fix cheaply?
  - **External shock** — what outside event (market, regulatory, personnel, provider outage) breaks an assumption baked into the plan?
  - **Internal blind spot** — what does everyone already half-suspect but hasn't said aloud?
- [ ] You ranked causes by likelihood × impact and wrote mitigations for the top three directly into the plan — not into a separate risk register nobody reads.
- [ ] You checked the bus factor: which single person, credential, or undocumented system does the plan silently depend on, and what happens when it's gone?

## Grill me: the question bank

Attack the plan with questions derived from the plan itself. Run at most 5 per round, update the plan, repeat until a full round changes nothing.

### Goals and scope

- [ ] What does "done" look like in one demonstrable sentence — and what would a user click, run, or observe to confirm it?
- [ ] Which requirement, if dropped, would still leave this shippable? (That is your scope-cut candidate.)
- [ ] What is explicitly out of scope, and what breaks if someone assumes it is in scope?
- [ ] Whose problem is this really solving, and how do you know they have this problem?

### Assumptions

- [ ] List every assumption the plan makes. For each: what breaks if it is wrong, and how would you detect that?
- [ ] What are you assuming about the input data (shape, size, encoding, trustworthiness)? What happens on the first malformed input?
- [ ] What are you assuming about the environment (OS, versions, network, credentials)? What happens when an assumption fails at 2 AM?
- [ ] What are you assuming about time and people — who does what, by when, and what slips first when the estimate is wrong?

### Design and interfaces

- [ ] Why this design and not the two obvious alternatives? What would make you switch?
- [ ] Where are the module boundaries, and what crosses them? Could a boundary move and simplify everything?
- [ ] What does the public interface (API, CLI, file format) look like, and what happens when a caller misuses it?
- [ ] What state exists, where does it live, and what happens when two writers race?
- [ ] Is this a one-way door wearing a two-way door's clothes — what is actually irreversible once you start?

### Edge cases and failure modes

- [ ] What is the empty case, the one-item case, the maximum case, and the hostile case?
- [ ] What happens when each dependency fails (network, database, disk full, third-party API down)? Walk the failure, don't hand-wave it.
- [ ] What happens on partial failure halfway through a multi-step operation? Is the system in a recoverable state?
- [ ] What fails silently — succeeding just enough that nobody notices until the damage compounds?
- [ ] What is the worst thing a malicious or careless user can do through this, and what stops them? (Cross-check `references/security.md` and `references/offensive-security.md`.)

### Scale and performance

- [ ] What are the real numbers: expected load, data volume, latency budget? Where did each number come from?
- [ ] What breaks first at 10x the expected load, and what is the plan when it does?
- [ ] Is there a performance claim in the plan without a baseline measurement? (See rule 5 in SKILL.md.)

### Operations

- [ ] How will you know it is working in production (logs, metrics, health checks, alerts)?
- [ ] How do you deploy it, and how do you roll it back? (If there is no rollback, the plan is not done.)
- [ ] What does the on-call person need to know at 2 AM that is not written down yet?
- [ ] Where did we get lucky in this plan — which step works only because nothing went wrong, and what catches it when luck runs out?

### Trade-offs and acceptance

- [ ] What did you deliberately choose NOT to optimize, and why is that the right call?
- [ ] What is the acceptance test — the concrete check that decides "ship" vs "not yet"?
- [ ] If you had half the time, what would you cut? (If you cannot answer, the plan is not prioritized.)
- [ ] Which contributing factors — not a single root cause — would combine to kill this, and which one have you left unmitigated?

## Running the grill

- [ ] You asked questions tied to concrete parts of the plan, not generic "are you sure?" — every question names the decision or assumption it targets.
- [ ] You answered honestly; anything you could not answer became a research task, a decision, or an explicit open question with an owner — never a shrug.
- [ ] You updated the written plan after every round; the plan on disk always reflects the latest answers.
- [ ] You stopped when a full round of questions changed nothing (diminishing returns), not when you ran out of energy.
- [ ] For large or irreversible work, the grilled plan went to the user for explicit approval before implementation; for small reversible work, you noted "self-grilled, proceeding" in one line.
- [ ] When the user says "grill me", you asked THEM the questions directly, took their answers, and sharpened the plan — the user is the reviewer, you are the interrogator.

## Sources

- https://github.com/raphaelthomas/tech-operator-crm-cards/blob/HEAD/learn/pre-mortem.md
- https://github.com/christian-clayton/workflow/blob/HEAD/skills/thinking-and-reasoning/pre-mortem-and-red-teaming/SKILL.md
- https://github.com/letpeoplework/letpeopleworkshop/blob/HEAD/skills/facilitation-practices/practices/pre-mortem.md
- https://github.com/lev-os/agents/blob/HEAD/skills-db/thinking/patterns/blameless-postmortems/SKILL.md
- https://github.com/ilv78/art-world-hub/blob/HEAD/docs/postmortems/POSTMORTEM_WORKFLOW.md
- https://sre.google/sre-book/postmortem-culture/
