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
 */
import { readFileSync, copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_FILES = [
  'task.md', 'tasks.md', 'decisions.md', 'grill.md',
  'design.md', 'architecture.md', 'report.md', 'progress.md',
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

  --init <dir>        create <dir> and copy the 8 template files into it
  --phase <p1..p4>    run phase gate checks against --dir
  --design            (p2 only) also enforce design.md direction/decision checks
  --strict            (p4 only) additionally fail on any /fail/ line not negated by "no ... fail"
  --checklists f1,f2  (p4 only) files (relative to skill root, or references/<name>) whose
                      "- [ ]" items must be attested in report.md "## Checklist attestation"
                      as "<basename>: <p> pass, <w> waived" with p+w == item count
  --critical          (p4 only) require report.md "## Critical-path" attesting every MUST item
                      in references/critical-path.md: "all <N> reviewed" (exact count), "no waivers",
                      or per-item waiver lines each with a reason (>= 30 chars)
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
 *  counts as a path. Used to prove decisions.md connects to the plan. */
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

function check(name, ok, detail) {
  return { name, ok: !!ok, detail };
}

// ---------------------------------------------------------------------------
// phase checks — each returns an array of check results
// ---------------------------------------------------------------------------

function checksP1(dir) {
  const out = [];
  const raw = readQuiet(path.join(dir, 'task.md'));
  const task = raw === null ? null : stripPlaceholders(raw);
  for (const h of P1_HEADERS) {
    const re = new RegExp(`^##\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
    if (task === null) out.push(check(`p1:task.md header "## ${h}"`, false, 'file missing: task.md'));
    else out.push(check(`p1:task.md header "## ${h}"`, re.test(task), re.test(task) ? 'present' : 'header not found'));
  }
  const tasks = readQuiet(path.join(dir, 'tasks.md'));
  if (tasks === null) {
    out.push(check('p1:tasks.md has "- [ ]" + "done when" line', false, 'file missing: tasks.md'));
  } else {
    const n = tasks.split('\n').filter((l) => /^\s*-\s*\[\s\]/.test(l) && substantiveDoneWhen(l)).length;
    out.push(check(
      'p1:tasks.md has "- [ ]" + substantive "done when" line',
      n >= 1,
      n >= 1 ? `found ${n}` : 'no open checkbox line with a real (non-placeholder) "done when" condition',
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
  const rawDec = readQuiet(path.join(dir, 'decisions.md'));
  const dec = rawDec === null ? null : stripPlaceholders(rawDec);
  if (dec === null) {
    out.push(check('p2:decisions.md has >= 2 "## D<n>" entries', false, 'file missing: decisions.md'));
    out.push(check('p2:decisions.md blocks have "options considered"+"why"+"sources"', false, 'file missing: decisions.md'));
    out.push(check('p2:decisions.md URL also in references/*.md', false, 'file missing: decisions.md'));
  } else {
    const blocks = decisionBlocks(dec);
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
        out.push(check('p2:decisions.md names a file path from task.md "## File changes"', false, 'file missing: task.md'));
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
    out.push(check('p2:grill.md has >= 1 "## round" header and >= 3 "Q:" lines', false, 'file missing: grill.md'));
  } else {
    const rounds = (grill.match(/^##\s*round/gim) || []).length;
    const qLines = grill.split('\n').filter((l) => /^\s*Q:\s*\S/.test(l));
    const aLines = grill.split('\n').filter((l) => /^\s*A:\s*\S/.test(l));
    const shortQ = qLines.filter((l) => l.replace(/^\s*Q:\s*/, '').trim().length < 30);
    const shortA = aLines.filter((l) => l.replace(/^\s*A:\s*/, '').trim().length < 30);
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
    grill === null ? 'file missing: grill.md' : (stopLines.length >= 1 ? `found ${stopLines.length}` : 'no "(plan updated: yes/no)" line — the stop condition must be recorded, not self-judged'),
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
  const shortV = verdicts.filter((l) => l.replace(/^\s*verdict:\s*/i, '').trim().length < 20);
  const vok = verdicts.length >= 2 && shortV.length === 0;
  let vdetail = `found ${verdicts.length} (need >= 2, each >= 20 chars)`;
  if (shortV.length) vdetail += `; too short: ${shortV.map((l) => `"${l.trim().slice(0, 60)}"`).join('; ')}`;
  out.push(check('p2:grill.md "## Judge pass" has >= 2 substantive "Verdict:" lines', grill !== null && vok, grill === null ? 'file missing: grill.md' : vdetail));

  const rawTask = readQuiet(path.join(dir, 'task.md'));
  const task = rawTask === null ? null : stripPlaceholders(rawTask);
  if (task === null) {
    out.push(check('p2:task.md "## Failure modes" has >= 3 bullets', false, 'file missing: task.md'));
  } else {
    const sec = sectionAfter(task, /^##\s*failure modes\s*$/im, /^##\s/m);
    if (sec === null) {
      out.push(check('p2:task.md "## Failure modes" has >= 3 bullets', false, '"## Failure modes" section not found in task.md'));
    } else {
      const bullets = sec.split('\n').filter((l) => /^\s*[-*]\s*\S/.test(l));
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
      out.push(check('p2:design.md has >= 2 "### direction" sections', false, 'file missing: design.md'));
      out.push(check('p2:design.md has a "## decision" line', false, 'file missing: design.md'));
    } else {
      const dirs = (design.match(/^###\s*direction/gim) || []).length;
      const decLine = /^##\s*decision/im.test(design);
      out.push(check('p2:design.md has >= 2 substantive "### direction" sections', dirs >= 2, `found ${dirs}, need >= 2`));
      out.push(check('p2:design.md has a substantive "## decision" line', decLine, decLine ? 'present' : 'not found'));
    }
  }
  return out;
}

function checksP3(dir) {
  const tasks = readQuiet(path.join(dir, 'tasks.md'));
  if (tasks === null) {
    return [check('p3:every checkbox line has a substantive "done when"', false, 'file missing: tasks.md')];
  }
  const lines = stripPlaceholders(tasks).split('\n');
  const boxes = lines.filter((line) => /^\s*-\s*\[[ xX]\]/.test(line));
  if (boxes.length === 0) {
    return [check('p3:every checkbox line has a substantive "done when"', false, 'no substantive task lines (template examples do not count — replace them with real tasks)')];
  }
  const bad = [];
  let open = 0, done = 0;
  for (const line of boxes) {
    if (/^\s*-\s*\[[xX]\]/.test(line)) done++; else open++;
    if (!substantiveDoneWhen(line)) bad.push(line.trim().slice(0, 120));
  }
  const detail = bad.length === 0
    ? `all ${open + done} checkbox lines have a substantive "done when" (open: ${open}, done: ${done})`
    : `${bad.length} violating line(s) (open: ${open}, done: ${done}): ${bad.map((b) => `"${b}"`).join('; ')}`;
  return [check('p3:every checkbox line has a substantive "done when"', bad.length === 0, detail)];
}

function checksP4(dir, strict, checklistFiles, skillRoot) {
  const out = [];
  const raw = readQuiet(path.join(dir, 'report.md'));
  const report = raw === null ? null : stripPlaceholders(raw);
  if (report === null) {
    out.push(check('p4:report.md "## Verification" has a pass verdict', false, 'file missing: report.md'));
  } else {
    const sec = sectionAfter(report, /^##\s*verification\s*$/im, /^##\s/m);
    if (sec === null) {
      out.push(check('p4:report.md "## Verification" has a pass verdict', false, '"## Verification" section not found in report.md'));
    } else {
      const verdicts = sec.split('\n').filter((l) => /pass/i.test(l) || /\[x\]/i.test(l));
      out.push(check(
        'p4:report.md "## Verification" has a pass verdict',
        verdicts.length >= 1,
        verdicts.length >= 1 ? `verdict line(s): ${verdicts.length}` : 'no line matching /pass/i or /[x]/i in the section',
      ));
    }
  }
  for (const entry of checklistFiles || []) {
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
      out.push(check('p4 --strict:no unnegated "fail" line', false, 'file missing: report.md'));
    } else {
      const bad = report.split('\n').filter((l) => /\bfail/i.test(l) && !/\bno\b.*\bfail/i.test(l));
      out.push(check(
        'p4 --strict:no unnegated "fail" line',
        bad.length === 0,
        bad.length === 0 ? 'no offending lines' : `${bad.length} line(s): ${bad.map((b) => `"${b.trim().slice(0, 120)}"`).join('; ')}`,
      ));
    }
  }
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
    out.push(check(name, false, 'references/critical-path.md not found under skill root'));
    return out;
  }
  const items = cp.split('\n').filter((l) => /^\s*-\s*\[[ xX]\]/.test(l)).length;
  const raw = readQuiet(path.join(dir, 'report.md'));
  const report = raw === null ? null : stripPlaceholders(raw);
  if (report === null) {
    out.push(check(name, false, 'file missing: report.md'));
    return out;
  }
  const sec = sectionAfter(report, /^##\s*critical-path\s*$/im, /^##\s/m);
  if (sec === null) {
    out.push(check(name, false, `"## Critical-path" section not found in report.md — attest all ${items} MUST items`));
    return out;
  }
  const allReviewed = new RegExp(`all\\s+${items}\\s+reviewed`, 'i').test(sec);
  const waiverLines = sec.split('\n').filter((l) => /waiv/i.test(l));
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

function runInit(targetDir, skillRoot) {
  mkdirSync(targetDir, { recursive: true });
  const tplDir = path.join(skillRoot, 'templates');
  let files;
  try { files = new Set(readdirSync(tplDir)); }
  catch {
    console.error(`[warn] templates dir not found: ${tplDir}; nothing copied`);
    console.log(`initialized dir (no templates copied): ${targetDir}`);
    return;
  }
  let copied = 0;
  for (const f of TEMPLATE_FILES) {
    if (!files.has(f)) {
      console.error(`[warn] template missing: ${path.join(tplDir, f)} (skipped)`);
      continue;
    }
    copyFileSync(path.join(tplDir, f), path.join(targetDir, f));
    console.log(`copied ${f}`);
    copied++;
  }
  console.log(`initialized ${targetDir} with ${copied}/${TEMPLATE_FILES.length} templates`);
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
    console.error('--phase requires --dir <dir>');
    process.exit(2);
  }

  const dir = path.resolve(args.dir);
  const checklistFiles = args.checklists ? args.checklists.split(',').map((s) => s.trim()).filter(Boolean) : [];
  let results;
  if (args.phase === 'p1') results = checksP1(dir);
  else if (args.phase === 'p2') results = checksP2(dir, skillRoot, args.design);
  else if (args.phase === 'p3') results = checksP3(dir);
  else {
    results = checksP4(dir, args.strict, checklistFiles, skillRoot);
    if (args.critical) results.push(...checksCritical(dir, skillRoot));
  }

  const failures = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? '[ok]' : '[FAIL]'} ${r.name}: ${r.detail}`);
  if (failures.length === 0) {
    console.log('GATE PASS');
    process.exit(0);
  } else {
    console.log(`GATE FAIL (${failures.length} failure${failures.length === 1 ? '' : 's'})`);
    for (const f of failures) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main();
