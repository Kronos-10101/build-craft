# Design Distinct — How to NOT Look Vibe-Coded

Why AI-generated sites all look the same, and the concrete antidotes. A site is "vibe-coded" not when AI helped build it, but when every taste decision was left at the default. Checked 2026-09-30.

## Why the convergence happens

An LLM outputs the statistical median of its training data: Tailwind docs examples, shadcn/ui demos, Vercel templates, and YC landing pages from 2022–2024. Tailwind's old default `bg-indigo-500` button color propagated through thousands of tutorials into the corpus (Tailwind's creator publicly apologized for it in 2024), and AI-generated sites got scraped back into training data — a self-reinforcing loop. "Be more creative" doesn't fix it; only explicit constraints do.

## The tells — kill every one of these

- [ ] No indigo/violet/blue-purple gradient hero (`from-indigo-500 to-purple-600`), no gradient-text headline (`bg-clip-text`) — the single strongest signal.
- [ ] No Inter-at-everything: if the typeface is Inter with default weights and no pairing, replace it with a deliberate choice.
- [ ] No pill badge + giant centered headline + two buttons + logo marquee hero — the median SaaS hero. Restructure the composition, not just the colors.
- [ ] No identical 3-card (or 3×2 bento) feature grid with icon-on-top cards — vary the layout rhythm: 2+1, editorial rows, alternating media.
- [ ] No emoji as the icon system (🚀 ⚡ 🔒 in feature cards) — use Lucide or custom SVG icons, consistently stroked.
- [ ] No fake dashboard screenshots with primary-color callouts, floating orbs, or meteor effects — cheap generated decoration that adds nothing.
- [ ] No generic copy: "Unlock the power of…", "Supercharge your workflow", "All-in-one platform" — if the headline fits ten other products, rewrite it with specifics (numbers, names, concrete outcomes).
- [ ] No unrequested dark mode and no monolithic `slate-*` neutrals straight from the default ramp — tint neutrals with the brand hue.
- [ ] No pure `#000` on pure `#fff` with zero brand color anywhere — tint, or commit to a real monochrome system deliberately.
- [ ] No diagonal-arrow glyph on every link, no five-type-styles-in-one-hero (eyebrow + logotype + H1 + subhead + badge competing) — one hierarchy, enforced.
- [ ] No identical pricing tables (3 tiers, middle one highlighted, checkmark lists) and no testimonial carousels with interchangeable quotes — vary the proof section: real metrics, named customers, or a single strong case study.
- [ ] No "trusted by" logo wall of grayscale lookalike logos when you have no customers — omit the section rather than fabricate social proof.
- [ ] No cookie-cutter alternating dark/light sections with the same padding rhythm — vary section density: a dense data section, then an airy statement section.

## The antidotes — checkable rules

- [ ] **Brand tokens decided before generation**: write down the palette (OKLCH values, not Tailwind defaults), the type pairing, the radius scale, and the motion curve in `design-tokens` first — then generate inside them. The anti-slop research shows domain-specific tokens are the highest-leverage fix.
- [ ] **Distinctive type pairing**: one display face with character + one workhorse text face, max 2 families, 2–3 weights per screen; never the default sans at default weights for everything.
- [ ] **One intentional accent color**, used sparingly (CTAs, key highlights) — not splashed across every section background.
- [ ] **Real, specific copy**: every headline names a concrete thing the product does, with at least one number, proper noun, or specific outcome per section. No lorem-style filler paragraphs.
- [ ] **Asymmetric or editorial layouts**: break the centered-column-everything pattern — left-aligned hero with media right, staggered grids, full-bleed moments, deliberate whitespace as a design element.
- [ ] **Real visuals**: actual product screenshots, real photography, or commissioned illustration — never gradient blobs and stock 3D shapes as the visual identity.
- [ ] **Micro-copy with a voice**: button labels, empty states, and error messages written like a person ("No invites yet — send your first one"), not template text ("No data available").
- [ ] **Custom details, applied with restraint**: one or two signature touches (a distinctive hover treatment, a custom cursor detail, an unusual section divider) — not five competing effects.
- [ ] **Component styling that isn't default shadcn**: restyle the primitives to the brand tokens (radius, borders, shadows, focus rings) instead of shipping `components.json` defaults untouched.
- [ ] **Consistent but non-default rhythm**: spacing, section padding, and card treatments follow the site's own system — grep for ad-hoc values that drift back toward the median.

