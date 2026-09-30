# Project Structure — production checklist

Covers folder layouts, file/directory naming, branch naming, Conventional Commits, env config, lockfiles, and changelogs.

## Conventional folder layouts

- [ ] Layout declared or detectable: single-package (`src/`, `tests/`, `docs/`, root config) or monorepo (`apps/`, `packages/` or `libs/`); stated in README.
- [ ] Python: `src/` layout for distributed/tested packages — importable code under `src/<package>/`, not at repo root. Top-level `tests/` outside `src/`; top-level `docs/` at root.
- [ ] Monorepo: runnable apps in `apps/<name>/` (e.g. `apps/web`, `apps/api`), never mixed with shared code; shared code in `packages/<name>/` or `libs/<name>/`; apps consume them via workspace references; no app imports another app's `src/`.
- [ ] Each package self-describing: its own manifest, `README.md`, `src/` + `tests/`.
- [ ] Auxiliary dirs segregated with defined roles: `scripts/`, `tools/`, `infra/`, `examples/`, `assets/`; no `misc/`, `final/`, `tmp/`, `backup/` junk.
- [ ] Root metadata present: `README.md`, `LICENSE`, `.gitignore`, `CHANGELOG.md`; CI config at root (`.github/workflows/`); shared configs in `tooling/` or `infra/`, not duplicated per package.

## File & directory naming

- [ ] Python modules/packages: `snake_case` (no hyphens — they break imports; no `CamelCase` files).
- [ ] Markdown/config files: lowercase `kebab-case`; top-level special files stay UPPERCASE (`README.md`, `CHANGELOG.md`, `LICENSE`).
- [ ] JS/TS: one framework convention per repo (`kebab-case` or `PascalCase` for components), applied uniformly.
- [ ] No spaces, mixed separators, or numbered scratch files (`train2.py`, `final_model.py`).
- [ ] Leading underscore = private (`_helpers.py`); no cross-package imports of underscore modules.
- [ ] Build artifacts never committed: `dist/`, `build/`, `__pycache__/`, `.egg-info/`, `node_modules/`, `.venv/` all gitignored.

## Branch naming

- [ ] `type/short-slug`: `feat/add-login`, `fix/header-bug`, `hotfix/security-patch`, `chore/update-dependencies`, `release/v1.2.0` — never bare names.
- [ ] Slugs lowercase kebab-case; one branch per task; never commit directly to `main`/`master` — all work lands via PR from a typed branch.

## Commit messages (Conventional Commits)

- [ ] Format `<type>[optional scope]: <description>` — e.g. `feat(api): add user registration endpoint`.
- [ ] Only sanctioned types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- [ ] Description imperative, lowercase, no trailing period ("add" not "added"); subject ≤ ~72 chars.
- [ ] Non-trivial changes carry a body: blank line after header, explains what and why, wrapped at 72 chars; footers as git trailers (`Closes #123`).
- [ ] Breaking changes flagged: `!` after type/scope and/or `BREAKING CHANGE:` footer.
- [ ] Commits drive changelog + SemVer: `fix`→PATCH, `feat`→MINOR, `BREAKING CHANGE`→MAJOR.

## Environment config

- [ ] No secrets or `.env` committed: `.env`, `.env.local`, `*.pem`, `*.key`, `*secret*` files gitignored and absent.
- [ ] `.env.example` committed and complete: lists every required variable with placeholder values and comments — the repo's canonical env-var contract.
- [ ] Config from the environment (12-factor): DB URLs, API keys, hostnames read from env vars at runtime; never hardcoded, never in `config.prod.js`-style files.
- [ ] Open-source litmus test passes: the codebase could be made public without compromising credentials.
- [ ] Env vars granular, not grouped: no `development`/`staging`/`production` config-group files.

## Lockfiles & reproducibility

- [ ] Dependency lockfile committed (`package-lock.json`/`pnpm-lock.yaml`, `poetry.lock`/`uv.lock`, `Cargo.lock`, `go.sum`) — never gitignored.
- [ ] CI installs strictly from the lockfile (`npm ci`, `--frozen-lockfile`, `--locked`) — CI fails on lock/manifest drift; manifest and lockfile change together in the same commit.
- [ ] No unbounded version ranges (`*`, `latest`) in committed manifests; apps lean toward exact pins, libraries toward caret ranges.

## Changelogs

- [ ] `CHANGELOG.md` follows Keep a Changelog: `## [Unreleased]` at top, then `## [X.Y.Z] - YYYY-MM-DD` reverse chronological, ISO 8601 dates, categories (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`) in order; empty categories omitted.
- [ ] Human-facing, not a git log: user-visible impact described; breaking changes and yanked releases labeled (`[YANKED]`).
- [ ] Updated in the same commit as the change, under `Unreleased`.

## Sources

- https://www.conventionalcommits.org/en/v1.0.0/ · https://12factor.net/config
- https://en.wikipedia.org/wiki/Monorepo
- https://github.com/pypa/packaging.python.org (src-layout discussion)
