# Design Directions — named styles with concrete recipes

Picked a direction *before* generating, committed to it, and written into brand tokens (see `design-polish.md`). This file kills the "agents improvise generic styles" problem: eight named, selectable directions, each a self-contained recipe of 5–7 concrete rules. Run the anti-slop gate in `design-distinct.md` on top of whichever direction is chosen — these recipes assume the tells are already dead. Checked 2026-10-13.

## Protocol: choosing and committing

- [ ] Pick exactly ONE direction per product surface; a marketing page and an app console may differ, but never mix two directions on one screen.
- [ ] Write the direction's rules down as brand tokens (palette, type pairing, radius, motion curve) before generating — generation happens inside the tokens.
- [ ] Name two reference products and what to borrow from each; state one thing the site must NOT look like.
- [ ] After generation, audit against both the recipe below and the tells in `design-distinct.md` — a surviving violation is a defect, not a preference.

## 1. Quiet premium (Apple/HIG minimal)

- [ ] **Type:** one family, system stack or equivalent; display sizes large with tight tracking, body generous line-height; sentence case everywhere, never shouty uppercase.
- [ ] **Color:** monochrome base on true neutral grays; exactly one system accent (classically blue) reserved as pinpricks — links, primary action, focus ring.
- [ ] **Spacing:** generous whitespace, single comfortable column (~65–70ch), one hero idea per viewport; density loosens, never tightens, as you scroll.
- [ ] **Motion:** subtle and physical — short ease-out transitions, content settles rather than bounces; nothing moves for decoration.
- [ ] **Imagery:** real product photography or screenshots on neutral backgrounds; no decorative shapes, no illustration-as-wallpaper.
- [ ] **Signature:** restraint is the brand — if a second accent or effect is tempting, delete it instead.
- [ ] **Look at:** Apple, Things (Cultured Code). **Avoid:** gradient-heavy SaaS templates, neon-dark "pro" skins.

## 2. Terminal precision (Linear-style dark)

- [ ] **Type:** display face with tight leading for headlines; mono for labels, numbers, and status (`tabular-nums`); size contrast does the hierarchy work.
- [ ] **Color:** near-black background (never pure `#000`); one accent color as pinpricks under 10% of the viewport; muted gray body text, full-contrast headings.
- [ ] **Spacing:** hairline borders over fills for elevation; marketing page airy, in-app surface tight and information-dense.
- [ ] **Motion:** precise, mathematical, short durations; motion communicates state changes only — hover clarifies (border/shadow shift), never bounces.
- [ ] **Imagery:** the real product screenshot sits directly below the promise; framed with a 1px border, never faked or mocked with generic data.
- [ ] **Signature:** one engineered detail (a subtle grid/dot texture, a single status dot) — geometry and spacing are the brand.
- [ ] **Look at:** Linear, Vercel. **Avoid:** neon-cyan "hacker" dashboards, purple-gradient dev-tool landings.

## 3. Print editorial (magazine)

- [ ] **Type:** a serif display face with real character paired with a neutral text face (max 2 families); strong size contrast; rules, kickers, and pull details used sparingly and only when they add information.
- [ ] **Color:** a paper background chosen for a brand reason (not the default "tasteful cream"); ink text; one confident spot color for emphasis.
- [ ] **Spacing:** asymmetric grid, 60/40 or 40/60 splits, full-bleed moments; section density varies — dense analysis, then an airy statement.
- [ ] **Motion:** near-zero on text; media may crossfade or page-turn; nothing scroll-reveals decoratively.
- [ ] **Imagery:** commissioned photography or illustration with captions; figures and tables treated as artifacts, not decoration.
- [ ] **Signature:** typographic confidence — the headline, the measure, and the white space carry the page, not components.
- [ ] **Look at:** The Pudding, Stripe Press. **Avoid:** generic Medium-style blog templates, italic-serif SaaS heroes.

## 4. Web brutalist

- [ ] **Type:** system stacks, mono, or a raw grotesque; large honest sizes; hierarchy through size and weight, not color; uppercase only where a label genuinely needs it.
- [ ] **Color:** high-contrast black on white (or inverted); visible 2px+ borders; square corners or one deliberate radius; one loud accent used bluntly.
- [ ] **Spacing:** tight and dense; borders do the separation work — no soft shadows, no blur, no rounded-card nesting.
- [ ] **Motion:** instant or stepped; hover inverts, underlines, or swaps — never scales or fades softly.
- [ ] **Imagery:** raw screenshots and unretouched photos; anti-stock, anti-polish; the content's roughness is the texture.
- [ ] **Signature:** visible structure — the grid, the borders, and the type ARE the design; nothing is hidden behind decoration.
- [ ] **Look at:** Craigslist (functional ancestor), early Gumroad. **Avoid:** polished SaaS landing pages, soft-shadow card grids.

## 5. Friendly rounded (soft/playful)

- [ ] **Type:** rounded or soft grotesque; medium weights over bold; generous line-height; sentence case; warm micro-copy voice.
- [ ] **Color:** warm-tinted neutrals with pastel accents used sparingly; contrast stays AA — no washed-out gray text on tinted surfaces.
- [ ] **Spacing:** roomy; larger radii mixed deliberately (not uniform everywhere); one soft shadow language, never shadow-plus-border stacked.
- [ ] **Motion:** springy easing on small elements, one signature interaction; playful in exactly one place, calm everywhere else.
- [ ] **Imagery:** a consistent custom illustration system (one character/style); real photos of real people when humans are the subject.
- [ ] **Signature:** warmth with discipline — friendly never means sloppy; every rounded corner is a decision, not a default.
- [ ] **Look at:** Duolingo, Headspace. **Avoid:** enterprise gray SaaS, candy-gradient "fun" templates.

