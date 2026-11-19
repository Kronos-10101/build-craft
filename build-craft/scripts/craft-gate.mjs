#!/usr/bin/env node
/**
 * craft-gate.mjs — build-craft phase gate enforcer.
 *
 *   node scripts/craft-gate.mjs --init <dir> [--skill-root <path>]
 *   node scripts/craft-gate.mjs --phase <p1|p2|p3|p4> [--design] [--strict] [--checklists f1,f2] --dir <dir> [--skill-root <path>]
 *
 * Node.js stdlib only. All checks are case-insensitive and line/regex-based.
 * Missing files are reported as failures; the script never crashes on them.
 *
 * ANTI-GAMING: beyond presence checks, the gate enforces minimum substance —
 * Q:/A: lines >= 30 chars, decision blocks >= 150 chars, failure-mode bullets
 * >= 20 chars, every grill question answered — so thin, copy-pasted, or
 * tautological content fails with the offending item named. decisions.md must
 * also name a file path that appears in task.md "## File changes" (decisions
 * must connect to the actual plan), and --checklists makes the routed
 * reference checklists auditable via a "## Checklist attestation" section in
 * report.md (pass+waived must equal the file's real "- [ ]" item count).
 *
 * PLACEHOLDER RULE: template example/placeholder content
 * does NOT count as real content. Before content checks run, each file's text
 * is stripped of HTML comments, lines containing the literal token EXAMPLE
 * (case-sensitive, the templates' placeholder marker), and lines containing
 * an <angle-bracket> placeholder token. Header-presence checks run on the
 * same stripped text. This guarantees a fresh --init scaffold can never
 * GATE PASS: every phase has at least one content check that fails on
 * example-only content. Real prose using lowercase "example" is unaffected;
 * avoid literal <...> tokens in checked lines.
 *
 * PROVENANCE & CHAINING: task.md records the routed reference chapters in
 * "## Consulted" (p1 verifies each basename exists in references/ and that
 * security.md accompanies the web/backend chapters). Phases chain through
 * <run-dir>/gate-log.md: every successful phase appends its own
 * "pN PASS <ISO timestamp>" line (plus CLI flags, plus p4 "unverified:"
 * audit names), and p2/p3/p4 each require the previous phase's line.
 * P4 attestations are DERIVED, not flagged: the checklist attestation runs
 * against every chapter in "## Consulted" and the critical-path attestation
 * always runs; --checklists/--critical flags only ADD files/emphasis.
 * P4 also derives the required "## Audits run" rows in report.md from the
 * consulted chapters, the planned file changes, and the target repo.
 */
import {
  readFileSync, copyFileSync, mkdirSync, readdirSync,
  existsSync, appendFileSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_FILES = [
  'task.md', 'tasks.md', 'decisions.md', 'grill.md',
  'design.md', 'architecture.md', 'report.md', 'progress.md', 'review.md',
];
/** Embedded fallback for templates/review.md, used only when the templates
 *  dir has no review.md yet. Must stay byte-equivalent in structure to the
 *  canonical template (same headers and placeholder lines). */
const REVIEW_TEMPLATE = `# Review

BASE: EXAMPLE <base ref>
HEAD: EXAMPLE <head ref>

Spec verdict: EXAMPLE <one-line verdict>
Quality verdict: EXAMPLE <one-line verdict>

## Declined to judge

- EXAMPLE: none

## Fix rounds

- EXAMPLE: round 1 — <fixes>
`;
/** Chapters that handle attacker-controlled input or shipped surface area:
 *  consulting any of them without security.md means the security checklist
 *  was never routed, so p1 fails until it is added. */
const SECURITY_TRIGGER_CHAPTERS = [
  'web-frontend.md', 'react-nextjs.md', 'backend-api.md', 'browser-extensions.md',
];
const P1_HEADERS = [
  'Goal', 'Non-goals', 'Decisions', 'File changes',
  'Risks', 'Failure modes', 'Rollback',
];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function usage(exit = 2) {
  const msg = `Usage:
  node scripts/craft-gate.mjs --init <dir> [--skill-root <path>]
  node scripts/craft-gate.mjs --phase <p1|p2|p3|p4> [--design] [--strict] [--checklists f1,f2] [--critical] --dir <dir> [--skill-root <path>]

  --init <dir>        create <dir>, copy the template files into it (incl. review.md),
                      scaffold any missing canonical sections, and create an empty gate-log.md
  --phase <p1..p4>    run phase gate checks against --dir; on success append
                      "pN PASS <ISO timestamp>" to <dir>/gate-log.md
  --design            (p2 only) also enforce design.md direction/decision checks
  --strict            (p4 only) additionally fail on any /fail/ line not negated by "no ... fail"
  --checklists f1,f2  (p4 only) ADD files (relative to skill root, or references/<name>) whose
                      "- [ ]" items must be attested in report.md "## Checklist attestation"
                      as "<basename>: <p> pass, <w> waived" with p+w == item count.
                      The attestation set is derived by default from task.md "## Consulted";
                      this flag only adds files, it never subsets the derived set.
  --critical          (p4 only) the report.md "## Critical-path" attestation of every MUST item
                      in references/critical-path.md ("all <N> reviewed" (exact count), "no waivers",
                      or per-item waiver lines each with a reason (>= 30 chars)) now runs BY DEFAULT;
                      this flag is accepted for compatibility and recorded in the gate log
  --dir <dir>         working directory holding the phase files
  --skill-root <path> override skill root (default: parent of this script's directory)`;
  console.error(msg);
  process.exit(exit);
}

function parseArgs(argv) {
  const args = {
    init: null, phase: null, design: false, strict: false, dir: null, skillRoot: null,
    checklists: null, critical: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--init') args.init = argv[++i] ?? null;
    else if (a === '--phase') args.phase = argv[++i] ?? null;
    else if (a === '--design') args.design = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '--critical') args.critical = true;
    else if (a === '--checklists') args.checklists = argv[++i] ?? null;
    else if (a === '--dir') args.dir = argv[++i] ?? null;
    else if (a === '--skill-root') args.skillRoot = argv[++i] ?? null;
    else if (a === '--help' || a === '-h') usage(0);
    else { console.error(`unknown argument: ${a}`); usage(2); }
  }
  return args;
}

/** Default skill root: parent of the script's own directory
 *  (script lives at <skill-root>/scripts/craft-gate.mjs). */
function resolveSkillRoot(flag) {
  if (flag) return path.resolve(flag);
  return path.dirname(SCRIPT_DIR);
}

/** Read a file; return null (never throw) when it is missing/unreadable. */
function readQuiet(p) {
  try { return readFileSync(p, 'utf8'); } catch { return null; }
}

/** Template placeholder markers: the literal token EXAMPLE (case-sensitive,
 *  as used by the templates) or an <angle-bracket> placeholder token. */
const EXAMPLE_RE = /EXAMPLE/;
const PLACEHOLDER_RE = /<[^<>\n]+>/;

/** Normalized template corpus — catches template lines reused with the EXAMPLE
 *  token renamed (Sample/Placeholder/...) or otherwise lightly disguised.
 *  Structural header lines are excluded so phase checks on headers keep working. */
