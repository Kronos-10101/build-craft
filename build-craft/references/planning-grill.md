# Planning and Grill Me — plan the work, then interrogate the plan until it survives

Scope: how to break a task down, allocate it, write an implementation plan, and then grill that plan with hostile questions until every hole is closed. Read this file during P-1 and P-2 of the SKILL.md workflow. Checked 2026-09-30.

## Task planning and allocation

- [ ] You restated the goal in one sentence and wrote explicit non-goals — anything not in the goal sentence is a candidate non-goal until justified.
- [ ] You decomposed the work so each task has a named input, a named output, and a verifiable done-condition; no task is "work on X".
- [ ] You ordered tasks by dependency (prerequisites first), risk (riskiest unknowns earliest — spike the scary part before committing), and layering (scaffold → core → features → polish).
- [ ] You marked what can run in parallel (independent tasks, parallel research) vs what must be sequential; parallel work has no shared mutable state between streams.
- [ ] If delegating to subagents, each one got exactly one task with its own done-condition and all the context it needs — never "help with the project".
- [ ] You identified the single riskiest assumption and have a plan to validate it first, not last.

## The implementation plan template

Write the plan in this shape before any code:

- [ ] **Goal** — one sentence: what will exist when this is done.
- [ ] **Non-goals** — what you are explicitly not doing (prevents scope creep mid-build).
- [ ] **Design decisions** — each decision with the alternatives considered and why this one won (one line each).
- [ ] **File-by-file changes** — every file created/modified/deleted and what changes inside it.
- [ ] **Test plan** — what you will test, at which layer (see `references/testing.md`), and what "passing" means.
- [ ] **Risks** — what could go wrong, likelihood, and the mitigation or contingency for each.
- [ ] **Rollback** — how to undo this if it fails in production (revert commit, migration down, feature flag).

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

### Design and interfaces

- [ ] Why this design and not the two obvious alternatives? What would make you switch?
- [ ] Where are the module boundaries, and what crosses them? Could a boundary move and simplify everything?
- [ ] What does the public interface (API, CLI, file format) look like, and what happens when a caller misuses it?
- [ ] What state exists, where does it live, and what happens when two writers race?

### Edge cases and failure modes

- [ ] What is the empty case, the one-item case, the maximum case, and the hostile case?
- [ ] What happens when each dependency fails (network, database, disk full, third-party API down)? Walk the failure, don't hand-wave it.
- [ ] What happens on partial failure halfway through a multi-step operation? Is the system in a recoverable state?
- [ ] What is the worst thing a malicious or careless user can do through this, and what stops them? (Cross-check `references/security.md` and `references/offensive-security.md`.)

### Scale and performance

- [ ] What are the real numbers: expected load, data volume, latency budget? Where did each number come from?
- [ ] What breaks first at 10x the expected load, and what is the plan when it does?
- [ ] Is there a performance claim in the plan without a baseline measurement? (See rule 5 in SKILL.md.)

### Operations

- [ ] How will you know it is working in production (logs, metrics, health checks, alerts)?
- [ ] How do you deploy it, and how do you roll it back? (If there is no rollback, the plan is not done.)
- [ ] What does the on-call person need to know at 2 AM that is not written down yet?

### Trade-offs and acceptance

- [ ] What did you deliberately choose NOT to optimize, and why is that the right call?
- [ ] What is the acceptance test — the concrete check that decides "ship" vs "not yet"?
- [ ] If you had half the time, what would you cut? (If you cannot answer, the plan is not prioritized.)

## Running the grill

- [ ] You asked questions tied to concrete parts of the plan, not generic "are you sure?" — every question names the decision or assumption it targets.
- [ ] You answered honestly; anything you could not answer became a research task, a decision, or an explicit open question with an owner — never a shrug.
- [ ] You updated the written plan after every round; the plan on disk always reflects the latest answers.
- [ ] You stopped when a full round of questions changed nothing (diminishing returns), not when you ran out of energy.
- [ ] For large or irreversible work, the grilled plan went to the user for explicit approval before implementation; for small reversible work, you noted "self-grilled, proceeding" in one line.
- [ ] When the user says "grill me", you asked THEM the questions directly, took their answers, and sharpened the plan — the user is the reviewer, you are the interrogator.

## Sources

- https://en.wikipedia.org/wiki/Work_breakdown_structure
- https://www.gov.uk/service-manual/agile-delivery
- https://martinfowler.com/articles/riskDrivenDesign.html
