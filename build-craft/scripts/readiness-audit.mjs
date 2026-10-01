#!/usr/bin/env node

/**
 * ══════════════════════════════════════════════════════════════════════════
 * BUILD-CRAFT PRODUCTION READINESS AUDIT (v1.0)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Adapted from the author's production-readiness-master skill
 * (scripts/audit-readiness.mjs). Zero external dependencies — node stdlib
 * only. Safe to run against any directory.
 *
 * High-precision static analysis scanner verifying production gates:
 * 1. Security & Secrets (hardcoded keys, XSS injection, CORS hijack, error
 *    stack leaks, weak password hashes, SQL injection via interpolation)
 * 2. Backend & Resilience (unbounded DB queries, unindexed SELECT *, missing
 *    fetch timeouts, silent catches, missing pending states, non-idempotent
 *    payments, unrestricted uploads, unchecked fetch responses)
 * 3. Design & Craft Anti-Slop (colored icon boxes, animate-ping, clichéd AI
 *    headlines, fabricated social proof, dead placeholder links, Lorem Ipsum,
 *    purple/pink gradients, stacked hover effects, fake verification badges,
 *    emoji-polluted clipboard copy, uniform card grids, oversized CTAs,
 *    bouncing scroll indicators, unearned authority badges)
 * 4. Ethical UI (confirmshaming, fake urgency countdowns, pre-checked consent,
 *    fabricated scarcity)
 * 5. Content Formatting (raw text dumps, justified text)
 * 6. Accessibility — WCAG 2.2 AA (img alt, clickable non-interactive elements,
 *    outline-none without focus ring, icon-only buttons, unlabeled inputs)
 * 7. Performance & SEO (raw <img> in Next.js projects, console.log, lucide
 *    barrel imports, TODO/FIXME/HACK, hardcoded copyright years, missing
 *    viewport meta in app entrypoints)
 *
 * Usage:
 *   node readiness-audit.mjs [path/to/project] [options]
 *
 * Options:
 *   --ci                  Exit with code 1 if any CRITICAL BLOCKERS exist
 *   --strict              Exit with code 1 if any WARNINGS exist
 *   --json                Output pure JSON report for automated CI pipelines
 *   --category <name>     Filter scan to a specific category (security, resilience, craft, ethics, formatting, a11y, perf)
 *   --ignore-dir <dirs>   Comma-separated list of additional directories to skip
 */

import fs from 'node:fs';
import path from 'node:path';

// ----------------------------------------------------------------------
// CLI Argument Parsing
// ----------------------------------------------------------------------
const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isStrict = args.includes('--strict');
const isCi = args.includes('--ci');

let categoryFilter = null;
let customIgnoreDirs = [];
let targetDirPath = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--category' && args[i + 1]) {
    categoryFilter = args[i + 1].toLowerCase();
    i++;
  } else if (arg === '--ignore-dir' && args[i + 1]) {
    customIgnoreDirs = args[i + 1].split(',').map(d => d.trim().toLowerCase());
    i++;
  } else if (!arg.startsWith('--') && !targetDirPath) {
    targetDirPath = arg;
  }
}

const targetDir = path.resolve(targetDirPath || process.cwd());

// ----------------------------------------------------------------------
// Terminal ANSI Styling
// ----------------------------------------------------------------------
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m\x1b[37m\x1b[1m',
  bgYellow: '\x1b[43m\x1b[30m\x1b[1m',
  bgBlue: '\x1b[44m\x1b[37m\x1b[1m',
  bgGreen: '\x1b[42m\x1b[30m\x1b[1m'
};

// ----------------------------------------------------------------------
// Ignore Filters
// ----------------------------------------------------------------------
const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out', '.output',
  'coverage', '.turbo', '.vercel', '.cache', 'vendor', 'tmp', 'temp',
  'artifacts', 'test-results', 'playwright-report', ...customIgnoreDirs
]);

const IGNORE_FILES = new Set([
  'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
  'readiness-audit.mjs', 'readiness-audit.js', 'audit.js', 'audit.mjs',
  'audit-readiness.mjs', 'audit-readiness.js'
]);

