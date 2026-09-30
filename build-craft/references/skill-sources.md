# Skill Sources — where to find skills on the internet

The agent uses these sources when it needs a capability this skill doesn't cover. Discover with `npx skills find <query>` first, then fall back to browsing the registries below.

## Directories and CLIs

| Source | URL | Notes |
|---|---|---|
| skills.sh (Vercel) | https://skills.sh | Open directory + leaderboard; `npx skills find/add/check/update`. The de-facto package manager. |
| Official skills mirror | https://officialskills.sh | Vercel's mirror of official skills. |

## Repositories and collections

| Source | URL | Notes |
|---|---|---|
| anthropics/skills | https://github.com/anthropics/skills | Anthropic's official repo: document skills (docx/pdf/pptx/xlsx), mcp-builder, frontend-design, skill-creator. Reference-quality authoring patterns. |
| VoltAgent/awesome-agent-skills | https://github.com/VoltAgent/awesome-agent-skills | Curated, 1000+ skills, official dev teams + community. |
| travisvn/awesome-claude-skills | https://github.com/travisvn/awesome-claude-skills | Curated Claude-skills list; community discovery standard. |
| ComposioHQ/awesome-claude-skills | https://github.com/ComposioHQ/awesome-claude-skills | Another curated Claude-skills list. |
| obra/superpowers | https://github.com/obra/superpowers | Composable full-SDLC skill framework (brainstorm → design → plan → TDD → review). Canonical progressive-disclosure example. |
| wshobson/agents | https://github.com/wshobson/agents | Production collection of subagents/plugins, tiered by model complexity. |
| vercel-labs/agent-skills | https://github.com/vercel-labs/agent-skills | Vercel's official collection. |
| agentskills/agentskills | https://github.com/agentskills/agentskills | The open standard's reference implementation + `skills-ref` validator CLI. |

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

- Pin every install to a tag or commit SHA. Floating branches let the payload change under you.
- Re-verify on every update: the published skill can pass review and have its runtime payload swapped later.
- Prefer official or reputable sources (anthropics/*, vercel-labs/*, obra/*) over anonymous marketplace uploads.
- Vet every third-party skill per `references/skill-vetting.md` before it runs with your permissions.

## Sources

- https://agentskills.io/specification
- https://skills.sh
- https://github.com/anthropics/skills
- https://github.com/VoltAgent/awesome-agent-skills
