# build-craft

A production-grade **Agent Skill** (open standard: [agentskills.io](https://agentskills.io/specification)) that turns an AI agent into a senior staff engineer: it can **design, build, and audit** software of any kind to production standard — and **fetch missing skills from the internet** on its own when a task needs a capability it doesn't have.

## What's inside

The skill lives in [`build-craft/`](build-craft/) and follows the spec layout (`SKILL.md` + `scripts/` + `references/` + `assets/`).

**`SKILL.md`** — the router: classifies the task (build vs audit), routes to the right domain checklist, defines the fetch protocol and the output contract.

**Domain checklists** (`references/`) — every item is a concrete, auditable pass/fail rule, sourced from official docs (PEPs, W3C/WCAG, OWASP, NIST, IETF RFCs, 12-factor, SEI CERT C):

| File | Covers |
|---|---|
| `python.md` | Style, typing (mypy strict), errors, logging, pytest, packaging, security, performance |
| `c-language.md` | `-Wall -Wextra -Werror`, sanitizers, clang-tidy/cppcheck, CERT C memory safety, CMake, toolchain hardening flags |
| `javascript-typescript.md` | Strict tsconfig, zero-`any` discipline, ESLint flat config, zod at boundaries, vitest, supply chain |
| `react-nextjs.md` | Next.js 16 + React 19: server-first components, data fetching, routing, Server Actions, images/fonts, auth, bundle discipline |
| `libraries.md` | Best library picks in detail — Python, JS/TS, React ecosystem, C/C++, CSS, databases, auth/security, observability, infra — plus default stack picks |
| `web-frontend.md` | Semantic HTML, WCAG 2.2 AA, Core Web Vitals, responsive, SEO, assets, no-JS fallbacks |
| `backend-api.md` | REST conventions, validation, OAuth2/JWT, rate limiting, pagination, idempotency, logging, health checks, 12-factor |
| `system-design.md` | Scalability, CAP trade-offs, load balancing, monolith vs microservices, resilience, observability |
| `databases.md` | Normalization, indexing, migrations (expand/contract), backups/PITR, pooling, N+1, isolation levels |
| `managed-data-platforms.md` | Neon vs Supabase vs PlanetScale vs self-hosted: how to choose, pooling rules, branching, PITR, connection strings, cost heuristics |
| `security.md` | OWASP Top 10:2025, auth (Argon2id/NIST 800-63B), secrets, supply chain/SBOM, TLS, security headers, least privilege |
| `optimization.md` | Profile-first discipline, Big-O review, caching strategy, query optimization, frontend budgets, load testing, measurable targets |
| `design-polish.md` | Typography, 8pt spacing, color/contrast, hierarchy, micro-interactions, empty/error/loading states, design tokens |
| `design-distinct.md` | How to NOT look vibe-coded: the tells of generic AI sites and the concrete antidotes |
| `project-structure.md` | Folder layouts, naming, branches, Conventional Commits, `.env` handling, lockfiles, changelogs |
| `audit-methodology.md` | Scoping, order of operations (security → correctness → performance → maintainability → polish), severity levels, report format |
| `skill-sources.md` | Where to find skills: skills.sh, anthropics/skills, awesome lists, install methods |
| `skill-vetting.md` | Security checklist before trusting a third-party skill (prompt-injection aware) |

**Scripts** (`scripts/`) — `fetch-skill.sh` (download + verify + red-flag-scan a skill from GitHub, pinned to a commit SHA), `audit-repo.sh` (run installed linters/scanners + high-signal greps), `check-skill.sh` (validate any `SKILL.md` against the spec).

**Templates** (`assets/templates/`) — `pyproject.toml` (ruff + mypy strict + pytest-cov), `.clang-format`, `.gitignore`, `.env.example`.

## Install

```bash
# via skills.sh
npx skills add veldore-aegon/build-craft --skill build-craft

# or manual
git clone https://github.com/veldore-aegon/build-craft
cp -r build-craft/build-craft ~/.claude/skills/
```

Validate with the spec checker:

```bash
python3 build-craft/scripts/check-skill.sh build-craft/SKILL.md
```

## The self-fetching bit

The skill teaches the agent to fetch skills itself: discover via `npx skills find <query>` or the registries in `references/skill-sources.md`, vet per `references/skill-vetting.md` (read everything, map data flows, pin to SHA — third-party skills are untrusted code), then install with `scripts/fetch-skill.sh`.

## License

MIT — see [LICENSE](LICENSE).
