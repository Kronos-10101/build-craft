#!/usr/bin/env node
/**
 * prose-scan.mjs — build-craft deterministic prose anti-slop scanner.
 *
 *   node scripts/prose-scan.mjs <file-or-dir> [--json]
 *
 * Node.js stdlib only. Directory input scans .md/.txt files recursively;
 * a single file is scanned as given. Exit 0 = no hard findings, 1 = at
 * least one hard finding, 2 = usage error. Warnings never affect the exit
 * code.
 *
 * SCOPE: a small, fixed, high-signal set of AI-writing tells — chatbot
 * artifacts, throat-clearing openers, significance inflation, emphasis
 * crutches, vague unattributed claims, and em-dash overuse — plus two
 * rhythm warnings (sentence-length uniformity, signpost-opener share).
 * The pattern set is deliberately narrow: this is a tripwire, not a
 * style guide.
 *
 * MASKING: fenced code blocks, inline code spans, blockquotes, and
 * double-quoted spans are blanked out before scanning (newlines and
 * columns preserved), so documentation that *teaches* bad writing by
 * quoting it does not flag its own examples. Single quotes are NOT
 * masked: they collide with apostrophes and would hide real slop in
 * ordinary prose.
 *
 * HONEST LIMIT: a clean scan does not prove human authorship, and a
 * flagged scan does not prove machine authorship. Human writers use
 * these phrases too, and generated text can avoid every tell here.
 * Treat findings as prompts for a human read, never as a verdict.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// phrase tables
// ---------------------------------------------------------------------------

/** HARD: chatbot artifacts — residues of a chat transcript, anywhere. */
const CHATBOT_ARTIFACTS = [
  'I hope this helps',
  'Certainly!',
  'Great question',
  'as an AI language model',
  'as of my knowledge cutoff',
];

/** HARD: throat-clearing openers — only flagged at a sentence start. */
const THROAT_CLEARING = [
  "Here's the thing",
  'Let me be clear',
  'It turns out',
  "Let's dive in",
  "Let's unpack",
];

/** HARD: significance inflation — grandeur without evidence, anywhere. */
const SIGNIFICANCE_INFLATION = [
  'stands as a testament',
  'pivotal moment',
  'rich tapestry',
  'cornerstone of',
  'enduring legacy',
];

/** HARD: emphasis crutches — fake punch in place of an argument. */
const EMPHASIS_CRUTCHES = [
  'Full stop.',
  'Let that sink in',
  'Make no mistake',
  'Read that again',
];

/** HARD: vague attribution — only flagged clause-initially, where the
 *  unnamed authority is doing the argumentative work. */
const VAGUE_ATTRIBUTION = [
  'Experts argue',
  'Studies show',
  'Research indicates',
];

/** WARN: paragraph-initial signposts; a high share reads as scaffolding. */
const SIGNPOST_OPENERS = ['However', 'Moreover', 'Furthermore', 'Additionally', 'In conclusion'];

// ---------------------------------------------------------------------------
// masking
// ---------------------------------------------------------------------------

/** Replace visible characters with spaces, preserving line/column layout. */
function blank(span) {
  return span.replace(/[^\n]/g, ' ');
}

