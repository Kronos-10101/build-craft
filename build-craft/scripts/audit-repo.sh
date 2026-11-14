#!/usr/bin/env bash
# audit-repo.sh — automated first pass over a repository.
#
# Usage: audit-repo.sh [repo-path]   (defaults to current directory)
#
# Runs whichever of these are installed: ruff, mypy --strict, pytest with
# coverage, bandit, pip-audit, gitleaks, shellcheck, clang-tidy availability
# note — plus high-signal greps for secrets, banned patterns, and debt.
# Missing tools are skipped with a note, never fatal.
#
# This is a triage aid, not a verdict. Every hit needs human/agent review.

set -uo pipefail
cd "${1:-.}" || { echo "error: cannot cd to ${1:-.} — check the path exists and is a directory (usage: audit-repo.sh [repo-path])"; exit 1; }
REPO="$(pwd)"
echo "=== build-craft audit: $REPO ==="

have() { command -v "$1" >/dev/null 2>&1; }
section() { echo; echo "--- $1 ---"; }
skip() { echo "(skip: $1 not installed — install it to enable this check; the rest of the audit still runs)"; }

# --- Python ---
if ls -- *.py pyproject.toml setup.cfg 2>/dev/null | head -1 >/dev/null; then :; fi
if have ruff || [[ -f pyproject.toml ]]; then
  section "ruff check"
  have ruff && ruff check . || skip ruff
  section "ruff format --check"
  have ruff && ruff format --check . || skip ruff
fi
if have mypy; then
  section "mypy --strict"
  if [[ -d src ]]; then mypy --strict src/ || true; else mypy --strict . || true; fi
else skip mypy; fi
if have pytest; then
  section "pytest"
  pytest -q -m "not slow" || true
else skip pytest; fi
if have bandit; then
  section "bandit"
  bandit -r src/ . -x ./tests 2>/dev/null || true
else skip bandit; fi
if have pip-audit; then
  section "pip-audit"
  pip-audit || true
else skip pip-audit; fi

# --- C ---
if ls -- *.c *.h CMakeLists.txt Makefile 2>/dev/null | head -1 >/dev/null; then
  section "C files present"
  echo "ensure CI builds with: -Wall -Wextra -Werror -Wpedantic -Wconversion"
  echo "ensure CI runs tests under: -fsanitize=address,undefined"
  have clang-tidy && echo "clang-tidy available" || echo "(clang-tidy not installed — see references/c-language.md)"
  have cppcheck && cppcheck --enable=warning,performance,portability --error-exitcode=1 . || skip cppcheck
fi

# --- Secrets ---
section "secret patterns"
# Minimum quoted-value lengths 8 (keys/secrets) / 4 (passwords): shorter values are variable names or dummies, not credentials.
grep -rEn --exclude-dir={.git,node_modules,.venv,venv,__pycache__,build,dist} \
  -i 'api[_-]?key\s*[:=]\s*["'"'"'][^"'"'"']{8,}|secret\s*[:=]\s*["'"'"'][^"'"'"']{8,}|password\s*[:=]\s*["'"'"'][^"'"'"']{4,}|-----BEGIN [A-Z ]*PRIVATE KEY-----' \
  . 2>/dev/null | grep -viE 'example|placeholder|xxx|your_|changeme' || echo "no secret patterns found"
if [[ -f .env ]]; then echo "FINDING: .env file committed in repo — remove it from version control, add .env to .gitignore, and rotate any secrets it contained"; fi
if have gitleaks; then
  section "gitleaks"
  gitleaks detect --source . --no-git || true
else skip gitleaks; fi

# --- Banned / risky patterns ---
section "risky patterns"
grep -rEn --exclude-dir={.git,node_modules,.venv,venv,__pycache__,build,dist} \
  'pickle\.loads?\(|yaml\.load\(|eval\(|exec\(|shell\s*=\s*True|os\.system|verify\s*=\s*False|strcpy\(|strcat\(|sprintf\(|gets\(' \
  . 2>/dev/null || echo "none found"

# --- Debt markers ---
section "TODO/FIXME without ticket refs"
# head -20: debt markers are a triage sample, not an inventory — 20 hits prove the pattern without flooding the report (mirrors audit-repo.mjs).
# Capture-then-print (not grep | head || echo): under pipefail, head closing the pipe early SIGPIPEs grep (status 141), which would print "none found" after real hits.
DEBT_HITS=$(grep -rEn --exclude-dir={.git,node_modules,.venv,venv,__pycache__,build,dist} \
  'TODO|FIXME|XXX|HACK' . 2>/dev/null | head -20)
if [[ -n "$DEBT_HITS" ]]; then echo "$DEBT_HITS"; else echo "none found"; fi

# --- Structure sanity ---
section "structure"
for f in README.md LICENSE .gitignore; do
  [[ -f "$f" ]] || echo "missing: $f — create it in the repo root (see references/project-structure.md)"
done
[[ -f .env.example ]] || echo "missing: .env.example (see references/project-structure.md)"
# head -3: one lockfile is expected; more than one is itself the anomaly, so listing beyond 3 adds only noise.
ls package-lock.json pnpm-lock.yaml poetry.lock uv.lock Cargo.lock go.sum 2>/dev/null | head -3 || echo "no lockfile found — commit your package manager lockfile so installs are reproducible"

echo
echo "=== done. Review every hit above against the checklists in references/. ==="
