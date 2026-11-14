# Skill Sources — where to find skills on the internet

The agent uses these sources when it needs a capability this skill doesn't cover. Discover with `npx skills find <query>` first, then fall back to browsing the registries below. Every URL below was verified to resolve on 2026-09-30. Checked 2026-09-30.

## Index local skills before searching the internet

- [ ] Before `npx skills find`, index the local skills directory before hitting the network: scan the skills directories in the per-agent table below, plus `~/.agents/skills` when it exists — a local skill that already covers the need beats a network install on speed, supply-chain risk, and reproducibility.
- [ ] Build the index once per agent: record each `SKILL.md`'s `name`, `description`, and declared tools/scripts, search that index first for every capability request, and refresh it after every install or update.
- [ ] Do not state a pre-installed local skill count as fact — count it before citing it. Verified 2026-10-01: `~/.agents/skills` does not exist on this machine; index what you can actually list.
- [ ] Prefer an installed-and-vetted local skill over a fresh download; when no local skill fits, fall back to the registries below and vet per `references/skill-vetting.md`.

## Directories and CLIs

| Source | URL | Notes |
|---|---|---|
| skills.sh (Vercel) | https://skills.sh | Open directory + leaderboard (1.5M+ all-time installs as of Sep 2026); `npx skills find/add/check/update`. The de-facto package manager. Skill pages live at `skills.sh/{owner}/{repo}/{skill}`. |
| Official skills mirror | https://officialskills.sh | Browse-only index of official vendor-published skills (Anthropic, OpenAI, Microsoft, Google, Cloudflare, Netlify…). Links out to each skill's original GitHub repo — install from the original source, never from the index itself. |
| Agent Skills spec | https://agentskills.io | The open standard: format spec, progressive disclosure model (discover → activate → execute), client showcase. |

skills.sh runs a public security-audit API on indexed skills with partner results from Gen Agent Trust Hub, Socket, and Snyk (observed 2026-09-09). A PASS there is a useful signal, not a substitute for vetting — check the audit badge before installing, then still vet per `references/skill-vetting.md`.

CLI facts (checked 2026-09-30): current `skills` CLI is 1.5.25 and requires Node >= 22.20.0. Docs live at `https://www.skills.sh/docs` (CLI: `/docs/cli`, API: `/docs/api`).

## Repositories and collections

| Source | URL | Notes |
|---|---|---|
| anthropics/skills | https://github.com/anthropics/skills | Anthropic's official repo: document skills (docx/pdf/pptx/xlsx), mcp-builder, frontend-design, skill-creator. Reference-quality authoring patterns. |
| google/skills | https://github.com/google/skills | Google's official catalog (Apache-2.0, ~198 skills), overwhelmingly Google Cloud product skills. Machine-readable index at `https://raw.githubusercontent.com/google/skills/main/index.json`; its `finding-google-skills` skill routes over that index on demand. |
| K-Dense-AI/scientific-agent-skills | https://github.com/K-Dense-AI/scientific-agent-skills | MIT, 177 skills. The catalog to reach for on scientific and data-analysis work (statistics, exploratory data analysis, experiment design, domain libraries) that build-craft deliberately does not carry. |
| VoltAgent/awesome-agent-skills | https://github.com/VoltAgent/awesome-agent-skills | Build-craft's publisher map: a curated index of ~1,250 skills organized by official publisher (about 70 vendors) plus community sections. Use it to locate the vendor-published skill for a stack, then install from the publisher's own repo and vet per `references/skill-vetting.md`. Its entries link out to officialskills.sh pages: officialskills.sh is the index, and this list is a curated front-end to it. Curated, not audited, as its own Security Notice states; entries can change after listing. |
| travisvn/awesome-claude-skills | https://github.com/travisvn/awesome-claude-skills | Curated Claude-skills list; community discovery standard. |
| ComposioHQ/awesome-claude-skills | https://github.com/ComposioHQ/awesome-claude-skills | Another curated Claude-skills list. |
| obra/superpowers | https://github.com/obra/superpowers | Composable full-SDLC skill framework (brainstorm → design → plan → TDD → review). Canonical progressive-disclosure example. |
| wshobson/agents | https://github.com/wshobson/agents | Production collection of subagents/plugins, tiered by model complexity. |
| vercel-labs/agent-skills | https://github.com/vercel-labs/agent-skills | Vercel's official collection. |
| agentskills/agentskills | https://github.com/agentskills/agentskills | The open standard's reference implementation + `skills-ref` validator CLI. |

