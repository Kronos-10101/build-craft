---
name: "build-craft"
description: "Build production-grade software of any kind — websites, backends, Python, C, system design, databases — applying security, performance optimization, design polish, project structure, and audit checklists. Audits existing codebases with severity-graded findings. Fetches missing skills from the internet on demand."
license: "MIT"
metadata: { "version": "1.0.0" }
---

# build-craft

## Purpose

Act as a senior staff engineer for any software task: design it, build it, or audit it to production standard. Route each task to the right domain checklist, enforce security before performance before polish, and fetch a specialized skill from the internet when this skill's own checklists are not enough.

## When to use

Use when asked to build, review, improve, secure, optimize, or audit software of any kind: a website, a backend/API, a Python program, a C program, a system architecture, a database schema, or an existing repository. Also use when asked to "make it production-ready", "check everything", or "do a full review".

## Workflow

### 1. Classify the task

- **Build** (new code, new system, new feature) → continue to step 2.
- **Audit** (review existing code or repo) → read `references/audit-methodology.md` first, then run the domain checklists in the order it prescribes: security → correctness → performance → maintainability → polish.

### 2. Route to domain references

Read every reference file that applies **before** writing code. Do not rely on memory for the checklists — open the file.

| Task | Read |
|---|---|
| Website / frontend UI | `references/web-frontend.md`, `references/design-polish.md`, `references/design-distinct.md` |
| Backend / REST API | `references/backend-api.md`, `references/system-design.md` |
| Python code | `references/python.md` |
| C code | `references/c-language.md` |
| JavaScript / TypeScript code | `references/javascript-typescript.md` |
| React / Next.js app | `references/react-nextjs.md`, `references/javascript-typescript.md` |
| Choosing libraries / tools / stack | `references/libraries.md` |
| System architecture | `references/system-design.md` |
| Database schema / queries / migrations | `references/databases.md` |
| Choosing a database platform (Postgres, Supabase, Neon…) | `references/managed-data-platforms.md` |
| Security review / hardening | `references/security.md` |
| Speed / efficiency / scaling | `references/optimization.md` |
| Look and feel / UX polish | `references/design-polish.md`, `references/design-distinct.md` |
| Repo layout, naming, branches, commits, env config | `references/project-structure.md` |

Read `references/security.md` for anything internet-facing or handling user data, even if the task is "just" a frontend page or a script.

### 3. Scaffold first

Set up the project structure per `references/project-structure.md` (src layout, `tests/`, `docs/`, `.env.example`, lockfile, CI) **before** writing feature code. Starter templates live in `assets/templates/` — copy and adapt them.

### 4. Build to the checklist

Write the code, then self-review against each routed checklist. Fix every violated item, or record it as accepted risk with a one-line reason.

### 5. Run the automated audit

Execute `scripts/audit-repo.sh <repo-path>`. It runs whichever linters and scanners are installed and greps for the highest-risk patterns. Treat its output as findings, not noise.

### 6. Report

Follow the Output Contract below.

## Fetching skills from the internet

When the task needs a capability this skill does not cover (a framework-specific skill, a document-format skill, a cloud-provider skill, etc.), the agent fetches it itself:

1. **Discover** — `npx skills find <query>` searches the skills.sh directory; the registries in `references/skill-sources.md` list the major sources (Anthropic's official repo, awesome lists, community collections).
2. **Vet before installing** — follow `references/skill-vetting.md`: read every file, confirm the description matches actual behavior, grep for network access / exec / credential reads, and pin to a tag or commit SHA. Third-party skills are untrusted code until vetted.
3. **Install** — `scripts/fetch-skill.sh <owner/repo> <skill-name> [--ref <tag|sha>] [--dest <dir>]`, or `npx skills add <owner/repo> --skill <name>`.
4. **Approval** — never auto-install a skill the user has not approved if the install grants it network access or executable scripts outside the sandbox.

## Output Contract

- **Builds**: working code, plus a short "Verification" section (tests run, linters run, audit script output), plus a list of checklist items deliberately not met and why.
- **Audits**: findings ordered by severity (Critical / High / Medium / Low / Info) per `references/audit-methodology.md`, each with `file:line` evidence; then a reviewed-clean list; then a prioritized fix plan.
- Keep prose tight. Report checklist verdicts; never paste checklist contents back into chat.

## Operating Rules

1. Security outranks performance outranks polish. Never trade a security checklist item for speed or looks without explicit user approval.
2. Evidence over assertion: cite `file:line` for audit findings; show command output for verification claims.
3. Measure before optimizing: no performance change without a baseline number from a profiler or benchmark.
4. Progressive disclosure: never paste reference files into chat. Summarize verdicts and link the file.
5. Pin everything: dependencies, skill installs, CI actions. Floating versions are findings.
6. Treat third-party skills as untrusted code until vetted per `references/skill-vetting.md`.
7. When a checklist item conflicts with the repo's own documented conventions (`AGENTS.md` / `CLAUDE.md`), the repo wins — note the deviation.
