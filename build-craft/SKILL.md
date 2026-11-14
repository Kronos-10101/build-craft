---
name: "build-craft"
description: "This skill acts as a senior staff engineer for software work of any kind: websites, frontend UI, and browser extensions, backends and REST APIs, Python, C, modern C++, JavaScript and TypeScript, React and Next.js, system design, database schemas, and AI/ML work including LLMs, agents, MCP servers, and vector databases. It plans the work, grills the plan with hostile questions until the plan survives, then builds or audits to production standard, routing each task to reference chapters on security, offensive security, testing, performance, and design polish, with machine-checked phase gates and severity-graded audit findings. Use it when asked to build, review, improve, secure, optimize, or audit software, when asked to make a codebase production-ready or run a full review, or when a plan needs grilling before code is written. When no routed reference chapter covers the task, it fetches and vets a specialized skill from the internet."
license: "MIT"
metadata: { "version": "1.3.0" }
---

# build-craft

## Purpose

Act as a senior staff engineer for any software task: plan it, grill the plan until it survives questioning, then design it, build it, or audit it to production standard. Route each task to the right reference chapters, and fetch a specialized skill from the internet when the routed chapters are not enough.

## When to use

Use for any build, review, improvement, security, optimization, or audit task on software, and whenever the user asks to make something production-ready, check everything, or run a full review. Non-trivial means anything that cannot be finished correctly in one shot; non-trivial work always runs the full workflow below, including the P-2 grill.

## How to use this skill (reading order)

Follow this exact order. How much freedom each phase allows is defined under Degrees of freedom below.

1. **Read this file (`SKILL.md`) fully.** It defines the workflow. Then read `references/critical-path.md`, the non-skippable MUST items; it outranks every reference chapter under time pressure.
2. **Scaffold the run dir**: `node scripts/craft-gate.mjs --init <run-dir>`. All run dir artifacts live in `<run-dir>`: `task.md`, `tasks.md`, `progress.md`, `decisions.md`, `grill.md`, `design.md`, `architecture.md`, `report.md`.
3. **Classify the task** (P-0): build vs audit vs plan-only.
4. **Plan** (P-1): break the work down and write the plan into `task.md` / `tasks.md`.
5. **Grill the plan** (P-2): interrogate it per reference chapter `planning-grill.md` until it survives; log rounds in `grill.md`, verdicts in `decisions.md`. Present the plan to the user for approval on large or irreversible work.
6. **Read the routed reference chapters**: every chapter the routing table lists for the task, **before** writing code. Do not rely on memory for the checklists. Open the chapter.
7. **Copy starter templates** from `assets/templates/` and adapt them (scaffold first).
8. **Build** to the checklists (P-3), tracking progress in `progress.md`.
9. **Verify** (P-4): self-review against the checklists, run tests, run `scripts/audit-repo.sh`, fill the `report.md` verification section.
10. **Report** per the Output Contract (P-5).

Skipping steps 4–5 is how production incidents are born. The order is load-bearing: plan, grill, read checklists, scaffold, build, verify, report.

## Degrees of freedom

- **P-1 and P-2: low freedom (read-do).** Follow the templates in `templates/` line by line; do not freelance the format or skip a field.
- **P-3: medium freedom.** The routed reference chapters constrain what must hold; implementation choices inside those constraints are open.
- **P-4: do-confirm.** Run the checks, then confirm each box in `report.md`.
- **Audits: high freedom within the severity format.** Choose where to dig and in what order; the finding format in reference chapter `audit-methodology.md` does not change.

## Enforcement: phase gates

Every phase is gated by `scripts/craft-gate.mjs`, which checks the artifacts in the run dir and exits 0 on pass:

- `node scripts/craft-gate.mjs --init <run-dir>`: scaffold the run dir from `templates/`.
- `node scripts/craft-gate.mjs --phase <p1|p2|p3|p4> [--design] [--strict] [--checklists f1,f2] [--critical] --dir <run-dir>`: gate a phase. `--design` adds the design-task checks; `--strict` additionally fails on any unnegated "fail" line in `report.md`; `--checklists` requires per-checklist pass/waived attestation in `report.md` (see P-4); `--critical` requires `## Critical-path` attestation of every MUST item in reference chapter `critical-path.md`.

**Global hard rule:** do not proceed to the next phase until `node scripts/craft-gate.mjs --phase <pX> --dir <run-dir>` exits 0. Each phase section below names its own gate command; this rule applies to all of them and is not repeated per phase.

