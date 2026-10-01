# Build & Dev Environments — how the environment is defined and reproduced

Scope: how the *environment* (containers, dev shells, tool versions, builds, CI) is declared, reproduced, and verified — repo layout, `.env` conventions, and lockfile bookkeeping live in `project-structure.md` and are not repeated here. Version-sensitive claims checked 2026-09-30.

## Docker: multi-stage, pinned, minimal

- [ ] `Dockerfile` is multi-stage with named targets (`deps`, `build`, `test`, `runtime`); build tools (compilers, package managers) exist only in earlier stages, never in the final image.
- [ ] Every `FROM` is pinned by digest (`image@sha256:…`); the tag appears only as a human-readable comment — a mutable tag is treated the same as `:latest`.
- [ ] Final stage runs as a non-root `USER` on a slim/distroless base; the image's PID 1 handles signals (exec-form `ENTRYPOINT`/`CMD`, or `tini` when a shell is needed).
- [ ] BuildKit is on (default in modern Docker; `# syntax=docker/dockerfile:1` at the top for mounts, heredocs, `COPY --link`); builds run through `docker buildx build`.
- [ ] Package-manager caches use `RUN --mount=type=cache` (npm, pip, cargo, apt — each scoped with its own `id=`, and by `${TARGETARCH}` for multi-arch builds), never a layer that bakes the cache into the image.
- [ ] Layer discipline: copy manifests and install deps before copying source, so source edits don't reinstall deps; `apt-get update` and `apt-get install` share one `RUN` so the package index can't go stale across layers.
- [ ] `.dockerignore` excludes `.git`, `.env*`, `node_modules`, `.venv`, `dist/`, and any credentials; a stale `.dockerignore` (context containing secrets) fails review.
- [ ] Long-lived services declare a `HEALTHCHECK` (or document that the orchestrator owns probing, when the image is distroless and has no shell/curl).
- [ ] CI builds export the build cache (`--cache-to type=registry,ref=…,mode=max` with a per-branch cache ref) so multi-stage intermediate layers are actually cached between runs.

## Secrets never in layers

- [ ] No secret appears in any layer: no `ENV API_KEY=`, no `COPY .env`, no `ARG` consumed by `RUN echo`; secrets reach builds only via `RUN --mount=type=secret,id=…` (with `--secret` passed at build time).
- [ ] The same build succeeds with dummy secrets, proving no build step leaks real credentials into cache layers.
- [ ] Runtime secrets are injected at run/deploy time (secret manager, env file mounted by the orchestrator), never baked into the image.

## Devcontainers

- [ ] **What:** the dev environment declared in `.devcontainer/devcontainer.json` (or `devcontainer.json` + compose) — one-click identical tooling in VS Code, JetBrains, Codespaces, or via the `devcontainer` CLI.
- [ ] Pick over raw Dockerfiles when the team wants editor-integrated onboarding; pick over Nix when the team won't learn the Nix language; pick over devbox/Flox when editor extensions and GUI tooling must be provisioned declaratively.
- [ ] Base `image` pinned by digest; devcontainer *features* pinned to immutable OCI tags (`ghcr.io/devcontainers/features/node:1` style refs are treated as mutable until digested).
- [ ] `postCreateCommand` installs project deps from the lockfile (not ad-hoc shell one-liners); dev-only services (DB, cache) live in a `docker-compose.yml` beside it, reachable by service name.
- [ ] Trade-off accepted explicitly: container spin-up time and macOS bind-mount overhead vs. Nix's native speed — measured, not assumed, before choosing.

## Nix, devbox, Flox, devenv: pick with intent

