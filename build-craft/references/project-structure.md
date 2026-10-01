# Project Structure — repo layout & project hygiene

Covers how a repository is organized and governed: folder layouts per ecosystem, naming, monorepo rules, branching strategy, branch protection, Conventional Commits, PR discipline, env config and the secret ladder, lockfile hygiene, changelogs and release automation, READMEs, and editorconfig. How the build/dev *environment* is created is covered by `build-environments.md` — this file is about the repo itself. Checked 2026-09-30.

## Picking the layout

- [ ] Single package per repo is the default: one `src/`, one test tree, one manifest, one deployable/consumable — stay here until sharing forces otherwise.
- [ ] Move to a monorepo when: shared design system, business logic, or SDKs across ≥2 apps; frequent cross-cutting changes that should land as one atomic commit; a team of ≤ ~15–20 people sharing code daily; roughly unified releases.
- [ ] Stay polyrepo (one repo per component) when: teams are genuinely independent with independent release schedules; no meaningful shared code; hard boundaries exist — contractors, compliance regimes, or a codebase carved out for open source.
- [ ] Layout is declared in the README (and in an ADR when monorepo was a deliberate choice): which shape and which tooling; no "accidental monorepo" that grew without a decision.
- [ ] Monorepo tooling matches the need: **pnpm workspaces alone** when there is no build orchestration to run; **Turborepo** when you want task pipelines + local/remote caching for a JS/TS stack with minimal config; **Nx** when you need generators, dependency-graph visualization, and enforced module boundaries (or polyglot plugins beyond JS); **Bazel** only at very large multi-language scale.
- [ ] Monorepo: apps in `apps/<name>/` (runnable), shared code in `packages/<name>/` (consumable); apps reference packages via workspace links — no app imports another app's `src/`.
- [ ] Internal packages use the `workspace:^` (or equivalent) protocol so they can never leak as registry-published versions by accident.
- [ ] Each package self-describing: its own manifest, `README.md`, `src/` + `tests/`.
- [ ] Auxiliary dirs have defined roles: `scripts/`, `tools/`, `infra/`, `examples/`, `assets/`, `docs/`; no `misc/`, `final/`, `tmp/`, `backup/` junk; no code committed outside declared dirs.

## Python layout

- [ ] Any package that is built, published, or imported by tests from the repo root uses the **src layout**: `src/<package>/`; tests cannot shadow the installed package with a stale working tree.
- [ ] Dev installs are editable (`pip install -e .` / `uv pip install -e .`), so the test suite validates the packaged artifact, not a local directory that happens to be on `sys.path`.
- [ ] `tests/` lives at the top level and mirrors the module tree; no tests inside the shipped package unless the project already ships them.
- [ ] Flat layout (`<package>/` at root) is acceptable only for throwaway scripts, internal services deployed from source, or repos already using it — never for new libraries.
- [ ] `__init__.py` curates the public API (`__all__` kept in step); import does nothing: no connections, no env reads, no filesystem scans; heavy optional deps stay in submodules.

## Node / TypeScript layout

- [ ] Importable code under `src/` (per package in a monorepo); tests colocated (`*.test.*` / `__tests__/`) or in top-level `tests/` — one convention per repo, enforced.
- [ ] Build output (`dist/`, `build/`, `.next/`, `.turbo/`) is gitignored, never committed; the repo builds from `src/`.
- [ ] Monorepo: root holds `pnpm-workspace.yaml` (or equivalent), `turbo.json` / `nx.json`, and the single root `README.md`; each `apps/*` and `packages/*` has its own `package.json` with an explicit `name`, `README.md`, and scripts.

## Go layout

