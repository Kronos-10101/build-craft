# Design Distinct — How to NOT Look Vibe-Coded

Why AI-generated sites all converge on one median look, the tells that give it away in 2026, and the concrete antidotes. A site is "vibe-coded" not when AI helped build it, but when every taste decision was left at the default. Checked 2026-10-01.
For the systematic visual-craft rules — type scales, spacing grids, token architecture, motion durations — see design-polish.md; this file is the anti-median filter.

## Why the convergence happens

An LLM outputs the statistical median of its training data: Tailwind docs examples, shadcn/ui demos, Vercel templates, and YC landing pages from 2022–2024. RLHF ratings compound it: human evaluators consistently rate "safe" outputs higher than interesting ones, so models learn that safety *is* the median — purple gradient, three cards, centered everything (a March 2026 Microsoft Research paper calls this pipeline "frictionless generation"). Tailwind's old `bg-indigo-500` default propagated through thousands of tutorials into the corpus (Tailwind's creator publicly apologized for it in 2024), and AI-generated sites now get scraped back into training data — a self-reinforcing loop. "Be more creative" doesn't fix it; only explicit constraints do.

## Visual tells — kill every one of these

- [ ] No indigo/violet/blue-purple gradient hero (`from-indigo-500 to-purple-600`), and no gradient-text headline (`bg-clip-text`) — the single strongest signal; the "Most Popular" gradient pill badge on the pricing tier is its sidekick.
- [ ] No decorative radial-gradient halo behind the hero "for atmosphere", no mesh/aurora blobs floating behind content — lazy decoration that carries no meaning.
- [ ] No neon cyan/purple accents with `box-shadow` glows on dark backgrounds — "hacker vibe" by default is not a designed dark theme.
- [ ] No cream/beige off-white chosen as the "tasteful neutral" default — this became its own tell in 2026; pick the background for a brand reason, not a safe one.
- [ ] No thick colored accent border on one side of a rounded card (`border-left: 4px solid ...`) — catalogued as the most recognizable card-level AI tell; it conflicts with the rounded corners and signals thoughtlessness, not hierarchy.
- [ ] No hairline border + wide soft shadow stacked on the same element — pick one elevation technique, not both.
- [ ] No cards nested inside cards inside cards ("cardocalypse") — flatten the hierarchy; use spacing or dividers instead.
- [ ] No uniform `rounded-xl`/`rounded-2xl` on every card with `rounded-full` pill buttons everywhere — mix radii deliberately; uniform rounding reads as template.
- [ ] No giant Lucide icon tile stacked above a heading — the universal AI feature-card template; put the icon in flow beside the heading or let it sit without its own container.
- [ ] No emoji as the icon system (🚀 ⚡ ✨) — use Lucide/Phosphor or custom SVG, consistently stroked; emoji bullets are decoration substituting for information architecture.
- [ ] No glassmorphism/blur as a decorative surface treatment — blur is fine when it solves a real layering problem (modal backdrops), not as the default finish.
- [ ] No repeating-gradient stripe patterns as decorative surface texture.
- [ ] No AI-illustration visuals — too smooth, too symmetrical, plastic; use real product screenshots, real photography, or commissioned art.
- [ ] No generic icon-in-colored-square on every card (`w-10 h-10 rounded-xl bg-blue-500/10` + zap/sparkles/shield/rocket/briefcase/globe/star) — the #1 amateur-AI signal; real products (Linear, Stripe, Apple, Vercel, Bloomberg) lead with typography size contrast and tabular numbers, never icon stickers.
- [ ] No uniform solid fill on every card (`bg-[#12141c]` on all) — cards breathe via subtle transparency (`bg-white/[0.02–0.04]`) + thin borders over the page background; vary emphasis by content weight, not tile color.
- [ ] No monotonous "wall of boxes": 4–8 identical metric boxes in a row, or card nested inside card inside card — replace with diverse pacing: an editorial hero with inline metric callouts, distribution ribbons/spectrums, horizontal carousel strips, or dynamic bento (1x1/2x1/1x2) weighted by real priority.
- [ ] No cold blinding-white admin spreadsheet as the primary discovery surface — lead with tactile, scannable discovery cards/bento; offer the dense table as a secondary toggle for power querying.
- [ ] No fake `animate-ping` radar dots on static badges, no bouncing scroll mouse/chevron in the hero — solid 6px dots only for real status; pulsing is reserved for actual live network/streaming transfers; users know how to scroll.
- [ ] No fake company avatars (two-letter initials in colored squares) or generic clip-art logos (graduation cap, briefcase, stethoscope) — use a clean typographic wordmark; never invent colored logo stickers.
- [ ] No dead ends in production: `href="#"` links, non-submitting forms, default framework favicons, raw `*.vercel.app` domains.
- [ ] No 2026 pastel-card combo: cream background + a matrix of identical rounded cards with colored (usually orange) borders, soft gradient fills, and hollow copy ("Unlock your potential", "All your tools. One simple dashboard") — reads polished for one screenshot, identical across ten products; vary the cards' structure, borders, and weight by real content.
- [ ] No low-contrast hero text color: the headline set in washed-out gray on the cream background is the faded-median look; the H1 carries full contrast against its surface, always.
- [ ] No builder badges or "Edit with …" tags left in production: strip Lovable/Vercel/Framer/hosting watermarks, editor iframes, and template credits before shipping — a watermark is a confession of origin.

