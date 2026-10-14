#!/usr/bin/env node

/**
 * ══════════════════════════════════════════════════════════════════════════
 * BUILD-CRAFT UNIVERSAL REPOSITORY AUDITOR (v2.0)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Universal, cross-platform repository triage and audit engine.
 * Zero external dependencies — pure Node.js stdlib.
 * Runs natively on Windows (pwsh/cmd), macOS, and Linux without Bash/WSL.
 *
 * Checks:
 * 1. Language toolchains (Python, JS/TS, C/C++)
 * 2. Static analysis, linters & typecheckers
 * 3. Test suites with fast triage
 * 4. High-precision secret detection
 * 5. Banned & dangerous patterns (eval, exec, hardcoded tokens, debug leftovers)
 *
 * Usage:
 *   node audit-repo.mjs [path] [options]
 *
 * Options:
 *   --ci        Exit code 1 if critical issues or failing tests are found
 *   --strict    Exit code 1 if any warnings or unformatted files exist
 *   --json      Output pure JSON report
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isStrict = args.includes('--strict');
const isCi = args.includes('--ci');

let targetPath = '.';
for (const arg of args) {
  if (!arg.startsWith('--')) {
    targetPath = arg;
    break;
  }
}

const rootDir = path.resolve(targetPath);

if (!fs.existsSync(rootDir)) {
  console.error(`Error: Directory not found: ${rootDir}`);
  process.exit(1);
}

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(msg = '') {
  if (!isJson) console.log(msg);
}

function header(title) {
  log(`\n${colors.bold}${colors.cyan}--- ${title} ---${colors.reset}`);
}

function haveTool(cmd) {
  try {
    const isWin = process.platform === 'win32';
    const checkCmd = isWin ? `where.exe ${cmd}` : `command -v ${cmd}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runCmd(cmd, desc) {
  header(desc || cmd);
  try {
    const out = execSync(cmd, { cwd: rootDir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (!isJson && out.trim()) console.log(out.trim());
    return { ok: true, output: out.trim() };
  } catch (err) {
    const errOut = (err.stdout || '') + '\n' + (err.stderr || '');
    if (!isJson) console.log(`${colors.red}${errOut.trim() || err.message}${colors.reset}`);
    return { ok: false, output: errOut.trim() };
  }
}

const findings = {
  critical: [],
  warnings: [],
  info: []
};

log(`${colors.bold}${colors.magenta}=== BUILD-CRAFT REPO AUDIT: ${rootDir} ===${colors.reset}`);

// ----------------------------------------------------------------------
// 1. Language Detection & Toolchain Checks
// ----------------------------------------------------------------------

const filesInRoot = fs.readdirSync(rootDir);
const hasPy = filesInRoot.some(f => f.endsWith('.py') || f === 'pyproject.toml' || f === 'setup.cfg');
const hasJsTs = filesInRoot.some(f => f === 'package.json' || f === 'tsconfig.json');
const hasC = filesInRoot.some(f => f.endsWith('.c') || f.endsWith('.cpp') || f === 'CMakeLists.txt' || f === 'Makefile');

// --- Python ---
if (hasPy) {
  log(`\n${colors.bold}[Python Project Detected]${colors.reset}`);
  if (haveTool('ruff')) {
    const r1 = runCmd('ruff check .', 'Ruff Linter');
    if (!r1.ok) findings.warnings.push({ title: 'Ruff linter findings', tool: 'ruff' });
    const r2 = runCmd('ruff format --check .', 'Ruff Format Check');
    if (!r2.ok) findings.warnings.push({ title: 'Ruff format mismatches', tool: 'ruff' });
  } else {
    log(`${colors.dim}(skip: ruff not installed)${colors.reset}`);
  }

  if (haveTool('mypy')) {
    const target = fs.existsSync(path.join(rootDir, 'src')) ? 'src/' : '.';
    const m = runCmd(`mypy --strict ${target}`, 'Mypy Strict Typecheck');
    if (!m.ok) findings.warnings.push({ title: 'Mypy type errors', tool: 'mypy' });
  }

  if (haveTool('pytest')) {
    const p = runCmd('pytest -q -m "not slow"', 'Pytest Unit Tests');
    if (!p.ok) findings.critical.push({ title: 'Failing Pytest tests', tool: 'pytest' });
  }
}

// --- Node / TypeScript ---
if (hasJsTs) {
  log(`\n${colors.bold}[JavaScript/TypeScript Project Detected]${colors.reset}`);
  const pkgJsonPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (pkg.scripts?.test && haveTool('npm')) {
        const t = runCmd('npm test', 'npm test');
        if (!t.ok) findings.critical.push({ title: 'Failing npm tests', tool: 'npm' });
      }
      if (pkg.scripts?.lint && haveTool('npm')) {
        const l = runCmd('npm run lint', 'npm run lint');
        if (!l.ok) findings.warnings.push({ title: 'npm lint errors', tool: 'npm' });
      }
    } catch {}
  }
}

// --- C / C++ ---
if (hasC) {
  log(`\n${colors.bold}[C/C++ Files Detected]${colors.reset}`);
  if (haveTool('cppcheck')) {
    const cp = runCmd('cppcheck --enable=warning,performance,portability --error-exitcode=1 .', 'cppcheck');
    if (!cp.ok) findings.warnings.push({ title: 'cppcheck findings', tool: 'cppcheck' });
  }
}

// ----------------------------------------------------------------------
// 2. High-Precision Secret Scanning & Banned Patterns
// ----------------------------------------------------------------------
header('Secret & Dangerous Pattern Scanner');

const ignoreDirs = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', 'target', '.next', '.gemini']);
const secretPatterns = [
  { name: 'API Key Assignment', regex: /api[_-]?key\s*[:=]\s*["']([A-Za-z0-9_\-]{16,})["']/i },
  { name: 'Generic Secret Assignment', regex: /secret\s*[:=]\s*["']([A-Za-z0-9_\-]{16,})["']/i },
  { name: 'Private Key Header', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Personal Access Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ }
];

const dangerousPatterns = [
  { name: 'Direct eval() usage', regex: /\beval\s*\(/ },
  { name: 'Direct exec() usage in Python', regex: /\bexec\s*\(/ },
  { name: 'Unsanitized os.system()', regex: /\bos\.system\s*\(/ },
  { name: 'Disabled TLS verification', regex: /verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0['"]?/i }
];

let scannedFiles = 0;
let secretHits = 0;
let dangerousHits = 0;

function scanDir(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        if (!ignoreDirs.has(ent.name)) {
          scanDir(path.join(dir, ent.name));
        }
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.exe', '.dll', '.so', '.dylib', '.zip', '.tar', '.gz', '.woff', '.woff2'].includes(ext)) {
          continue;
        }

        const fullPath = path.join(dir, ent.name);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > 1024 * 1024 * 2) continue;

          const content = fs.readFileSync(fullPath, 'utf-8');
          scannedFiles++;
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;

            for (const sp of secretPatterns) {
              if (sp.regex.test(line)) {
                if (!/example|placeholder|xxx|your_|changeme|dummy|mock/i.test(line)) {
                  secretHits++;
                  findings.critical.push({
                    title: `Potential Secret: ${sp.name}`,
                    file: path.relative(rootDir, fullPath),
                    line: lineNum,
                    snippet: line.trim().slice(0, 80)
                  });
                }
              }
            }

            for (const dp of dangerousPatterns) {
              if (dp.regex.test(line)) {
                dangerousHits++;
                findings.warnings.push({
                  title: `Dangerous Call: ${dp.name}`,
                  file: path.relative(rootDir, fullPath),
                  line: lineNum,
                  snippet: line.trim().slice(0, 80)
                });
              }
            }
          }
        } catch {}
      }
    }
  } catch {}
}

scanDir(rootDir);

log(`Scanned ${scannedFiles} source files.`);
if (secretHits === 0 && dangerousHits === 0) {
  log(`${colors.green}✓ Zero secret patterns or dangerous calls detected.${colors.reset}`);
} else {
  if (secretHits > 0) log(`${colors.red}✗ Detected ${secretHits} potential secrets!${colors.reset}`);
  if (dangerousHits > 0) log(`${colors.yellow}! Detected ${dangerousHits} dangerous calls.${colors.reset}`);
}

// ----------------------------------------------------------------------
// 3. Final Summary & Exit
// ----------------------------------------------------------------------
header('Audit Summary');

log(`Critical Issues : ${findings.critical.length}`);
log(`Warnings        : ${findings.warnings.length}`);

if (isJson) {
  console.log(JSON.stringify(findings, null, 2));
}

if (isCi && findings.critical.length > 0) {
  log(`\n${colors.red}${colors.bold}AUDIT FAILED (CI Mode): Critical issues exist.${colors.reset}`);
  process.exit(1);
}

if (isStrict && (findings.critical.length > 0 || findings.warnings.length > 0)) {
  log(`\n${colors.red}${colors.bold}AUDIT FAILED (Strict Mode): Warnings or critical issues exist.${colors.reset}`);
  process.exit(1);
}

log(`\n${colors.green}${colors.bold}✓ Audit completed successfully.${colors.reset}`);
process.exit(0);