- [ ] `cmd/<binary>/main.go`: one subdirectory per binary; does flag parsing, config, DI wiring, shutdown — no business logic, ~50–100 lines.
- [ ] All application code in `internal/` (Go enforces the import boundary: external modules cannot import it); `pkg/` only for code that is deliberately a public reusable API worth maintaining.
- [ ] API contracts in `api/` (`.proto`, OpenAPI); no `src/` or `lib/` directories — those are not Go conventions.
- [ ] Packages are short, lowercase, single words (`httputil`, not `http_util`); files `snake_case.go`; tests are `foo_test.go` next to the code; flat packages over deep nesting.

## Rust / Cargo layout

- [ ] `src/lib.rs` is the library root and `src/main.rs` the default binary; extra binaries in `src/bin/*.rs` (or `src/bin/<name>/main.rs` for multi-file); target names are `kebab-case`, modules `snake_case`.
- [ ] Integration tests in `tests/` (one binary per file), benchmarks in `benches/`, runnable examples in `examples/` — all auto-discovered by Cargo; no manifest `[targets]` entries unless the path deviates from convention.
- [ ] Multi-crate workspaces (`[workspace]` with `members`) only when crates genuinely have independent CI/test concerns or are reused; otherwise a single crate. Shared dep versions in `[workspace.dependencies]`.
- [ ] `Cargo.lock` committed for binaries/applications; `Cargo.toml` sets `edition` (2024 unless a dependency forces otherwise), `license`, and `description`.

## C / C++ layout (Pitchfork)

- [ ] Public headers live in `include/<project-name>/` (never bare `include/` — prevents header collisions); private headers and sources in `src/`; directory structure mirrors namespaces (`include/foo/player.hpp` ↔ `src/foo/player.cpp`).
- [ ] `tests/` mirrors the source tree; `external/` holds vendored third-party code (never modified directly); `tools/`, `docs/`, `data/`, `extras/` for build helpers, docs, static data, examples.
- [ ] Out-of-source builds only: `build/` is gitignored and untracked, never committed alongside sources.

## Naming

- [ ] Python modules/packages `snake_case` — no hyphens (they break imports), no `CamelCase` files.
- [ ] Rust modules `snake_case`, binaries/crates `kebab-case`; Go packages lowercase single word; C/C++ files lowercase with underscores.
- [ ] JS/TS: one repo-wide convention (`kebab-case` files; `PascalCase` for React components), applied uniformly.
- [ ] Markdown/config files lowercase `kebab-case`; top-level special files stay UPPERCASE (`README.md`, `CHANGELOG.md`, `LICENSE`, `CONTRIBUTING.md`).
- [ ] No spaces, no mixed separators, no numbered scratch files (`train2.py`, `final_model.py`); leading underscore marks private (`_helpers.py` — no cross-package imports of underscore modules).
- [ ] Build artifacts never committed: `dist/`, `build/`, `__pycache__/`, `.egg-info/`, `node_modules/`, `.venv/`, `target/`, `.turbo/` are all gitignored.

## Branching strategy — trunk-based vs GitFlow

- [ ] Decision rule: **trunk-based development by default** (short-lived branches off `main`, hours to ≤2 days; `main` always deployable); pick **GitFlow** only for versioned, shipped software — mobile/desktop apps, SDKs with LTS branches, regulatory code-freeze windows, or multiple supported releases in parallel.
- [ ] The choice is written down in `CONTRIBUTING.md` so new contributors do not import a different workflow by habit.
- [ ] Branch names are `type/short-slug`: `feat/add-login`, `fix/header-bug`, `hotfix/security-patch`, `chore/update-dependencies`, `release/v1.2.0` — never bare names; one branch per task; never commit directly to `main`.
- [ ] Incomplete trunk-based work is hidden behind feature flags, not long-lived branches; flags are short-lived with an owner and a removal date (an abandoned flag is tech debt).
- [ ] `release/*` branches are cut from `main` at release time for stabilization only (version bumps, `CHANGELOG` edits, cherry-picked fixes) — never for new features; `hotfix/*` branches from `main` and merge back to both `main` and any `develop`/release line.

## Branch protection & CODEOWNERS (GitHub)