## Type tells — the 2026 rotation

- [ ] No Inter at weight 700 with `-0.02em` tracking as the default display style — the median-AI headline formula; try Inter at 500/400 and let size do the work, or replace the face entirely.
- [ ] Not the 2026 rotation as the new default: Inter → Geist (itself overused) → Space Grotesk → Instrument Serif → Fraunces. Steering off Inter and landing on Fraunces is "the same non-decision wearing better clothes" — an italic-serif hero on a SaaS landing page is generic taste, not differentiation (checked 2026-09-30).
- [ ] No single font for everything — pair one display face with character and one workhorse text face (max 2 families); one face doing both jobs reads as never-styled.
- [ ] No cursive or script display font as the personality shortcut — a script headline on a SaaS page is the same non-decision as the 2026 font rotation; script faces earn their place only in genuinely editorial or luxury registers.
- [ ] No default-font text-only "logo": the product name typed in body font with zero treatment is not a wordmark — a wordmark needs a designed decision (weight, tracking, case, custom letterforms) or an actual mark; plain text in Inter is the unstyled default.
- [ ] No hero eyebrow pill chip ("✨ Introducing", "New", "Beta") above the giant headline — fold the kicker into the headline or drop it.
- [ ] No tiny uppercase tracked labels above *every* section heading — repeated kickers are structural scaffolding made visible; use eyebrows sparingly, only when they add information.
- [ ] No decorative monospace captions scattered for "hacker vibe" — reserve mono for actual code/data or an intentional brutalist register.
- [ ] No em-dashes sprinkled through headlines and no letter-spacing crushed past legibility — use the punctuation where grammar requires it; tight tracking only on display sizes.
- [ ] Numbers are `font-mono tabular-nums font-semibold` (metrics, prices, timers, counts) — prevents layout jitter and reads as financial authority; numeric table columns right-aligned, text columns left-aligned.
- [ ] Micro-labels are `text-[11px] font-semibold uppercase tracking-wider text-slate-400` (or the token equivalent); no pill-badge avalanche — tags reserved for primary status indicators, metadata as clean rows otherwise.
- [ ] Micro-visualizations over icons: a hairline distribution bar (`h-1 rounded-full`), a percentile delta tag (`top 5%`, `+18% YoY`), a subtle sparkline SVG.

## Layout and section tells