| Phase | Gate checks |
|---|---|
| p1 | `task.md` has all 7 headers; every `tasks.md` task has a substantive "done when" (condition ≥20 chars, no tautologies) |
| p2 | `grill.md` has ≥1 round with ≥3 substantive `Q:`/`A:` (≥30 chars each, every Q answered), an explicit `(plan updated: yes/no)` stop predicate, the `## Rubric` section, and a `## Judge pass` with ≥2 substantive `Verdict:` lines; `decisions.md` has ≥2 substantive `## D` entries (≥150 chars each) with "why X over Y" + source URLs (each URL in `references/`) naming a file path from `task.md` `## File changes`; `task.md` lists ≥3 substantive pre-mortem failure modes (≥20 chars each) |
| p3 | every `tasks.md` checkbox has a substantive "done when" (open/done counts reported); `design.md` picked and grilled when `--design` |
| p4 | `report.md` `## Verification` has a pass verdict (documenting tests, linters, audit runs); with `--checklists`, `## Checklist attestation` lists "`<name>`: `<p>` pass, `<w>` waived" per checklist with p+w = that checklist's item count; with `--critical`, `## Critical-path` attests all MUST items ("all `<N>` reviewed", "no waivers", or reasoned per-item waivers) |

**What the gate cannot do.** The gate checks artifacts, not thought. An agent can still write thin-but-passing prose (3 shallow questions, 2 shallow decisions) and pass. The gate makes skipping expensive and visible: every skipped step requires fabricating a plausible, cross-referenced, attested artifact, which is most of the work of doing it properly. Grill depth and decision quality sit one layer up, covered by the rubric-anchored judge pass and, for large or irreversible work, by human approval at P-2. When a measure becomes a target it degrades, so keep a log of gate FAIL reasons per run and revise checks that agents learn to game.

## Workflow

### P-0. Triage and classify

- **Build** (new code, new system, new feature) → full pipeline P-1 through P-5.
- **Audit** (review existing code or repo) → read reference chapter `references/audit-methodology.md` first, then run the routed reference chapters in the order it prescribes: security → correctness → performance → maintainability → polish. Audits still get a mini plan (`task.md` scope + checklist order) and a light grill (what could this audit miss?).
- **Plan-only** (user wants a design, not code) → run P-1 and P-2, deliver the plan (`task.md` + `decisions.md` + `report.md`) as the output.
- Scaffold the run dir here if you skipped step 2 above: `node scripts/craft-gate.mjs --init <run-dir>`.

### P-1. Plan: break down and allocate the work

Follow reference chapter `planning-grill.md` (Task planning and allocation; The implementation plan template): restate the goal in one sentence with explicit non-goals, decompose into tasks that each carry a substantive "done when" condition, order dependencies first and riskiest unknowns earliest, and mark what can run in parallel. A delegated subagent gets exactly one task with its own done-condition, never "help with the project".

- Fill `task.md` completely: the 7 headers `## Goal`, `## Non-goals`, `## Decisions`, `## File changes`, `## Risks`, `## Failure modes`, `## Rollback`. Log started and completed work in `progress.md` in the run dir as you go.
- Gate: `node scripts/craft-gate.mjs --phase p1 --dir <run-dir>`.

### P-2. Grill me: interrogate the plan until it survives

You are both the planner and the hostile reviewer. Attack the plan with questions derived from the plan itself: every design decision, every assumption, every blank spot is a target. The full question bank and the running protocol live in reference chapter `planning-grill.md`. The non-negotiables:

1. **Ask sharp, specific questions**, at most 5 per round, each tied to a concrete part of the plan. Log every round in `grill.md`: at least 1 round, at least 3 `Q:` lines with answers, Q and A substantive (≥30 chars each), every Q answered. Answer honestly: anything unanswerable becomes a research task, a decision, or an explicit open question with an owner.
2. **Record every decision** in `decisions.md`: at least 2 `## D` entries, each stating "why X over Y" with the sources consulted (URLs) and naming the file path from `task.md` `## File changes` it affects. URL rule: for load-bearing claims, open the 2-3 linked sources from the reference chapters and record their URLs in `decisions.md`. Decorative citations are not allowed.
3. **Pre-mortem**: write at least 3 failure modes into `task.md` under `## Failure modes` (≥20 chars each): how this plan could fail in production and what prevents each one. Method: reference chapter `planning-grill.md`, Pre-mortem.
4. **Update the plan** with every answer that changes a decision.
5. **Stop predicate**: repeat until a full round of grilling changes nothing. That is the stop condition, diminishing returns, not exhaustion. Record it explicitly: end the final round with `(plan updated: yes)` or `(plan updated: no)`. A self-judged "I think we're done" with no recorded predicate means P-2 has not happened.
6. **Judge pass** (separate from the rounds above): re-read the grill log as the judge, not the author. Score every answer against the `## Rubric` in `grill.md` (evidence, adversarial coverage, decision clarity, stop discipline) and write at least 2 `Verdict:` lines. The judge pass is a different mental step from answering; never merge it into the last round.
7. **Large or irreversible work** (schema migrations, deletions, public releases, money movement): present the grilled plan to the user and get explicit approval before P-3. For small reversible work, the self-grill is enough; say so in one line and proceed.
8. **Design tasks**: work through `design.md`. Pick from 2-4 named directions in reference chapter `design-directions.md`, grill each direction, record the pick and why. Gate with `--design`.