- [ ] GitHub **rulesets** are used over classic branch protection: they layer, are visible to read-access users, support bypass lists, and can be stored in the repo as code so governance changes go through review.
- [ ] `main` ruleset requires: a pull request (no direct pushes), ≥1 approval, dismiss-stale-reviews on push, required status checks by exact CI job name, branches up to date before merge, linear history or merge policy decided once, conversation resolution, no force pushes, no deletions.
- [ ] `v*` tag ruleset blocks tag moves and deletions (consumers trust tags; moving them is a supply-chain incident).
- [ ] `CODEOWNERS` lives in `.github/` on the protected branch; patterns run general→specific (**last match wins**); owners are teams (`@org/backend`), not individuals; each path has 1–2 owners; security-sensitive paths (`.github/workflows/`, `infra/`, migrations) are owned by platform/security.
- [ ] "Require review from Code Owners" is enabled in the ruleset — the file alone does not block anything.

## Commit messages (Conventional Commits)

- [ ] Format `<type>(<scope>): <description>` — e.g. `feat(api): add user registration endpoint`; in a monorepo the scope is the package/app name.
- [ ] Only sanctioned types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- [ ] Description imperative, lowercase, no trailing period ("add" not "added"); subject ≤ ~72 chars.
- [ ] Non-trivial changes carry a body (blank line after header) explaining what and why; footers as git trailers (`Refs #123`, `Fixes #123`).
- [ ] Breaking changes are flagged with `!` after the type/scope and/or a `BREAKING CHANGE:` footer that describes the migration; one breaking change per commit so SemVer bumps are correct.
- [ ] Reverts follow git's format: header `Revert "…"` with a body containing `This reverts commit <sha>`; never delete the offending commit from history.
- [ ] Commits drive changelog + SemVer: `fix`→PATCH, `feat`→MINOR, `BREAKING CHANGE`→MAJOR.
- [ ] Enforcement happens in CI on the **PR title** (a SHA-pinned check like `amannn/action-semantic-pull-request`) — local `commitlint` alone is not a gate; with squash-merge the PR title becomes the commit, so it is the thing that must validate.

## PR discipline

- [ ] PRs are ≤ ~400 lines changed; larger work is stacked PRs; small PRs get fast review — merge speed is a feature.
- [ ] A `pull_request_template.md` exists and gets filled: what, why, how it was verified, risk and rollback.
- [ ] PR links its issue; all comment threads are resolved before merge; head branches auto-delete after merge.
- [ ] One merge strategy per repo (squash, rebase, or merge commits), chosen deliberately and encoded in the ruleset's linear-history setting — mixed strategies produce unreadable history.

## Environment config & the secret ladder

- [ ] No secrets or real `.env` committed: `.env`, `.env.local`, `*.pem`, `*.key`, `*secret*` are gitignored and absent from history; secret scanning (e.g. GitGuardian / push protection) is on.
- [ ] `.env.example` is committed and complete: every required variable with placeholder values and comments — the repo's canonical env-var contract.
- [ ] Config comes from the environment (12-factor): DB URLs, API keys, hostnames are read from env vars at runtime; never hardcoded, never in `config.prod.js`-style group files; env vars stay granular, never bundled as "environments".
- [ ] The secret ladder is respected: `.env` is for local dev placeholders only; team secrets live in a secret manager (Infisical, Doppler, 1Password) injected at runtime; production/service secrets graduate to cloud secret managers or Vault/OpenBao with short-TTL dynamic secrets; CI authenticates with OIDC workload identity where possible instead of long-lived keys.
- [ ] The open-source litmus test passes: the codebase could be made public at any moment without compromising credentials.

## Lockfiles (repo hygiene slice)

- [ ] Every ecosystem's lockfile is committed (`package-lock.json`/`pnpm-lock.yaml`, `uv.lock`, `Cargo.lock`, `go.sum`, `flake.lock`) — never gitignored.
- [ ] Manifest and lockfile change together in the same commit; CI fails on drift between them.
- [ ] No unbounded version ranges (`*`, `latest`) in committed manifests; applications lean toward exact pins, libraries toward caret ranges.

