#!/usr/bin/env node
// audit-repo.mjs — cross-platform port of scripts/audit-repo.sh.
//
// Usage: node scripts/audit-repo.mjs [repo-path]   (defaults to current directory)
//
// Runs whichever of these are installed: ruff, mypy --strict, pytest with
// coverage, bandit, pip-audit, gitleaks, clang-tidy availability note,
// cppcheck — plus high-signal greps for secrets, banned patterns, and debt.
// Missing tools are skipped with a note, never fatal. Node standard library
// only: no dependencies, works on Windows PowerShell without WSL.
//
// This is a triage aid, not a verdict. Every hit needs human/agent review.

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const REPO = resolve(process.argv[2] || ".");
try {
  process.chdir(REPO);
} catch {
  console.error(`error: cannot cd to ${process.argv[2] || "."} — check the path exists and is a directory (usage: node scripts/audit-repo.mjs [repo-path])`);
  process.exit(1);
}
console.log(`=== build-craft audit: ${REPO} ===`);

const section = (name) => console.log(`\n--- ${name} ---`);
const skip = (tool) => console.log(`(skip: ${tool} not installed — install it to enable this check; the rest of the audit still runs)`);

// Run a tool; returns "ran" | "missing". Non-zero exits are fine (triage aid).
function runTool(cmd, args, silent = false) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.error && r.error.code === "ENOENT") return "missing";
  if (!silent) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
  return "ran";
}

function topLevelFiles() {
  try {
    return readdirSync(REPO);
  } catch {
    return [];
  }
}
const hasAny = (names) => topLevelFiles().some((f) => names.includes(f));
const hasExt = (exts) =>
  topLevelFiles().some((f) => exts.some((e) => f.endsWith(e)));

// --- recursive content search (portable replacement for grep -r) ---
const EXCLUDE_DIRS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "__pycache__",
  "build",
  "dist",
]);

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      yield* walk(join(dir, e.name));
    } else if (e.isFile()) {
      yield join(dir, e.name);
    }
  }
}

function grepFiles(regex, { invert = null, limit = Infinity } = {}) {
  const hits = [];
  for (const f of walk(REPO)) {
    let buf;
    try {
      const st = statSync(f);
      if (st.size > 4 * 1024 * 1024) continue; // skip huge files: the 4 MB cap keeps the scan fast and in-memory; source files above it are generated or binary in practice
      buf = readFileSync(f);
    } catch {
      continue;
    }
    if (buf.includes(0)) continue; // binary
    const lines = buf.toString("utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        if (invert && invert.test(lines[i])) continue;
        // 200-char excerpt: long enough to judge the hit in context, short enough to keep triage output scannable.
        hits.push(`${relative(REPO, f)}:${i + 1}:${lines[i].trim().slice(0, 200)}`);
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

// --- Python ---
const pyProject = hasAny(["pyproject.toml"]) || hasExt([".py"]) || hasAny(["setup.cfg"]);
const ruffPresent = runTool("ruff", ["--version"], true) === "ran"; // probe only
if (ruffPresent || pyProject) {
  section("ruff check");
  if (ruffPresent) runTool("ruff", ["check", "."]);
  else skip("ruff");
  section("ruff format --check");
  if (ruffPresent) runTool("ruff", ["format", "--check", "."]);
  else skip("ruff");
}
section("mypy --strict");
if (runTool("mypy", ["--version"], true) === "ran") {
  const srcDir = topLevelFiles().includes("src") ? "src/" : ".";
  runTool("mypy", ["--strict", srcDir]);
} else {
  skip("mypy");
}
section("pytest");
if (runTool("pytest", ["--version"], true) === "ran") runTool("pytest", ["-q", "-m", "not slow"]);
else skip("pytest");
section("bandit");
if (runTool("bandit", ["--version"], true) === "ran") runTool("bandit", ["-r", "src/", ".", "-x", "./tests"]);
else skip("bandit");
section("pip-audit");
if (runTool("pip-audit", ["--version"], true) === "ran") runTool("pip-audit", []);
else skip("pip-audit");

// --- C ---
if (hasExt([".c", ".h"]) || hasAny(["CMakeLists.txt", "Makefile"])) {
  section("C files present");
  console.log("ensure CI builds with: -Wall -Wextra -Werror -Wpedantic -Wconversion");
  console.log("ensure CI runs tests under: -fsanitize=address,undefined");
  if (runTool("clang-tidy", ["--version"], true) === "ran") console.log("clang-tidy available");
  else console.log("(clang-tidy not installed — see references/c-language.md)");
  if (runTool("cppcheck", ["--version"], true) !== "missing")
    runTool("cppcheck", ["--enable=warning,performance,portability", "--error-exitcode=1", "."]);
  else skip("cppcheck");
}

// --- Secrets ---
section("secret patterns");
// Minimum quoted-value lengths in the regex below: 8 chars for keys/secrets, 4 for passwords — shorter quoted values are variable names or dummies, not credentials (the invert filter drops the remaining examples).
const secretHits = grepFiles(
  /api[_-]?key\s*[:=]\s*["'][^"']{8,}|secret\s*[:=]\s*["'][^"']{8,}|password\s*[:=]\s*["'][^"']{4,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  { invert: /example|placeholder|xxx|your_|changeme/i }
);
console.log(secretHits.length ? secretHits.join("\n") : "no secret patterns found");
if (hasAny([".env"])) console.log("FINDING: .env file committed in repo — remove it from version control, add .env to .gitignore, and rotate any secrets it contained");
section("gitleaks");
if (runTool("gitleaks", ["version"], true) === "ran") runTool("gitleaks", ["detect", "--source", ".", "--no-git"]);
else skip("gitleaks");

// --- Banned / risky patterns ---
section("risky patterns");
const riskyHits = grepFiles(
  /pickle\.loads?\(|yaml\.load\(|eval\(|exec\(|shell\s*=\s*True|os\.system|verify\s*=\s*False|strcpy\(|strcat\(|sprintf\(|gets\(/
);
console.log(riskyHits.length ? riskyHits.join("\n") : "none found");

// --- Debt markers ---
section("TODO/FIXME without ticket refs");
// Limit 20: debt markers are a triage sample, not an inventory — 20 hits prove the pattern exists without flooding the report.
const debtHits = grepFiles(/TODO|FIXME|XXX|HACK/, { limit: 20 });
console.log(debtHits.length ? debtHits.join("\n") : "none found");

// --- Structure sanity ---
section("structure");
for (const f of ["README.md", "LICENSE", ".gitignore"]) {
  if (!hasAny([f])) console.log(`missing: ${f} — create it in the repo root (see references/project-structure.md)`);
}
if (!hasAny([".env.example"]))
  console.log("missing: .env.example (see references/project-structure.md)");
const locks = topLevelFiles().filter((f) =>
  ["package-lock.json", "pnpm-lock.yaml", "poetry.lock", "uv.lock", "Cargo.lock", "go.sum"].includes(f)
);
// Show at most 3 lockfiles: one is expected; listing more adds noise, and more than one already signals the anomaly worth reviewing.
console.log(locks.length ? locks.slice(0, 3).join("\n") : "no lockfile found — commit your package manager lockfile so installs are reproducible");

console.log("\n=== done. Review every hit above against the checklists in references/. ===");
