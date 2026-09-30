# Build & Dev Environments — production checklist

How to manage build/dev environments and which method wins per situation: Docker, devcontainers, Nix, Python/Node env managers, direnv, lockfiles, reproducible builds, dev/prod parity, CI. Each entry states what it is and when to pick it. Checked 2026-09-30.

## Docker & multi-stage builds

- [ ] **What:** OS-level container images; multi-stage builds separate build-time deps from the runtime image.
- [ ] Pick over alternatives when you need byte-identical runtime artifacts across dev/CI/prod, or to ship a service as one unit.
- [ ] Multi-stage `Dockerfile`: builder stage compiles, final stage copies only the artifact — no compilers in production images.
- [ ] Base images pinned by digest (`image@sha256:…`), never `:latest`; final image runs as non-root `USER` on a slim/distroless base.
- [ ] `.dockerignore` excludes `.git`, `node_modules`, `.venv`, build caches; layer order puts slow-changing deps first for cache hits.

## Devcontainers

- [ ] **What:** a Docker container declared by `.devcontainer/devcontainer.json` as the dev environment (VS Code, JetBrains, GitHub Codespaces).
- [ ] Pick over raw Docker when the team wants one-click onboarding and identical tooling in-editor; pick over Nix when the team won't learn the Nix language.
- [ ] Image or Dockerfile pinned by digest; `postCreateCommand` installs project deps reproducibly (from lockfile, not ad-hoc).
- [ ] Dev-only services (DB, cache) declared in `docker-compose.yml` next to it; ports and VS Code extensions declared in the JSON, not in chat lore.
- [ ] Caveat accepted: 10s–3min container spin-up and slow bind mounts on macOS (VirtioFS) — fine for servers, painful for huge native compiles.

## Nix flakes

- [ ] **What:** purely functional package manager; `flake.nix` + `flake.lock` declare the exact dependency closure, hashed.
- [ ] Pick over Docker/devcontainers when you want native-speed tools (<100ms shell entry, no VM/mount overhead — the Shopify macOS case), bit-reproducible toolchains, and any-editor support.
- [ ] Pick over venv/conda when the project needs non-Python system deps (compilers, CUDA, GDAL) pinned alongside the interpreter.
- [ ] `flake.lock` committed; binary cache configured (Cachix/Garnix) so nobody compiles the world; `nix develop` is the documented entry point.
- [ ] Caveat accepted: steep learning curve (Nix language), macOS/Linux only, first build slow without a cache. Low-friction alternative: **devbox** (Nix-powered, no Nix language).

## Python: venv vs uv vs conda

- [ ] **venv + pip** — stdlib, zero new tools. Pick for the most standard minimal workflow or when teaching; accept slow resolver and no real lockfile (`pip freeze` is a snapshot, not a lockfile).
- [ ] **uv** — the 2026 default for new Python projects: env + packages + lockfile (`uv.lock`) + Python versions in one fast Rust binary, 10–100× faster installs than pip.
- [ ] Pick **uv** over venv/poetry/pipenv for any new project; `uv sync` reproduces the env from `uv.lock`, committed to git.
- [ ] **conda/mamba** — cross-language envs (Python + C/C++/R/Fortran, CUDA) from conda-forge. Pick over uv only for scientific stacks with heavy native deps (GIS, bioinformatics, GPU toolkits) that pip wheels don't cover; use **mamba** (faster solver), never bare conda for new envs.
- [ ] One tool per project, never mixed: no `pip install` inside a uv-managed project, no conda env + `pip install` without `--no-deps` discipline.

## Node version managers & direnv

- [ ] **Node:** `packageManager` field in `package.json` pins the manager (corepack); interpreter pinned via **mise**/**asdf**/`.nvmrc` — pick mise for polyglot repos (one tool pins Node+Python+Go).
- [ ] Never rely on system Node; CI installs the pinned version from the lockfile with a frozen install (`npm ci`).
- [ ] **direnv:** auto-activates per-directory env vars on `cd` via `.envrc`. Pick over manual `source` rituals and shell-specific rc hacks.
- [ ] `.envrc` is allowlisted per machine (`direnv allow`); it exports `PATH`/vars, never secrets — secrets come from the secret manager.

## Lockfiles, reproducible builds, parity

- [ ] Every ecosystem's lockfile committed: `uv.lock`/`package-lock.json`/`pnpm-lock.yaml`/`Cargo.lock`/`flake.lock`; CI installs strictly from it and fails on drift.
- [ ] No unbounded ranges (`*`, `latest`) in committed manifests; manifest and lockfile change in the same commit.
- [ ] Reproducible builds: pinned digests for base images, `SOURCE_DATE_EPOCH` for timestamps, SBOM (CycloneDX/SPDX) generated per release artifact.
- [ ] CI verifies the lockfile is current (regenerate-and-diff step) so manifest/lockfile drift fails the build instead of shipping silently.
- [ ] `pip freeze` snapshots never committed as a source of truth — only real lockfiles with hashes and platform metadata.
- [ ] Dev/prod parity: same language major version, same service versions (DB/cache), same env-var contract (`.env.example`); differences documented, not discovered.
- [ ] CI environment strategy: ephemeral runners, dependency cache keyed on lockfile hash, the same container/image or Nix closure that developers use — "works on my machine" is a CI config bug.

## Sources

- https://github.com/mlgruby/dotfile-nix/blob/HEAD/NIX_VS_DEVCONTAINERS.md
- https://github.com/bagelhole/devops-security-agent-skills/blob/HEAD/devops/developer-experience/devcontainers-nix/SKILL.md
- https://github.com/sasselab-teaching/preparation_gs2f_seminar/blob/HEAD/resources/Python_environment_management.md
- https://github.com/ekipo/ray-manalotos-claude-code-marketplace/blob/HEAD/mise-toolkit/skills/mise-lang-python-packages/SKILL.md
- https://github.com/pyopensci/python-package-guide/blob/HEAD/maintain-automate/environment-managers.md