## Changelogs & release automation

- [ ] `CHANGELOG.md` follows Keep a Changelog: `## [Unreleased]` at top, then `## [X.Y.Z] - YYYY-MM-DD` in reverse chronological order, ISO 8601 dates, categories (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`) in order; empty categories omitted; it is human-written and human-facing, not a git log dump.
- [ ] Yanked releases are marked `## [0.0.5] - 2014-12-13 [YANKED]`; deprecations and removals are always called out so upgrades are not surprises.
- [ ] One owner for the changelog: either hand-maintained under `Unreleased`, or fully automated with **release-please** — never both; the automated file is not hand-edited.
- [ ] release-please (Google-maintained, `googleapis/release-please-action`): config and `.release-please-manifest.json` committed; it opens/updates a Release PR from conventional commits on `main`, bumps the version, regenerates `CHANGELOG.md`, and creates the tag + GitHub Release on merge — version fields in manifests are owned by the tool.

## READMEs that actually help

- [ ] Root `README.md` answers in order: what it is and why it exists, 60-second quickstart (copy-paste commands), how to run the dev environment and tests, where docs live; every monorepo package repeats the essentials in its own `README.md`.
- [ ] README quickstart is verified from a fresh checkout — a stale or aspirational README is treated as a bug, not decoration.
- [ ] Badges are real (CI status, coverage, version) — no badge links to dead services.

## editorconfig & repo hygiene files

- [ ] `.editorconfig` at the repo root with `root = true` and a universal `[*]` block: `charset = utf-8`, `end_of_line = lf`, `insert_final_newline = true`, `trim_trailing_whitespace = true`; `[*.md]` keeps trailing whitespace (significant in Markdown); `Makefile` and friends use hard tabs; indent size set per language family.
- [ ] Line endings are coordinated with `.gitattributes` (`text=auto`, `*.sh eol=lf`) so Windows/macOS/Linux clones do not flip-flop diffs; Git `core.autocrlf` is not relied upon.
- [ ] `CONTRIBUTING.md` documents dev setup, the branching workflow, and commit conventions; `SECURITY.md` states how to report vulnerabilities; `LICENSE` is present at the root.
- [ ] If AI coding agents work in this repo, `AGENTS.md` (or equivalent) tells them how to build, test, and where new code goes — machine-readable project hygiene.
- [ ] `.github/` carries `pull_request_template.md`, issue forms, and a Dependabot or Renovate config so dependency updates arrive as reviewable PRs; generated operational files (Renovate dashboard issues, release-please manifests) are never hand-edited.
- [ ] `.gitignore` covers every ecosystem in the repo and every artifact dir; a fresh clone shows zero untracked-but-generated files after the standard build.

## Deployment parity, migrations & ops

Deploying safely is a repo-hygiene concern: the same immutable artifact ships to every environment, migrations cannot take the site down, and a failed release can be undone in minutes.

### Three-tier environment separation

- [ ] Development, Staging, and Production are strictly separated; Staging runs identical engine versions, database schemas, and feature flags as Production — anything "only tested on dev" is untested.
- [ ] The same immutable build artifact ships to every environment; config comes from the environment (see the Secret ladder section above); build, release, and run are strictly separated stages.

### Zero secrets in code

- [ ] Zero credentials, API keys, or database passwords committed to Git (enforced by the Secret ladder and Branch protection sections above); secret scanning runs on pre-commit hooks and in CI; platform push protection is enabled.

### Zero-downtime database migrations

- [ ] Schema changes are backward-compatible using the expand-and-contract pattern: add the new nullable column first → migrate the data → deploy code that reads the new column → deprecate and remove the old column. No lock-the-table `ALTER` on a live production table.
- [ ] A full database snapshot backup is verified immediately before executing migrations; a pre-written, verified rollback SQL migration is ready to run.

### Rollout strategies

- [ ] Production deploys use a progressive strategy, not big-bang: blue-green (instant switchback to the known-good environment) or canary (1% → 10% → 50% → 100% with automatic halt on error-rate/latency regression) — the choice is documented and the tooling exists before the first risky deploy.
- [ ] Database migrations always ship ahead of or alongside the code that reads them (expand-and-contract); the app version and migration version are pinned together in the release so a rollback reverts both consistently.
- [ ] Feature flags gate risky changes; flags carry an owner and a removal date — a stale flag is not a rollout strategy.

### Rollback runbook

- [ ] The runbook documents, in order: how to detect a bad deploy (which dashboard, which alert), the exact rollback command (artifact tag/pin to redeploy, or flag to flip), the database rollback path (pre-written rollback SQL from the migration step), who approves, and how to verify recovery — all rehearsed, returning the system to the previous release within 3 minutes.

### Smoke testing & post-deploy soak

- [ ] Automated or manual smoke tests run against primary routes immediately after every deployment; error rate, CPU/memory, and latency are watched for 15–30 minutes post-release before the deploy is declared healthy.
- [ ] Soak criteria are explicit: error rate within baseline ± tolerance, p95 latency within SLO, no new error signatures in telemetry, no saturation of connection pools or queues — a canary that drifts outside these bounds halts automatically.

### Centralized observability

- [ ] Error logging (Sentry, LogRocket, Datadog) is tagged with the release version so a spike can be traced to a deploy; uptime monitoring with alerting to Slack/PagerDuty is in place before the first production deploy.

## Sources

- https://12factor.net/config
- https://keepachangelog.com/en/1.1.0/
- https://dev.to/acestus/trunk-based-development-vs-git-flow-2kb5
- https://dev.to/mikhail_dorokhovich_0c532/trunk-based-development-vs-gitflow-the-principle-is-to-match-your-branches-to-your-cadence-4ihi
- https://github.com/snehitha3907/devops-kit/blob/HEAD/Git/docs/git-workflows-comparison.md
- https://www.coderabbit.ai/blog/monorepo-vs-polyrepo
- https://dev.to/libme/monorepo-or-polyrepo-for-a-three-person-startup-a-decision-framework-51nd
- https://github.com/xmlking/chakra/blob/HEAD/content/blog/monorepo-vs-polyrepo.mdx
- https://github.com/j4flmao/agent-skills/blob/HEAD/skills/devops/monorepo/SKILL.md
- https://dev.to/thedavestack/nx-vs-turborepo-integrated-ecosystem-or-high-speed-task-runner-the-key-decision-for-your-monorepo-279
- https://github.com/glapsfun/cnative-skills/blob/HEAD/plugins/gh-guru/skills/gh-guru/references/repo-management.md
- https://github.com/kingsleydaprime/knowledgebase/blob/HEAD/git/14-github-and-ci.md
- https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/
- https://github.com/anthonyposchen/agent-skills/blob/HEAD/skills/coding/references/go.md
- https://github.com/full-stack-skills/rust-skills/blob/HEAD/skills/rust-cargo-build/references/cargo-guide-workflow.md
- https://github.com/vector-of-bool/pitchfork
- https://github.com/ismaelmartinez/teams-for-linux/blob/HEAD/docs-site/docs/development/adr/023-release-automation-tooling.md
- https://github.com/laurigates/dotfiles/blob/HEAD/docs/adrs/0009-conventional-commits-release-please.md
- https://github.com/forumviriumhelsinki/.github/blob/HEAD/.claude/rules/dependency-automation.md
- https://github.com/edouardmisset/learning-curve/blob/HEAD/src/content/docs/learn/guides/project/editorconfig.mdx
- https://github.com/nullbytelabs/work/blob/HEAD/docs/secrets-management-and-injection.md
- https://github.com/hamchowderr/braynee/blob/HEAD/skills/setup/rules-templates/secrets.md