/** Blank out spans that must never be flagged (see header: MASKING). */
function maskIgnoredSpans(text) {
  let masked = text.replace(/```[\s\S]*?```/g, (m) => blank(m));
  masked = masked.replace(/~~~[\s\S]*?~~~/g, (m) => blank(m));
  masked = masked.replace(/`[^`\n]+`/g, (m) => blank(m));
  masked = masked.replace(/^>.*$/gm, (m) => blank(m));
  masked = masked.replace(/"[^"\n]*"/g, (m) => blank(m));
  masked = masked.replace(/“[^”]*”/g, (m) => blank(m));
  return masked;
}

// ---------------------------------------------------------------------------
// text geometry helpers (all offsets refer to the masked text; masking
// preserves newlines, so they are equally valid in the original)
// ---------------------------------------------------------------------------

function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineCol(starts, pos) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= pos) lo = mid; else hi = mid - 1;
  }
  return { line: lo + 1, col: pos - starts[lo] + 1 };
}

/** Paragraphs of the masked text: blank-line-separated blocks with offsets. */
function paragraphs(masked) {
  const out = [];
  const re = /\n[ \t]*\n/g;
  let start = 0, m;
  const push = (end) => {
    const raw = masked.slice(start, end);
    if (raw.trim().length > 0) out.push({ start, text: raw });
  };
  while ((m = re.exec(masked)) !== null) {
    push(m.index);
    start = m.index + m[0].length;
  }
  push(masked.length);
  return out;
}

function words(text) {
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
}

/** Prose units for the em-dash density check. A blank-line block is not always
 *  one prose paragraph: table rows are data (their pipes and dashes are cell
 *  structure, never prose), and each list item is its own unit (a bold-lead
 *  item's separator dash is a convention, not a rhythm tell). Splitting this
 *  way keeps the rule aimed at flowing prose. */
function proseUnits(masked) {
  const units = [];
  for (const para of paragraphs(masked)) {
    const lines = para.text.split('\n');
    let offset = para.start;
    let cur = null;
    const flush = () => { if (cur && cur.text.trim().length > 0) units.push(cur); cur = null; };
    for (const line of lines) {
      const lineStart = offset;
      offset += line.length + 1;
      if (/^\s*\|/.test(line)) { flush(); continue; } // table row: not prose
      if (/^\s*(?:[-*+]|\d+\.)\s/.test(line)) {
        flush();
        cur = { start: lineStart, text: line };
      } else if (cur) {
        cur.text += '\n' + line;
      } else {
        cur = { start: lineStart, text: line };
      }
    }
    flush();
  }
  return units;
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);
}

/** Population coefficient of variation (std / mean). */
function cv(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

// ---------------------------------------------------------------------------
// phrase matching
// ---------------------------------------------------------------------------

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive literal-phrase regex with word-ish boundaries.
 *  A straight apostrophe in the phrase also matches the curly form. */
function phraseRe(phrase, prefix) {
  const body = escRe(phrase).replace(/'/g, "['’]");
  const left = /[A-Za-z0-9]/.test(phrase[0]) ? '(?<![A-Za-z0-9_-])' : '';
  const right = /[A-Za-z0-9]/.test(phrase[phrase.length - 1]) ? '(?![A-Za-z0-9_-])' : '';
  return new RegExp((prefix || '') + left + body + right, 'gi');
}

/** Prefix matching start-of-text, post-sentence-boundary, or a markdown
 *  line start (heading / list marker / numbering). */
const SENTENCE_START = String.raw`(?:^|(?<=[.!?])\s+|^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+))`;
/** Clause start: a sentence start, or just after a comma/semicolon/colon. */
const CLAUSE_START = String.raw`(?:^|(?<=[.!?])\s+|^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)|(?<=[,;:])\s+)`;

const HARD_ANYWHERE = [
  { category: 'chatbot-artifact', phrases: CHATBOT_ARTIFACTS },
  { category: 'significance-inflation', phrases: SIGNIFICANCE_INFLATION },
  { category: 'emphasis-crutch', phrases: EMPHASIS_CRUTCHES },
];
const HARD_AT_START = [
  { category: 'throat-clearing', phrases: THROAT_CLEARING, prefix: SENTENCE_START },
  { category: 'vague-attribution', phrases: VAGUE_ATTRIBUTION, prefix: CLAUSE_START },
];

// ---------------------------------------------------------------------------
// per-file scan
// ---------------------------------------------------------------------------

function scanFile(file) {
  const original = readFileSync(file, 'utf8');
  const masked = maskIgnoredSpans(original);
  const starts = lineStarts(masked);
  const origLines = original.split('\n');
  const findings = [];
  const warnings = [];

  const context = (line) => {
    const raw = (origLines[line - 1] || '').trim();
    return raw.length > 100 ? raw.slice(0, 100) + '...' : raw;
  };
  const addFinding = (category, matched, pos, detail) => {
    const { line, col } = lineCol(starts, pos);
    findings.push({ category, phrase: matched, line, column: col, detail: detail || '', context: context(line) });
  };

  for (const { category, phrases } of HARD_ANYWHERE) {
    for (const phrase of phrases) {
      const re = phraseRe(phrase);
      let m;
      while ((m = re.exec(masked)) !== null) addFinding(category, m[0], m.index);
    }
  }
  for (const { category, phrases, prefix } of HARD_AT_START) {
    for (const phrase of phrases) {
      const re = phraseRe(phrase, prefix);
      let m;
      while ((m = re.exec(masked)) !== null) {
        // m[0] includes the prefix; the phrase itself is the tail.
        addFinding(category, m[0].slice(m[0].length - phrase.length), m.index + (m[0].length - phrase.length));
      }
    }
  }

  const paras = paragraphs(masked);

  // HARD: em-dash density — 2+ in a single prose unit (flowing paragraph or
  // single list item; table rows excluded — see proseUnits).
  for (const para of proseUnits(masked)) {
    const dashes = (para.text.match(/—/g) || []).length + (para.text.match(/--/g) || []).length;
    if (dashes >= 2) {
      const { line } = lineCol(starts, para.start + para.text.search(/\S/));
      findings.push({
        category: 'em-dash-density',
        phrase: `${dashes} em dashes in one paragraph`,
        line, column: 1,
        detail: 'paragraph uses 2+ em dashes (— or --); rewrite at least one clause as its own sentence',
        context: context(line),
      });
    }
  }

  // WARN: sentence-length burstiness.
  const sentences = splitSentences(masked);
  if (sentences.length > 10) {
    const lengths = sentences.map((s) => words(s).length);
    const value = cv(lengths);
    if (value < 0.35) {
      warnings.push({
        metric: 'sentence-burstiness',
        value: Math.round(value * 1000) / 1000,
        threshold: 'CV < 0.35',
        detail: `sentence lengths are suspiciously uniform across ${sentences.length} sentences (CV ${value.toFixed(3)}); vary the rhythm — mix short declaratives with longer ones`,
      });
    }
  }

  // WARN: signpost-opener share.
  if (paras.length >= 3) {
    const signpostRe = new RegExp(`^\\s*(?:#{1,6}\\s+|[-*+]\\s+)?(${SIGNPOST_OPENERS.map(escRe).join('|')})\\b`, 'i');
    let hits = 0;
    for (const para of paras) {
      const first = para.text.split('\n').find((l) => l.trim().length > 0) || '';
      if (signpostRe.test(first)) hits++;
    }
    const share = hits / paras.length;
    if (share > 0.30) {
      warnings.push({
        metric: 'signpost-openers',
        value: Math.round(share * 1000) / 1000,
        threshold: 'share > 0.30',
        detail: `${hits} of ${paras.length} paragraphs open with a signpost (However/Moreover/Furthermore/Additionally/In conclusion) — ${(share * 100).toFixed(0)}%; let some paragraphs start with their subject instead`,
      });
    }
  }

  return { file, findings, warnings };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage(exit = 2) {
  console.error(`Usage:
  node scripts/prose-scan.mjs <file-or-dir> [--json]

  <file-or-dir>   a prose file, or a directory scanned recursively for .md/.txt files
  --json          machine-readable report on stdout

Exit: 0 = no hard findings, 1 = hard findings present, 2 = usage error.
Warnings (rhythm metrics) are reported but never affect the exit code.`);
  process.exit(exit);
}

