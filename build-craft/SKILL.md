---
name: "build-craft"
description: "Build production-grade software of any kind — websites, backends, Python, C/C++, JS/TS, system design, databases — plus AI/ML: how LLMs work, agents, MCP servers, vector DBs. Plans the work, grills the plan with hard questions until it is tight, then builds. Applies security (incl. attacker perspective), testing, performance, design polish, and audit checklists. Audits codebases with severity-graded findings. Fetches missing skills from the internet on demand."
license: "MIT"
metadata: { "version": "1.1.0" }
---

# build-craft

## Purpose

Act as a senior staff engineer for any software task: plan it, grill the plan until it survives questioning, then design it, build it, or audit it to production standard. Route each task to the right domain checklist, enforce security before performance before polish, and fetch a specialized skill from the internet when this skill's own checklists are not enough.

## When to use

Use when asked to build, review, improve, secure, optimize, or audit software of any kind: a website, a backend/API, a Python program, a C/C++ program, a system architecture, a database schema, an AI agent, an MCP server, or an existing repository. Also use when asked to "make it production-ready", "check everything", or "do a full review". Use the Grill Me protocol (P-2 below) whenever the task is non-trivial — anything you cannot finish correctly in one shot.

## How to use this skill (reading order)

Never improvise the process. Follow this exact order:

1. **Read this file (`SKILL.md`) fully** — it defines the workflow.
2. **Classify the task** (P-0): build vs audit vs plan-only.
3. **Plan** (P-1): break the work down and write an implementation plan using `references/planning-grill.md`.
4. **Grill the plan** (P-2): interrogate it with the question bank in `references/planning-grill.md` until it survives. Present the plan to the user for approval on large or irreversible work.
5. **Read the routed domain references** — every file the routing table lists for the task, **before** writing code. Do not rely on memory for the checklists — open the file.
6. **Copy starter templates** from `assets/templates/` and adapt them (scaffold first).
7. **Build** to the checklists (P-3).
8. **Verify** (P-4): self-review against the checklists, run tests, run `scripts/audit-repo.sh`.
9. **Report** per the Output Contract (P-5).

Skipping steps 3–4 is how production incidents are born. The order is load-bearing: plan → grill → read checklists → scaffold → build → verify → report.

## Workflow

### P-0. Triage and classify

- **Build** (new code, new system, new feature) → full pipeline P-1 through P-5.
- **Audit** (review existing code or repo) → read `references/audit-methodology.md` first, then run the domain checklists in the order it prescribes: security → correctness → performance → maintainability → polish. Audits still get a mini plan (scope + checklist order) and a light grill (what could this audit miss?).
- **Plan-only** (user wants a design, not code) → run P-1 and P-2, deliver the implementation plan as the output.

### P-1. Plan: break down and allocate the work

Do not start coding from a paragraph of requirements. Produce a written plan first:

1. **Restate the goal in one sentence**, plus explicit non-goals (what you will NOT do).
2. **Decompose** into tasks small enough that each one has a clear done-condition. A task is well-sized when you can name its inputs, its outputs, and how you will verify it.
3. **Order the tasks**: dependencies first, riskiest unknowns earliest (spike or prototype the scary part before committing to the design), scaffolding before features, features before polish.
4. **Allocate**: mark what can run in parallel (independent tasks, delegatable research) vs what must be sequential. If delegating to subagents, each gets one task with its own done-condition — never "help with the project".
5. **Write the implementation plan** using the template in `references/planning-grill.md`: goal, non-goals, design decisions, file-by-file changes, test plan, risks, rollback.

### P-2. Grill me: interrogate the plan until it survives

This is the step that makes plans robust. You are both the planner and the hostile reviewer. Attack the plan with questions **derived from the plan itself** — every design decision, every assumption, every blank spot is a target. The full question bank lives in `references/planning-grill.md`; the protocol:

1. **Present the plan** (or hold it in context for small tasks).
2. **Ask sharp, specific questions** — at most 5 per round, each one tied to a concrete part of the plan. "What if X?" beats "Are you sure?". Target: goals vs non-goals, hidden assumptions, edge cases, failure modes, data shape, interfaces, security, scale, operations, and how success will be measured.
3. **Answer them honestly.** If you cannot answer, the plan has a hole: research it, decide it, or mark it as an explicit open question with an owner.
4. **Update the plan** with every answer that changes a decision.
5. **Repeat** until a full round of grilling changes nothing. That is the stop condition — diminishing returns, not exhaustion.
6. **For large or irreversible work** (schema migrations, deletions, public releases, money movement): present the grilled plan to the user and get explicit approval before P-3. For small reversible work, the self-grill is enough — say so in one line and proceed.

