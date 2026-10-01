# Design Polish — visual craft as a system

Scope: the verifiable craft system behind refined interfaces — typography, spacing, color, motion, loading/empty/error states, design tokens. To not look AI-generated, see `design-distinct.md`; for semantic HTML and WCAG mechanics, see `web-frontend.md`. Checked 2026-10-01.

## Typography

- [ ] Sizes from a documented **modular scale** (1.2 dense dashboards, 1.25–1.333 marketing, 1.5–1.618 editorial) — grep the stylesheet for ad-hoc values outside the scale.
- [ ] Fluid type via `clamp()` with `rem` bounds and a viewport slope, e.g. `clamp(1rem, 0.93rem + 0.3vw, 1.125rem)` — no fixed `px` font sizes.
- [ ] Component-level fluid sizing uses container query units (`cqi`/`cqw`) instead of `vw`, with `container-type: inline-size` on the parent slot.
- [ ] Body ≥ 16px (17–18px mobile); line height 1.5–1.6 body in unitless numbers (never `px`), 1.1–1.3 headings.
- [ ] Measure **45–75 chars** (`max-width: 65ch` target; 80ch hard cap); max 2 font families, max 2–3 weights per screen.
- [ ] `text-wrap: balance` on headings, captions, blockquotes; `text-wrap: pretty` on paragraphs (progressive enhancement — no Firefox support as of mid-2026).
- [ ] Left-align body; `font-variant-numeric: tabular-nums` on prices, timers, tables; underline reserved for links only.
- [ ] Variable fonts preferred: one WOFF2 file per family covering weight range; ≤200 KB total fonts.
- [ ] Optical sizing enabled on variable display faces (`font-optical-sizing: auto`) — small text stays legible, display text keeps its character.
- [ ] Heading letter-spacing tightened slightly (−0.01em to −0.03em on display sizes); body letter-spacing at 0 — no decorative tracking on small text.
- [ ] Font loading: `font-display: swap`, preload primary face, metric-matched fallback (`font-size-adjust: from-font` or `size-adjust`) — zero layout shift on swap; no icon fonts (inline SVG instead).
- [ ] Numeric columns right-aligned (`tabular-nums text-right`), text columns left-aligned — instant cross-row comparison; tabular figures prevent jitter on live numbers.
- [ ] Bold highlights 1–2 key phrases per paragraph, never whole paragraphs — over-bolding defeats its purpose and makes everything look urgent.
- [ ] No `text-justify` — uneven word spacing hurts readability (especially for dyslexia); left-align body in LTR languages.
- [ ] Pull quotes, callouts, and code blocks are styled as distinct tiers — not inline bold pretending to be structure.

## Content formatting & text quality

- [ ] No raw-text dumps: long-form content never shipped as a single `whitespace-pre-line` block — build/use a text formatter that detects section headers (lines ending with `:`, ALL CAPS lines → bold labels with extra spacing), list items (short imperative/numbered lines → dash-marked bullets), and paragraphs (proper spacing), rendering each in typographic tiers.
- [ ] Walls chunked: 3–4 sentences per paragraph, descriptive subheadings as scanning anchors; `max-w-prose` / ~65ch keeps lines at 45–75 chars.
- [ ] Line height 1.4–1.6 body (unitless) — cramped `1.1` body text is an amateur-template tell.
- [ ] Every number carries its unit (ms, KB, %); decimal places consistent within a column; currency symbols not mixed with ISO codes in the same surface.
- [ ] Dates unambiguous and localized (2026-10-01), never `10/01/26`; relative times ("2h ago") paired with an absolute `title` on hover.
- [ ] Large numbers humanized with the exact value on hover/`title` ("1.24 Cr" → `title="₹1,24,00,000"`) — readability without losing precision.
- [ ] Key–value metadata uses definition lists (`<dl>`), not one-column tables or bold-colon soup.
- [ ] Ordered lists keep their numbering across interruptions; abbreviations expanded on first use; domain jargon linked to docs.
- [ ] Code blocks: syntax-highlighted, copy button top-right, line numbers on long snippets — never screenshots of code.
- [ ] Claims in long-form content get footnote/citation links — unlinked numbers fail the truthfulness gate (see design-distinct.md).
- [ ] Blockquotes used for actual quotations only — not as a generic highlight box.
- [ ] Copy-to-clipboard output is clean plaintext — no emoji prefixes, decorative unicode borders, or markdown syntax in non-markdown contexts.