If the user says "grill me", run this protocol against them directly: ask the questions, take their answers, sharpen the plan. Two tight rounds beat ten vague ones.

Gate: `node scripts/craft-gate.mjs --phase p2 --dir <run-dir>` (`--design` for design tasks).

### P-3. Implement

1. **Scaffold first**: set up the project structure per reference chapter `project-structure.md` before writing feature code. Copy and adapt starter templates from `assets/templates/`.
2. **Build to the checklist**: write the code, then self-review against each routed reference chapter. Fix every violated item, or record it as accepted risk with a one-line reason. Work in slices: each slice runs implement, test, verify, commit, so every slice is independently revertable and the tree stays green between slices. Out-of-scope issues you notice are reported as "NOTICED BUT NOT TOUCHING", never fixed by drive-by. Never re-run a verification command on unchanged code.
3. Check off `tasks.md` items and update `progress.md` as work lands.

Gate: `node scripts/craft-gate.mjs --phase p3 --dir <run-dir>`.

### P-4. Verify

- Run the test suite (new tests per the plan's test section, plus existing).
- Run the linters and typecheckers the routed reference chapters demand.
- Execute `scripts/audit-repo.sh <repo-path>`, or `node scripts/audit-repo.mjs <repo-path>` on Windows/PowerShell without WSL (same checks, cross-platform), and treat its output as findings, not noise.
- For web apps, also run `node scripts/readiness-audit.mjs <project-path> --ci`: the 46-rule production-readiness gate (security, resilience, anti-slop craft, ethical UI, formatting, a11y, perf/SEO). No critical blockers ship.
- When the change includes user-facing prose (README/docs/report text), also run `node scripts/prose-scan.mjs <paths>` and fix every hard flag, or record it as accepted with a one-line reason, same discipline as any other P-4 check. Method: reference chapter `writing-craft.md`.
- Debug before you fix: use the gated debugging method in reference chapter `testing.md` (Debugging as a gated method). No fix is proposed before the investigate gate passes.
- Fill the verification section of `report.md`: what ran, what passed, what was waived and why. If the target project has a `CONSTRAINTS.md` (see reference chapter `quality-bar.md`), run its floor-guard diff review and record the verdict with the other checks. For routed checklists, add `## Checklist attestation` with one "`<name>`: `<p>` pass, `<w>` waived" line per checklist (p+w = that checklist's `- [ ]` item count) and gate with `--checklists <f1,f2>`.
- **Critical path**: add `## Critical-path` to `report.md` walking all MUST items in reference chapter `critical-path.md`: either "all `<N>` reviewed, no waivers" (exact count) or per-item waiver lines with reasons. **NEVER silently drop a critical-path item.** Gate with `--critical`.

Gate: `node scripts/craft-gate.mjs --phase p4 --dir <run-dir>` (add `--strict`, `--checklists <f1,f2>`, `--critical` as the task demands).

### P-5. Report

Follow the Output Contract below. `report.md` is the written record; the chat summary stays tight.

## Domain routing

Read reference chapter `critical-path.md` first on every build or audit task: it is the non-skippable MUST-tier subset distilled from all reference chapters. Then read every reference chapter below that applies, **before** writing code.

| Task | Read |
|---|---|
| Website / frontend UI | `references/web-frontend.md`, `references/design-polish.md`, `references/design-distinct.md` |
| Browser extension (Chrome MV3) | `references/browser-extensions.md`, `references/web-frontend.md` |
| Backend / REST API | `references/backend-api.md`, `references/system-design.md` |
| API versioning / deprecation policy | `references/api-versioning.md` |
| Python code | `references/python.md`, `references/python-internals.md` |
| C code | `references/c-language.md` |
| Modern C++ (17/20/23/26), low-level optimization | `references/cpp-modern.md`, `references/c-language.md` |
| JavaScript / TypeScript code | `references/javascript-typescript.md` |
| React / Next.js app | `references/react-nextjs.md`, `references/javascript-typescript.md` |
| Choosing libraries / tools / stack | `references/libraries.md` |
| Build / dev environment management | `references/build-environments.md` |
| System architecture | `references/system-design.md`, `references/system-design-deep.md` |
| HLD / LLD, design interviews | `references/system-design-deep.md` |
| Database schema / queries / migrations | `references/databases.md` |
| Choosing a database platform (Postgres, Supabase, Neon…) | `references/managed-data-platforms.md` |
| Vector DBs / embeddings / RAG | `references/vector-databases.md` |
| Security review / hardening | `references/security.md` |
| How attackers hack (offensive perspective) | `references/offensive-security.md`, `references/security.md` |
| Testing strategy / test types | `references/testing.md`, `references/quality-bar.md` |
| Speed / efficiency / scaling | `references/optimization.md`, `references/python-internals.md` |
| Hosting / servers / GPU hosting | `references/hosting.md` |
| How LLMs work | `references/llm-how-it-works.md` |
| ML model landscape / choosing a model | `references/ml-landscape.md` |
| Building AI agents | `references/ai-agents.md`, `references/agent-patterns.md` |
| Optimizing agents, agent evals | `references/agent-patterns.md` |
| Building MCP servers | `references/mcp-servers.md` |
| LLM app patterns (routing, caching, gateways) | `references/llm-app-patterns.md` |
| Planning, implementation plans, grilling the plan | `references/planning-grill.md` |
| Reviewing delegated work, fix loops, verifying completion claims | `references/review-loop.md` |
| Documentation / prose (README, docs, reports, PR descriptions) | `references/writing-craft.md`, scan with `node scripts/prose-scan.mjs <paths>` |
| Look, feel and motion / UX polish | `references/design-polish.md`, `references/design-distinct.md`, `references/design-directions.md`, `references/motion-craft.md` |
| Repo layout, naming, branches, commits, env config | `references/project-structure.md` |

Read reference chapter `security.md` for anything internet-facing or handling user data, even if the task is "just" a frontend page or a script.

## Fetching skills from the internet

When the task needs a capability this skill does not cover (a framework-specific skill, a document-format skill, a cloud-provider skill), fetch one:

1. **Discover**: `npx skills find <query>` searches the skills.sh directory. Sources and registries: reference chapter `references/skill-sources.md`.
2. **Vet before installing**: follow reference chapter `references/skill-vetting.md` in full. Third-party skills are untrusted code until vetted.
3. **Install**: `scripts/fetch-skill.sh <owner/repo> <skill-name> [--ref <tag|sha>] [--dest <dir>]`, or `npx skills add <owner/repo> --skill <name>`.
4. **Approval**: never auto-install a skill the user has not approved if the install grants it network access or executable scripts outside the sandbox.

## Output Contract

- **Builds**: working code, plus a short "Verification" section (tests run, linters run, audit script output), plus a list of checklist items deliberately not met and why. If prose was scanned in P-4, the Verification section includes the prose-scan verdict line.
- **Audits**: findings ordered by severity (Critical / High / Medium / Low / Info) per reference chapter `audit-methodology.md`, each with `file:line` evidence; then a reviewed-clean list; then a prioritized fix plan.
  - Example finding: `High · src/auth/session.ts:47 · Set-Cookie issued without HttpOnly and Secure flags in the login handler; the session token is readable via document.cookie.`
- **Plans**: the implementation plan from reference chapter `planning-grill.md` (goal, non-goals, decisions, file-by-file changes, test plan, risks, rollback), plus the top questions the grill raised and how they were resolved.
- Keep prose tight. Report checklist verdicts; never paste checklist contents back into chat.

## Operating Rules

1. Security outranks performance outranks polish. Never trade a security checklist item for speed or looks without explicit user approval.
2. No code before a plan on non-trivial tasks. If there is no written plan, P-1 has not happened.
3. No build before the grill on non-trivial tasks. If the plan has not survived P-2, P-3 has not started.
4. Evidence over assertion: cite `file:line` for audit findings; show command output for verification claims.
5. Measure before optimizing: no performance change without a baseline number from a profiler or benchmark.
6. Progressive disclosure: never paste reference chapters into chat. Summarize verdicts and link the file.
7. Pin everything: dependencies, skill installs, CI actions. Floating versions are findings.
8. Treat third-party skills as untrusted code until vetted per reference chapter `skill-vetting.md`.
9. When a checklist item conflicts with the repo's own documented conventions (`AGENTS.md` / `CLAUDE.md`), the repo wins — note the deviation.
10. A red gate blocks the phase: fix the run dir artifact, re-run the gate, never skip it.