let ECHO_SET = null;
let ECHO_TPL_DIR = null; // set by main() from the resolved skill root
function normalizeLine(l) {
  return l
    .toLowerCase()
    .replace(/\b(examples?|samples?|placeholders?|lorem)\b/g, '')
    .replace(/<[^<>\n]+>/g, '')
    .replace(/[`*_#>\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function templateEchoSet() {
  if (ECHO_SET !== null) return ECHO_SET;
  ECHO_SET = new Set();
  const tdir = ECHO_TPL_DIR || path.join(path.dirname(SCRIPT_DIR), 'templates');
  let files = [];
  try { files = readdirSync(tdir).filter((f) => f.endsWith('.md')); } catch { return ECHO_SET; }
  for (const f of files) {
    const t = readQuiet(path.join(tdir, f));
    if (t === null) continue;
    for (const line of t.split('\n')) {
      if (/^#{1,6}\s/.test(line.trim())) continue;
      const n = normalizeLine(line);
      // 15 chars: below this, normalized lines are generic fragments any doc shares; above it, a match fingerprints copied template text.
      if (n.length > 15) ECHO_SET.add(n);
    }
  }
  return ECHO_SET;
}
function isTemplateEcho(line) {
  const t = line.trim();
  // Structural markers the agent is supposed to keep verbatim are never echo:
  // the grill stop predicate and markdown headers.
  if (/^\(plan updated:/i.test(t)) return false;
  if (/^#{1,6}\s/.test(t)) return false;
  const n = normalizeLine(line);
  // Same 15-char floor as templateEchoSet(): shorter matches are coincidence, not template reuse.
  return n.length > 15 && templateEchoSet().has(n);
}

/** Remove template placeholder content: strip HTML comments, then drop any
 *  line containing EXAMPLE, an <...> placeholder token, or a disguised reuse
 *  of a template line. Content checks run on the result so example-only
 *  scaffolds can never satisfy them. */
function stripPlaceholders(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((l) => !EXAMPLE_RE.test(l) && !PLACEHOLDER_RE.test(l) && !isTemplateEcho(l))
    .join('\n');
}

/** A checkbox line "has done when" only if the condition is substantive:
 *  contains "done when" (case-insensitive), is not a template placeholder or
 *  echo, and the condition text after "done when:" is >= 20 chars
 *  (kills tautologies like "done when: it works"). */
function substantiveDoneWhen(line) {
  if (!/done when/i.test(line)) return false;
  if (EXAMPLE_RE.test(line) || PLACEHOLDER_RE.test(line) || isTemplateEcho(line)) return false;
  const cond = (line.split(/done when/i)[1] || '').replace(/[`*_]/g, '').trim();
  // >= 20 chars: tautologies ("it works", "done") fit in under 20; a checkable condition does not.
  return cond.length >= 20;
}