- [ ] No identical 3-card feature row (icon + title + 2-line description × 3) — use a 60/40 primary-secondary split, a vertical stack with alternating media, or a tabbed primary feature.
- [ ] No bento grid applied to content with no real size/priority hierarchy — bento is novelty-fatigued; arbitrary mismatched boxes read as chaos without a product to justify them.
- [ ] No canonical section order applied regardless of product: Hero → Logos → Features → Stats → Testimonials → Pricing → FAQ → CTA → Footer — reorder so the sequence tells *this* product's story.
- [ ] No centered text on every section — left-align body copy; reserve centering for one true hero moment.
- [ ] No monotonous 64–96px section padding everywhere — vary density (dense data section, then an airy statement section) so the page has dynamics instead of a metronomic march.
- [ ] No 3-tier pricing table with a scaled-up highlighted middle and identical checkmark lists — design the comparison around the actual plans.
- [ ] No stats row of 3–4 big numbers with small labels as a generic credibility device — prove with real artifacts, named customers, or one strong case study.
- [ ] No FAQ accordion as the default closing section when there are no actual frequent questions — an objections section only earns its place answering real objections.
- [ ] No single full-width gradient CTA banner jammed right before the footer — the final ask should grow out of the page's argument, not the template's slot.
- [ ] No sticky nav in the universal logo-left / links-center / CTA-right formation, and no 4-column mega footer regardless of actual link count — design chrome around real content.
- [ ] No raw-text wall dumps: long-form content never shipped as a single `whitespace-pre-line` block — headers, bullets, and paragraphs are detected and rendered in typographic tiers (formatting standard in design-polish.md).
- [ ] No single one-page site as the entire product presence when the product deserves routes: docs, pricing, contact, and legal pages get real URLs — one endless scrolling page for a real product is the median template, and it drags the footer-nav, orphan-page, and SEO tells down with it.

## Component and interaction tells

- [ ] No default shadcn/Tailwind primitives shipped untouched — restyle `components.json` defaults (radius, borders, shadows, focus rings) to the brand tokens.
- [ ] No toast notifications for every click, no modal for content that deserves a page (if it needs scrolling and columns, it needs a URL), no indefinite spinners, no "Something went wrong" errors that name nothing and fix nothing.
- [ ] No "Get Started" CTA repeated identically in every section — vary the CTA to what the section actually offers.
- [ ] No `scale(1.05)` hover on everything and no identical fade-in on every element — hover clarifies (border/shadow shift, not bounce); motion is choreographed, primary elements first, secondary staggered.
- [ ] No fake dashboard screenshots, fake terminals, or fake charts with generic data — show the real product UI or nothing.
- [ ] No decorative "01 / 02 / 03" numbered steps when the content isn't actually sequential — numbers earn their place only in a sequence.
- [ ] No placeholder humans: generic names ("John Doe", "Acme", "Nexus"), fake round numbers (99.99%), stock smiling-team photos, or SVG "egg" avatars.
- [ ] No power-user cosplay: loud `(Press / to search)` micro-copy and `[/] [T] [S] [C]` shortcut badges inline in the UI — clean placeholder text, shortcuts documented in a discreet `?` modal.
- [ ] No gamified-leaderboard dressing on institutional data: flame emojis, `#01/#02` rank tags, glowing neon tiers — present figures objectively.
- [ ] No fintech-KPI ticker styling for non-financial data — calm, contextual analytical presentation; no screaming urgency labels.
- [ ] No oversized filled buttons ("View Details", "Open Dashboard", "Explore Now") on every card/row — quiet typographic text links; the data is the hero, not the buttons.
- [ ] No hidden-on-hover critical actions (edit, delete, copy, view) — quiet low-contrast text links visible at all times; hover-hiding fails on touch and creates discovery friction.
- [ ] No gratuitous feature padding (anti-YAGNI): decorative widgets, fake live tickers, arbitrary filter chips that solve no verified user need — every element must earn its place or be deleted.
- [ ] No dark patterns: confirmshaming decline copy ("No thanks, I prefer to waste money" → neutral "No thanks" / "Skip"), fake-urgency countdowns that reset on refresh, consent banners where "Reject All" is a tiny gray link while "Accept All" is a big button (equal visual weight or nothing), pre-checked marketing opt-ins, basket-sneaking, drip pricing.

## Copy tells