## 6. Quiet luxury

- [ ] **Type:** refined serif or elegant grotesque for display, quiet text face for body; wide tracking on micro-labels; restrained sizes — confidence, not volume.
- [ ] **Color:** deep neutrals (charcoal, ivory, stone); one precious accent (gold, deep emerald) used extremely sparingly; matte surfaces, never glossy.
- [ ] **Spacing:** extreme whitespace; few elements per viewport; slow visual pacing — the page should feel unhurried.
- [ ] **Motion:** slow, deliberate fades; nothing pops, slides in fast, or bounces; transitions feel weighted.
- [ ] **Imagery:** high-end photography with generous crops; the product shown like an object, styled and lit — never a raw screenshot.
- [ ] **Signature:** material honesty — paper grain, ink depth, metal; texture through tone, never through patterns or gradients.
- [ ] **Look at:** Aesop, Bang & Olufsen. **Avoid:** gold-gradient "premium" templates, neon luxe, stock luxury (yachts, watches).

## 7. Data dense (utilitarian dashboard)

- [ ] **Type:** workhorse grotesque or system stack; mono `tabular-nums` on every number; micro-labels uppercase with wide tracking; hierarchy through size and weight.
- [ ] **Color:** neutral surface (light or dark); color reserved strictly for semantic meaning — status, deltas, alerts — never decoration; no rainbow borders.
- [ ] **Spacing:** dense, information-first; dividers instead of cards; 12–16px rhythm; discovery cards or bento lead, dense tables available as the power-query toggle.
- [ ] **Motion:** near-zero decoration; instant state changes; skeletons match the geometry of the content they replace.
- [ ] **Imagery:** real data visualizations are the hero — sparklines, distribution bars, percentile tags — over icons and illustration.
- [ ] **Signature:** scan speed — a power user reads the screen in seconds; every pixel answers "what changed and what needs me."
- [ ] **Look at:** Bloomberg Terminal, Grafana. **Avoid:** marketing-style dashboards with hero gradients, gamified leaderboards.

## 8. Crafted warmth (analog/craft)

- [ ] **Type:** humanist serif or warm grotesque; slightly looser tracking; italics for emphasis, not decoration; one display face with character, one workhorse text face.
- [ ] **Color:** warm paper tones chosen for a brand reason; earthy accents; ink text; texture through tonal variation, never through stripe patterns.
- [ ] **Spacing:** comfortable, book-like measure; section breaks marked with a rule or one small signature ornament — one or two hand-touched details max.
- [ ] **Motion:** gentle and unhurried; paper-like transitions; the 2026 counter-movement's visible designer's hand (asymmetry, a hand-drawn touch) with restraint.
- [ ] **Imagery:** analog photography, real process shots, visible maker's hand; never smooth AI-illustration plastic.
- [ ] **Signature:** the human touch — one deliberate imperfection or hand detail that proves a person made judgments; five competing effects is noise, not craft.
- [ ] **Look at:** Basecamp, Field Notes. **Avoid:** sterile corporate minimalism, over-illustrated "hand-drawn" SaaS.

## When one product needs two directions

- [ ] A marketing page and an app console may legitimately differ (e.g. Print editorial outside, Data dense inside) — declare both up front, never drift into it.
- [ ] Share the type pairing and the neutral scale across both; only the mode-specific rules (density, motion, color discipline) change — see "choose the mode by surface" in `design-distinct.md`.
- [ ] The transition between surfaces must feel like one product: same voice, same accent pinpricks, same wordmark treatment.
- [ ] Never let a third direction creep in — two declared directions is the maximum for one product.

## Record the choice

- [ ] Write the chosen direction name into the design briefing (`DESIGN.md` or equivalent) with the two reference products and the one must-NOT-look-like.
- [ ] The review pass names the direction it audits against — "audited as Terminal precision: pass" — so drift is checkable.

## How to choose — match the direction to the product and audience

- [ ] Developer/technical tool → **Terminal precision** or **Data dense**: the audience expects density, honesty, and real artifacts — decoration reads as untrustworthy.
- [ ] Consumer app for everyone → **Quiet premium** or **Friendly rounded**: trust and approachability win; pick playful only if the brand can sustain it.
- [ ] Content, publishing, or ideas are the product → **Print editorial**: reading is the experience, so typography is the interface.
- [ ] Money, health, or high-stakes decisions → **Quiet premium** or **Quiet luxury**: restraint reads as safety; never playful, never brutalist.
- [ ] Internal tools and ops consoles → **Data dense**: scan speed beats beauty; spend the design budget on information hierarchy, not hero sections.

## Sources

No external source list: the eight directions are original syntheses written for this skill, not citations of any single document. The named products in each recipe ("Look at") are public reference points for visual study, not quoted sources. For the underlying craft mechanics they assume, see `references/design-polish.md`; for the anti-slop gate, see `references/design-distinct.md`.