## Publisher sources

Found through the publisher map above. Where the map links only to officialskills.sh, the route below is a verified skill page on that index; install from the publisher's own repo where one is given, and vet every entry per `references/skill-vetting.md`.

| Source | URL | Notes |
|---|---|---|
| Trail of Bits (security skills) | https://officialskills.sh/trailofbits/skills/audit-context-building | 21 skills, routed via `officialskills.sh/trailofbits/skills/`: audits, fuzzing, and code review. The standout security publisher in the map. |
| Microsoft (official skills) | https://officialskills.sh/microsoft/skills/cloud-solution-architect | 133 skills, routed via `officialskills.sh/microsoft/skills/`: Azure, the Copilot SDK, and an MCP builder among them. |
| LambdaTest/agent-skills | https://github.com/LambdaTest/agent-skills | 49 skills; the largest testing-focused collection in the map. |
| Cypress (cypress-io/ai-toolkit) | https://github.com/cypress-io/ai-toolkit | Cypress's official toolkit for E2E testing: authoring, explaining, and documentation skills. |
| Supabase | https://officialskills.sh/supabase/skills/postgres-best-practices | Data-vendor official skill, routed via officialskills.sh: `postgres-best-practices` for PostgreSQL on Supabase. |
| Neon | https://officialskills.sh/neondatabase/skills/neon-postgres | Data-vendor official skills, routed via `officialskills.sh/neondatabase/skills/`: serverless Postgres use and egress tuning. |
| ClickHouse | https://officialskills.sh/clickhouse/skills/clickhouse-best-practices | Data-vendor official skills, routed via `officialskills.sh/clickhouse/skills/`: best practices, chDB, and architecture advice. |
| DuckDB | https://officialskills.sh/duckdb/skills/query | Data-vendor official skills, routed via `officialskills.sh/duckdb/skills/`: querying, file reading, and documentation search. |
| MongoDB | https://officialskills.sh/mongodb/skills/mongodb-connection | Data-vendor official skills, routed via `officialskills.sh/mongodb/skills/`: connection, schema design, and query tuning. |
| Redis (redis/agent-skills) | https://github.com/redis/agent-skills | Data-vendor official skills from Redis, including data structures, search, and caching practice. |
| Qdrant (qdrant/skills) | https://github.com/qdrant/skills | Vector-database vendor skills: scaling, search quality, deployment, and SDK use. |
| Milvus (zilliztech/milvus-skill) | https://github.com/zilliztech/milvus-skill | Vector-database vendor skill from Zilliz: collections, indexes, vector search, and RAG workflows. |
| Auth0 | https://officialskills.sh/auth0/skills/auth0-android | 14 auth-vendor skills, routed via `officialskills.sh/auth0/skills/`: SDK integration, MFA, and migration. |
| Better Auth | https://officialskills.sh/better-auth/skills/best-practices | 7 auth-vendor skills, routed via `officialskills.sh/better-auth/skills/`: setup, providers, and error handling. |
| Cloudflare (cloudflare/security-audit-skill) | https://github.com/cloudflare/security-audit-skill | Cloudflare's security-audit skill: multi-phase audits with machine-readable findings. |
| Angular (angular/skills) | https://github.com/angular/skills | The Angular team's official skills for building and scaffolding Angular apps. |
| NVIDIA (NVIDIA/skills) | https://github.com/NVIDIA/skills | NVIDIA's official catalog for its AI and accelerated-computing platforms; the vendor reorganizes it often, so browse the source rather than a snapshot. |
| NeoLabHQ/context-engineering-kit | https://github.com/NeoLabHQ/context-engineering-kit | A context-engineering collection: context design and documentation-writing skills. |
| muratcankoylan/Agent-Skills-for-Context-Engineering | https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering | A context-engineering collection: context fundamentals, degradation, compression, and optimization. |