function collectFiles(target) {
  let st;
  try { st = statSync(target); } catch { return null; }
  if (st.isFile()) return [target];
  if (!st.isDirectory()) return null;
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const p = path.join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/\.(md|txt)$/i.test(name)) out.push(p);
    }
  };
  walk(target);
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const positional = argv.filter((a) => a !== '--json');
  if (positional.length !== 1 || positional[0].startsWith('--')) usage(2);
  if (argv.some((a) => a.startsWith('--') && a !== '--json')) usage(2);

  const files = collectFiles(positional[0]);
  if (files === null) {
    console.error(`error: not a file or directory: ${positional[0]}`);
    process.exit(2);
  }

  const results = [];
  for (const f of files) {
    try { results.push(scanFile(f)); }
    catch (e) { console.error(`error: cannot read ${f}: ${e.message}`); }
  }

  const totalHard = results.reduce((n, r) => n + r.findings.length, 0);
  const totalWarn = results.reduce((n, r) => n + r.warnings.length, 0);

  if (json) {
    console.log(JSON.stringify({ files: results, totals: { files: results.length, hard: totalHard, warnings: totalWarn } }, null, 2));
  } else {
    for (const r of results) {
      if (r.findings.length === 0 && r.warnings.length === 0) continue;
      console.log(`\n== ${r.file} ==`);
      for (const f of r.findings) {
        console.log(`  HARD  line ${f.line}:${f.column}  [${f.category}] "${f.phrase}"`);
        if (f.detail) console.log(`        ${f.detail}`);
        if (f.context) console.log(`        > ${f.context}`);
      }
      for (const w of r.warnings) {
        console.log(`  WARN  [${w.metric}] ${w.detail}`);
      }
    }
    console.log(`\nprose-scan: ${results.length} file(s) scanned, ${totalHard} hard finding(s), ${totalWarn} warning(s)`);
    console.log(totalHard > 0 ? 'PROSE SCAN FAIL' : 'PROSE SCAN CLEAN (a clean scan does not prove human authorship)');
  }

  process.exit(totalHard > 0 ? 1 : 0);
}

main();
