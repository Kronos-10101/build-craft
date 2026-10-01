# Skill Sources — where to find skills on the internet

The agent uses these sources when it needs a capability this skill doesn't cover. Discover with `npx skills find <query>` first, then fall back to browsing the registries below. Every URL below was verified to resolve on 2026-09-30.

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
| VoltAgent/awesome-agent-skills | https://github.com/VoltAgent/awesome-agent-skills | Curated, 1000+ skills, official dev teams + community; backs the officialskills.sh index. |
| travisvn/awesome-claude-skills | https://github.com/travisvn/awesome-claude-skills | Curated Claude-skills list; community discovery standard. |
| ComposioHQ/awesome-claude-skills | https://github.com/ComposioHQ/awesome-claude-skills | Another curated Claude-skills list. |
| obra/superpowers | https://github.com/obra/superpowers | Composable full-SDLC skill framework (brainstorm → design → plan → TDD → review). Canonical progressive-disclosure example. |
| wshobson/agents | https://github.com/wshobson/agents | Production collection of subagents/plugins, tiered by model complexity. |
| vercel-labs/agent-skills | https://github.com/vercel-labs/agent-skills | Vercel's official collection. |
| agentskills/agentskills | https://github.com/agentskills/agentskills | The open standard's reference implementation + `skills-ref` validator CLI. |

## Where installed skills live (per agent)

Different agents look for skills in different directories — install to the one your agent actually reads:

- [ ] Claude Code → `.claude/skills/` (project) or `~/.claude/skills/` (global).
- [ ] Codex → `.codex/skills/`; Antigravity → `.antigravity/skills/`; Gemini CLI → `.gemini/skills/`; Cursor → `.cursor/skills/`; Windsurf → `.windsurf/skills/`.
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
- https://github.com/VoltAgent/awesome-agent-skills