/** Extract http(s) URLs from text, stripping trailing punctuation like ) ] . , */
function extractUrls(text) {
  const found = text.match(/https?:\/\/\S+/g) || [];
  return found.map((u) => u.replace(/[)\].,;:!?'"`>]+$/, ''));
}

/** Escape a literal string for use inside a RegExp. */
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extract candidate file paths from text: backtick-quoted spans containing a
 *  slash or a dotted extension, plus bare slash-containing tokens and
 *  extension-bearing tokens. URLs are excluded first so "https://a/b" never
 *  counts as a path. Used to prove decisions.md connects to the plan.
 *  Extensions match at 1-6 chars: real suffixes (.md, .mjs, .json) fit, while
 *  longer dotted tails are version strings or prose, not file paths. */
function extractPaths(text) {
  const set = new Set();
  const noUrls = text.replace(/https?:\/\/\S+/g, ' ');
  for (const m of noUrls.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim().replace(/^['"]|['"]$/g, '');
    if (/[/\\]/.test(t) || /\.[A-Za-z0-9]{1,6}$/.test(t)) set.add(t);
  }
  for (const m of noUrls.matchAll(/(?<![\w/.-])([\w][\w\-.]*\/[\w\-.]+(?:\/[\w\-.]+)*)(?![\w/.-])/g)) {
    set.add(m[1]);
  }
  for (const m of noUrls.matchAll(/(?<![\w/.-])([\w][\w\-.]*\.[A-Za-z0-9]{1,6})(?![\w/.-])/g)) {
    if (!/^\d+\.\d+$/.test(m[1])) set.add(m[1]); // skip version-ish "2.0"
  }
  return set;
}

/** Return the text of the section starting at the first line matching
 *  headerLineRe, up to (but excluding) the next line matching nextHeaderRe,
 *  or EOF. Returns null when the header is not found. */
function sectionAfter(text, headerLineRe, nextHeaderRe) {
  const lines = text.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headerLineRe.test(lines[i])) { start = i; break; }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (nextHeaderRe.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

/** Split decisions.md into blocks, one per "## D<n>" header line. */
function decisionBlocks(text) {
  const re = /^##\s*D\d.*/gim;
  const idx = [];
  let m;
  while ((m = re.exec(text)) !== null) idx.push(m.index);
  return idx.map((s, i) => text.slice(s, idx[i + 1] ?? text.length));
}

/** True when a raw (unstripped) line is template placeholder content:
 *  it carries the EXAMPLE token or an <angle-bracket> token. The shared
 *  format contract states such lines never count as real content. */
function isPlaceholderLine(line) {
  return EXAMPLE_RE.test(line) || PLACEHOLDER_RE.test(line);
}

/** Parse task.md "## Consulted" per the format contract: one routed chapter
 *  per line as "- <basename>.md". Returns null when the section is absent,
 *  otherwise the array of basenames from lines matching the contract regex
 *  (placeholder lines never match in practice — "- EXAMPLE: x.md" is not a
 *  bare basename line — and are excluded explicitly as well). */
function parseConsulted(rawTask) {
  if (rawTask === null) return null;
  const sec = sectionAfter(rawTask, /^##\s*consulted\s*$/im, /^##\s/m);
  if (sec === null) return null;
  const entries = [];
  for (const line of sec.split('\n').slice(1)) {
    if (isPlaceholderLine(line)) continue;
    const m = line.trim().match(/^-\s+([A-Za-z0-9._-]+\.md)\s*$/);
    if (m) entries.push(m[1]);
  }
  return entries;
}

/** Parse task.md "## Target" per the format contract: the section's single
 *  content line is the target repo path, or "none" for plan-only runs.
 *  Returns { present, target } — target is null when the section holds only
 *  placeholder/empty lines. */
function parseTarget(rawTask) {
  if (rawTask === null) return { present: false, target: null };
  const sec = sectionAfter(rawTask, /^##\s*target\s*$/im, /^##\s/m);
  if (sec === null) return { present: false, target: null };
  const content = sec.split('\n').slice(1)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isPlaceholderLine(l));
  return { present: true, target: content.length ? content[0] : null };
}

/** Phase chaining: gate-log.md must already hold a "<prev> PASS" line,
 *  appended by the gate itself on that phase's successful run. */
function checkGateLog(dir, phase, prev) {
  const name = `${phase}:gate-log.md records "${prev} PASS" (phase chaining)`;
  const raw = readQuiet(path.join(dir, 'gate-log.md'));
  const ok = raw !== null && new RegExp(`^${prev} PASS\\b`, 'm').test(raw);
  return check(
    name,
    ok,
    ok
      ? `found a "${prev} PASS" line in gate-log.md`
      : `no "${prev} PASS" line in gate-log.md — run the ${prev} gate successfully first `
        + `(node scripts/craft-gate.mjs --phase ${prev} --dir <run-dir>); the gate appends the line itself on success`,
  );
}

/** Split design.md into blocks, one per "### direction" header line
 *  (mirrors decisionBlocks() for decisions.md). */
function directionBlocks(text) {
  const re = /^###\s*direction.*$/gim;
  const idx = [];
  let m;
  while ((m = re.exec(text)) !== null) idx.push(m.index);
  return idx.map((s, i) => text.slice(s, idx[i + 1] ?? text.length));
}

/** Detail strings quote offending lines truncated at 60 chars (fragments) or
 *  120 chars (full lines): enough text to locate the problem in the source
 *  file, short enough that a failing gate stays readable on one screen. */
function check(name, ok, detail) {
  return { name, ok: !!ok, detail };
}

// ---------------------------------------------------------------------------
// phase checks — each returns an array of check results
// ---------------------------------------------------------------------------

function checksP1(dir, skillRoot) {
  const out = [];
  const raw = readQuiet(path.join(dir, 'task.md'));
  const task = raw === null ? null : stripPlaceholders(raw);
  for (const h of P1_HEADERS) {
    const re = new RegExp(`^##\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
    if (task === null) out.push(check(`p1:task.md header "## ${h}"`, false, 'file missing: task.md — run --init <dir> to scaffold it from templates/, then fill it in'));
    else out.push(check(`p1:task.md header "## ${h}"`, re.test(task), re.test(task) ? 'present' : `header not found — add a line exactly "## ${h}" to task.md`));
  }
  const tasks = readQuiet(path.join(dir, 'tasks.md'));
  if (tasks === null) {
    out.push(check('p1:tasks.md has "- [ ]" + "done when" line', false, 'file missing: tasks.md — run --init <dir> to scaffold it from templates/, then replace the example tasks with real ones'));
  } else {
    const n = tasks.split('\n').filter((l) => /^\s*-\s*\[\s\]/.test(l) && substantiveDoneWhen(l)).length;
    // >= 1 qualifying line: phase 1 is meaningless with zero real tasks, so one substantive checkbox is the floor.
    out.push(check(
      'p1:tasks.md has "- [ ]" + substantive "done when" line',
      n >= 1,
      n >= 1 ? `found ${n}` : 'no open checkbox line with a real (non-placeholder) "done when" condition',
    ));
  }
  // Consulted: which reference chapters were routed is provenance, not
  // decoration — p4 derives its attestation set from this list.
  const consulted = raw === null ? null : parseConsulted(raw);
  if (raw === null) {
    out.push(check('p1:task.md "## Consulted" lists >= 1 routed chapter', false, 'file missing: task.md — run --init <dir> to scaffold it from templates/, then fill it in'));
    out.push(check('p1:task.md "## Target" has a non-placeholder target line', false, 'file missing: task.md — run --init <dir> to scaffold it from templates/, then fill it in'));
  } else {
    out.push(check(
      'p1:task.md "## Consulted" lists >= 1 routed chapter',
      consulted !== null && consulted.length >= 1,
      consulted === null
        ? '"## Consulted" section not found in task.md — add the section and list one routed reference chapter per line, e.g. "- security.md"'
        : (consulted.length >= 1
          ? `found ${consulted.length}: ${consulted.join(', ')}`
          : '"## Consulted" has no valid entry — add one routed reference chapter per line as "- <basename>.md" (e.g. "- security.md"); EXAMPLE/placeholder lines do not count'),
    ));
    if (consulted !== null && consulted.length >= 1) {
      let refFiles = new Set();
      try { refFiles = new Set(readdirSync(path.join(skillRoot, 'references')).filter((f) => f.toLowerCase().endsWith('.md'))); } catch { /* empty set: every entry reports missing below */ }
      const missing = consulted.filter((c) => !refFiles.has(c));
      out.push(check(
        'p1:task.md "## Consulted" chapters exist in references/',
        missing.length === 0,
        missing.length === 0
          ? `all ${consulted.length} consulted chapter(s) exist in references/`
          : `not found in references/: ${missing.join(', ')} — fix the basename in "## Consulted" to a chapter that exists in the skill's references/ directory`,
      ));
      const triggers = consulted.filter((c) => SECURITY_TRIGGER_CHAPTERS.includes(c));
      const needsSecurity = triggers.length > 0 && !consulted.includes('security.md');
      out.push(check(
        'p1:task.md "## Consulted" includes security.md alongside web/backend chapters',
        !needsSecurity,
        needsSecurity
          ? `${triggers.join(', ')} consulted without security.md — add a "- security.md" line to "## Consulted" in task.md`
          : (triggers.length ? 'security.md is consulted alongside the web/backend chapter(s)' : 'no web/backend chapter consulted, security.md not required'),
      ));
    }
    const tgt = parseTarget(raw);
    out.push(check(
      'p1:task.md "## Target" has a non-placeholder target line',
      tgt.present && tgt.target !== null,
      !tgt.present
        ? '"## Target" section not found in task.md — add the section with a single content line: the target repo path, or "none" for a plan-only run'
        : (tgt.target !== null
          ? `target: ${tgt.target}`
          : '"## Target" has no content line — add a single line under "## Target" with the target repo path, or "none" for a plan-only run (the EXAMPLE line does not count)'),
    ));
  }
  return out;
}

function refUrlSet(skillRoot) {
  const set = new Set();
  const refDir = path.join(skillRoot, 'references');
  let files = [];
  try { files = readdirSync(refDir).filter((f) => f.toLowerCase().endsWith('.md')); } catch { return set; }
  for (const f of files) {
    const t = readQuiet(path.join(refDir, f));
    if (t !== null) for (const u of extractUrls(t)) set.add(u);
  }
  return set;
}

function checksP2(dir, skillRoot, withDesign) {
  const out = [];
  out.push(checkGateLog(dir, 'p2', 'p1'));
  const rawDec = readQuiet(path.join(dir, 'decisions.md'));
  const dec = rawDec === null ? null : stripPlaceholders(rawDec);
  if (dec === null) {
    out.push(check('p2:decisions.md has >= 2 "## D<n>" entries', false, 'file missing: decisions.md — run --init <dir> to scaffold it from templates/, then record the phase decisions'));
    out.push(check('p2:decisions.md blocks have "options considered"+"why"+"sources"', false, 'file missing: decisions.md — run --init <dir> to scaffold it from templates/, then record the phase decisions'));
    out.push(check('p2:decisions.md URL also in references/*.md', false, 'file missing: decisions.md — run --init <dir> to scaffold it from templates/, then record the phase decisions'));
    out.push(check('p2:decisions.md has an "Approval:" line', false, 'file missing: decisions.md — run --init <dir> to scaffold it from templates/, then record the phase decisions'));
  } else {
    // Approval provenance: one non-placeholder "Approval:" line anywhere in
    // decisions.md — either who approved and when, or the exact sanctioned
    // not-required form for small, reversible work.
    const approvalLines = rawDec.split('\n').filter((l) => {
      const m = l.trim().match(/^Approval:\s*(.+)$/);
      return m !== null && !isPlaceholderLine(l) && m[1].trim().length > 0;
    });
    out.push(check(
      'p2:decisions.md has an "Approval:" line',
      approvalLines.length >= 1,
      approvalLines.length >= 1
        ? `found: "${approvalLines[0].trim().slice(0, 120)}"`
        : 'no non-placeholder "Approval:" line in decisions.md — add "Approval: <name/date>" or "Approval: not required — small and reversible" (the EXAMPLE line does not count)',
    ));
    const blocks = decisionBlocks(dec);
    // >= 2 entries (checked next): one decision proves no alternatives were weighed; two is the smallest count that proves a choice happened.
    out.push(check('p2:decisions.md has >= 2 "## D<n>" entries', blocks.length >= 2, `found ${blocks.length} substantive, need >= 2`));
    if (blocks.length === 0) {
      out.push(check('p2:decisions.md blocks have "options considered"+"why"+"sources"', false, 'no substantive decision blocks found'));
    } else {
      const bad = [];
      blocks.forEach((b, i) => {
        const low = b.toLowerCase();
        const missing = ['options considered', 'why', 'sources'].filter((s) => !low.includes(s));
        if (missing.length) bad.push(`block ${i + 1} missing: ${missing.join(', ')}`);
      });
      out.push(check(
        'p2:decisions.md blocks have "options considered"+"why"+"sources"',
        bad.length === 0,
        bad.length === 0 ? `${blocks.length} blocks, all contain the required strings` : bad.join('; '),
      ));
    }
    const decUrls = new Set(extractUrls(dec));
    const refs = refUrlSet(skillRoot);
    const hit = [...decUrls].filter((u) => refs.has(u));
    out.push(check(
      'p2:decisions.md URL also in references/*.md',
      hit.length >= 1,
      hit.length >= 1
        ? `matched: ${hit.slice(0, 3).join(', ')}${hit.length > 3 ? ` (+${hit.length - 3} more)` : ''}`
        : `${decUrls.size} substantive URL(s) in decisions.md, 0 also present in references/*.md`,
    ));
    if (blocks.length > 0) {
      const thin = [];
      for (const b of blocks) {
        const num = (b.match(/^##\s*D(\d+)/im) || [])[1] ?? '?';
        const len = b.replace(/\s+/g, ' ').trim().length;
        // 150 chars: options considered + why + sources cannot be stated honestly in less; below it the block is a stub.
        if (len < 150) thin.push(`D${num} (${len} chars, need >= 150)`);
      }
      out.push(check(
        'p2:decisions.md blocks are substantive (>= 150 chars each)',
        thin.length === 0,
        thin.length === 0
          ? `${blocks.length} blocks, all >= 150 chars`
          : `thin blocks: ${thin.join('; ')} — write real options, reasons, and sources`,
      ));
    }
    {
      // Cross-reference: decisions must name a file path that also appears
      // in task.md "## File changes" — proves decisions connect to the plan.
      const rawTaskX = readQuiet(path.join(dir, 'task.md'));
      const tx = rawTaskX === null ? null : stripPlaceholders(rawTaskX);
      if (tx === null) {
        out.push(check('p2:decisions.md names a file path from task.md "## File changes"', false, 'file missing: task.md — run --init <dir> to scaffold it from templates/, then fill it in'));
      } else {
        const fc = sectionAfter(tx, /^##\s*file changes\s*$/im, /^##\s/m);
        const planPaths = fc ? extractPaths(fc) : new Set();
        const decPaths = extractPaths(dec);
        const shared = [...decPaths].filter((p) => planPaths.has(p));
        out.push(check(
          'p2:decisions.md names a file path from task.md "## File changes"',
          shared.length >= 1,
          shared.length >= 1
            ? `shared path(s): ${shared.slice(0, 3).join(', ')}`
            : `no overlap — decisions.md paths: ${[...decPaths].slice(0, 4).join(', ') || '(none)'}; `
              + `"## File changes" paths: ${[...planPaths].slice(0, 4).join(', ') || '(none)'} — name a planned file in a decision`,
        ));
      }
    }
  }

  const rawGrill = readQuiet(path.join(dir, 'grill.md'));
  const grill = rawGrill === null ? null : stripPlaceholders(rawGrill);
  if (grill === null) {
    out.push(check('p2:grill.md has >= 1 "## round" header and >= 3 "Q:" lines', false, 'file missing: grill.md — run --init <dir> to scaffold it from templates/, then run the grill in it'));
  } else {
    const rounds = (grill.match(/^##\s*round/gim) || []).length;
    const qLines = grill.split('\n').filter((l) => /^\s*Q:\s*\S/.test(l));
    const aLines = grill.split('\n').filter((l) => /^\s*A:\s*\S/.test(l));
    // 30 chars: a real Q or A names a subject and a stake; rubber stamps ("looks good?", "yes") fit in ~10, so 30 forces specifics.
    const shortQ = qLines.filter((l) => l.replace(/^\s*Q:\s*/, '').trim().length < 30);
    const shortA = aLines.filter((l) => l.replace(/^\s*A:\s*/, '').trim().length < 30);
    // >= 1 round, >= 3 questions: one round is the minimum recorded interrogation, and three questions is the smallest set covering goal, constraints, and failure modes.
    const ok = rounds >= 1 && qLines.length >= 3 && shortQ.length === 0
      && aLines.length >= qLines.length && shortA.length === 0;
    const bits = [
      `rounds: ${rounds} (need >= 1)`,
      `Q: lines: ${qLines.length} (need >= 3, each >= 30 chars)`,
      `A: lines: ${aLines.length} (need >= Q: count, each >= 30 chars)`,
    ];
    if (shortQ.length) bits.push(`short Q: (< 30 chars): ${shortQ.map((l) => `"${l.trim().slice(0, 60)}"`).join('; ')}`);
    if (shortA.length) bits.push(`short A: (< 30 chars): ${shortA.map((l) => `"${l.trim().slice(0, 60)}"`).join('; ')}`);
    out.push(check('p2:grill.md rounds + substantive Q:/A: (>= 30 chars each, every Q answered)', ok, bits.join('; ')));
  }

  // Explicit stop predicate: the grill ends with a recorded "(plan updated: yes|no)",
  // never a self-judged "I think we're done".
  const stopLines = grill === null ? [] : grill.split('\n').filter((l) => /\(plan updated:\s*(yes|no)\)/i.test(l));
  out.push(check(
    'p2:grill.md has explicit stop predicate "(plan updated: yes/no)"',
    grill !== null && stopLines.length >= 1,
    grill === null ? 'file missing: grill.md — run --init <dir> to scaffold it from templates/, then run the grill in it' : (stopLines.length >= 1 ? `found ${stopLines.length}` : 'no "(plan updated: yes/no)" line — the stop condition must be recorded, not self-judged'),
  ));

  // Rubric-anchored critique: the ## Rubric section must survive in grill.md so
  // answers are scored against explicit criteria, not open-ended "is this good?".
  const hasRubric = grill !== null && /^##\s*rubric/im.test(grill);
  out.push(check(
    'p2:grill.md keeps the "## Rubric" section',
    hasRubric,
    hasRubric ? 'present' : '"## Rubric" section missing — restore it from templates/grill.md and score each answer against it',
  ));

  // Separate judge pass: after the rounds, a distinct verdict step (not the same
  // breath as the answers) — the structural fix for rationalized self-review.
  const verdicts = grill === null ? [] : grill.split('\n').filter((l) => /^\s*verdict:/i.test(l));
  // >= 2 verdicts of >= 20 chars: one verdict is self-review, and under 20 chars only "ok"/"fine" fit — neither is a judged ruling.
  const shortV = verdicts.filter((l) => l.replace(/^\s*verdict:\s*/i, '').trim().length < 20);
  const vok = verdicts.length >= 2 && shortV.length === 0;
  let vdetail = `found ${verdicts.length} (need >= 2, each >= 20 chars)`;
  if (shortV.length) vdetail += `; too short: ${shortV.map((l) => `"${l.trim().slice(0, 60)}"`).join('; ')}`;
  out.push(check('p2:grill.md "## Judge pass" has >= 2 substantive "Verdict:" lines', grill !== null && vok, grill === null ? 'file missing: grill.md — run --init <dir> to scaffold it from templates/, then run the grill in it' : vdetail));

  const rawTask = readQuiet(path.join(dir, 'task.md'));
  const task = rawTask === null ? null : stripPlaceholders(rawTask);
  if (task === null) {
    out.push(check('p2:task.md "## Failure modes" has >= 3 bullets', false, 'file missing: task.md — run --init <dir> to scaffold it from templates/, then fill it in'));
  } else {
    const sec = sectionAfter(task, /^##\s*failure modes\s*$/im, /^##\s/m);
    if (sec === null) {
      out.push(check('p2:task.md "## Failure modes" has >= 3 bullets', false, '"## Failure modes" section not found in task.md — add the section and list at least three substantive failure-mode bullets'));
    } else {
      const bullets = sec.split('\n').filter((l) => /^\s*[-*]\s*\S/.test(l));
      // >= 3 bullets of >= 20 chars: fewer than three means the happy path was never stress-tested, and 20 chars forces a named failure instead of "it breaks".
      const short = bullets.filter((l) => l.replace(/^\s*[-*]\s*/, '').trim().length < 20);
      const ok = bullets.length >= 3 && short.length === 0;
      let detail = `found ${bullets.length} (need >= 3)`;
      if (short.length) detail += `; too short (< 20 chars): ${short.map((l) => `"${l.trim().slice(0, 60)}"`).join('; ')}`;
      out.push(check('p2:task.md "## Failure modes" has >= 3 substantive bullets (>= 20 chars each)', ok, detail));
    }
  }

  if (withDesign) {
    const rawDesign = readQuiet(path.join(dir, 'design.md'));
    const design = rawDesign === null ? null : stripPlaceholders(rawDesign);
    if (design === null) {
      out.push(check('p2:design.md has >= 2 "### direction" sections', false, 'file missing: design.md — create it from templates/design.md (this check runs only with --design)'));
      out.push(check('p2:design.md has a "## decision" line', false, 'file missing: design.md — create it from templates/design.md (this check runs only with --design)'));
      out.push(check('p2:design.md direction blocks are substantive (>= 150 chars each)', false, 'file missing: design.md — create it from templates/design.md (this check runs only with --design)'));
    } else {
      // >= 2 directions: a single direction is a default, not a design decision; two proves alternatives were actually compared.
      const dirs = (design.match(/^###\s*direction/gim) || []).length;
      const decLine = /^##\s*decision/im.test(design);
      out.push(check('p2:design.md has >= 2 substantive "### direction" sections', dirs >= 2, `found ${dirs}, need >= 2`));
      out.push(check('p2:design.md has a substantive "## decision" line', decLine, decLine ? 'present' : 'not found — add a "## decision" section naming the chosen direction'));
      // Substance floor per direction block, same 150-char rule (and same
      // rationale) as the decisions.md blocks above: a direction that fits
      // in a tweet has no trade-offs stated, so it was never really weighed.
      const dblocks = directionBlocks(design);
      const thinDirs = [];
      dblocks.forEach((b, i) => {
        const len = b.replace(/\s+/g, ' ').trim().length;
        if (len < 150) thinDirs.push(`direction ${i + 1} (${len} chars, need >= 150)`);
      });
      out.push(check(
        'p2:design.md direction blocks are substantive (>= 150 chars each)',
        dblocks.length > 0 && thinDirs.length === 0,
        dblocks.length === 0
          ? 'no "### direction" blocks found — add at least two direction blocks of >= 150 chars each to design.md'
          : (thinDirs.length === 0
            ? `${dblocks.length} direction blocks, all >= 150 chars`
            : `thin blocks: ${thinDirs.join('; ')} — expand each direction with its approach, costs, and trade-offs`),
      ));
    }
  }
  return out;
}

function checksP3(dir) {
  const out = [];
  out.push(checkGateLog(dir, 'p3', 'p2'));
  const tasks = readQuiet(path.join(dir, 'tasks.md'));
  if (tasks === null) {
    out.push(check('p3:every checkbox line has a substantive "done when"', false, 'file missing: tasks.md — run --init <dir> to scaffold it from templates/, then replace the example tasks with real ones'));
    out.push(check('p3:tasks.md has >= 1 done task', false, 'file missing: tasks.md — run --init <dir> to scaffold it from templates/, then replace the example tasks with real ones'));
  } else {
    const lines = stripPlaceholders(tasks).split('\n');
    const boxes = lines.filter((line) => /^\s*-\s*\[[ xX]\]/.test(line));
    if (boxes.length === 0) {
      out.push(check('p3:every checkbox line has a substantive "done when"', false, 'no substantive task lines (template examples do not count — replace them with real tasks)'));
      out.push(check('p3:tasks.md has >= 1 done task', false, 'no substantive task lines — replace the template examples in tasks.md with real tasks and mark at least one "- [x]" when its work is actually done'));
    } else {
      const bad = [];
      let open = 0, done = 0;
      for (const line of boxes) {
        if (/^\s*-\s*\[[xX]\]/.test(line)) done++; else open++;
        if (!substantiveDoneWhen(line)) bad.push(line.trim().slice(0, 120));
      }
      const detail = bad.length === 0
        ? `all ${open + done} checkbox lines have a substantive "done when" (open: ${open}, done: ${done})`
        : `${bad.length} violating line(s) (open: ${open}, done: ${done}): ${bad.map((b) => `"${b}"`).join('; ')}`;
      out.push(check('p3:every checkbox line has a substantive "done when"', bad.length === 0, detail));
      // >= 1 done: p3 is the build phase — passing it with zero completed
      // tasks certifies work that never happened.
      out.push(check(
        'p3:tasks.md has >= 1 done task',
        done >= 1,
        done >= 1
          ? `${done} done, ${open} open`
          : 'done-task count is 0 — complete at least one real task and mark it "- [x]" in tasks.md before running the p3 gate',
      ));
    }
  }
  // Progress provenance: at least one real dated entry. A dated heading
  // counts only when its block holds non-placeholder content lines — the
  // template's own "## 2026-10-13" heading survives stripping but all of
  // its EXAMPLE bullets do not, so a fresh scaffold still fails here.
  const rawProg = readQuiet(path.join(dir, 'progress.md'));
  if (rawProg === null) {
    out.push(check('p3:progress.md has >= 1 non-template dated entry', false, 'file missing: progress.md — run --init <dir> to scaffold it from templates/, then log the work under a "## YYYY-MM-DD" heading'));
  } else {
    const plines = stripPlaceholders(rawProg).split('\n');
    let datedEntries = 0;
    for (let i = 0; i < plines.length; i++) {
      if (!/^##\s*\d{4}-\d{2}-\d{2}\s*$/.test(plines[i].trim())) continue;
      let hasContent = false;
      for (let j = i + 1; j < plines.length; j++) {
        if (/^##\s/.test(plines[j])) break;
        if (plines[j].trim().length > 0) { hasContent = true; break; }
      }
      if (hasContent) datedEntries++;
    }
    out.push(check(
      'p3:progress.md has >= 1 non-template dated entry',
      datedEntries >= 1,
      datedEntries >= 1
        ? `found ${datedEntries} dated entr${datedEntries === 1 ? 'y' : 'ies'} with real content`
        : 'no dated entry with real content — add a "## YYYY-MM-DD" heading (today\'s date) to progress.md with at least one real "- done: ..." line under it; the template\'s EXAMPLE lines do not count',
    ));
  }
  return out;
}

/** Required "## Audits run" rows, derived (never flagged) from the run's
 *  own records. Script-token patterns accept the sanctioned name variants:
 *  audit-repo ships as .sh and .mjs; the others as .mjs (a .sh wrapper is
 *  accepted too); floor-guard is a review pass, not a script file, so it
 *  takes an optional scripts/ prefix. */
const AUDIT_SCRIPT_PATTERNS = {
  'audit-repo': String.raw`scripts/audit-repo(?:\.(?:sh|mjs))?`,
  'readiness-audit': String.raw`scripts/readiness-audit(?:\.(?:sh|mjs))?`,
  'prose-scan': String.raw`scripts/prose-scan(?:\.(?:sh|mjs))?`,
  'floor-guard': String.raw`(?:scripts/)?floor-guard(?:\.(?:sh|mjs))?`,
};
const AUDIT_ROW_EXAMPLES = {
  'audit-repo': '- `scripts/audit-repo.sh` — verdict: pass',
  'readiness-audit': '- `scripts/readiness-audit.mjs` — verdict: pass',
  'prose-scan': '- `scripts/prose-scan.mjs` — verdict: pass',
  'floor-guard': '- `floor-guard` — verdict: pass',
};

function requiredAudits(dir) {
  const ids = ['audit-repo']; // always: the repo audit runs on every build
  const rawTask = readQuiet(path.join(dir, 'task.md'));
  const consulted = rawTask === null ? [] : (parseConsulted(rawTask) ?? []);
  if (consulted.includes('web-frontend.md') || consulted.includes('react-nextjs.md')) ids.push('readiness-audit');
  let prose = consulted.includes('writing-craft.md');
  if (!prose && rawTask !== null) {
    const fc = sectionAfter(stripPlaceholders(rawTask), /^##\s*file changes\s*$/im, /^##\s/m);
    // Any planned .md change is user-facing prose, so the prose scan applies.
    if (fc !== null && /[\w./-]+\.md\b/.test(fc)) prose = true;
  }
  if (prose) ids.push('prose-scan');
  const tgt = rawTask === null ? { target: null } : parseTarget(rawTask);
  if (tgt.target !== null && tgt.target !== 'none') {
    const resolved = path.isAbsolute(tgt.target) ? tgt.target : path.resolve(dir, tgt.target);
    // floor-guard exists only where a project floor exists: a CONSTRAINTS.md
    // in an on-disk target repo.
    if (existsSync(resolved) && existsSync(path.join(resolved, 'CONSTRAINTS.md'))) ids.push('floor-guard');
  }
  return ids;
}

function checksAudits(dir, report) {
  const out = [];
  const ids = requiredAudits(dir);
  const sec = report === null ? null : sectionAfter(report, /^##\s*audits run\s*$/im, /^##\s/m);
  for (const id of ids) {
    const name = `p4:report.md "## Audits run" has a "${id}" row with verdict pass / reasoned cannot-verify`;
    if (report === null) {
      out.push(check(name, false, 'file missing: report.md — run --init <dir> to scaffold it from templates/, then write the report'));
      continue;
    }
    if (sec === null) {
      out.push(check(name, false, `"## Audits run" section not found in report.md — add the section and a row "${AUDIT_ROW_EXAMPLES[id]}" (or the same row with "verdict: cannot verify — <reason of >= 20 chars>")`));
      continue;
    }
    const tokenRe = new RegExp('`' + AUDIT_SCRIPT_PATTERNS[id] + '`');
    const row = sec.split('\n').find((l) => tokenRe.test(l));
    if (!row) {
      out.push(check(name, false, `no "${id}" row in "## Audits run" — add the row "${AUDIT_ROW_EXAMPLES[id]}" (or the same row with "verdict: cannot verify — <reason of >= 20 chars>")`));
      continue;
    }
    const m = row.match(/verdict:\s*(pass|cannot verify)\b(.*)$/i);
    if (!m) {
      out.push(check(name, false, `"${id}" row has no sanctioned verdict — end the row with "verdict: pass" or "verdict: cannot verify — <reason of >= 20 chars>": "${row.trim().slice(0, 120)}"`));
      continue;
    }
    if (/^pass$/i.test(m[1].trim())) {
      out.push(check(name, true, `"${id}" row verdict: pass`));
      continue;
    }
    // cannot verify: the reason after the second em dash must be real.
    // >= 20 chars: the same floor as failure-mode bullets — "n/a" / "not run"
    // fit well under 20 and name no cause; a real blocker does not.
    const rm = (m[2] || '').match(/^\s*[—-]\s*(.+)$/);
    const reason = rm ? rm[1].trim() : '';
    if (reason.length >= 20) {
      const c = check(name, true, `"${id}" row verdict: cannot verify — ${reason} (accepted; recorded as unverified in gate-log.md)`);
      c.unverified = [id];
      out.push(c);
    } else {
      out.push(check(name, false, `"${id}" row says "cannot verify" but the reason is ${reason.length} chars (need >= 20) — state the concrete blocker after "verdict: cannot verify — ", or run the audit and record "verdict: pass"`));
    }
  }
  return out;
}

/** When review-loop.md was consulted, the review must leave artifacts:
 *  review.md with real base/head refs, substantive verdicts, and an explicit
 *  declined-to-judge section (which may honestly state none). */
function checksReview(dir) {
  const out = [];
  const rawRev = readQuiet(path.join(dir, 'review.md'));
  const lineValue = (label) => {
    if (rawRev === null) return null;
    const m = rawRev.match(new RegExp(`^${escRe(label)}:\\s*(.*)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const realValue = (v) => v !== null && v.length > 0 && !EXAMPLE_RE.test(v) && !PLACEHOLDER_RE.test(v);
  if (rawRev === null) {
    const miss = 'file missing: review.md — review-loop.md is in "## Consulted", so create review.md in the run dir (run --init <dir> to scaffold it) and record the review in it';
    out.push(check('p4:review.md has non-placeholder "BASE:"/"HEAD:" lines', false, miss));
    out.push(check('p4:review.md "Spec verdict:"/"Quality verdict:" lines are substantive (>= 20 chars)', false, miss));
    out.push(check('p4:review.md has a "## Declined to judge" section', false, miss));
    return out;
  }
  const base = lineValue('BASE');
  const head = lineValue('HEAD');
  const refsOk = realValue(base) && realValue(head);
  out.push(check(
    'p4:review.md has non-placeholder "BASE:"/"HEAD:" lines',
    refsOk,
    refsOk
      ? `BASE: ${base}; HEAD: ${head}`
      : 'review.md needs real "BASE: <base ref>" and "HEAD: <head ref>" lines naming the reviewed range (the EXAMPLE lines do not count)',
  ));
  const spec = lineValue('Spec verdict');
  const qual = lineValue('Quality verdict');
  // >= 20 chars: same floor as grill verdicts — under it only "ok"/"fine" fit.
  const badVerdicts = [['Spec verdict', spec], ['Quality verdict', qual]]
    .filter(([, v]) => !realValue(v) || v.length < 20)
    .map(([label, v]) => `${label} (${v === null ? 'missing' : `${v.length} chars`})`);
  out.push(check(
    'p4:review.md "Spec verdict:"/"Quality verdict:" lines are substantive (>= 20 chars)',
    badVerdicts.length === 0,
    badVerdicts.length === 0
      ? 'both verdicts present and >= 20 chars'
      : `fix in review.md: ${badVerdicts.join('; ')} — write a real one-line verdict of >= 20 chars for each (EXAMPLE lines do not count)`,
  ));
  const hasDeclined = /^##\s*declined to judge\s*$/im.test(rawRev);
  out.push(check(
    'p4:review.md has a "## Declined to judge" section',
    hasDeclined,
    hasDeclined ? 'present' : '"## Declined to judge" section not found in review.md — add the section (it may state "- none" when nothing was declined)',
  ));
  return out;
}

function checksP4(dir, strict, checklistFiles, skillRoot) {
  const out = [];
  out.push(checkGateLog(dir, 'p4', 'p3'));
  const raw = readQuiet(path.join(dir, 'report.md'));
  const report = raw === null ? null : stripPlaceholders(raw);
  // Derived attestation set: every chapter in task.md "## Consulted" is
  // attested by default. CLI --checklists entries only ADD to this set —
  // they can never subset it away.
  const rawTask4 = readQuiet(path.join(dir, 'task.md'));
  const consulted4 = rawTask4 === null ? [] : (parseConsulted(rawTask4) ?? []);
  const effectiveChecklists = [...new Set([...consulted4, ...(checklistFiles || [])])];
  if (report === null) {
    out.push(check('p4:report.md "## Verification" has a pass verdict', false, 'file missing: report.md — run --init <dir> to scaffold it from templates/, then write the report'));
  } else {
    // >= 1 pass verdict line inside the section (checked below): an empty or verdict-free Verification section is not evidence the work was checked.
    const sec = sectionAfter(report, /^##\s*verification\s*$/im, /^##\s/m);
    if (sec === null) {
      out.push(check('p4:report.md "## Verification" has a pass verdict', false, '"## Verification" section not found in report.md — add the section and record an explicit pass verdict line in it'));
    } else {
      // Word-boundary pass token: "pass", "passes" or "passed" as a whole
      // word. A bare /pass/i substring also matches "password" — a line
      // about a password flow is not a verification verdict.
      const verdicts = sec.split('\n').filter((l) => /\bpass(?:ed|es)?\b/i.test(l) || /\[x\]/i.test(l));
      out.push(check(
        'p4:report.md "## Verification" has a pass verdict',
        verdicts.length >= 1,
        verdicts.length >= 1 ? `verdict line(s): ${verdicts.length}` : 'no line with a whole-word pass verdict (pass/passes/passed) or a checked [x] item in the section — add an explicit verdict line such as "result: pass" (note: "password" does not count)',
      ));
    }
  }
  for (const entry of effectiveChecklists) {
    // Resolve relative to skill root, falling back to references/<entry>.
    let p = path.resolve(skillRoot, entry);
    let t = readQuiet(p);
    if (t === null) {
      p = path.resolve(skillRoot, 'references', entry);
      t = readQuiet(p);
    }
    const base = path.basename(p);
    const name = `p4 --checklists:${base} attested "<basename>: <p> pass, <w> waived"`;
    if (t === null) {
      out.push(check(name, false, `checklist file not found: ${entry} (tried skill root and references/)`));
      continue;
    }
    const items = t.split('\n').filter((l) => /^\s*-\s*\[[ xX]\]/.test(l)).length;
    const sec = report === null ? null : sectionAfter(report, /^##\s*checklist attestation\s*$/im, /^##\s/m);
    if (sec === null) {
      out.push(check(name, false, `"## Checklist attestation" section not found in report.md — need "${base}: <p> pass, <w> waived" with p+w = ${items}`));
      continue;
    }
    const m = sec.match(new RegExp(`^${escRe(base)}\\s*:\\s*(\\d+)\\s*pass\\s*,\\s*(\\d+)\\s*waived`, 'im'));
    if (!m) {
      out.push(check(name, false, `no line "${base}: <p> pass, <w> waived" in attestation section (${base} has ${items} checklist items)`));
      continue;
    }
    const sum = parseInt(m[1], 10) + parseInt(m[2], 10);
    out.push(check(
      name,
      sum === items,
      sum === items
        ? `${m[1]} pass + ${m[2]} waived = ${items} items`
        : `attested ${m[1]} pass + ${m[2]} waived = ${sum}, but ${base} has ${items} checklist items — account for every item`,
    ));
  }
  if (strict) {
    if (report === null) {
      out.push(check('p4 --strict:no unnegated "fail" line', false, 'file missing: report.md — run --init <dir> to scaffold it from templates/, then write the report'));
    } else {
      const bad = report.split('\n').filter((l) => /\bfail/i.test(l) && !/\bno\b.*\bfail/i.test(l));
      out.push(check(
        'p4 --strict:no unnegated "fail" line',
        bad.length === 0,
        bad.length === 0 ? 'no offending lines' : `${bad.length} line(s): ${bad.map((b) => `"${b.trim().slice(0, 120)}"`).join('; ')}`,
      ));
    }
  }
  out.push(...checksAudits(dir, report));
  if (consulted4.includes('review-loop.md')) out.push(...checksReview(dir));
  return out;
}

/** p4 --critical: every MUST item in references/critical-path.md is either
 *  reviewed-clean or explicitly waived with a reason. The gate cannot check
 *  rule compliance itself — it checks the attestation, so nothing on the
 *  critical path is ever silently dropped. */
function checksCritical(dir, skillRoot) {
  const out = [];
  const name = 'p4 --critical:report.md "## Critical-path" attests every MUST item';
  const cp = readQuiet(path.join(skillRoot, 'references', 'critical-path.md'));
  if (cp === null) {
    out.push(check(name, false, 'references/critical-path.md not found under skill root — check that --skill-root points at the build-craft skill directory'));
    return out;
  }
  const items = cp.split('\n').filter((l) => /^\s*-\s*\[[ xX]\]/.test(l)).length;
  const raw = readQuiet(path.join(dir, 'report.md'));
  const report = raw === null ? null : stripPlaceholders(raw);
  if (report === null) {
    out.push(check(name, false, 'file missing: report.md — run --init <dir> to scaffold it from templates/, then write the report'));
    return out;
  }
  const sec = sectionAfter(report, /^##\s*critical-path\s*$/im, /^##\s/m);
  if (sec === null) {
    out.push(check(name, false, `"## Critical-path" section not found in report.md — attest all ${items} MUST items`));
    return out;
  }
  const allReviewed = new RegExp(`all\\s+${items}\\s+reviewed`, 'i').test(sec);
  const waiverLines = sec.split('\n').filter((l) => /waiv/i.test(l));
  // 30 chars: a waiver must name the risk being accepted; "n/a" / "skip" fit well under 30, a real reason does not.
  const shortWaivers = waiverLines.filter((l) => l.trim().length < 30);
  const noWaivers = /\bno\s+waivers\b/i.test(sec) && waiverLines.length === 0;
  const ok = allReviewed || noWaivers || (waiverLines.length >= 1 && shortWaivers.length === 0);
  let detail;
  if (allReviewed) detail = `"all ${items} reviewed" — matches critical-path.md item count`;
  else if (noWaivers) detail = '"no waivers" declared';
  else if (waiverLines.length >= 1 && shortWaivers.length === 0) detail = `${waiverLines.length} reasoned waiver(s)`;
  else if (shortWaivers.length) detail = `waiver lines need reasons (>= 30 chars): ${shortWaivers.map((l) => `"${l.trim().slice(0, 60)}"`).join('; ')}`;
  else detail = `need "all ${items} reviewed", "no waivers", or per-item waiver lines with reasons`;
  out.push(check(name, ok, detail));
  return out;
}

// ---------------------------------------------------------------------------
// --init
// ---------------------------------------------------------------------------

/** Append a canonical scaffold block to a copied template when its section
 *  is absent, so --init output carries the current format contract even if
 *  the templates dir lags it. Never duplicates a section the template
 *  already has. The appended lines are EXAMPLE placeholders: they scaffold
 *  the shape and (by the placeholder rule) can never satisfy a gate. */
function ensureScaffoldSection(file, headerRe, block) {
  const t = readQuiet(file);
  if (t === null || headerRe.test(t)) return;
  appendFileSync(file, (t.endsWith('\n') ? '' : '\n') + block);
}

function ensureCanonicalSections(targetDir) {
  ensureScaffoldSection(
    path.join(targetDir, 'task.md'),
    /^##\s*target\s*$/im,
    '\n## Target\n\nEXAMPLE: /path/to/target-repo (or: none)\n',
  );
  ensureScaffoldSection(
    path.join(targetDir, 'task.md'),
    /^##\s*consulted\s*$/im,
    '\n## Consulted\n\n- EXAMPLE: security.md\n',
  );
  ensureScaffoldSection(
    path.join(targetDir, 'decisions.md'),
    /^\s*Approval:/m,
    '\nApproval: EXAMPLE: <name/date>, or: not required — small and reversible\n',
  );
  ensureScaffoldSection(
    path.join(targetDir, 'report.md'),
    /^##\s*audits run\s*$/im,
    '\n## Audits run\n\n- `scripts/audit-repo.sh` — verdict: EXAMPLE\n',
  );
}

function runInit(targetDir, skillRoot) {
  mkdirSync(targetDir, { recursive: true });
  // gate-log.md starts empty; phase successes append to it. Never truncate
  // an existing log — it is the run's chaining provenance.
  const gateLog = path.join(targetDir, 'gate-log.md');
  if (!existsSync(gateLog)) {
    writeFileSync(gateLog, '');
    console.log('created gate-log.md (empty)');
  }
  const tplDir = path.join(skillRoot, 'templates');
  let files;
  try { files = new Set(readdirSync(tplDir)); }
  catch {
    console.error(`[warn] templates dir not found: ${tplDir}; nothing copied — check that --skill-root points at the build-craft skill directory`);
    console.log(`initialized dir (no templates copied): ${targetDir}`);
    return;
  }
  let copied = 0;
  for (const f of TEMPLATE_FILES) {
    if (!files.has(f)) {
      if (f === 'review.md') {
        // Embedded canonical fallback so a run dir always gets a review.md
        // scaffold even when templates/ has not caught up yet.
        const dest = path.join(targetDir, f);
        if (!existsSync(dest)) writeFileSync(dest, REVIEW_TEMPLATE);
        console.log('scaffolded review.md (embedded fallback — templates/review.md missing)');
        copied++;
        continue;
      }
      console.error(`[warn] template missing: ${path.join(tplDir, f)} (skipped — restore it in the skill templates directory)`);
      continue;
    }
    copyFileSync(path.join(tplDir, f), path.join(targetDir, f));
    console.log(`copied ${f}`);
    copied++;
  }
  ensureCanonicalSections(targetDir);
  console.log(`initialized ${targetDir} with ${copied}/${TEMPLATE_FILES.length} templates`);
}

/** Append the success line to <dir>/gate-log.md:
 *  "pN PASS <ISO-8601 timestamp>", plus " flags: ..." when CLI flags were
 *  passed, plus " unverified: <audit names>" when p4 passed with
 *  cannot-verify audit rows. This log is what the next phase chains on. */
function appendGateLog(dir, phase, args, unverified) {
  const flags = [];
  if (args.design) flags.push('--design');
  if (args.strict) flags.push('--strict');
  if (args.checklists) flags.push(`--checklists ${args.checklists}`);
  if (args.critical) flags.push('--critical');
  let line = `${phase} PASS ${new Date().toISOString()}`;
  if (flags.length) line += ` flags: ${flags.join(' ')}`;
  if (unverified.length) line += ` unverified: ${unverified.join(', ')}`;
  try {
    appendFileSync(path.join(dir, 'gate-log.md'), `${line}\n`);
  } catch {
    console.error('[warn] GATE PASS but gate-log.md could not be appended — the next phase will fail its chaining check until the log is writable');
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  const skillRoot = resolveSkillRoot(args.skillRoot);
  ECHO_TPL_DIR = path.join(skillRoot, 'templates');

  if (args.init) {
    runInit(path.resolve(args.init), skillRoot);
    return;
  }
  if (!args.phase) usage(2);
  if (!['p1', 'p2', 'p3', 'p4'].includes(args.phase)) {
    console.error(`invalid phase: ${args.phase} (expected p1|p2|p3|p4)`);
    process.exit(2);
  }
  if (!args.dir) {
    console.error('--phase requires --dir <dir> — pass the directory holding the phase files, e.g. --phase p1 --dir ./run');
    process.exit(2);
  }

  const dir = path.resolve(args.dir);
  const checklistFiles = args.checklists ? args.checklists.split(',').map((s) => s.trim()).filter(Boolean) : [];
  let results;
  if (args.phase === 'p1') results = checksP1(dir, skillRoot);
  else if (args.phase === 'p2') results = checksP2(dir, skillRoot, args.design);
  else if (args.phase === 'p3') results = checksP3(dir);
  else {
    results = checksP4(dir, args.strict, checklistFiles, skillRoot);
    // Critical-path attestation runs by default at p4 (derived, not
    // flagged); --critical remains accepted and is recorded in the log.
    results.push(...checksCritical(dir, skillRoot));
  }

  const failures = results.filter((r) => !r.ok);
  // Audits accepted on a "cannot verify" attestation: they pass the gate
  // but stay visible — printed as warnings here and named in the log line.
  const unverified = [...new Set(results.flatMap((r) => r.unverified || []))];
  for (const r of results) console.log(`${r.ok ? '[ok]' : '[FAIL]'} ${r.name}: ${r.detail}`);
  if (failures.length === 0) {
    for (const id of unverified) {
      console.log(`[warn] unverified audit: ${id} — passed on a "cannot verify" attestation; recorded in gate-log.md`);
    }
    appendGateLog(dir, args.phase, args, unverified);
    console.log('GATE PASS');
    process.exit(0);
  } else {
    console.log(`GATE FAIL (${failures.length} failure${failures.length === 1 ? '' : 's'})`);
    for (const f of failures) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main();