- [ ] No AI word list in marketing copy: delve, leverage, seamless, unleash, unlock, supercharge, game-changer, tapestry, cutting-edge, empower, robust, landscape, streamline — use concrete verbs that describe what the product does.
- [ ] No template openers: "In today's fast-paced world", "Are you ready to take your X to the next level", "Whether you're a ... or a ...", "Let's dive in", "Look no further".
- [ ] No "It's not just X, it's Y" cadence and no three-item faux-parallel lists ("Fast, reliable, and scalable") — cut to the two claims that are actually true.
- [ ] No hedging where a definitive claim belongs: can, could, should, might, may, ought — commit or qualify with evidence.
- [ ] No "AI-powered" / "AI-driven" as the headline's prefix identity and no unrequested AI chat widget as the site's interaction identity — name the mechanism, not the tech category.
- [ ] Every headline passes the competitor test: remove the product name — if it still fits a rival, rewrite with a number, proper noun, or concrete outcome.
- [ ] Feature descriptions name the mechanism, not the vibe: "branch-per-PR Postgres clones" beats "seamless developer experience".
- [ ] One concrete number per section minimum: latency figures, row counts, time saved.
- [ ] Micro-copy in a voice: errors name the cause *and* the fix; empty states point to the next action ("No invites yet — send your first one", not "No data available"); success states say what happened ("50 points added"), not how the user should feel.
- [ ] No fabricated social proof: fake testimonials, invented company logos, "10,000+ happy developers" counters, unverified star ratings — real product screenshots, real case studies, or omit the section.
- [ ] No monotonous AI voice: identical sentence lengths, the "We believe in X. That's why Y." template, excessive em-dashes (—) — rhythm test: read aloud, vary punchy and long sentences, one em-dash per page max, concrete verbs over leverage/harness/empower.
- [ ] Copy-to-clipboard output is clean plaintext (Linear/Notion/Stripe style) — no emoji salad, no decorative unicode borders, no markdown in non-markdown contexts.

## The antidotes — checkable rules

