# Design Polish — production checklist

Covers typography, spacing, color, hierarchy, micro-interactions, empty/error/loading states, and design tokens. For avoiding the generic "AI-generated" look, see `design-distinct.md`.

## Typography

- [ ] Type sizes from a documented **modular scale** (1.2 dense dashboards, 1.25–1.333 marketing, 1.5–1.618 editorial); no hand-picked sizes — grep the stylesheet for ad-hoc values.
- [ ] Body ≥ 16px (17–18px mobile); sizes in `rem`; line height 1.5–1.6 for body (never `px` line-height), 1.1–1.3 for headings.
- [ ] Measure: **45–75 chars** (target `max-width: 65ch`; hard cap 80ch). Max 2 font families; max 2–3 weights per screen.
- [ ] Fluid type with `clamp()`; left-align body; `text-wrap: balance` on headings; `tabular-nums` for prices/tables. Underline = links only.
- [ ] Font loading: `font-display: swap`, WOFF2 self-hosted, preload primary font, ≤200 KB total; metric-matched fallbacks so zero layout shift; no icon fonts (inline SVG instead).

## Spacing (8pt grid)

- [ ] All padding/margin/gap from the scale `4·8·12·16·24·32·48·64·80·96·128` — no arbitrary values; `gap-*` on parents over child margins.
- [ ] Section padding by density: desktop ≥80px, mobile ≥48px; marketing 80–120px; app 48–64px; dense dashboards 8–16px. Page gutters in a centered max-width (1200–1400px; reading column `max-w-2xl`).
- [ ] External margin ≥ internal padding; edges/baselines align across columns; CSS Grid/Flexbox only (no absolute-position layout). Touch targets ≥44×44px, 8–16px between interactive elements.

## Color

- [ ] **WCAG AA contrast**: normal text ≥4.5:1, large text ≥3:1, UI boundaries/icons/focus ≥3:1 — measured per pairing, including muted text and placeholders.
- [ ] Palette with semantic roles (brand, surfaces, text tiers, borders, success/warning/error/info); ≤12 unique non-gray colors; neutrals consistently warm or cool.
- [ ] **No color-only encoding** — status conveyed with icon + text label as well.
- [ ] Dark mode: full theme via variables (no hard-coded #fff/#000); all pages themed including error/404; body text off-white, not pure white; contrast re-verified in both modes; no wrong-theme flash; `theme-color` meta per mode.
- [ ] Visible `:focus-visible` on every interactive element (≥2px high-contrast outline); skip-to-content link first in the DOM.

## Visual hierarchy

- [ ] Hierarchy via size + weight + color (never font-size alone); ≥2 weights separating levels.
- [ ] Exactly one `<h1>` per page; headings ordered without skips; exactly one `<main>` landmark; semantic HTML; `<button>` for actions, `<a href>` for navigation; every input has a visible `<label>`.
- [ ] **One primary action per view** — single dominant CTA; secondary/tertiary de-emphasized. Layout functional at 200–400% zoom; at most one orchestrated entrance animation.

## Micro-interactions

- [ ] Every interactive element has hover/focus/active states. Transitions **150–300ms** (button press 100–160ms; modals 200–500ms; exit ≈60–70% of enter), ease-out entering / ease-in exiting; properties named explicitly — never `transition: all`.
- [ ] Animate **transform and opacity only**; honor `prefers-reduced-motion`. One signal per hover (translate *or* color *or* underline).
- [ ] Loading decision tree: <300ms → nothing; 300ms–2s → **skeleton** shaped like the layout with reserved space; >2s → determinate progress + contextual message. Never an endless spinner without a timeout/error path.
- [ ] **Optimistic UI** for near-certain actions (flip instantly, sync in background, roll back with toast on failure). Loading regions marked `aria-busy`; async status announced via `aria-live`. Submit disabled during flight.

## Empty / error / loading states

- [ ] **Every async view has three designed variants**: loading, empty, error — no blank pages or raw empty tables.
- [ ] Empty states first-class: icon + headline + what fills the surface + primary CTA; filtered-to-nothing names the active filters with "Clear filters".
- [ ] Error messages name **cause AND fix** ("We couldn't reach the server. Check your connection and try again.") — never "An error occurred", never raw codes; every error carries a retry affordance; form state preserved on error.
- [ ] No dead ends — recovery always possible (retry preserves state/scroll/filters; cache last-good response under a "stale" badge). Custom 404 + 500/offline pages with navigation; destructive actions get explicit confirm (type-the-name), reversible ones get Undo (5–10s).

## Consistency via design tokens

- [ ] Tokens for **everything**: colors, spacing, type/line-heights/weights, radii, borders, shadows, z-index layers, motion durations/easings — **no magic numbers in CSS**.
- [ ] Three-tier architecture (W3C DTCG): primitive (`color.blue.500`) → semantic (`color.text.primary`) → component (`button.primary.bg`); components reference semantic tokens, never primitives.
- [ ] Naming convention documented and enforced; values stored once and reused; semantic overrides per theme so theme switching changes zero component code.
- [ ] Repeated patterns are a single shared component with state variants (Default/Hover/Pressed/Focus/Disabled) — no one-off restyled copies. Lint CSS: no inline hex, no arbitrary pixels, no `!important`. Mobile-first; spot-check 320/375/768/1024/1440/1920; no horizontal scroll at any viewport.

## Sources

- https://www.w3.org/TR/WCAG22/ · https://en.wikipedia.org/wiki/Web_Content_Accessibility_Guidelines
- https://github.com/nemolabsdev/conversion-craft/blob/HEAD/curriculum/research/typography-craft.md
- https://github.com/srstomp/copyskills/blob/HEAD/skills/ux-copy/references/empty-states.md