// ----------------------------------------------------------------------
// Rule Catalog (Categorized with Precision Test Handlers)
// ----------------------------------------------------------------------
const RULES = [
  // ====================================================================
  // 1. SECURITY & SECRETS (BLOCKERS)
  // ====================================================================
  {
    id: 'SEC-001',
    category: 'Security & Secrets',
    severity: 'BLOCKER',
    name: 'Hardcoded API Key / Secret Token',
    regex: /(?:sk_live_[0-9a-zA-Z]{24,}|ghp_[0-9a-zA-Z]{36}|AIzaSy[0-9A-Za-z-_]{33}|xox[baprs]-[0-9a-zA-Z]{10,48}|AKIA[0-9A-Z]{16}|-----BEGIN PRIVATE KEY-----)/,
    remediation: 'Move secret into environment variables (.env.local) and reference via process.env.'
  },
  {
    id: 'SEC-002',
    category: 'Security & Secrets',
    severity: 'BLOCKER',
    name: 'Unsanitized dangerouslySetInnerHTML / v-html',
    test: (content, line) => {
      const hasDanger = /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:/.test(line) || /v-html\s*=/.test(line);
      const isSanitized = /DOMPurify|sanitize|escapeHtml/.test(line);
      return hasDanger && !isSanitized;
    },
    remediation: 'Sanitize dynamic HTML using DOMPurify.sanitize() before rendering to prevent XSS injection.'
  },
  {
    id: 'SEC-003',
    category: 'Security & Secrets',
    severity: 'BLOCKER',
    name: 'Permissive Wildcard CORS with Credentials',
    regex: /cors\(\s*\{\s*(?:origin:\s*['"]\*['"],?\s*credentials:\s*true|credentials:\s*true,?\s*origin:\s*['"]\*['"])\s*\}\s*\)/,
    remediation: 'Explicitly specify allowed origins when enabling credentials to prevent origin hijack.'
  },
  {
    id: 'SEC-004',
    category: 'Security & Secrets',
    severity: 'WARNING',
    name: 'Internal Error Stack Leaked to Client',
    regex: /res\.(?:status\(500\)|send|json)\(\s*\{.*(?:stack|error:\s*err\.message).*\}/,
    remediation: 'Return a generic user-safe error message. Log the real stack trace server-side.'
  },
  {
    id: 'SEC-005',
    category: 'Security & Secrets',
    severity: 'BLOCKER',
    name: 'Weak / Broken Cryptographic Hash for Passwords',
    regex: /(?:createHash\(['"](?:md5|sha1)['"]\)|crypto\.(?:md5|sha1)\()/,
    remediation: 'Never use MD5 or SHA-1 for passwords or integrity tokens. Use Argon2id or bcrypt (cost factor >= 12).'
  },
  {
    id: 'SEC-006',
    category: 'Security & Secrets',
    severity: 'WARNING',
    name: 'Potential SQL Injection via String Interpolation',
    test: (content, line) => {
      return /(?:db\.query|client\.query|sequelize\.query|knex\.raw)\(\s*`.*?\$\{.*?\}\s*`/.test(line);
    },
    remediation: 'Use parameterized queries ($1, $2) or an ORM with automatic escaping instead of template literal strings.'
  },

  // ====================================================================
  // 2. BACKEND & RESILIENCE
  // ====================================================================
  {
    id: 'RES-001',
    category: 'Backend & Resilience',
    severity: 'WARNING',
    name: 'Unbounded Database Query (Missing LIMIT / take)',
    test: (content, line) => {
      // Flags prisma/drizzle/mongoose queries that fetch all without pagination
      if (/\.(?:findMany|findAll)\(\s*\{/.test(line) && !line.includes('take:') && !line.includes('limit:') && !line.includes('cursor:') && !line.includes('skip:')) {
        return true;
      }
      return false;
    },
    remediation: 'Enforce pagination: pass `take: 20` or `limit: 20` to avoid memory exhaustion on large datasets.'
  },
  {
    id: 'RES-002',
    category: 'Backend & Resilience',
    severity: 'WARNING',
    name: 'Unindexed Raw SQL SELECT *',
    regex: /SELECT\s+\*\s+FROM\s+[a-zA-Z0-9_]+(?!\s+WHERE\s+.*LIMIT)/i,
    remediation: 'Select only required columns and ensure WHERE conditions run against indexed columns with a LIMIT clause.'
  },
  {
    id: 'RES-003',
    category: 'Backend & Resilience',
    severity: 'WARNING',
    name: 'Network Request without Explicit Timeout',
    test: (content, line) => {
      if (line.includes('fetch(') && !line.includes('signal') && !line.includes('AbortSignal.timeout') && (line.includes('http://') || line.includes('https://') || line.includes('/api/'))) {
        return true;
      }
      return false;
    },
    remediation: 'Add an AbortSignal timeout: `fetch(url, { signal: AbortSignal.timeout(8000) })` to prevent hung worker threads.'
  },
  {
    id: 'RES-004',
    category: 'Backend & Resilience',
    severity: 'WARNING',
    name: 'Silent Swallowed Promise Rejection',
    regex: /\.catch\(\s*(?:\(\s*\)\s*=>\s*\{\s*\}|\(\s*_\s*\)\s*=>\s*\{\s*\}|\(\s*e\s*\)\s*=>\s*\{\s*\})\s*\)/,
    remediation: 'Never swallow errors silently. Log to error telemetry (e.g. Sentry/logger.error) or surface a user fallback.'
  },
  {
    id: 'RES-005',
    category: 'Backend & Resilience',
    severity: 'WARNING',
    name: 'Empty Catch Block',
    regex: /catch\s*\([a-zA-Z0-9_]*\)\s*\{\s*(?:\/\/[^\n]*|\/\*.*?\*\/|\s)*\}/,
    remediation: 'Add meaningful handling, error reporting, or state notification inside catch blocks.'
  },
  {
    id: 'RES-006',
    category: 'Backend & Resilience',
    severity: 'WARNING',
    name: 'Form Submit without Pending/Disabled State',
    test: (content, line) => {
      return /<button[^>]*type=["']submit["']/.test(line) && !line.includes('disabled');
    },
    remediation: 'Disable submit button during submission: `disabled={isPending || isSubmitting}` to prevent duplicate submissions.'
  },
  {
    id: 'RES-007',
    category: 'Backend & Resilience',
    severity: 'BLOCKER',
    name: 'Financial Mutation without Idempotency Key',
    test: (content, line) => {
      const isPayment = /(?:stripe\.paymentIntents\.create|stripe\.charges\.create|paypal\.orders\.create|razorpay\.orders\.create)/.test(line);
      return isPayment && !line.includes('idempotencyKey') && !content.includes('idempotencyKey');
    },
    remediation: 'Pass `{ idempotencyKey: ... }` to payment mutations to guarantee exactly-once charging on network retries.'
  },
  {
    id: 'RES-008',
    category: 'Backend & Resilience',
    severity: 'NOTICE',
    name: 'Unrestricted File Upload Handler',
    test: (content, line) => {
      return /multer\(/.test(line) && !content.includes('limits:');
    },
    remediation: 'Configure explicit upload limits: `limits: { fileSize: 5 * 1024 * 1024 }` to prevent disk/memory exhaustion.'
  },
  {
    id: 'RES-009',
    category: 'Backend & Resilience',
    severity: 'NOTICE',
    name: 'Unchecked fetch() Response Status',
    test: (content, line) => {
      // Flags calling res.json() without checking res.ok
      return /await\s+[a-zA-Z0-9_]+\.json\(\)/.test(line) && !content.includes('.ok') && !content.includes('.status');
    },
    remediation: 'Always check `if (!res.ok) throw new Error(...)` before parsing JSON to catch 4xx/5xx responses gracefully.'
  },

  // ====================================================================
  // 3. DESIGN & CRAFT ANTI-SLOP
  // ====================================================================
  {
    id: 'CRAFT-001',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Cheesy Colored Icon Box Crutch',
    regex: /(?:w-[6789]|h-[6789]|w-10|h-10|w-12|h-12|p-[23]).*?rounded-(?:md|lg|xl|2xl|full).*?bg-(?:blue|indigo|purple|violet|emerald|amber|rose|teal|cyan|green)-(?:50|100).*?text-(?:blue|indigo|purple|violet|emerald|amber|rose|teal|cyan|green)-(?:500|600|700)/,
    remediation: 'Anti-Slop Standard: Eliminate decorative colored icon boxes on card headers. Replace with refined typography, tabular mono metrics, or subtle hairline tags.'
  },
  {
    id: 'CRAFT-002',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Gimmicky Radar Pulse (animate-ping)',
    regex: /\banimate-ping\b/,
    remediation: 'Remove fake `animate-ping` radar dots. If communicating live status, use a calm solid 6px badge or static dot.'
  },
  {
    id: 'CRAFT-003',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Clichéd AI Marketing Headline',
    regex: /(?:Unlock your potential|Supercharge your workflow|Elevate your productivity|Next-gen(?:eration)? AI platform|All your tools in one|The all-in-one platform for|Revolutionize the way you|Transform the way you work)/i,
    remediation: 'Replace generic AI marketing filler with specific, tangible value propositions and concrete metrics.'
  },
  {
    id: 'CRAFT-004',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Suspicious / Fabricated Social Proof',
    regex: /(?:10,000\+|50,000\+|100,000\+)\s+(?:happy\s+customers|users\s+worldwide|developers\s+love\s+us|satisfied\s+teams)/i,
    remediation: 'Never use fabricated metric claims. Use genuine testimonials, customer logos, or verifiable counts.'
  },
  {
    id: 'CRAFT-005',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Dead Placeholder Link (href="#")',
    regex: /href=["'](?:#|javascript:void\(0\)|javascript:;)["']/,
    remediation: 'Provide real functional URLs, route targets, or replace with an accessible `<button type="button">` if triggering an action.'
  },
  {
    id: 'CRAFT-006',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Placeholder Text Left In Source',
    regex: /\b(?:Lorem ipsum dolor|dolor sit amet|John Doe|Jane Doe|Acme Corp|foobar@example\.com)\b/i,
    remediation: 'Replace placeholder Lorem Ipsum and mock names with realistic domain-specific content.'
  },
  {
    id: 'CRAFT-007',
    category: 'Design & Craft Anti-Slop',
    severity: 'NOTICE',
    name: 'Generic AI Purple/Pink Gradient Duo',
    regex: /from-(?:purple|violet|indigo)-500\s+(?:via-[a-z]+-500\s+)?to-(?:pink|fuchsia)-500/,
    remediation: 'Avoid clichéd purple/pink gradients. Curate bespoke, refined palettes using tools like Realtime Colors.'
  },
  {
    id: 'CRAFT-008',
    category: 'Design & Craft Anti-Slop',
    severity: 'NOTICE',
    name: 'Stacked Excessive Hover Animations',
    test: (content, line) => {
      let animCount = 0;
      if (line.includes('hover:scale-')) animCount++;
      if (line.includes('hover:rotate-')) animCount++;
      if (line.includes('hover:shadow-')) animCount++;
      if (line.includes('hover:animate-')) animCount++;
      return animCount >= 3;
    },
    remediation: 'Restraint Rule: Do not stack multiple heavy hover effects. Use a single subtle translation (e.g. `hover:-translate-y-0.5`).'
  },
  {
    id: 'CRAFT-009',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Fake Operational Telemetry & Phony Verification Badges',
    regex: /\b(?:Live\s+Verification|Phase\s+\d+\s+Verified|Real-?time\s+AI\s+Verification|100%\s+AI\s+Verified|Auto-verified\s+live)\b/i,
    remediation: 'Zero False Information: Do not display fake operational buzzwords or artificial verification badges on static/periodic data. State authentic data source and date transparently.'
  },
  {
    id: 'CRAFT-010',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Emoji-Polluted Clipboard Copy',
    regex: /(?:📌|💰|🎓|📝|⏰|🔥|✨|🚀|💼|🎯|📊|💡|🏆|⭐|💎|🌟).*(?:clipboard|copyToClipboard|navigator\.clipboard|writeText|execCommand\s*\(\s*['"]copy)/i,
    remediation: 'Clipboard copy must output clean, parseable plaintext. Remove emoji prefixes from programmatic copy output.'
  },
  {
    id: 'CRAFT-011',
    category: 'Design & Craft Anti-Slop',
    severity: 'NOTICE',
    name: 'Uniform Solid Card Background Grid',
    test: (content, line) => {
      // Detect a card with a hard-coded solid dark bg that indicates uniform grid
      return /className=.*bg-\[#[0-9a-fA-F]{6}\].*rounded/.test(line) && !line.includes('bg-white/') && !line.includes('bg-black/');
    },
    remediation: 'Use subtle transparency (bg-white/[0.02-0.04]) with thin borders instead of identical solid card backgrounds for an editorial, non-templated look.'
  },
  {
    id: 'CRAFT-012',
    category: 'Design & Craft Anti-Slop',
    severity: 'NOTICE',
    name: 'Oversized Action Button in Data Row/Card',
    regex: /(?:View\s+Details|Open\s+Dashboard|Explore\s+Now|Learn\s+More|Get\s+Started).*(?:bg-(?:blue|indigo|purple|emerald|green|orange|red)-(?:500|600|700))/i,
    remediation: 'Row/card actions should be quiet typographic text links, not loud colored buttons. The data is the hero, not the actions.'
  },
  {
    id: 'CRAFT-013',
    category: 'Design & Craft Anti-Slop',
    severity: 'NOTICE',
    name: 'Bouncing Scroll Indicator',
    regex: /animate-bounce.*(?:scroll|chevron|arrow-down|mouse)|(?:scroll|chevron|arrow-down|mouse).*animate-bounce/i,
    remediation: 'Remove bouncing scroll indicators. Modern users know how to scroll. This is a recognized AI builder tell.'
  },
  {
    id: 'CRAFT-014',
    category: 'Design & Craft Anti-Slop',
    severity: 'WARNING',
    name: 'Unearned Authority Badge',
    regex: /\b(?:Official\s+(?:Source|Filing|Record)|Verified\s+(?:Source|Data|Record)|AI[- ]Verified|Certified\s+(?:Source|Data))\b/i,
    remediation: 'Do not attach unearned authority labels to ordinary data displays. Only show verification badges backed by a real, auditable verification process.'
  },

  // ====================================================================
  // 4. ETHICAL UI & DARK PATTERN DETECTION
  // ====================================================================
  {
    id: 'ETHICS-001',
    category: 'Ethical UI',
    severity: 'WARNING',
    name: 'Confirmshaming Opt-Out Language',
    regex: /(?:No,?\s+I\s+(?:don'?t|do\s+not)\s+want\s+to|I\s+prefer\s+to\s+(?:waste|miss|lose|stay)|No\s+thanks?,?\s+I'?(?:m|ll)\s+(?:keep|stay)\s+(?:broke|poor|uninformed|behind))/i,
    remediation: 'Dark Pattern Alert: Use neutral decline language ("No thanks" or "Skip"). Confirmshaming guilt-trips carry regulatory risk (FTC, EU DSA).'
  },
  {
    id: 'ETHICS-002',
    category: 'Ethical UI',
    severity: 'WARNING',
    name: 'Potential Fake Urgency / Resetting Countdown',
    test: (content, line) => {
      // Detect countdown patterns without a real deadline source
      const hasCountdown = /(?:countdown|timer|setInterval|setTimeout).*(?:\d+\s*\*\s*60|\d+\s*\*\s*1000)/i.test(line);
      const hasDeadline = content.includes('deadline') || content.includes('endDate') || content.includes('expiresAt');
      return hasCountdown && !hasDeadline;
    },
    remediation: 'Countdown timers must reflect real deadlines. Timers that reset on page refresh are deceptive. Ensure a real server-side deadline backs any countdown.'
  },
  {
    id: 'ETHICS-003',
    category: 'Ethical UI',
    severity: 'NOTICE',
    name: 'Pre-Checked Marketing Consent',
    regex: /(?:defaultChecked|checked\s*=\s*\{?\s*true\s*\}?).*(?:newsletter|marketing|subscribe|opt.?in|notifications)/i,
    remediation: 'Marketing opt-in checkboxes must be unchecked by default. Pre-checked consent violates GDPR opt-in requirements.'
  },
  {
    id: 'ETHICS-004',
    category: 'Ethical UI',
    severity: 'NOTICE',
    name: 'Fabricated Scarcity Signal',
    regex: /\b(?:only\s+\d+\s+left|limited\s+(?:time|stock|availability)|hurry|selling\s+fast|\d+\s+people?\s+(?:viewing|watching|looking))\b/i,
    remediation: 'Scarcity indicators must reflect real data. Fabricated urgency signals destroy user trust and carry regulatory liability.'
  },

  // ====================================================================
  // 5. CONTENT FORMATTING QUALITY
  // ====================================================================
  {
    id: 'FMT-001',
    category: 'Content Formatting',
    severity: 'NOTICE',
    name: 'Raw Text Block without Formatting',
    regex: /whitespace-pre-line|white-space:\s*pre-line|whitespace-pre-wrap|white-space:\s*pre-wrap/,
    remediation: 'Never dump raw text with whitespace-pre-line. Build a formatter to detect headers, bullets, and paragraphs, rendering with typographic hierarchy.'
  },
  {
    id: 'FMT-002',
    category: 'Content Formatting',
    severity: 'NOTICE',
    name: 'Justified Text Alignment',
    regex: /\btext-justify\b|text-align:\s*justify/,
    remediation: 'Avoid text-justify. It creates uneven word spacing that is especially difficult for dyslexic readers. Use left-alignment.'
  },

  // ====================================================================
  // 6. ACCESSIBILITY (WCAG 2.2 AA)
  // ====================================================================
  {
    id: 'A11Y-001',
    category: 'Accessibility (WCAG)',
    severity: 'BLOCKER',
    name: 'Image Missing alt Attribute',
    test: (content, line) => {
      return /<img\s+/.test(line) && !line.includes('alt=');
    },
    remediation: 'Add a descriptive `alt="..."` attribute, or `alt=""` if the image is purely decorative.'
  },
  {
    id: 'A11Y-002',
    category: 'Accessibility (WCAG)',
    severity: 'WARNING',
    name: 'Interactive onClick on Non-Interactive Element without Role/KeyHandler',
    test: (content, line) => {
      const isDivSpan = /<(?:div|span|p|a)\s+[^>]*onClick=/.test(line);
      const hasAccessibility = line.includes('role=') || line.includes('onKeyDown') || line.includes('onKeyUp') || line.includes('tabIndex');
      return isDivSpan && !hasAccessibility;
    },
    remediation: 'Use a `<button>` element instead, or provide `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler.'
  },
  {
    id: 'A11Y-003',
    category: 'Accessibility (WCAG)',
    severity: 'WARNING',
    name: 'Outline Suppressed without Focus-Visible Ring',
    test: (content, line) => {
      const hasOutlineNone = /\boutline-none\b/.test(line);
      const hasFocusVisible = line.includes('focus-visible:') || line.includes('focus:ring') || line.includes('focus:border') || line.includes('focus-visible:ring');
      return hasOutlineNone && !hasFocusVisible;
    },
    remediation: 'Pair `outline-none` with visible focus indicators: `focus-visible:ring-2 focus-visible:ring-offset-2`.'
  },
  {
    id: 'A11Y-004',
    category: 'Accessibility (WCAG)',
    severity: 'WARNING',
    name: 'Icon-Only Button Missing Accessible Label',
    test: (content, line) => {
      return /<button[^>]*>/.test(line) && line.includes('Icon') && !line.includes('aria-label') && !line.includes('sr-only');
    },
    remediation: 'Add `aria-label="Action description"` or an `<span className="sr-only">Description</span>` inside icon buttons.'
  },
  {
    id: 'A11Y-005',
    category: 'Accessibility (WCAG)',
    severity: 'NOTICE',
    name: 'Form Control Missing Accessible Label',
    test: (content, line) => {
      const isInput = /<(?:input|select|textarea)\s+/.test(line);
      const hasLabel = line.includes('aria-label') || line.includes('aria-labelledby') || line.includes('id=') || line.includes('type="hidden"') || line.includes('type="submit"');
      return isInput && !hasLabel;
    },
    remediation: 'Every input must have an associated `<label for="...">` or an `aria-label` attribute.'
  },

  // ====================================================================
  // 7. PERFORMANCE & SEO
  // ====================================================================
  {
    id: 'PERF-001',
    category: 'Performance & SEO',
    severity: 'WARNING',
    name: 'Raw <img> in Next.js Project (Missing next/image)',
    test: (content, line, filePath) => {
      const isNextProject = fs.existsSync(path.join(targetDir, 'next.config.js')) ||
                           fs.existsSync(path.join(targetDir, 'next.config.mjs')) ||
                           fs.existsSync(path.join(targetDir, 'next.config.ts'));
      return isNextProject && /<img\s+[^>]*src=/i.test(line);
    },
    remediation: 'Use `<Image />` from "next/image" for automatic responsive sizing, WebP conversion, and layout shift prevention.'
  },
  {
    id: 'PERF-002',
    category: 'Performance & SEO',
    severity: 'WARNING',
    name: 'Unstripped console.log() in Production Code',
    test: (content, line) => {
      return /\bconsole\.log\(/.test(line) && !line.trim().startsWith('//');
    },
    remediation: 'Remove development `console.log()` statements before shipping to prevent noisy client consoles and memory leaks.'
  },
  {
    id: 'PERF-003',
    category: 'Performance & SEO',
    severity: 'NOTICE',
    name: 'Monolithic Lucide Icon Barrel Import',
    regex: /import\s+\*\s+as\s+[a-zA-Z0-9_]+\s+from\s+['"]lucide-react['"]/,
    remediation: 'Import icons named individually (`import { Check } from "lucide-react"`) to enable tree-shaking and avoid 2MB+ bundle bloat.'
  },
  {
    id: 'PERF-004',
    category: 'Performance & SEO',
    severity: 'BLOCKER',
    name: 'Unresolved TODO / FIXME / HACK Comment',
    test: (content, line) => {
      return /\/\/\s*(?:TODO|FIXME|HACK|BUG):/i.test(line);
    },
    remediation: 'Resolve open technical debt or convert into a tracked linear/github issue before production release.'
  },
  {
    id: 'PERF-005',
    category: 'Performance & SEO',
    severity: 'NOTICE',
    name: 'Hardcoded Copyright Year',
    regex: /©\s*(?:202[0-5]|201[0-9])\b/,
    remediation: 'Make copyright year dynamic: `{new Date().getFullYear()}` so it never falls out of date.'
  }
];

// ----------------------------------------------------------------------
// Scan State & Metrics
// ----------------------------------------------------------------------
const findings = {
  blockers: [],
  warnings: [],
  notices: []
};

const categoryCounts = {
  'Security & Secrets': { blockers: 0, warnings: 0, notices: 0 },
  'Backend & Resilience': { blockers: 0, warnings: 0, notices: 0 },
  'Design & Craft Anti-Slop': { blockers: 0, warnings: 0, notices: 0 },
  'Ethical UI': { blockers: 0, warnings: 0, notices: 0 },
  'Content Formatting': { blockers: 0, warnings: 0, notices: 0 },
  'Accessibility (WCAG)': { blockers: 0, warnings: 0, notices: 0 },
  'Performance & SEO': { blockers: 0, warnings: 0, notices: 0 }
};

let totalFilesScanned = 0;
let totalLinesScanned = 0;

function isAppEntrypoint(relPath) {
  const norm = relPath.toLowerCase().replace(/\\/g, '/');
  if (norm === 'index.html' || norm === 'public/index.html' || norm === 'src/index.html') return true;
  if (norm.match(/^(?:src\/)?app\/layout\.[a-z]+$/) || norm.match(/^(?:src\/)?pages\/_document\.[a-z]+$/)) return true;
  return false;
}

function scanFile(filePath) {
  const ext = path.extname(filePath);
  if (!['.html', '.tsx', '.jsx', '.ts', '.js', '.mjs', '.cjs', '.vue', '.svelte', '.prisma', '.sql'].includes(ext)) {
    return;
  }

  const fileName = path.basename(filePath);
  if (IGNORE_FILES.has(fileName)) return;

  const relPath = path.relative(targetDir, filePath).split(path.sep).join('/');

  // Skip ignored subdirectories
  const parts = relPath.toLowerCase().split('/');
  for (const p of parts) {
    if (DEFAULT_IGNORE_DIRS.has(p)) {
      return;
    }
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return;
  }

  const lines = content.split('\n');
  totalFilesScanned++;
  totalLinesScanned += lines.length;

  // Entrypoint document level checks
  if (isAppEntrypoint(relPath)) {
    if (!content.includes('viewport') && !content.includes('viewport-fit')) {
      const item = {
        id: 'SEO-001',
        category: 'Performance & SEO',
        severity: 'BLOCKER',
        name: 'Missing Responsive Viewport Meta Tag in App Entrypoint',
        file: relPath,
        line: 1,
        snippet: '<head>',
        remediation: 'Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`.'
      };
      findings.blockers.push(item);
      categoryCounts['Performance & SEO'].blockers++;
    }
  }

  // Scan line by line for precise location and snippets
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const rule of RULES) {
      // Category filter check
      if (categoryFilter) {
        const catName = rule.category.toLowerCase();
        if (!catName.includes(categoryFilter)) continue;
      }

      let matched = false;

      if (rule.test) {
        matched = rule.test(content, line, filePath);
      } else if (rule.regex) {
        matched = rule.regex.test(line);
      }

      if (matched) {
        const item = {
          id: rule.id,
          category: rule.category,
          severity: rule.severity,
          name: rule.name,
          file: relPath,
          line: lineNum,
          snippet: line.trim().slice(0, 140),
          remediation: rule.remediation
        };

        if (rule.severity === 'BLOCKER') {
          findings.blockers.push(item);
          if (categoryCounts[rule.category]) categoryCounts[rule.category].blockers++;
        } else if (rule.severity === 'WARNING') {
          findings.warnings.push(item);
          if (categoryCounts[rule.category]) categoryCounts[rule.category].warnings++;
        } else {
          findings.notices.push(item);
          if (categoryCounts[rule.category]) categoryCounts[rule.category].notices++;
        }
      }
    }
  }
}

function traverse(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }

  for (const entry of entries) {
    const lowerName = entry.name.toLowerCase();
    if (DEFAULT_IGNORE_DIRS.has(lowerName)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      traverse(full);
    } else {
      scanFile(full);
    }
  }
}

// ----------------------------------------------------------------------
// Execute Scan
// ----------------------------------------------------------------------
traverse(targetDir);

// Calculate readiness score
const rawScore = 100 - (findings.blockers.length * 15) - (findings.warnings.length * 4) - (findings.notices.length * 1);
const readinessScore = Math.max(0, Math.min(100, rawScore));

// ----------------------------------------------------------------------
// Output: JSON Mode
// ----------------------------------------------------------------------
if (isJson) {
  const output = {
    targetDir,
    timestamp: new Date().toISOString(),
    metrics: {
      totalFilesScanned,
      totalLinesScanned,
      readinessScore,
      blockersCount: findings.blockers.length,
      warningsCount: findings.warnings.length,
      noticesCount: findings.notices.length
    },
    categoryBreakdown: categoryCounts,
    findings
  };
  console.log(JSON.stringify(output, null, 2));
  if (isCi && findings.blockers.length > 0) process.exit(1);
  if (isStrict && (findings.blockers.length > 0 || findings.warnings.length > 0)) process.exit(1);
  process.exit(0);
}

// ----------------------------------------------------------------------
// Output: Pretty Terminal Mode
// ----------------------------------------------------------------------
console.log(`\n${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
console.log(` ${colors.cyan}${colors.bold}BUILD-CRAFT PRODUCTION READINESS AUDIT (v1.0)${colors.reset}`);
console.log(` ${colors.gray}Target:${colors.reset}  ${targetDir}`);
console.log(` ${colors.gray}Scanned:${colors.reset} ${totalFilesScanned} source files, ${totalLinesScanned} lines`);
if (categoryFilter) {
  console.log(` ${colors.magenta}Filter:${colors.reset}   Category matching "${categoryFilter}"`);
}
console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

// Readiness Score Header
let scoreBadge = colors.bgGreen;
let grade = 'A+ GOLD STANDARD - PRODUCTION READY';

if (readinessScore < 60) {
  scoreBadge = colors.bgRed;
  grade = 'F - CRITICAL BLOCKERS DETECTED';
} else if (readinessScore < 75) {
  scoreBadge = colors.bgYellow;
  grade = 'C - RESILIENCE & POLISH NEEDED';
} else if (readinessScore < 88) {
  scoreBadge = colors.bgBlue;
  grade = 'B - HIGH CRAFT (MINOR WARNINGS)';
} else if (readinessScore < 95) {
  scoreBadge = colors.bgGreen;
  grade = 'A - PRODUCTION READY';
}

console.log(`  ${colors.bold}Readiness Score:${colors.reset} ${scoreBadge} ${readinessScore} / 100 ${colors.reset}  ${colors.bold}${grade}${colors.reset}\n`);

// Category Summary Grid
console.log(`  ${colors.dim}┌─────────────────────────────┬──────────┬──────────┬──────────┐${colors.reset}`);
console.log(`  ${colors.dim}│${colors.reset} ${colors.bold}Category${colors.reset}${' '.repeat(20)} ${colors.dim}│${colors.reset} ${colors.red}Blockers${colors.reset} ${colors.dim}│${colors.reset} ${colors.yellow}Warnings${colors.reset} ${colors.dim}│${colors.reset} ${colors.blue}Advisory${colors.reset} ${colors.dim}│${colors.reset}`);
console.log(`  ${colors.dim}├─────────────────────────────┼──────────┼──────────┼──────────┤${colors.reset}`);

for (const [cat, counts] of Object.entries(categoryCounts)) {
  const padCat = cat.padEnd(27, ' ');
  const b = String(counts.blockers).padStart(8, ' ');
  const w = String(counts.warnings).padStart(8, ' ');
  const n = String(counts.notices).padStart(8, ' ');
  console.log(`  ${colors.dim}│${colors.reset} ${padCat} ${colors.dim}│${colors.reset} ${counts.blockers > 0 ? colors.red + b + colors.reset : b} ${colors.dim}│${colors.reset} ${counts.warnings > 0 ? colors.yellow + w + colors.reset : w} ${colors.dim}│${colors.reset} ${n} ${colors.dim}│${colors.reset}`);
}
console.log(`  ${colors.dim}└─────────────────────────────┴──────────┴──────────┴──────────┘${colors.reset}\n`);

// 1. Critical Blockers
if (findings.blockers.length > 0) {
  console.log(` ${colors.bgRed} 🚫 CRITICAL BLOCKERS (${findings.blockers.length}) ${colors.reset} ${colors.red}${colors.bold}Must fix before shipping to production!${colors.reset}\n`);
  findings.blockers.forEach((item, idx) => {
    console.log(`  ${colors.bold}${idx + 1}. [${item.id}] ${item.name}${colors.reset}`);
    console.log(`     ${colors.gray}Location:${colors.reset} ${colors.underline}${item.file}:${item.line}${colors.reset}`);
    console.log(`     ${colors.gray}Code:${colors.reset}     ${colors.red}${item.snippet}${colors.reset}`);
    console.log(`     ${colors.green}Fix:${colors.reset}      ${item.remediation}\n`);
  });
} else {
  console.log(`  ${colors.green}✔ Zero Critical Blockers Detected.${colors.reset}\n`);
}

// 2. Warnings (Anti-Slop & Resilience)
if (findings.warnings.length > 0) {
  console.log(` ${colors.bgYellow} ⚠️  WARNINGS & ANTI-SLOP VIOLATIONS (${findings.warnings.length}) ${colors.reset}\n`);
  findings.warnings.forEach((item, idx) => {
    console.log(`  ${colors.yellow}${colors.bold}${idx + 1}. [${item.id}] ${item.name}${colors.reset}`);
    console.log(`     ${colors.gray}Location:${colors.reset} ${colors.underline}${item.file}:${item.line}${colors.reset}`);
    console.log(`     ${colors.gray}Code:${colors.reset}     ${colors.yellow}${item.snippet}${colors.reset}`);
    console.log(`     ${colors.cyan}Fix:${colors.reset}      ${item.remediation}\n`);
  });
} else {
  console.log(`  ${colors.green}✔ Zero Anti-Slop or Resilience Warnings Detected.${colors.reset}\n`);
}

// 3. Notices & Advisories
if (findings.notices.length > 0) {
  console.log(` ${colors.bold}${colors.blue}ℹ  ADVISORIES & OPTIMIZATIONS (${findings.notices.length})${colors.reset}\n`);
  findings.notices.forEach((item, idx) => {
    console.log(`  - [${item.id}] ${item.name} at ${colors.gray}${item.file}:${item.line}${colors.reset}`);
    console.log(`    ${colors.dim}Fix:${colors.reset} ${item.remediation}`);
  });
  console.log('');
}

console.log(`${colors.bold}──────────────────────────────────────────────────────────────────────────${colors.reset}`);
console.log(` Summary: ${findings.blockers.length} Blockers | ${findings.warnings.length} Warnings | ${findings.notices.length} Advisories`);
console.log(`${colors.bold}──────────────────────────────────────────────────────────────────────────${colors.reset}\n`);

// CI / Strict Exits
if (isCi && findings.blockers.length > 0) {
  process.exit(1);
}
if (isStrict && (findings.blockers.length > 0 || findings.warnings.length > 0)) {
  process.exit(1);
}