## Data tables & pagination

- [ ] Sortable headers on every comparable column (numbers, dates, text) with clear directional indicators (↑/↓ chevrons or ▲/▼); current sort state visually obvious; `aria-sort` on the active header.
- [ ] Stable, predictable sort semantics: numeric compare on numeric columns, locale-aware string compare, nulls last — no ASCII-order surprises.
- [ ] Ellipsis pagination for >10 pages (`1 2 3 … 12 13 14 15`): first/last page always reachable, window around the current page; no context-free prev/next-only or "Load more" on bounded datasets.
- [ ] "Showing X–Y of Z results" always displayed near pagination — dataset scale and filter effect visible at a glance.
- [ ] URL state: page, sort field/order, and active filters encoded in query params — bookmarkable, shareable, back-button restores the exact view.
- [ ] Sticky table header on long tables; column widths stable across pages (tabular-nums on numeric columns).
- [ ] Mobile: identifier column pinned (sticky left); remaining columns via horizontal scroll or card stacking — never squished illegible columns.
- [ ] Row actions as quiet text links ("Details", "Edit"), visible at all times — not loud colored buttons, not hidden-on-hover; the data is the hero.
- [ ] Row readability: subtle alternating row shading or hairline dividers for cross-row tracking; no aggressive zebra stripes.
- [ ] Row selection (where applicable): checkboxes with header select-all, keyboard operable, selection count announced to screen readers.
- [ ] Density control for power users (comfortable/compact toggle) on data-heavy tools; preference persisted.
- [ ] Zero-result filters: explanatory message naming the cause + suggested actions (clear filters, broaden search) — never a blank table body.
- [ ] Forgiving filters: case-insensitive text matching; active filters shown as removable chips; filter changes announce result counts to screen readers.
- [ ] Export (CSV/print) offered on data-heavy tables where users reasonably need it — exporting via emoji-polluted clipboard copy is banned (see Content formatting above).
- [ ] Keyboard-operable grids: arrow-key cell navigation and row activation without a mouse on data-heavy tools.
- [ ] Column chooser for optional columns on dense tools; hidden columns remain available in export.
- [ ] Header labels are plain language ("Hired on"), not DB column names (`created_at`); totals/footer rows pinned and visually distinct from data rows.
- [ ] Aggregates labeled with their method ("Median", "p99", "Sum") — a bare number in a totals row is ambiguous.
- [ ] Dense data surfaces support text selection and cell-value copy — no `user-select: none` on data.
- [ ] Bulk-action bar appears only when rows are selected; actions confirm before destructive operations.
- [ ] Table-level quick filter (search box filtering the visible dataset) on wide datasets; debounced input, never a full re-render flash.
- [ ] Empty/error states for tables render inside the table geometry (a row spanning all columns), not as a detached page-level card.

## Footer & navigation hygiene