## Where installed skills live (per agent)

Different agents look for skills in different directories — install to the one your agent actually reads:

- [ ] Claude Code → `.claude/skills/` (project) or `~/.claude/skills/` (global).
- [ ] Codex → `.agents/skills/` (project) or `~/.agents/skills/` (global); Antigravity → `.agents/skills/` (project) or `~/.gemini/config/skills/` (global).
- [ ] GitHub Copilot → `.github/skills/` (project) or `~/.copilot/skills/` (global); OpenCode → `.opencode/skills/` (project) or `~/.config/opencode/skills/` (global).
- [ ] Gemini CLI → `.gemini/skills/`; Cursor → `.cursor/skills/`; Windsurf → `.windsurf/skills/`.
- [ ] You confirmed the target directory exists and is the one the running agent reads before installing — a skill installed to the wrong path silently never loads.

## Install methods

```bash
# Search the directory
npx skills find <query>

# Install from any GitHub repo (whole repo, or one skill)
npx skills add <owner/repo>
npx skills add <owner/repo> --skill <skill-name>

# Pin a version for reproducibility — never a floating branch
npx skills add <owner/repo>@<tag|commit-sha>

# Global install (~/.claude/skills/)
npx skills add -g <owner/repo>

# Check for updates / apply updates
npx skills check
npx skills update
```

Manual methods (when the CLI doesn't fit):

```bash
# Sparse git clone of one skill directory
git clone --filter=blob:none --sparse https://github.com/<owner>/<repo>
cd <repo> && git sparse-checkout set <path-to-skill>
cp -r <path-to-skill> ~/.claude/skills/

# Whole-repo tarball, no git needed
curl -L https://codeload.github.com/<owner>/<repo>/tar.gz/<tag-or-sha> -o repo.tar.gz

# Single file (e.g. read a SKILL.md before deciding)
curl -L https://raw.githubusercontent.com/<owner>/<repo>/<ref>/skills/<name>/SKILL.md
```

Claude Code plugin route: `/plugin marketplace add <owner/repo>`, then `/plugin install <skill>@<marketplace>`.

This skill's own helper wraps the safe path:

```bash
scripts/fetch-skill.sh <owner/repo> <skill-name> [--ref <tag|sha>] [--dest <dir>]
```

It downloads, verifies the SKILL.md frontmatter, scans for red-flag patterns, and only then installs.

## Rules

- [ ] Pin every install to a tag or commit SHA. Floating branches let the payload change under you.
- [ ] Re-verify on every update: the published skill can pass review and have its runtime payload swapped later.
- [ ] Prefer official or reputable sources (anthropics/*, vercel-labs/*, obra/*) over anonymous marketplace uploads.
- [ ] Check skills.sh's audit badge (Gen Agent Trust Hub / Socket / Snyk) as a first signal — then vet every third-party skill per `references/skill-vetting.md` before it runs with your permissions.
- [ ] Install project-local (not global) when the skill is single-project; global installs widen every future session's attack surface.

## Sources

- https://skills.sh
- https://officialskills.sh
- https://agentskills.io
- https://github.com/fairy123456789/human-edge-agent-skills/blob/HEAD/docs/SKILLS_SH_STATUS.md
- https://github.com/aradotso/ai-agent-skills/blob/HEAD/skills/awesome-agent-skills/SKILL.md
- https://github.com/ahmed-zhran/ocx-profiles/blob/HEAD/files/profiles/z-ws/skills/z-skill/SKILL.md