- [ ] **Nix flakes** (`flake.nix` + committed `flake.lock`): pick when you need bit-reproducible toolchains *and* system deps (compilers, CUDA, GDAL) pinned with the interpreter, native-speed shells (<100ms entry), and any-editor support; accept the Nix-language learning curve and macOS/Linux-only reality.
- [ ] **devbox** (Nix under the hood, `devbox.json`): pick as the low-friction default for standard nixpkgs packages — same packages, no Nix language; record one line *why* if you graduate to a pure flake (custom derivation, overlay, input override).
- [ ] **Flox**: pick when environments must be shared/pushed/pulled like artifacts across a team or org, or when dev shells must match CI/operator runtimes from one manifest (incl. `flox containerize` for images).
- [ ] **devenv**: pick when the shell must also run background services declaratively (`services.postgres.enable = true`).
- [ ] Binary caches configured (Cachix/Garnix) so nobody compiles nixpkgs from source; `nix develop` (or the wrapper's equivalent) is the one documented entry point.
- [ ] When wrapping Nix, pair it with direnv (below) so the env activates on `cd`; the wrapper's lockfile (`devbox.lock` etc.) is committed like any other lock.

## Python: uv is the 2026 default

- [ ] **New projects use uv**: `pyproject.toml` + `uv.lock` (committed, cross-platform, hash-bearing) + `uv sync` to reproduce; the project workflow (`uv init` / `uv add` / `uv sync` / `uv run`), not pip commands, is documented.
- [ ] Interpreter version is pinned by uv itself (`.python-version` or the `requires-python` field), not by hope; one-off tools run via `uvx` (known tools only — arbitrary package names are a supply-chain risk).
- [ ] CI uses `astral-sh/setup-uv` (pinned to a commit SHA, checked 2026-09-30) with `uv sync --locked` so lockfile drift fails the build; production deploys add `--no-dev`.
- [ ] **venv + pip** is legacy-only: acceptable for teaching or the most minimal workflow, never with hand-rolled `pip freeze` snapshots as the source of truth.
- [ ] **conda/mamba** only for scientific stacks with heavy native deps (GIS, bioinformatics, GPU toolkits) that pip wheels don't cover; use **mamba** (fast solver), never bare conda for new envs.
- [ ] One env manager per project, never mixed: no `pip install` inside a uv-managed project, no conda env + `pip install` without `--no-deps` discipline, no `poetry.lock` and `uv.lock` coexisting.

## Version managers: mise for polyglot, single-language as fallback

- [ ] **mise** (Rust, `mise.toml` at the repo root): the polyglot default — pins Node, Python, Go, Java, etc. in one file, replaces nvm/pyenv/rbenv/asdf with one config, and can also own per-directory env vars and tasks.
- [ ] `mise.toml` is committed; `mise use` writes the request, and the lockfile (when generated) is committed for byte-exact tool versions; configs from others get `mise trust` before execution.
- [ ] Single-language managers (`.nvmrc`, `.tool-versions`) are acceptable only when the repo is single-language and the team already standardizes on them; `package.json` `packageManager` pins the Node package manager via corepack.
- [ ] Never rely on system Node/Python: CI installs the pinned versions (`npm ci`, `uv sync`) rather than inheriting whatever the runner ships.
- [ ] mise manages *tool versions*, not project dependencies: package installs still go through npm/pip/uv — mise does not replace the package manager.

## direnv: auto-activation

- [ ] **direnv** auto-loads/unloads per-directory env on `cd` via `.envrc`, replacing manual `source` rituals and shell-specific rc hacks; it is hooked into the shell once and otherwise invisible.
- [ ] `.envrc` is allowlisted per machine (`direnv allow`) after review — an unreviewed `.envrc` from someone else is never allowed blindly.
- [ ] `.envrc` exports `PATH` and env vars, never secrets — secrets come from the secret manager or a gitignored file `dotenv`'d in; with Nix, `.envrc` contains `use flake` (via **nix-direnv**, which caches the evaluation so `cd` stays fast).
- [ ] If mise already covers per-directory env vars in a project, don't run direnv on top of it for the same job — one auto-activation path per project.
- [ ] `.direnv/` cache directory is gitignored; `.envrc` itself may be committed when it contains only safe logic.

## Reproducible builds & supply-chain evidence

- [ ] All timestamps in build output derive from `SOURCE_DATE_EPOCH` (clamped, UTC); BuildKit propagates it automatically (since buildx v0.10) to OCI `created` timestamps, and `rewrite-timestamp=true` normalizes file timestamps in release images.
- [ ] Release images build hermetically where feasible (`RUN --network=none` for pure build steps) so artifacts depend only on declared inputs.
- [ ] SBOM generated per release artifact with **Syft** (CycloneDX and/or SPDX), uploaded as a release asset and verified as valid JSON with pinned timestamp fields.
- [ ] Release images are **signed** with keyless **cosign** (Sigstore Fulcio + Rekor) from CI via the workflow's OIDC identity (`id-token: write`); signatures bind the resolved **digest**, never the mutable tag.
- [ ] SLSA build provenance is generated for release artifacts (`actions/attest-build-provenance` or the `slsa-framework` generator); target SLSA build level L2+, with provenance verifiable by a third party (`cosign verify` / `gh attestation verify`).
- [ ] A rebuild from the same commit and lockfiles can be verified byte-identical (diffoscope-style); what is *not* byte-reproducible (e.g. third-party-signed blobs) is documented, not discovered.

## Dev/prod parity

- [ ] Same language major version, same service versions (DB/cache/queue) in dev, CI, and prod; `.env.example` enumerates every required variable with placeholders (details in `project-structure.md`).
- [ ] The CI environment is the same container image or Nix closure developers use — "works on my machine" is treated as a CI config bug.
- [ ] Any deliberate deviation (e.g. SQLite locally vs Postgres in prod) is documented with the mitigation, not silently discovered in production.

## CI environment strategy

- [ ] Runners are ephemeral; dependency caches are keyed on the lockfile hash and scoped per-branch, with `main`'s cache as a warm fallback.
- [ ] **Every third-party GitHub Action is pinned to a full commit SHA** with the version as a trailing comment (`uses: org/action@<40-char-sha> # vX.Y.Z`); tags/branches are mutable and fail review. Renovate/Dependabot's `github-actions` ecosystem keeps the SHA pins bumpable.
- [ ] Workflows declare default-deny `permissions: {}` and grant per-job minimums; workflows are linted with zizmor (injection, token-scope, template-injection findings fixed, not suppressed without a reason).
- [ ] Matrix builds cover the supported platform/language versions (not just the developer's laptop version); `fail-fast: false` so one broken axis doesn't hide the others.
- [ ] Polyglot tool versions in CI come from the committed `mise.toml` via the mise action; Python deps come from `uv sync --locked`; the buildx registry cache (`mode=max`) keeps Docker builds incremental.
- [ ] Formatting/lint/secret-detection run as pre-commit hooks (`.pre-commit-config.yaml` with pinned hook revs, `pre-commit install` documented); CI re-runs the same hooks so contributors without local hooks can't bypass them.

## Sources

- https://github.com/juninmd/skills/blob/HEAD/.agents/skills/cloud-devops/references/dockerfile-standards.md
- https://github.com/snehitha3907/devops-kit/blob/HEAD/Docker/docs/docker-build-cache-and-multi-stage-layering.md
- https://github.com/iuliandita/skills/blob/HEAD/skills/docker/SKILL.md
- https://github.com/ericbfriday/-nmdpdonorpatient/blob/HEAD/docs/research/devcontainer-cross-ide-compatibility.md
- https://github.com/mlgruby/dotfile-nix/blob/HEAD/NIX_VS_DEVCONTAINERS.md
- https://github.com/mizchi/skills/blob/HEAD/tooling/nix-setup/SKILL.md
- https://github.com/levonk/levonk-base-boilerplate/blob/HEAD/internal-docs/adr/adr-20251226001-devbox-direnv-dev-environment.md
- https://github.com/ludo-technologies/python-best-practices/blob/HEAD/skills/tooling/rules/pkg-uv.md
- https://github.com/alirezax2/yfinancecrawler/blob/HEAD/.gemini/uv-github-action/SKILL.md
- https://github.com/prekzursil/agent-skills-toolchain/blob/HEAD/skills/mise/SKILL.md
- https://github.com/ekipo/ray-manalotos-claude-code-marketplace/blob/HEAD/mise-toolkit/skills/mise-elevator-pitch/SKILL.md
- https://mise.jdx.dev/getting-started.html
- https://github.com/vorburger/nixfiles/blob/HEAD/docs/docs/tutorial/direnv.md
- https://reproducible-builds.org/docs/source-date-epoch/
- https://github.com/owasp/devsecopsguideline/blob/HEAD/current-version/2-Process/2-3-Build/2-3-6-Supply-Chain-Security/2-3-6-2-Artifact-Signing-and-Provenance.md
- https://github.com/prebid/salesagent/blob/HEAD/docs/decisions/adr-007-build-provenance.md
- https://github.com/sbomify/sbomify.com/blob/HEAD/content/posts/2026-01-29-what-is-a-dependency-in-software.md
- https://github.com/ericboehs/claude-plugins/blob/HEAD/plugins/gh-actions-security/skills/gh-actions-security/SKILL.md
- https://github.com/luongnv89/skills/blob/HEAD/skills/devops-pipeline/SKILL.md