- [ ] Footer is a utility, not a pitch: essential links only — Privacy, Terms, Contact, plus optional About/Careers/Social — no branding paragraphs, redundant CTAs, or lorem ipsum.
- [ ] Copyright year computed dynamically (`new Date().getFullYear()` or server-side equivalent), never hardcoded.
- [ ] Primary navigation ≤7 items; overloaded navs signal failed prioritization — group the rest under clearly-labeled dropdowns or the footer.
- [ ] No orphan pages: every page reachable from primary nav or an explicit in-site link; sitemap linked in the footer.
- [ ] Footer columns labeled with real headings ("Company", "Resources"), never "Links" / "Misc" — screen-reader users scan them.
- [ ] Language/region switcher (if multi-locale) lives in the footer, not buried in settings.
- [ ] Active nav state visible: current page indicated with `aria-current="page"` + a visual treatment.
- [ ] Mobile navigation actually works: hamburger opens/closes cleanly, focus trapped while open, Escape closes, all items reachable — test on real mobile viewports; broken mobile nav is the #1 "looks unfinished" signal.
- [ ] Social links open in a new tab with `rel="noopener"` and labeled icons (no mystery glyphs).
- [ ] Error pages branded and helpful (search, home link, friendly message) — default framework error pages are a production blocker (see Empty/error states).
- [ ] Legal pages (Privacy, Terms) show a last-updated date; the policy text matches what the product actually does.
- [ ] Long pages get a back-to-top affordance after ~3 viewport heights of scroll.
- [ ] Footer density matches context: marketing pages get a full sitemap footer; in-app surfaces get a minimal footer (status, help, legal) — never the marketing mega-footer inside the product.
- [ ] "Powered by" credits (if any) are quiet text, not logos competing with the brand.
- [ ] Footer contains no H1 and no keyword-stuffed link farms — search engines penalize both.
- [ ] Footer trust row (where applicable): status page link, contact info, compliance/security badges *only if real* — no fabricated trust signals (truthfulness standard in design-distinct.md).

## Spacing & layout

- [ ] All padding/margin/gap from a scale (8pt base: `4·8·12·16·24·32·48·64·80·96·128`) — no arbitrary values; `gap` on parents instead of child margins.
- [ ] Fluid spacing with `clamp()` for section-level padding (e.g. `clamp(2rem, 1.5rem + 2vw, 4rem)`); density bands: marketing 80–120px desktop, app 48–64px, dense dashboards 8–16px.
- [ ] Page gutters in a centered max-width (1200–1400px; reading column ~65ch); logical properties (`padding-inline`, `margin-block`) throughout; viewport heights in `dvh` not `vh`.
- [ ] External margin ≥ internal padding; edges and baselines align across columns; CSS Grid/Flexbox/subgrid only (no absolute-position layout).
- [ ] Components adapt via container queries (`@container`), media queries reserved for page-level concerns; touch targets ≥44×44px with 8–16px spacing between interactive elements.
- [ ] Layout CSS ordered via cascade layers (`@layer reset, base, components, utilities`); component proximity scoping uses `@scope` (Baseline Jan 2026) instead of specificity hacks.
- [ ] Concentric radii: outer radius = inner radius + padding — nested rounded corners compound instead of matching; one consistent inner radius per surface (better-ui, jakubkrehel/skills, MIT, checked 2026-10-02).
- [ ] Optical over geometric alignment: icons next to text, centered dots, and baselines aligned by eye (optical center) — pixel-exact math that looks off-center fails.

## Color system (OKLCH-first)

- [ ] All authored colors in `oklch()` — no hex or HSL for new tokens; perceptually uniform lightness (equal L reads equally bright across hues).
- [ ] Hover/focus/disabled/translucent variants derived at the point of use with `color-mix(in oklch, …)` or relative color syntax `oklch(from var(--brand) calc(l - 0.07) c h)` — never hand-tuned extra stops.
- [ ] Semantic roles defined (brand, surfaces, text tiers, borders, success/warning/error/info); ≤12 unique non-gray colors; neutrals consistently warm or cool; optionally `color(display-p3 …)` vibrancy with sRGB fallback.
- [ ] **No color-only encoding** — status carried by icon + text label as well.
- [ ] AA contrast measured per pairing (normal text ≥4.5:1, large text ≥3:1, UI boundaries/icons ≥3:1) including muted text and placeholders; APCA `Lc` levels used as the perceptual readability ceiling for fine tuning. Contrast mechanics: `web-frontend.md`.

## Dark mode craft