## Copy that sells — before/after

- [ ] Every headline passes the competitor test: remove the product name — if it still fits a rival, rewrite with specifics.
- [ ] Before: "Supercharge your workflow with our all-in-one platform." After: "Ship database branches for every pull request in 800 ms."
- [ ] Before: "Unlock the power of AI-driven insights." After: "See which query slowed your p99, with the EXPLAIN plan attached."
- [ ] Feature descriptions name the mechanism, not the vibe: "branch-per-PR Postgres clones" beats "seamless developer experience."
- [ ] Numbers beat adjectives: latency figures, row counts, time saved — one concrete number per section minimum.

## Color and type discipline

- [ ] Neutrals tinted with the brand hue (warm grays for a warm brand, cool for cool) — never raw `slate-*`/`gray-*` straight from the default ramp.
- [ ] Accent color used at <10% of the viewport: CTAs, active states, key data points — large colored surfaces are a deliberate statement, not a default.
- [ ] Dark mode is a designed theme (re-tinted surfaces, re-verified contrast), not an inversion nobody asked for; if the brief didn't ask for it, don't ship it.
- [ ] Display type reserved for display: the characterful face appears in headlines and big numbers, never in body copy or form labels.
- [ ] Type scale from a modular ratio (1.2–1.333), not hand-picked sizes; exactly one H1 per page; no skipped heading levels.

## Layout patterns that aren't the median

- [ ] Pick one non-default composition per page: left-aligned hero with sticky media, oversized typographic statement, horizontal-scroll feature rail, split-screen with asymmetric ratio (40/60, not 50/50).
- [ ] Vary section rhythm deliberately: dense → airy → dense, so the page has dynamics instead of a metronomic card-section/card-section march.
- [ ] Break the container occasionally: one full-bleed moment (a wide screenshot, a statement band, a data visualization) per page gives the layout a memory.
- [ ] Whitespace as a design element: a section with one sentence and vast space reads as confident; a page afraid of empty space reads as generated.

## Before you generate — the briefing checklist

- [ ] Brand tokens written down first: palette (OKLCH), type pairing, radius scale, motion curve, border/shadow language. Generation happens inside these, never before them.
- [ ] Real copy collected before layout: actual headlines, real feature names, real numbers — never generate the design and fill copy later.
- [ ] Two or three reference sites named explicitly (not "modern SaaS sites") with a note on what to borrow from each: "Linear's restraint, Gumroad's playfulness, nothing else."
- [ ] One thing the site must NOT look like, stated up front: "not a purple-gradient SaaS hero."
- [ ] After generation, run the tells checklist above as a review pass — treat every surviving tell as a defect, not a preference.

## The 3-second test

- [ ] Screenshot the hero, shrink it to a thumbnail, and ask: could this be any of ten products? If yes, change the type, the color, or the composition until the answer is no.
- [ ] Read the H1 aloud with the product name removed — if it still makes sense for a competitor, the copy is generic.

## Sources

- https://www.925studios.co/blog/ai-slop-design-tells
- https://github.com/oshadakavinda/malware-static-analysis/blob/HEAD/docs/ui_ai_look_avoidance.md
- https://github.com/lelephi/marketing-agent-skills-for-founders/blob/HEAD/landing-page-review/references/ai-slop-tells.md
- https://github.com/cuuper22/anti-slop-design/blob/HEAD/README.md
- https://github.com/blakecyze/mimesis/blob/HEAD/research/research-design.md