Grilling is not stalling. Two tight rounds beat ten vague ones. If the user says "grill me", run this protocol against them directly: ask the questions, take their answers, sharpen the plan.

### P-3. Implement

1. **Scaffold first**: set up the project structure per `references/project-structure.md` (src layout, `tests/`, `docs/`, `.env.example`, lockfile, CI) **before** writing feature code. Copy and adapt starter templates from `assets/templates/`.
2. **Build to the checklist**: write the code, then self-review against each routed checklist. Fix every violated item, or record it as accepted risk with a one-line reason.

### P-4. Verify

- Run the test suite (new tests per the plan's test section, plus existing).
- Run the linters/typecheckers the checklists demand.
- Execute `scripts/audit-repo.sh <repo-path>` and treat its output as findings, not noise.

### P-5. Report

Follow the Output Contract below.

## Domain routing

Read every reference file that applies **before** writing code.

| Task | Read |
|---|---|
| Website / frontend UI | `references/web-frontend.md`, `references/design-polish.md`, `references/design-distinct.md` |
| Backend / REST API | `references/backend-api.md`, `references/system-design.md` |
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
| Testing strategy / test types | `references/testing.md` |
| Speed / efficiency / scaling | `references/optimization.md`, `references/python-internals.md` |
| Hosting / servers / GPU hosting | `references/hosting.md` |
| How LLMs work | `references/llm-how-it-works.md` |
| ML model landscape / choosing a model | `references/ml-landscape.md` |
| Building AI agents | `references/ai-agents.md`, `references/agent-patterns.md` |
| Optimizing agents, agent evals | `references/agent-patterns.md` |
| Building MCP servers | `references/mcp-servers.md` |
| LLM app patterns (routing, caching, gateways) | `references/llm-app-patterns.md` |
| Planning, implementation plans, grilling the plan | `references/planning-grill.md` |
| Look and feel / UX polish | `references/design-polish.md`, `references/design-distinct.md` |
| Repo layout, naming, branches, commits, env config | `references/project-structure.md` |

Read `references/security.md` for anything internet-facing or handling user data, even if the task is "just" a frontend page or a script.

## Fetching skills from the internet

When the task needs a capability this skill does not cover (a framework-specific skill, a document-format skill, a cloud-provider skill, etc.), the agent fetches it itself:

1. **Discover** — `npx skills find <query>` searches the skills.sh directory; the registries in `references/skill-sources.md` list the major sources (Anthropic's official repo, awesome lists, community collections).
2. **Vet before installing** — follow `references/skill-vetting.md`: read every file, confirm the description matches actual behavior, grep for network access / exec / credential reads, and pin to a tag or commit SHA. Third-party skills are untrusted code until vetted.
3. **Install** — `scripts/fetch-skill.sh <owner/repo> <skill-name> [--ref <tag|sha>] [--dest <dir>]`, or `npx skills add <owner/repo> --skill <name>`.
4. **Approval** — never auto-install a skill the user has not approved if the install grants it network access or executable scripts outside the sandbox.

## Output Contract

- **Builds**: working code, plus a short "Verification" section (tests run, linters run, audit script output), plus a list of checklist items deliberately not met and why.
- **Audits**: findings ordered by severity (Critical / High / Medium / Low / Info) per `references/audit-methodology.md`, each with `file:line` evidence; then a reviewed-clean list; then a prioritized fix plan.
- **Plans**: the implementation plan from `references/planning-grill.md` (goal, non-goals, decisions, file-by-file changes, test plan, risks, rollback), plus the top questions the grill raised and how they were resolved.
- Keep prose tight. Report checklist verdicts; never paste checklist contents back into chat.

## Operating Rules

1. Security outranks performance outranks polish. Never trade a security checklist item for speed or looks without explicit user approval.
2. No code before a plan on non-trivial tasks. If there is no written plan, P-1 has not happened.
3. No build before the grill on non-trivial tasks. If the plan has not survived P-2, P-3 has not started.
4. Evidence over assertion: cite `file:line` for audit findings; show command output for verification claims.
5. Measure before optimizing: no performance change without a baseline number from a profiler or benchmark.
6. Progressive disclosure: never paste reference files into chat. Summarize verdicts and link the file.
7. Pin everything: dependencies, skill installs, CI actions. Floating versions are findings.
8. Treat third-party skills as untrusted code until vetted per `references/skill-vetting.md`.
9. When a checklist item conflicts with the repo's own documented conventions (`AGENTS.md` / `CLAUDE.md`), the repo wins — note the deviation.