- [ ] Full theme via semantic token overrides — zero hard-coded `#fff`/`#000`; prefer `light-dark()` for paired light/dark values with `color-scheme: light dark` declared.
- [ ] Neutrals tinted toward the brand hue (tiny chroma, e.g. `oklch(18% 0.015 255)`), never pure gray; body text off-white, never pure white.
- [ ] Contrast re-verified in both modes, including skeleton and error surfaces; `theme-color` meta per mode.
- [ ] No wrong-theme flash: theme applied before first paint (early inline script or `color-scheme` hint); persisted preference beats OS default.
- [ ] Theme-switch transition suppression: on light/dark toggle, inject `transition: none !important`, force a reflow, restore on the next frame — no color-transition flicker across every element (better-ui technique, checked 2026-10-02).
- [ ] Visible `:focus-visible` on every interactive element (≥2px outline, high-contrast against the current theme, offset ≥2px); skip-to-content link first in the DOM.

## Micro-interactions & motion (2026)

- [ ] Every interactive element has hover/focus/active states styled with `:has()` for parent-from-child state where JS class-toggling was needed before (e.g. `.form-group:has(input:focus)`).
- [ ] Durations from tokens: press 100–160ms, simple transitions 150–300ms, modals/drawers 200–500ms, exits ≈60–70% of enter; `prefers-reduced-motion` honored globally.
- [ ] Easing: ease-out entering / ease-in exiting by default; `linear()` for natural-feeling multi-segment curves; properties named explicitly — never `transition: all`.
- [ ] Animate **transform and opacity only** on the compositor; one signal per hover (translate *or* color *or* underline); custom properties registered with `@property` when animated.
- [ ] Discrete enter/exit animations via `@starting-style` + `transition-behavior: allow-discrete` (graceful in Firefox, where the exit is skipped rather than broken).
- [ ] View Transitions API used for state/route changes — same-document is Baseline since Firefox 144 (Oct 2025); cross-document (`@view-transition { navigation: auto }` on both documents) is progressive enhancement only (no Firefox as of mid-2026).
- [ ] Scroll-driven animations (`animation-timeline: scroll()/view()`) gated behind `@supports` and `prefers-reduced-motion` — progressive enhancement only (Firefox behind a flag as of mid-2026); content never gated on them.
- [ ] Scroll containers use `scrollbar-gutter: stable` to prevent layout shift when scrollbars appear; `scroll-padding` keeps anchored content clear of sticky headers.
- [ ] Named motion tokens (transitions.dev practice, checked 2026-10-02): durations, easings, distances, and blur as CSS custom properties; ad-hoc values tokenized in a refine pass — no raw `200ms` scattered in components. (The repo's "43+" tagline is its marketing claim; the shipped skill carries 32 transitions.)
- [ ] Easing vocabulary with exact curves: default `--ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1)`; bounce curves (`cubic-bezier(0.34, 1.36, 0.64, 1)`) reserved for playful non-functional moments — never on functional motion.
- [ ] Interruptible by default: interactive state changes use CSS transitions (always interruptible); one-shot sequences use keyframes; never non-interruptible JS-driven animations on hover/active/press states.
- [ ] Press feedback: `scale(0.96)` on press, never below `0.95`; paired with the 100–160ms press token.
- [ ] Exits softer than enters: small fixed translateY (~4–8px), ease-out both directions; ~100ms stagger only for infrequent staged entrances (page-load lists), never on every interaction.
- [ ] Motion reviewed at 10% speed before shipping — slow playback exposes jank and asymmetry invisible at full speed.

## Loading states

- [ ] <300ms → nothing (or just the press state); 300ms–2s → **skeleton** shaped like the layout with reserved space (blocks layout shift); >2s → determinate progress + contextual message.
- [ ] Skeletons mirror the actual content shape (rows match row height, varied line widths 100%/75%/60%); never a full-page spinner when layout is predictable; full-page spinner only as last resort.
- [ ] Shimmer on a 1.5s loop, disabled under `prefers-reduced-motion`; shimmer gradient colored from theme tokens, not hard-coded grays.
- [ ] ≥10s → progress with status updates + cancel affordance; no endless spinner without a timeout or error path.
- [ ] Paginated lists reserve table height during page turns (skeleton rows, not a spinner swap) — no layout shift when the next page renders.
- [ ] **Optimistic UI** for near-certain actions (flip instantly, sync in background, roll back with toast on failure); submit disabled during flight; loading regions marked `aria-busy`, async status announced via `aria-live`.

## Empty / error states

- [ ] **Every async view designs three variants**: loading, empty, error — no blank pages or raw empty tables.
- [ ] Empty states first-class: icon + headline + what fills the surface + primary CTA; filtered-to-nothing names the active filters with "Clear filters".
- [ ] Partial failure designed: a grid/card list with one failed item shows that item's inline error, not a page-wide error.
- [ ] Timeout errors name the elapsed wait ("Taking longer than 30s — retry or check status") and offer cancel/retry rather than a silent hang.
- [ ] Error messages name **cause AND fix** ("We couldn't reach the server. Check your connection and try again.") — never "An error occurred", never raw codes; every error carries a retry affordance; form state preserved.
- [ ] No dead ends — retry preserves state/scroll/filters; cache last-good response under a "stale" badge; custom 404 + 500/offline pages with navigation.
- [ ] Destructive actions get explicit confirm (type-the-name); reversible ones get Undo (5–10s).

## Visual hierarchy

- [ ] Hierarchy via size + weight + color together — never font-size alone; ≥2 weights separating levels.
- [ ] **One primary action per view** — single dominant CTA, secondary/tertiary de-emphasized.
- [ ] At most one orchestrated entrance animation per page; layout functional at 200–400% zoom; semantic HTML landmarks per `web-frontend.md`.
- [ ] Stats presented as typography-first figures (`font-mono tabular-nums`), not icon stickers — the full anti-slop standard lives in design-distinct.md.
- [ ] Related controls grouped with 8px internal gaps and 24px external separation — proximity is the cheapest hierarchy signal.

## Design tokens (W3C DTCG)

- [ ] Canonical token source in DTCG JSON: every leaf token has `$value` (+ `$type`, optional `$description`); aliases use brace syntax `{color.blue.500}`; no bespoke token schema.
- [ ] Three tiers: primitive (`color.blue.500`) → semantic (`color.text.primary`) → component (`button.primary.bg`); components reference semantic tokens, never primitives; built to CSS custom properties via Style Dictionary or Terrazzo.
- [ ] Token types used, not strings for everything: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number` — motion durations/easings are tokens too.
- [ ] Theming is semantic-token remapping only — switching themes changes zero component code; `light-dark()` values are valid token values.
- [ ] Naming convention documented and enforced; values stored once; lint CSS: no inline hex, no arbitrary pixels, no `!important`, no magic numbers.
- [ ] Repeated patterns are a single shared component with state variants (Default/Hover/Pressed/Focus/Disabled) — no one-off restyled copies.
- [ ] Mobile-first; spot-check 320/375/768/1024/1440/1920; no horizontal scroll at any viewport.
- [ ] Shadow tokens use brand-tinted oklch (e.g. `oklch(20% 0.02 var(--hue) / 0.08)`) instead of black-alpha — shadows pick up the theme instead of fighting it.
- [ ] Elevation is multi-layered, never one harsh `box-shadow`: each elevation token stacks 2–3 neutral layers (tight ambient + soft cast, e.g. `0 1px 2px …, 0 4px 12px …`) in brand-tinted oklch — a single harsh `0 8px 24px rgba(0,0,0,0.25)` or a neon `box-shadow` glow on dark backgrounds fails (see the dark-background glow tell in design-distinct.md).

## Curated design resources

Pull from these vetted, high-taste sources instead of generic AI templates. When in doubt, steal taste from a live benchmark, not from the prompt.

- **Taste galleries**: [godly.website](https://godly.website/) — live gallery of the best shipped web design; [mobbin.com](https://mobbin.com/) — real shipped iOS/Android/web flows from top brands; [minimal.gallery](https://minimal.gallery/) — restrained, typography-driven curation.
- **Palette, type, backgrounds**: [realtimecolors.com](https://www.realtimecolors.com/) — contrast-verified palette and font-pairing preview on a live layout; [haikei.app](https://haikei.app/) — clean SVG waves/geometry without heavy imagery; [coolors.co](https://coolors.co/) — palette generator with WCAG contrast checker; [fontjoy.com](https://fontjoy.com/) — font pairing tool.
- **Component primitives**: [ui.shadcn.com](https://ui.shadcn.com/) — accessible Radix + Tailwind primitives, the enterprise foundation (restyle the defaults); [kokonutui.com](https://kokonutui.com/) — 100+ components with built-in micro-interactions; [magicui.design](https://magicui.design/) — animated landing page components; [componentry.dev](https://componentry.dev/) — animated copy-paste components; [ui.aceternity.com](https://ui.aceternity.com/) — animated cards and background effects.
- **Motion**: [motion.dev](https://motion.dev/) — production animation, gesture, and layout engine; [motion-primitives.com](https://motion-primitives.com/) — copy-paste Motion + Tailwind primitives; [react-spring.dev](https://www.react-spring.dev/) — physics-based animation without re-render lag.
- **Data visualization**: [bklit.com](https://bklit.com/) — polished, responsive chart templates; [tremor.so](https://tremor.so/) — React dashboard and chart components.
- **Icons (used functionally, never as decoration)**: [lucide.dev](https://lucide.dev/) — consistently stroked SVG icons; the zero-decorative-icon law in design-distinct.md decides *where* they may appear.
- **Vetting rule**: preview 3 shipped examples from any resource before adopting its pattern — a gallery screenshot is inspiration, not a component.
- **Rule of thumb**: if the component looks identical to the resource's demo, restyle it to the brand tokens before shipping.

## Sources

- https://github.com/yu-aimaker/awesomedesignsystem/blob/HEAD/research/color-systems.md — OKLCH/P3/APCA color systems, semantic tokens (2026)
- https://github.com/tinovyatkin/modern-css-skill/blob/HEAD/SKILL.md — OKLCH tokens, light-dark, text-wrap, fluid space/type (2026)
- https://github.com/seanlf/claude-rss-news-digest/blob/HEAD/docs/standards/css.md — 2026 CSS baseline/feature support table
- https://github.com/athevon/genjutsu/blob/HEAD/skills/_jutsu/css-native/references/modern-css.md — View Transitions browser support matrix (2026)
- https://github.com/samskywalker21/my-learning-md-docs/blob/HEAD/css/css-responsive-typography.md — container query units, style queries, fluid type
- https://blog.codercops.com/blog/design-tokens-2026-w3c-format-guide — DTCG format guide (2026)
- https://github.com/hugolify/hugolify-theme-design-system/blob/HEAD/docs/DTCG.md — DTCG $value/$type/alias format
- https://github.com/semikolon/spela/blob/HEAD/docs/ux_principles_media_remote_2026_07_04.md — loading duration/pattern mapping (NN/g)
- https://github.com/narenkatakam/ux-audit/blob/HEAD/skills/ux-audit/references/ui-states.md — skeleton vs spinner decision tree, empty/error patterns
- https://github.com/rbaumier/skills/blob/HEAD/ui-ux/SKILL.md — view-state completeness, skeleton implementation
- https://github.com/Jakubantalik/transitions.dev — motion-token vocabulary (`skills/transitions-dev/_root.css`: durations, easings, distances) and the tokenize-ad-hoc-motion ("refine") practice (checked 2026-10-02)
- https://github.com/jakubkrehel/skills — `better-ui` skill (MIT): concentric radius, optical alignment, interruptible animations, stagger/exit discipline, theme-switch transition suppression, 10%-speed review (checked 2026-10-02)
- https://github.com/pbakaus/impeccable — the repo's own claimed spec is "1 skill, 24 commands, 61 deterministic detector rules" (Paul Bakaus, Apache 2.0, ~73.5k stars, checked 2026-10-02)