- [ ] **Brand tokens decided before generation**: write down the palette (OKLCH values, not Tailwind defaults), the type pairing, the radius scale, and the motion curve first — then generate inside them. (Token architecture itself lives in design-polish.md; this file's job is making those tokens non-median.)
- [ ] **One display face with character + one workhorse text face**, max 2 families, 2–3 weights per screen; and check the choice against the 2026 rotation above — if the "distinctive" pick is Geist or Fraunces, find a third option.
- [ ] **One intentional accent color used as pinpricks**, <10% of the viewport (CTAs, active states, key data) — large colored surfaces are a deliberate statement, not a default.
- [ ] **Specificity is the meta-rule**: for every design decision, ask what would change if the user were someone concrete (e.g. a 45-year-old auntie checking her son's tutor at 9pm on a borrowed phone); if nothing changes, the design isn't specific enough.
- [ ] **Real visuals as the visual identity**: actual product screenshots framed as protagonists (1px borders, subtle inner glow), real photography, or commissioned illustration — never gradient blobs and stock 3D shapes.
- [ ] **Asymmetric or editorial layouts**: left-aligned hero with media right, split-screen at 40/60 (not 50/50), full-bleed moments — break the centered-column-everything pattern; structural repetition across pages is the tell, not color choice.
- [ ] **Custom details with restraint**: one or two signature touches (a distinctive hover treatment, an unusual section divider) — not five competing effects.
- [ ] **Motion that earns its place**: communicates state changes, directs attention, matches the product personality; delete everything decorative. Stripe's motion feels precise and mathematical; Duolingo's feels playful and bouncy — yours should feel like your product.
- [ ] **Semantic color naming**: name colors for what they do, not what they look like (`--color-action-primary`, not `--color-gradient-start`) — decorative color carries no meaning.
- [ ] **Treat slop as a gravitational pull, not a one-time bug**: every new AI-generated page is a fresh chance for defaults to creep back — audit against the tells above on each pass.
- [ ] **The 3-color constraint**: 2–3 brand colors + neutral grays max; neutrals consistently warm *or* cool (never sterile pure `#FFFFFF` nor pitch `#000`); one distinctive accent used as pinpricks (<10% viewport) for CTAs, active states, key data — color means something or stays home. (Token architecture in design-polish.md.)

## What the distinctive ones actually do — steal the principles, not the pixels

- [ ] Linear's lesson: near-black (#0a0a0a-ish), never pure black; massive display type with tight leading does the hero's work; a real product screenshot sits directly below the promise; accents are pinpricks (one yellow star, tiny status dots) — "expensive without ostentatious".
- [ ] Vercel's lesson: monochrome + one engineered light source; Geist Sans + Geist Mono for labels and numbers; faint dot/grid texture behind content; geometry + spacing as brand; proof-blocks (deploy logs, metrics) styled as real objects with chrome.
- [ ] Stripe's lesson: one big gradient moment (a single hero ribbon), then a disciplined, information-dense page; every section carries a concrete artifact (dashboard, snippet, card) — no section is words alone.
- [ ] Anthropic's lesson: off-white warmth with tonal restraint — borrow the restraint, not the palette.
- [ ] Their shared principles, not their pixels: aggressively high contrast, generous whitespace (more than feels necessary), monochrome base with one accent, sharp type — distinctive because of restraint, not excess.
- [ ] Do not over-design to compensate: layers of gradients, parallax on every section, custom cursors are noise, not identity. The 2026 counter-movement explicitly values a visible designer's hand — asymmetric type, hand-drawn touches, even jank — as proof a person made judgments.

## The 5 zero-tolerance rules — the anti-slop gate

1. **Zero decorative icons**: if an icon is not an interactive control (search, menu, close, chevron, download, expand), delete it. No `Briefcase` on a job card, no `TrendingUp` on a growth stat, no `IndianRupee` on a salary card — typography, label hierarchy, and tabular data are the visual hero.
2. **No colored icon badges**: ban `w-6 h-6 rounded-md bg-blue-50 text-blue-600` (and friends) sitting on cards as decoration.
3. **Typography and tabular numbers are the hero**: all metrics in `font-mono tabular-nums font-semibold`; micro-labels in `text-[11px] font-semibold uppercase tracking-wider text-slate-400`.
4. **Unified neutral elevation over rainbow borders**: one disciplined surface token — light `bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]`, dark `bg-slate-900/60 border border-slate-800/80`. Ban `border-emerald-200`, `border-indigo-200`, `border-sky-200`. Color is for semantic indicators only (a `+14.2%` delta, an alert) — never decoration.
5. **No fake radar pings**: `animate-ping` on a static badge is an instant tell. Status = a solid, refined 6px dot (`h-1.5 w-1.5 rounded-full`) for real state only.

## Before / after — killing the icon-box stat card

```tsx
// ❌ AI slop: icon in colored square, rainbow hover border
<div className="rounded-xl border border-slate-200/80 bg-white p-3.5 hover:border-emerald-200">
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-slate-500">Highest CTC</span>
    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
      <TrendingUp className="h-3.5 w-3.5" />
    </div>
  </div>
  <span className="text-xl font-bold tracking-tight text-emerald-700 tabular-nums">₹1.24 Cr</span>
</div>

// ✅ Elite craft: typography is the hero, neutral surface, quiet status tag
<div className="rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300">
  <div className="flex items-center justify-between">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Peak package</span>
    <span className="rounded border border-emerald-200/50 bg-emerald-50/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">Top 0.1%</span>
  </div>
  <div className="mt-2.5 flex items-baseline gap-1.5">
    <span className="font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
      ₹1.24 <span className="text-sm font-medium text-slate-500">Cr</span>
    </span>
  </div>
</div>
```

Discipline: the *number* got bigger and mono-tabular; the icon died; the border went from rainbow-hover to a single neutral token; the decorative sticker became a quiet percentile tag.

## Before / after — DOM flattening

```html
<!-- ❌ Vibecoded div soup: nested cards, gradient headline, decoration everywhere -->
<div class="p-8 rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900">
  <div class="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
    <h3 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
      Feature Title ✨
    </h3>
    <p class="text-gray-400">Unlock revolutionary potential...</p>
  </div>
</div>

<!-- ✅ Flattened semantic structure: one surface, typography does the work -->
<article class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
  <h3 class="text-base font-semibold text-neutral-900 dark:text-white">
    Automated batch processing
  </h3>
  <p class="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
    Execute recurring transformations across 10,000+ files with native checkpoint recovery and concurrency limits.
  </p>
</article>
```

One surface, no nested borders, concrete numbers in the copy — restraint is the whole technique.

## Radical truthfulness — zero hallucination

- [ ] Every statistic, metric, calculation, testimonial, badge, and status on the site is true and traceable to real source data — no hallucinated numbers, synthetic reviews, invented benchmarks, or fictitious verification states.
- [ ] No real data → state the source transparently, show clear mock/sandbox indicators in dev, or omit the claim — AI never fills content gaps with believable falsehoods.
- [ ] Data provenance is explicit: exact timestamp, source, and update cadence on batch/historical data ("Batch updated Oct 2024 via official records") — no fake operational theater ("Live Verification", "Real-Time Synchronized", "Phase X Verified").
- [ ] Authority badges only from a real auditable verification process — "Official Filing", "Verified Source", "AI-Verified" on ordinary data destroys trust faster than no badge at all.
- [ ] Urgency is honest: countdowns reflect real deadlines, "only X left" reflects real inventory, "Y people viewing" reflects real numbers.

## Deep-diving skills — fetch, don't guess

These companions live outside build-craft. Fetch a matching skill with `scripts/fetch-skill.sh` before starting, never guess its contents:

- Design critique + style recipes (Linear / Apple HIG / Pentagram / MUJI-style restraint) → fetch a skill matching "web design critique style recipes" via `scripts/fetch-skill.sh`.
- Typography pairing + fluid scales → fetch a skill matching "typography pairing fluid type scale" via `scripts/fetch-skill.sh`.
- Motion physics (springs vs easing curves) → fetch a skill matching "animation physics motion tokens" via `scripts/fetch-skill.sh`.
- Layered neutral shadows + frosted-glass discipline → fetch a skill matching "beautiful layered shadows" via `scripts/fetch-skill.sh`.
- Copy voice that doesn't read as AI → fetch a skill matching "product copywriting conversion" via `scripts/fetch-skill.sh`.
- Pre-ship design review → fetch a skill matching "design audit review" via `scripts/fetch-skill.sh`.

## The anti-vibecoding review pass — agent protocol

Run this pass on every generated page before shipping:

- [ ] **Count**: ≤3 non-neutral brand colors, ≤6 font sizes, ≤3 animation patterns — anything over is a fail.
- [ ] **Purge**: decorative colored icon boxes, `animate-ping`/`animate-pulse` on static data, rainbow borders, the same scroll reveal on every section.
- [ ] **Replace**: hollow headlines ("Unlock…", "Supercharge…") with domain-specific claims; icon-sticker stat cards with typography-driven metrics.
- [ ] **Delete**: fake testimonials, unverified counters/ratings, placeholder metrics, fake telemetry.
- [ ] **Verify**: every number traceable to a source; every status indicator truthful; copy passes the rhythm test.
- [ ] **Scorecard**: ✅ passed / ⚠️ warning (needs a human decision) / 🚫 blocked (fix before launch) / ➖ N/A (documented reason).

## Copy that sells — before/after

- [ ] Before: "Supercharge your workflow with our all-in-one platform." After: "Ship database branches for every pull request in 800 ms."
- [ ] Before: "Unlock the power of AI-driven insights." After: "See which query slowed your p99, with the EXPLAIN plan attached."
- [ ] Before: "In today's fast-paced world, businesses need robust solutions." After: nothing — this opener should never survive a draft; delete and start with the claim.
- [ ] Numbers beat adjectives: latency figures, row counts, time saved — one concrete number per section minimum.
- [ ] Before: "Loved by 10,000+ innovative builders worldwide." (fake logos) After: "Used by data engineers processing 40TB of telemetry daily." — or remove until real clients exist.
- [ ] Before: "It's not just a tool — it's your creative co-pilot." After: "A command-line tool for generating typed SQL migrations."
- [ ] Read the copy aloud. If it sounds like a textbook instead of someone excitedly telling a friend, rewrite it.

## Before you generate — the briefing checklist

- [ ] Brand tokens written down first: palette (OKLCH), type pairing, radius scale, motion curve, border/shadow language. Generation happens inside these, never before them.
- [ ] Real copy collected before layout: actual headlines, real feature names, real numbers — never generate the design and fill copy later.
- [ ] A tone extreme chosen up front (editorial / brutalist / soft / utilitarian / luxury / playful / technical) — "clean and modern" is not a tone. Derive it from the domain: a trading tool gets terminal density, an RPG tool gets drama.
- [ ] Two or three reference sites named explicitly with what to borrow from each: "Linear's restraint, Gumroad's playfulness, nothing else." Never copy the pixels.
- [ ] One thing the site must NOT look like, stated up front: "not a purple-gradient SaaS hero, not a bento grid".
- [ ] After generation, run the tells above as a review pass — treat every surviving tell as a defect, not a preference.
- [ ] Ground-truth calibration done first: studied real live products in the domain (terminology, workflows, mental models come from reality, not prompt imagination); taste calibrated on godly.website / mobbin.com / minimal.gallery, not generic templates.
- [ ] AI-slop poisoning check: any fact taken from blogs, forums, or SEO sites cross-verified against Tier-1 primary sources (official docs, institutional portals, verified repos) before adoption.
- [ ] Matching deep-diving skills fetched via scripts/fetch-skill.sh where the work needs them (typography, motion, critique) — constraints read, not assumed.

## The 3-second test

- [ ] Screenshot the hero, shrink it to a thumbnail — could this be any of ten products? If yes, change the type, the color, or the composition until the answer is no.
- [ ] Read the H1 aloud with the product name removed — if it still makes sense for a competitor, the copy is generic.
- [ ] Apply the specificity test: change the target user to someone concrete — if nothing about the page would change, it's not specific enough yet.
- [ ] Count the tells: 0–1 surviving tells is clean, 2–3 is the warning zone, 4+ is full slop — rewrite with intentional decisions.

## Sources

Community checklists from Instagram reels (Oct 2026) contributed the pastel-card combo, low-contrast hero text, builder-badge, cursive-font, default-font-logo, and one-page-site tells — treat these as pattern observations from practitioner content, not primary documentation: yatesvids ("20 vibecoded website giveaways"), aj.on.ai ("30 reasons your site looks vibecoded"), swiperightai ("Sign 2: Rounded cards everywhere"), udayan.builds ("10 things to do right after your website goes live"), okaashish ("11 things Claude should check in your vibe coded website").

- https://www.925studios.co/blog/ai-slop-web-design-guide
- https://github.com/blakecyze/mimesis/blob/HEAD/research/research-design.md
- https://github.com/ojozinho/uiux-boost/blob/HEAD/references/ai-slop-patterns.md
- https://github.com/themizeguy/anti-slop/blob/HEAD/anti-slop/skills/anti-slop/references/design-patterns.md
- https://github.com/jmsuico/jrmsulibrary-web-page/blob/HEAD/AI_Frontend_Design_Patterns_Checklist.md
- https://github.com/kevin-liu-01/prototemplate/blob/HEAD/docs/research/inspo.md
- https://github.com/johnnycakx/foil/blob/HEAD/design-loop/RESEARCH.md
- https://github.com/robpalmer99/robpalmer-site/blob/HEAD/src/content/blog/claude-code-landing-page-copy-skill.mdx
- https://github.com/laith0003/ux-skill/blob/HEAD/references/foundations/copy.md
- https://github.com/wedigcode/workforces/blob/HEAD/skills/design-anti-patterns/SKILL.md
- https://github.com/fernando0422/prime-ai-consultants-site/blob/HEAD/AGENTS.md
- https://github.com/shibz792/aic/blob/HEAD/.claude/skills/web-design-aesthetic/SKILL.md
- https://godly.website/ — live gallery of the best shipped web design; taste calibration
- https://mobbin.com/ — real shipped iOS/Android/web flows from top brands
- https://minimal.gallery/ — restrained, typography-driven references
- https://www.realtimecolors.com/ — contrast-verified palette and font pairing preview
- https://haikei.app/ — clean SVG geometry and backgrounds without heavy imagery
- https://ui.shadcn.com/ — accessible component primitives (restyle the defaults)
- https://kokonutui.com/ — 100+ components with built-in micro-interactions
- https://magicui.design/ — animated landing page components
- https://componentry.dev/ — animated copy-paste UI components
- https://ui.aceternity.com/ — animated cards and background effects
- https://motion.dev/ — production animation, gesture, and layout engine
- https://motion-primitives.com/ — copy-paste Motion + Tailwind primitives
- https://www.react-spring.dev/ — physics-driven animation without re-render lag
- https://tremor.so/ — React dashboard and chart components
- https://bklit.com/ — polished responsive chart templates
- https://coolors.co/ — palette generator with WCAG contrast checker
- https://fontjoy.com/ — font pairing tool
