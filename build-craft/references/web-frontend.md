# Web Frontend — production checklist

Pass/fail checks for semantic HTML, WCAG 2.2 AA accessibility, mobile ergonomics, Core Web Vitals, technical SEO, asset optimization, and no-JS fallbacks — each verifiable by inspection, DevTools, or a command (version-sensitive claims dated, checked 2026-10-01). Checked 2026-10-01.

## Contents

- Semantic HTML & document structure
- Web Components
- Accessibility (WCAG 2.2 AA)
- Mobile & device ergonomics
- Core Web Vitals & performance
- Technical SEO & crawlability
- Asset optimization
- Forms: native controls, validation, OTP
- UI behaviors: invokers, moves, highlights, snap
- Launch content & interaction sweep
- Interaction laws — find it, hit it, choose it, finish it
- Pre-ship verification suite
- Post-launch operations (first 48 hours)
- Progressive enhancement / no-JS
- Sources

## Semantic HTML & document structure

- [ ] `<!DOCTYPE html>`, exactly one `<html lang="…">`, exactly one `<title>` per page.
- [ ] Landmarks: one `<header>`, one `<nav>`, one `<main>`, one `<footer>` per page; every content node sits inside a landmark; repeated `<section>`/`<aside>`/multiple `<nav>`s get `aria-label` so they're distinguishable.
- [ ] Exactly one `<h1>` per page; heading levels never skipped (`<h1>`→`<h6>`); headings describe the section that follows.
- [ ] Native elements for their job: `<button>` for actions, `<a href>` for navigation, real form controls, `<ul>/<ol>` for lists, `<table>` with `<th scope>` for data, `<time datetime>` for dates. No div-as-button, no span-as-link.
- [ ] Every meaningful `<img>` has non-empty descriptive `alt`; decorative images use `alt=""`; decorative inline SVG uses `aria-hidden="true"` + `focusable="false"`.
- [ ] Every form control has an associated `<label>` (or `aria-labelledby`); related fields grouped in `<fieldset>`/`<legend>`; errors linked via `aria-describedby` and flagged with `aria-invalid`.
- [ ] Link text is meaningful standalone — no bare "click here" or "read more" (2.4.4).
- [ ] "Skip to main content" link is the first focusable element and becomes visible on keyboard focus.
- [ ] Modals are native `<dialog>` + `.showModal()` — free focus trap, inert background, Esc-to-close, `::backdrop`, focus restoration (Baseline widely available since 2024-09-14, checked 2026-09-30); transient overlays (menus, toasts, tooltips) use the Popover API; disclosure uses `<details>/<summary>`. Hand-rolled `role="dialog"` only where the platform element genuinely can't do the job.
- [ ] Sections made programmatically inert use the `inert` attribute, not just `pointer-events: none` or `opacity`.
- [ ] `closedby` behavior is explicit for dialogs where light-dismiss is intended; popover open/close goes through `popovertarget` on a `<button>` so no-JS invocation works. Where Invoker Commands are supported, prefer `commandfor`/`command` instead (see UI behaviors); never combine both on one button for one popover.
- [ ] Every `<iframe>` carries a descriptive `title` attribute.
- [ ] `lang` matches the page's primary content language; mixed-language pages set `lang` on the non-primary regions.

## Web Components

- [ ] Register once with `customElements.define('x-name', Class)`; `observedAttributes` and lifecycle hooks are snapshotted at define time, so declare them on the class before registration, never patched on after.
- [ ] Elements in the DOM before definition stay inert until upgrade runs the constructor + `connectedCallback`; components still work when server-rendered first and defined late.
- [ ] Shadow DOM is the style boundary: page CSS does not reach in, component CSS does not leak out; set `:host { display: block }` (custom elements default to inline).
- [ ] Style the host from inside with `:host` / `:host([disabled])`; skip `:host-context()` (Chromium-only, no cross-browser path).
- [ ] Theming API is CSS custom properties: consume `var(--x-color, fallback)` inside, let the consumer set `--x-color` outside; never seed the public property on `:host`, or ancestors cannot override it.
- [ ] Open styling goes through `::part(name)` / `exportparts` for named internals; pick one channel per need: custom properties for a bounded value set, parts for unrestricted styling of one element.
- [ ] Runtime state via `ElementInternals.states` + `:state(name)` (busy, invalid), not synthetic attributes; state is runtime-only, so anything set from markup or persisted belongs in an attribute.
- [ ] Wrapped native controls get `font: inherit` + `color: inherit` inside the shadow tree; UA form-control fonts do not inherit across the boundary.
- [ ] Form-associated custom elements (FACE): `static formAssociated = true` + `attachInternals()`; submit via `setFormValue()`, validate via `setValidity()`, implement `formResetCallback` / `formStateRestoreCallback`; no hidden `<input>` shim except as the no-FACE fallback.
- [ ] Declarative Shadow DOM for prerender/SSR: `<template shadowrootmode="open">` with styles inside the template, so first paint is styled before upgrade; avoid `mode: 'closed'` shadow roots, which block tests and accessibility walkers.
- [ ] Accessible components: real `<button>`/`<nav>`/`<ul>` inside the shadow tree first; role/state defaults via the `ElementInternals` ARIA mixin, overridable by consumer attributes.
- [ ] `id`-based ARIA (`aria-labelledby`, `aria-describedby`, `aria-controls`) never crosses a shadow boundary; cross it with reflected element properties (`ariaLabelledByElements` and kin) or keep label and control in one tree.
- [ ] Focus: `delegatesFocus: true` when wrapping one focusable control (label clicks forward, `:focus` matches the host); a host that is itself the control gets `tabIndex = 0` in `connectedCallback`, never in the constructor.
- [ ] Responsive components query their container (`@container` on the host box), not the viewport; cascade layers inside a shadow root are scoped to that root.

## Accessibility (WCAG 2.2 AA)

- [ ] Declared target: WCAG 2.2 Level AA — the W3C Recommendation adds 9 success criteria over 2.1 and removes 4.1.1 Parsing.
- [ ] All functionality keyboard-operable: every control reachable via Tab, activated with Enter/Space, no keyboard traps; Esc closes dialogs/menus and returns focus to the trigger.
- [ ] Visible focus indicator on `:focus-visible`; `outline: none` never used without a replacement indicator (e.g. `focus-visible:ring-2 focus-visible:ring-offset-2`); focused element never fully hidden behind sticky chrome (2.4.11 Focus Not Obscured (Minimum), AA — verify with a sticky header using `scroll-margin-top`/`scroll-padding-top`).
- [ ] Focus indicator sized and contrasted: ≥2px perimeter and ≥3:1 contrast against the focused element (2.4.13 is AAA — aim for it anyway).
- [ ] Body and label text contrast ≥4.5:1 against background (≥3:1 for large text — ≥18pt/24px regular or ≥14pt/19px bold); color never the only channel for meaning.
- [ ] Non-text UI components (borders, icons, input outlines, focus indicators, chart strokes) ≥3:1 contrast against adjacent colors.
- [ ] Pointer targets ≥24×24 CSS px with no possible overlaps (2.5.8 Target Size (Minimum), AA, checked 2026-09-30).
- [ ] Touch UIs aim for 44×44 CSS px / 48 dp targets (or 24×24 px visible with transparent hit padding reaching 44×44); targets separated by ≥8px.
- [ ] Accessible name contains the visible label text (2.5.3); icon-only buttons get `aria-label` or visually-hidden screen-reader text.
- [ ] First rule of ARIA: no ARIA when a native element suffices; every custom control exposes name, role, and state; composite widgets (tabs, combobox, menu) implement the WAI-ARIA APG keyboard pattern.
- [ ] Dynamic updates announced via `aria-live` (`polite` routine, `assertive` only for true interruptions); async results use a status region.
- [ ] Every drag operation has a single-pointer alternative (tap/click, arrow buttons) (2.5.7); auth offers a non-cognitive path (passkey/magic link, paste allowed, no CAPTCHA-only) (3.3.8); multi-step forms never re-ask already-entered info (3.3.7); help links sit in a consistent order across pages (3.2.6).
- [ ] Form errors: on failed submit, focus moves to an error summary region listing every error with links to the offending fields (3.3.1, 3.3.3).
- [ ] Timeouts: users are warned before any session or data timeout and given a way to extend it (2.2.1, 2.2.6).
- [ ] `prefers-reduced-motion` disables parallax, smooth scroll, view transitions, and autoplay animation; `prefers-reduced-transparency` disables backdrop blur/frosted-glass; video captioned, audio transcribed.
- [ ] OS text scaling honored: `<meta name="text-scale" content="scale">` in `<head>` lets `rem` follow the OS text-scale setting; with the opt-in set, never set a root `font-size` on `html`/`:root` and never also apply `env(preferred-text-scale)` manually (double scaling); unsupported browsers degrade to normal zoom.
- [ ] CSS generated content that carries meaning gets alternative text: `content: url(icon.svg) / "Save"`, preceded by a plain `content: url(icon.svg)` fallback line for older parsers; no alt argument for purely decorative generated content, and meaningful text itself stays in the DOM, not in `content`.
- [ ] Every animated state change ships a static cue — animation is enhancement, never the only signal; under `prefers-reduced-motion` the state stays fully legible (better-ui, checked 2026-10-02).
- [ ] Focus order matches visual order — CSS reordering (`order`, grid placement) doesn't scramble Tab order.
- [ ] Automation floor: axe-core/Lighthouse catch roughly a third of issues — manual keyboard and screen-reader (NVDA/VoiceOver) passes remain mandatory.

## Mobile & device ergonomics

- [ ] True mobile-first build: designed at 360–390px viewport first, progressively enhanced to tablet (768px) and desktop (1280px+).
- [ ] The thumb zone: primary navigation and key interactive buttons placed in the bottom 40% of the viewport on mobile.
- [ ] Touch target geometry: minimum 44×44 CSS px per interactive target on touch UIs (24×24 px WCAG AA minimum is the floor, not the goal); targets separated by ≥8px; nothing hover-only — every hover reveal has a tap/focus equivalent.
- [ ] Zero horizontal scroll: verified at 360px width — inputs, tables, `<pre>` code blocks, and flex containers never overflow; strict `max-w-full overflow-x-hidden` inspection.
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">`; no `user-scalable=no` / `maximum-scale=1` (breaks pinch zoom, 1.4.4); add `viewport-fit=cover` and honor `env(safe-area-inset-top/bottom)` where content goes edge-to-edge.
- [ ] iOS/Android polish: `theme-color` meta tag matching the nav background (light/dark variants); dedicated Apple touch icon (180×180 PNG) and web-app manifest icons; no default framework favicon left in place.
- [ ] Mobile viewport quirks handled: `100dvh` instead of `100vh` where dynamic toolbars collapse layout; fixed chrome honors `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`; sticky/fixed chrome never covers the focused control or the primary CTA; `orientation` changes don't break layout.
- [ ] Form inputs use `font-size: ≥16px` on mobile (prevents iOS auto-zoom on focus); numeric entry uses `inputmode` rather than `type="number"` spinners where the value isn't a true quantity.
- [ ] Mobile navigation works end-to-end: hamburger menu opens and closes (X button, Esc, backdrop tap), traps focus while open, and every nav item is reachable and functional — tested on a real 360px viewport.
- [ ] Tables on mobile scroll inside a labeled region (`role="region"` + `aria-label` + `tabindex="0"`), never by forcing page-level horizontal overflow.
- [ ] Fluid foundation: relative units (`%`, `rem`, `fr`, `clamp()`); media queries adapt features rather than amputating them; readable and operable at 200% browser zoom (1.4.4).
- [ ] Component-level responsiveness via CSS container queries (`@container`); no per-breakpoint JS layout code where CSS suffices.
- [ ] CSS-first layout and state: native CSS nesting, `:has()` parent selectors, `@container` container queries, and `color-mix()` for derived color variants (all Baseline widely available, checked 2026-10-01) — JS layout listeners (resize handlers computing breakpoints, JS-driven theme switches) are a last resort, never the default.
- [ ] CSS anchor positioning (`position-anchor`, `anchor()`, `position-try-fallbacks` — Baseline 2026, checked 2026-09-30) tethers tooltips, menus, and popovers instead of Floating UI/Popper.js; pure progressive enhancement where unsupported.

## Core Web Vitals & performance

- [ ] Thresholds (checked 2026-09-30, web.dev/articles/vitals): LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile of field visits, mobile and desktop assessed separately. Definitions are stable with a predictable annual cadence — ignore "CWV 2.0" or tightened-threshold claims from SEO blogs.
- [ ] INP is the only interactivity metric (FID replaced 2024-03-12, removed from field tools 2024-09-09); Lighthouse lab reports TBT as the INP proxy, never presented as the INP grade.
- [ ] Field data is the grade: RUM via the `web-vitals` library (`onLCP`/`onINP`/`onCLS`) shipped to analytics; CrUX, PageSpeed Insights, and Search Console consulted. Lab data is for development and regression gating only.
- [ ] Analytics delivery uses `fetchLater()` where supported, superseding the older `navigator.sendBeacon` / `fetch({keepalive:true})` pattern prescribed here before: queue the latest full snapshot, abort and re-queue on update via `AbortController`, wrap calls in try/catch (quota roughly 64KB per origin), feature-detect `fetchLater` and fall back to `sendBeacon`; never beacon from `unload`.
- [ ] Batched analytics: one `fetchLater(url, { activateAfter: <window> })` per window batches every event in that window into a single send that still fires on page exit; reset the queue once the result reports `activated: true`.
- [ ] Lighthouse Performance ≥90 on mobile in lab as a CI gate, not as the score that matters.
- [ ] Performance budget — block release if exceeded: initial JS bundle ≤150KB gzipped; total page payload ≤1.5MB gzipped; FCP ≤1.2s (warning); LCP >4.0s / INP >500ms / CLS >0.25 are hard blockers.
- [ ] TTFB discipline: HTML document response ≤600ms on the landing route (server timing audited, not assumed).
- [ ] LCP: server response fast; critical CSS inlined or server-rendered; render-blocking third-party scripts deferred or eliminated; hero image preloaded (`<link rel="preload" as="image" fetchpriority="high">`, responsive variant: `imagesrcset`/`imagesizes`), LCP element carries `fetchpriority="high"`.
- [ ] INP: no interaction handler blocks the main thread >50ms; long work chunked with `scheduler.yield()`/`setTimeout(0)` splits; CPU-heavy transforms (markdown parsing, heavy sorting, image manipulation) moved to web workers; input search fields debounced 200–300ms; scroll/resize listeners `passive: true`; no forced synchronous layout inside handlers; low-priority work via `requestIdleCallback`.
- [ ] Task priority: order separate work streams with `scheduler.postTask(fn, { priority })` (`user-blocking` for input-critical work, `user-visible` default, `background` for analytics/prefetch); `scheduler.yield()` only splits one running task, it does not order streams.
- [ ] Reprioritize or cancel queued work with `TaskController`: pass `controller.signal` to `postTask()`, then `controller.setPriority('user-blocking')` when queued work becomes urgent or `controller.abort()` when it goes stale; feature-detect `scheduler.postTask`, load a scheduler polyfill only where multi-tier ordering is load-bearing.
- [ ] INP diagnosis before fixing: split the worst interaction with Event Timing into input delay, processing duration, and presentation delay; fix the subpart that is actually long (other running code, the handler itself, or rendering, in that order).
- [ ] LoAF attribution in field data: use the `web-vitals` attribution build / Long Animation Frames entries intersecting the interaction; read `forcedStyleDuration`/`forcedLayoutDuration` for script-side thrash and `styleDuration`/`layoutDuration` for frame rendering cost; prefer LoAF over JS self-profiling in production (lower overhead).
- [ ] Interaction paint for SPAs: observe `interaction-contentful-paint` (feature-detect via `PerformanceObserver.supportedEntryTypes`, observe with `buffered: true`) to attribute post-interaction paints and soft navigations to the interaction that caused them; correlate by `interactionId`, not `navigationId`.
- [ ] Foreground time, not time-on-page: sum `visibility-state` entries (`performance.getEntriesByType('visibility-state')`) for engagement/session metrics; an empty array is the feature detection, fall back to `visibilitychange` timestamps.
- [ ] Background fetches step aside: `fetch(url, { priority: 'low' })` for analytics, telemetry, sync, and speculative data; never on fetches the current view waits for; unsupported browsers ignore the option.
- [ ] Script/preload priority is a scarce boost: `fetchpriority="high"` on at most 1–2 critical scripts or preloads, `fetchpriority="low"` on non-essential scripts (with `async`/`defer`/module) and secondary preloads; fonts and the LCP image already default high, do not tag everything.
- [ ] Deferred heavy content streams in: out-of-order HTML streaming (declarative patch markers / `element.streamHTML()`) paints the critical shell first and patches placeholders as content arrives; placeholders reserve final geometry, patched regions keep focus, and long waits announce via a small live region on the status text only (never `role="alert"`, never the whole patched region).
- [ ] Heavy collapsed content stays findable with `hidden="until-found"` + a `beforematch` listener syncing accordion/tab UI state; prefer plain `<details>` when it can do the job, and never use `until-found` where content must stay in the accessibility tree while hidden.
- [ ] High-frequency interactions (hover, drag, scroll scrub) keep visual feedback ≤150ms so the UI feels attached to the input — long transitions on continuous input are perceived as lag (better-ui, checked 2026-10-02).
- [ ] CLS: explicit `width`/`height` (or CSS `aspect-ratio`) on every image, video, iframe, and embed; dynamic slots (banners, notices, third-party widgets) reserve min-height matching final dimensions; skeletons match final card geometry exactly; fonts use `font-display: swap` with `size-adjust`/metric-override fallbacks; critical fonts preloaded with correct `as`/`crossorigin`; offscreen `content-visibility: auto` reserves space via `contain-intrinsic-size`.
- [ ] Third-party scripts deferred/async, each with an owner and a purpose, and their INP/LCP impact measured in field data.
- [ ] Third-party embeds (video, maps, chat widgets) load behind a click-to-play facade — no heavy embed loads before user intent.
- [ ] Hydration discipline: below-the-fold components defer client interactivity (React/Next.js: prefer Server Components to minimize what hydrates); the hero never waits on client JS.
- [ ] No unused CSS frameworks or dead utility layers shipped — DevTools Coverage shows no large unused CSS/JS chunks on the landing route.
- [ ] bfcache eligible (back/forward navigations restore near-instantly): zero `unload` listeners — use `pagehide`/`visibilitychange` instead (Lighthouse `no-unload-listeners` audit passes); HTML responses never send `Cache-Control: no-store`; WebSockets/connections closed on `pagehide` and re-established on `pageshow`, with stale data refreshed when `event.persisted` is true; verified via DevTools → Application → Back/forward cache → "Test back/forward cache".
- [ ] Static assets served with `Cache-Control: public, max-age=31536000, immutable` from a CDN at the edge.
- [ ] Redirect chains eliminated (single www→apex hop); Brotli/gzip on all text assets; HTTP/2 or HTTP/3 serving.
- [ ] preconnect limited to 2–4 origins the page actually uses; unused preconnects removed (over-hinting is measurable performance debt).
- [ ] Speculation Rules (Chromium-only, not Baseline — pure progressive enhancement): `<script type="speculationrules">` prerender/prefetch on predictable navigations; logout, cart-mutation, and nofollow URLs excluded; eagerness matched to false-positive cost (`moderate`/`conservative` first); `document.prerendering` respected by analytics so prerenders don't inflate stats.
- [ ] View Transitions: same-document (`document.startViewTransition`) is Baseline — use freely with feature detection; cross-document (`@view-transition { navigation: auto }`) is Chromium + Safari 18.2+ only and not Baseline, so navigation must work fine without it; both guarded by `prefers-reduced-motion`.
- [ ] Clean runtime: zero unhandled exceptions, zero console errors/warnings, zero failed network requests (404/500), source maps stripped from production builds.

## Technical SEO & crawlability

- [ ] Custom production domain: never ship on temporary subdomains (`*.vercel.app`, `*.netlify.app`); strip all platform builder watermarks.
- [ ] Server-rendered baseline: view-source (`curl -s https://domain.com`, or `curl -s -A "Googlebot"`) must return semantic HTML content, headings, and copy — never an empty `<div id="root"></div>`. Prefer SSR/SSG over client-rendered SPAs whose hero only appears after hundreds of KB of JS execute.
- [ ] Page-specific metadata, unique per route: `<title>` of 50–60 chars (`Page Title | Brand Name`).
- [ ] Meta description of 140–160 chars, unique and actionable per route; title/description uniqueness audited across all routes (no duplicates) before release.
- [ ] `<link rel="canonical">` as an absolute URL on every indexable page, self-referencing on the canonical variant; descriptive human-readable URLs.
- [ ] Head template every public route must carry (verify in view-source, not only in client-rendered DOM):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Crisp Descriptive Title | BrandName</title>
  <meta name="description" content="Clear, compelling 140-160 character description.">
  <link rel="canonical" href="https://yourdomain.com/canonical-path">
  <!-- OpenGraph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="BrandName">
  <meta property="og:title" content="Crisp Descriptive Title | BrandName">
  <meta property="og:description" content="Clear, compelling 140-160 character description.">
  <meta property="og:url" content="https://yourdomain.com/canonical-path">
  <meta property="og:image" content="https://yourdomain.com/og/social-card.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Crisp Descriptive Title | BrandName">
  <meta name="twitter:description" content="Clear, compelling 140-160 character description.">
  <meta name="twitter:image" content="https://yourdomain.com/og/social-card.png">
  <!-- Icons -->
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#FAF9F6" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#090A0F" media="(prefers-color-scheme: dark)">
</head>
```

- [ ] Social/link previews validator-tested: absolute `og:image`/`twitter:image` URLs (1200×630px PNG/JPEG, reachable without auth, ≤8MB) so shares render a card; card image matches the page topic, not a generic brand banner.
- [ ] Structured data in JSON-LD (Google's recommended format) matching visible page content exactly — hidden or contradictory markup is a policy violation; include `Organization` + `WebSite` + `BreadcrumbList` at root and domain-specific types (`SoftwareApplication`, `Article`, `Product`, `Event`, `JobPosting`, `VideoObject`, `Recipe`) where applicable; validated with the Rich Results Test; eligibility never guarantees display.
- [ ] Root JSON-LD shape (`@graph` with `Organization`, `WebSite`, and the domain entity):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://yourdomain.com/#organization",
      "name": "BrandName",
      "url": "https://yourdomain.com",
      "logo": "https://yourdomain.com/logo.png",
      "sameAs": ["https://twitter.com/brandhandle", "https://github.com/brandorg"]
    },
    {
      "@type": "WebSite",
      "@id": "https://yourdomain.com/#website",
      "url": "https://yourdomain.com",
      "name": "BrandName",
      "publisher": { "@id": "https://yourdomain.com/#organization" }
    },
    {
      "@type": "SoftwareApplication",
      "name": "BrandName Engine",
      "operatingSystem": "All",
      "applicationCategory": "DeveloperApplication",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    }
  ]
}
</script>
```
- [ ] Retired rich results not expected (checked 2026-09-30): FAQPage rich results ended 2026-05-07, HowTo retired 2023, and Book Actions / Course Info / ClaimReview / Estimated Salary / Learning Video / Special Announcement / Vehicle Listing retired June 2025 — stop building new markup for them, but don't panic-remove old markup (valid schema, zero SERP effect).
- [ ] `robots.txt` grants crawl access to public routes and references the `sitemap.xml` location; Googlebot can fetch CSS/JS (no robots disallow on assets); no `noindex` on indexable pages.
- [ ] Dynamic `sitemap.xml` with absolute URLs and honest last-modified timestamps (the sitemap ping endpoint was disabled in 2023 — rely on robots.txt and Search Console).
- [ ] `llms.txt` at domain root: an emerging (non-standard, not required by Google — foundational SEO guidance states no AI-only files are needed) convention providing Markdown-formatted context for AI crawlers and assistants; include it as progressive enhancement, not a substitute for crawlable semantic content.
- [ ] Multilingual pages carry `hreflang` with a self-referencing canonical per variant.
- [ ] Branded error pages: custom, helpful 404 Not Found and 500 Server Error pages with search, home navigation, and contact links — the default framework error page is a production blocker.

## Asset optimization

- [ ] JS/CSS minified, bundled, tree-shaken, fingerprinted with long-term immutable caching; HTML served fresh or short-lived (`no-cache`, never `no-store` — protects bfcache).
- [ ] Images: AVIF → WebP → original fallback via `<picture>`; `srcset` with accurate `sizes` (an omitted `sizes` makes the browser assume `100vw` and can fetch the largest file); intrinsic dimensions close to the largest displayed size; AVIF quality ~75–85; AVIF decode is CPU-heavier — weigh file size against decode cost on low-end devices.
- [ ] Explicit `width`/`height` (or CSS `aspect-ratio`) on all images and video; hero LCP image eager with `fetchpriority="high"` and preloaded — never lazy-loaded; below-the-fold images and iframes get `loading="lazy"` (+ `decoding="async"` for images); zero uncompressed SVGs or raw camera PNGs/JPEGs.
- [ ] Icons as inline SVG (`aria-hidden`, `focusable="false"`, SVGO-optimized, `currentColor` theming); never SVG for photographs or raster-inside-SVG.
- [ ] Animated icon entrances use small fixed values (scale 0.25→1, opacity 0→1, blur 4px→0) — no generic fade-and-rise on every glyph (better-ui, checked 2026-10-02).
- [ ] Video as adaptive-bitrate HLS/DASH with multiple renditions, always with a `poster` frame; `preload="none"` until user intent.
- [ ] Below-the-fold `<video>`/`<audio>` get `loading="lazy"`: media data, `preload` fetches, the `poster` image, and muted autoplay all defer until near the viewport; never lazy the LCP/hero video; `<audio loading="lazy">` always carries `controls` (no visible box means it never intersects and never loads).
- [ ] Every preload matches what the page actually fetches — unused preloads removed; preconnect limited to origins the page really uses (over-hinting is measurable performance debt).
- [ ] Fonts: woff2 only, subsetted to the glyph ranges in use, `font-display: swap`; no system-fallback flash on the hero.
- [ ] No dependency imported for a single utility — bundle visualizer run on every build and tree-shaking verified, not assumed.

## Forms: native controls, validation, OTP

- [ ] Customizable select: opt in with `appearance: base-select` on both the `<select>` and `::picker(select)`; the trigger is a `<button>` inside the `<select>` holding `<selectedcontent>`; options carry rich content (icons, descriptions) while native keyboard, form submission, and accessibility stay intact.
- [ ] Picker styling: never `overflow: hidden` on `::picker(select)` (options must stay scrollable at high zoom); animate open/close on `::picker(select)` with `transition-behavior: allow-discrete`; set an explicit width, since base-select no longer sizes to the longest option.
- [ ] No base-select support means the native OS dropdown: feature-detect `CSS.supports('appearance', 'base-select')`; ship no JS rebuild of the control as the fallback.
- [ ] `field-sizing: content` on inputs/textareas/selects that should grow with content, always paired with `min-inline-size` and `max-inline-size` guards (empty field must not collapse, long value must not break layout); reset any global `width: 100%` / fixed `height` on those elements or sizing never applies.
- [ ] Native switch: `<input type="checkbox" switch>` + `<label>` for binary on/off; native submission, keyboard, and switch semantics come free; polyfill only when `'switch' in HTMLInputElement.prototype` is false.
- [ ] OTP is one field: a single `<input type="text" inputmode="numeric" autocomplete="one-time-code">`; never split digits across six `maxlength="1"` boxes (breaks autofill, paste, and screen-reader order); segment visually with monospace + `letter-spacing` if needed.
- [ ] OTP layer 2, WebOTP: feature-detect `'OTPCredential' in window`, call `navigator.credentials.get({ otp: { transport: ['sms'] } })` from the form lifecycle (secure context only), abort it on manual submit; no polyfill exists for SMS reading, so absence degrades to autofill/manual entry.
- [ ] OTP layer 3, anti-phishing binding: the SMS last line is exactly `@example.com #123456` (domain as first character of the last line, one space, `#` + code, nothing after it); browser/OS only suggest or deliver the code when the domain matches. SMS stays step-up only; passkeys are the phishing-resistant primary.
- [ ] IME-safe Enter: every custom Enter handler (search, rename, command palette, chat box, textarea submit) returns early when `event.isComposing` is true; add `event.keyCode === 229` for the Safari composition-end ordering case. An Enter that confirms an IME candidate must never submit.
- [ ] Validation styling fires after interaction only: `:user-invalid` for errors, `:user-valid` for success; never style on bare `:valid`/`:invalid`, which flag untouched required fields on load.
- [ ] `:user-invalid` does not set ARIA by itself: sync `aria-invalid` from `el.matches(':user-invalid')` on blur/submit, starting from `aria-invalid="false"`; a submit attempt counts as interaction, so errors style and focus correctly.

## UI behaviors: invokers, moves, highlights, snap

- [ ] Invoker Commands replace click-handler wiring where supported: `<button commandfor="id" command="…">`; the browser handles state, focus, and ARIA for built-ins (`show-modal`, `close`, `request-close` for `<dialog>`; `show-popover`, `hide-popover`, `toggle-popover` for popovers).
- [ ] `request-close` beats `close` for cancel paths that must honor unsaved-changes logic: it fires `cancel` first and ignores `closedby`.
- [ ] Custom commands are prefixed `--`: write `command="--spin"`, handle them in a `command` event listener on the target (`event.command`, `event.source`); feature-detect `'commandForElement' in HTMLButtonElement.prototype` and polyfill only when missing.
- [ ] Never put `popovertarget` and `commandfor` on the same button for the same popover: the popover toggles twice and ends where it started.
- [ ] Interest Invokers for hover/focus/long-press previews: `interestfor="id"` on a `<button>`/`<a>` pointing at `popover="hint"`; hint popovers coexist with `auto` popovers, light-dismiss, and become the trigger's accessible description (plain hint) or a reachable `tooltip` region (rich hint with links/headings).
- [ ] Tooltip vs toggletip: tooltip for a short, missable clarification on a control that does something else; toggletip (an `i`/`?` button whose job is the hint, with `interestfor` + `popovertargetaction="show"`) for anything longer, needed, or reachable on touch/screen readers; anything essential goes inline instead.
- [ ] Hint content still meets WCAG 1.4.13: dismissible with Esc, hoverable, persistent until dismissed or invalid; position via the implicit anchor (`position-area`, `position-try-fallbacks`), no hand-written `anchor-name` needed for interest popovers.
- [ ] State-preserving moves use `parent.moveBefore(node, ref)` (same call shape as `insertBefore`): the move is atomic, so iframe state, focus, playing media, and running animations survive reparenting; `connectedCallback`/`disconnectedCallback` do not fire (use `connectedMoveCallback`); feature-detect `'moveBefore' in Element.prototype`, fall back to `appendChild`/`insertBefore` accepting the state loss.
- [ ] Custom Highlight API for find-in-page, search matches, and spellcheck-style ranges: build `Range`s, register `new Highlight(range)` with `CSS.highlights.set('name', h)`, style with `::highlight(name)`; only `color`, `background-color`, `text-decoration`, `text-shadow`, and text-stroke properties apply inside `::highlight()`; feature-detect `CSS.highlights` and leave text unhighlighted where absent.
- [ ] Snap state comes from events, not scroll listeners: `scrollsnapchanging` on the container for live feedback (pending target in `event.snapTargetInline`/`snapTargetBlock`), `scrollsnapchange` for the settled target; sync once on load by geometry, since neither fires for a restored scroll position; `IntersectionObserver` is the fallback, with different (mid-scroll) timing.

## Launch content & interaction sweep

Run after the build is feature-complete, before the pre-ship verification suite.

- [ ] Author / trust signals: content pages show the author's name, role/credentials, and photo; a `Person` schema links the author; an "About" page documents who is behind the site.
- [ ] Breadcrumbs: visible breadcrumb trail on deep pages, matching the `BreadcrumbList` JSON-LD exactly.
- [ ] Logo in the header links to `/`; phone numbers are `tel:` links; email addresses are `mailto:` links.
- [ ] Placeholder purge: zero lorem ipsum, "TODO", "coming soon", or framework default text anywhere public — view-source included.
- [ ] Unused nav/footer items removed; no dead `href="#"` links; every link resolves.
- [ ] Every state-changing action shows a success confirmation (toast or inline message); failures show an actionable error with a retry — no silent submits.
- [ ] No mass-produced thin or unedited AI content: every public page is genuinely helpful, accurate, and human-reviewed. Google's bar is helpful vs. unhelpful content, not human vs. AI authorship.

## Interaction laws — find it, hit it, choose it, finish it

The grouping, target, choice, and completion rules behind the sweep above — the laws that decide whether a layout reads correctly and a flow gets finished, before any word on it is read.

- [ ] Proximity groups first: the gap between two groups is at least twice the gap inside either one, and a label sits closer to its own field than to the field above it.
- [ ] Similarity is a contract: one look per role, everywhere — every link, every destructive action, every card of a type shares one anatomy; anything that behaves differently must look different.
- [ ] Uniform connectedness outranks proximity and similarity: a shared container or a joining line (stepper, timeline) declares "one thing" — never park unrelated items inside one container.
- [ ] Prägnanz before decoration: spacing and alignment show the structure first; add a border, divider, or card only when layout alone leaves the grouping ambiguous.
- [ ] Fitts — the primary action is the largest target on the screen and sits where the pointer or thumb already rests: beside the field it submits, at the bottom of the screen on mobile. Touch targets measure at least 44pt on Apple platforms and 48dp on Material, padding included in the measure; on desktop, the screen's edges and corners are the cheapest targets there are: a target pinned flush to an edge is effectively wider than it looks, so persistent actions belong there when the layout allows.
- [ ] Destructive actions sit apart from the primary action so a miss can't reach them; in their confirmation, Cancel takes the initial focus, the destructive button is no larger than Cancel, and its label names verb + object ("Delete address").
- [ ] Small visuals get an expanded hit zone, not a bigger glyph — 16–24px icons, close buttons, and checkboxes expand via a centered pseudo-element:

```css
.icon-btn { position: relative; }
.icon-btn::after {
  content: ""; position: absolute; left: 50%; top: 50%;
  width: max(100%, 44px); height: max(100%, 44px); translate: -50% -50%;
}
```

- [ ] Overlapping hit zones shrink equally, never below the 24×24px WCAG 2.2 floor — if they still collide, move one action instead; an icon button inside a clickable card stacks above the card's target and stops the click from reaching it, and a row that acts as one link is one target end to end.
- [ ] Hick — option sets people weigh against each other (plans, sort orders, settings) hold ≤7 entries per headed group; prune the options almost nobody picks before adding chrome around the rest.
- [ ] Lookups lead with search (command palettes, country and font pickers): when the user already knows the target, search makes list length irrelevant. Onboarding and checkout take one decision per step; "recommended" appears only when a real recommendation backs it, and paid or data-sharing options are never pre-selected.
- [ ] Miller — chunk anything past ~5 units: card numbers 4-4-4-4 (Amex 4-6-5), one-time codes 3+3, phone numbers in their national grouping, form sections of ≤5 fields, top-level navigation ≤7 entries.
- [ ] Fixed-pattern values format as the user types, and no value is carried in the user's head between screens — repeat it where it's needed rather than making them remember or re-find it.
- [ ] Jakob — the conventions hold: ⌘K/Ctrl+K opens the command palette, Enter submits a single-field form, account and cart live top-right, a magnifier means search and a gear means settings, links look like links. Novelty goes in the content, never in where things live; a broken convention is taught on first use while the conventional path keeps working.
- [ ] Tesler — the product absorbs the complexity: prefill what's inferable (country from locale, city from postcode, name and email from the account), default to what most people pick, and never ask for data the product already holds; wherever an option costs money or shares data, the default is the free, private one.
- [ ] Parkinson — forms stay short: correct `autocomplete` attributes everywhere, last-used values remembered, the common answer offered as one tap, optional fields off the main path, and a long task states its expected duration before it starts.
- [ ] Postel — typed input parses its common forms: dates in the user's locale formats, phone and card numbers with spaces, dashes, or brackets, emails with stray spaces or capitals, pasted values with trailing whitespace; a parsed value is shown back in one clean, normalized format.
- [ ] Values picked from a range the product already knows (a delivery day, a booking slot) get a constrained picker limited to valid choices, not a text field that can only fail.
- [ ] Validation timing: on blur or submit, never while a field is being typed for the first time; once an error is showing, re-check on every keystroke so it clears the moment it's fixed.
- [ ] A failed parse or submit keeps everything the user typed, and the error names the format that works, with a concrete example — input the product could have parsed is never rejected.
- [ ] Undo beats confirmation for anything reversible: the item leaves the screen at once, a toast offers Undo for ≥5 seconds, and the request fires only when that window closes (or the page hides). Confirmations are reserved for destructive actions that can't be undone.
- [ ] Progressive disclosure: the options most visits need are visible; the rest sit behind a "More options" expander, and a follow-up field appears only once the answer that triggers it exists — nothing most visits need is ever hidden.
- [ ] Goal gradient: multi-step flows show position and remainder ("Step 2 of 4", "3 fields left"), count already-finished steps as done, and never read 0% after real progress; a progress fill animates `transform: scaleX` from the left edge (never `width`) and never moves backward.
- [ ] Peak-end: every flow closes on a confirmation stating what happened and what happens next, never a bare redirect, and the closing moment is built rather than defaulted — a drawn checkmark or an equivalent success beat over a plain summary of the outcome; fix the flow's worst moment (an error, a long wait) before polishing its average moments.

## Pre-ship verification suite

Run this standardized audit suite before any web release is marked "done" — every command below must pass with zero blockers:

```bash
# 0. Static readiness audit (craft / a11y / security / resilience / SEO)
node scripts/readiness-audit.mjs .            # vendored from the production-readiness-master audit engine
node scripts/readiness-audit.mjs . --ci       # CI mode: exit 1 on critical blockers
node scripts/readiness-audit.mjs . --json     # machine-readable report

# 1. Build & bundle health
npm run build                 # zero TypeScript/build errors
npx vite-bundle-visualizer    # inspect JS chunk sizes (Vite)  —  or:  ANALYZE=true npm run build  (Next.js)

# 2. Dependency vulnerabilities
npm audit --omit=dev
npx lockfile-lint --path package-lock.json --validate-https --allowed-hosts npm

# 3. Crawler & SSR baseline
curl -s -A "Googlebot" https://yourdomain.com | head -n 50   # must show semantic HTML, not <div id="root">

# 4. Lighthouse scorecard (mobile AND desktop)
npx lighthouse https://yourdomain.com --output=json,html --output-path=./lighthouse-report --chrome-flags="--headless"
npx lighthouse https://yourdomain.com --preset=desktop --output=json,html --output-path=./lighthouse-report-desktop --chrome-flags="--headless"

# 5. Accessibility audit (axe CLI)
npx @axe-core/cli https://yourdomain.com

# 6. Broken link & asset checker
npx link-checker https://yourdomain.com --recurse
```

- [ ] Gate criteria: Lighthouse mobile Performance ≥90 with zero "poor" CWV; axe zero critical/serious violations; link-checker zero 404s; `npm audit --omit=dev` zero high/critical; bundle and payload within the performance budget.
- [ ] Suite runs against staging before production; reports (lighthouse HTML/JSON, axe output) saved as release artifacts.
- [ ] Production scorecard produced per release: ✅ Passed / ⚠️ Warning (user decision or non-blocking polish) / 🚫 Blocked (critical fix required before launch) / ➖ N/A (documented reason).
- [ ] All 🚫 blockers fixed before delivery; warnings triaged with an owner and a date.

## Post-launch operations (first 48 hours)

Scope note: these are technical-hygiene gates. No checklist guarantees rankings — treat "rank #1 by Friday" style promises as marketing, not engineering.

- [ ] Google Search Console: property verified (DNS record or HTML file), sitemap submitted, coverage report clean — zero "excluded by `noindex`" on pages meant to rank.
- [ ] Bing Webmaster Tools: site verified, sitemap submitted.
- [ ] `robots.txt` live-check: `curl -s https://domain.com/robots.txt` grants Googlebot/Bingbot access to public routes and references the sitemap location; the AI-crawler policy is a deliberate choice, not a copy-paste default.
- [ ] Googlebot access check: `curl -s -A "Googlebot" https://domain.com/key-route` returns 200 with semantic content — not blocked, not a soft 404.
- [ ] Analytics + RUM live: pageviews flowing and `web-vitals` field data landing in the analytics pipeline — verified with a real visit, not just the snippet being present.
- [ ] PageSpeed Insights run on the landing and key conversion routes (mobile and desktop); the field-data baseline recorded so the next release has something to beat.
- [ ] Broken-link scan clean against production; redirect chains audited (single hop max); orphan audit: every public page reachable from nav or an internal link — no orphans except deliberate ones (documented campaign pages).
- [ ] Re-run cadence: link, redirect, and coverage checks scheduled weekly (CI cron or calendar reminder), not treated as one-off.
- [ ] Conditional — local businesses only: Google Business Profile claimed with real address and hours; listed on relevant review sites. Pure digital products mark this ➖ N/A with reason.

## Progressive enhancement / no-JS

- [ ] Core content and critical journeys (read, search, contact/checkout, auth) work with JavaScript disabled; where JS is mandatory, a `<noscript>` notice or static fallback says so.
- [ ] Forms are real `<form>`s with `action`/`method` that submit without JS; navigation is real `<a href>`s; dialogs close via `<form method="dialog">`; disclosure via `<details>/<summary>` — working states, not fallback states.
- [ ] Speculation rules, view transitions, popover, and anchor positioning all degrade silently where unsupported — the underlying action never depends on them.
- [ ] No blank screen on script failure: server-rendered or static shell content paints before JS; script errors can't erase rendered content.
- [ ] Modern APIs feature-detected before use (`"startViewTransition" in document`, `"popover" in HTMLElement.prototype`); polyfills loaded conditionally and only where the feature is load-bearing.
- [ ] Print sanity: print preview shows full article text with no cut-off columns, and link URLs are exposed in print styles.
- [ ] Service worker, if used, caches versioned assets cache-first and HTML network-first so a stale shell never ships.
- [ ] Critical journeys manually walked with JavaScript disabled during QA — read, search, contact/checkout, auth all reach a working state, not a dead end.

Note: bfcache eligibility and the `no-store` ban are the most-missed 2026 items — a single `Cache-Control: no-store` on HTML or one third-party `unload` listener silently kills back/forward restores. FID is retired; INP is the interactivity metric.

## Sources

- https://web.dev/articles/vitals — CWV thresholds, p75, lifecycle (opened 2026-09-30)
- https://web.dev/articles/bfcache — never use `unload`, `pagehide`, `pageshow`/`persisted`, no `no-store`
- production-readiness-master (local user merge): checklist categories 5–8 (mobile ergonomics, WCAG 2.2 AA, CWV performance, technical SEO), `references/cwv-performance-playbook.md` (LCP/INP/CLS techniques, performance budgets), `references/seo-social-spec.md` (meta/OG/JSON-LD spec, robots.txt, llms.txt), Automated Pre-Ship Verification Suite
- https://github.com/agricidaniel/claude-seo/blob/HEAD/skills/seo/references/cwv-thresholds.md — thresholds stable, FID removal dates, anti-hallucination guard on "CWV 2.0"
- https://github.com/mariusyvard/nulltohero/blob/HEAD/skills/siteasy/references/wcag-2-2.md — the 9 new WCAG 2.2 SCs and levels
- https://github.com/piiix-org/inter.face/blob/HEAD/docs/research/accessibility-wcag.md — WCAG 2.2 draft-numbering traps, 4.1.1 removal, errata through 2025-10-28
- https://github.com/nemolabsdev/conversion-craft/blob/HEAD/curriculum/research/modern-baseline-css.md — `<dialog>` widely available since 2024-09-14; popover newly available since 2025-01-27
- https://github.com/seanlf/claude-rss-news-digest/blob/HEAD/docs/standards/html.md — dialog/popover/invoker/interest-invoker status
- https://github.com/aurorahijabco/webapp-campaign/blob/HEAD/.claude/skills/frontend/frontend-impl/frontend-impl-popover-dialog-anchor/SKILL.md — `closedby` defaults, dialog-vs-popover decision tree
- https://github.com/seanlf/claude-rss-news-digest/blob/HEAD/docs/standards/css.md — anchor positioning Baseline 2026, view transitions status
- https://github.com/smitt2767/frontcore/blob/HEAD/content/frontend/performance-and-core-web-vitals/speculation-rules-api.mdx — Speculation Rules API, Chromium-only, prerender vs prefetch
- https://github.com/harlan-zw/unlighthouse.dev/blob/HEAD/content/learn-lighthouse/lcp/13.best-practices-2026.md — speculation eagerness levels, fetchpriority image pattern
- https://github.com/mariusyvard/nulltohero/blob/HEAD/skills/siteasy/references/image-strategy.md — AVIF→WebP fallback, preload with imagesrcset/imagesizes
- https://github.com/abdullasulaiman/frontend-backend-system-design/blob/HEAD/src/content/concepts/image-and-media-optimization.mdx — quality/size/decode-cost tradeoff, video as adaptive-bitrate + poster
- https://github.com/lakshyamodirocks/aasman/blob/HEAD/experts/sandhan/KB.md — structured-data retirements (FAQPage 2026-05-07, 7 types June 2025)
- https://github.com/fsu-ml/fsu-ml.github.io/blob/HEAD/.claude/skills/website-audit/references/seo/L6-structured-data.md — rich-result support status as of July 2026
- https://github.com/michealtestimony046-glitch/frontend-first-view/blob/HEAD/docs/seo-aeo-autonomous-research.md — Google's generative-AI search guidance (foundational SEO, no llms.txt, structured data not required)
- http://dev.to/shreysaraswatweb/frontend-performance-in-2026-the-techniques-that-actually-move-the-needle-now-445j — speculation rules as MPA-only, Chromium-only caveats
- Instagram community checklists (udayan.builds, yatesvids, okaashish, aj.on.ai, swiperightai), Oct 2026: post-launch ops and launch-sweep items; treated as community hygiene checklists, not primary documentation. Rank promises ("rank #1 by Friday"), backlink-from-Forbes claims, and the blanket "AI content" ban were reframed or dropped; see the scope note under Post-launch operations.
- https://github.com/jakubkrehel/skills — `better-ui` skill (MIT): static-cue rule for animated state changes, ≤150ms feedback on high-frequency interactions, icon entrance values (checked 2026-10-02)
- https://github.com/LemonFace0309/charles-skills — `charles-ux-animation` skill: the interaction laws section (grouping, Fitts, Hick, Miller, Jakob, Tesler, Postel, goal gradient, peak-end), itself built on Jon Yablonski's Laws of UX, https://lawsofux.com (checked 2026-11-13)
- GoogleChrome/modern-web-guidance (Apache-2.0), https://github.com/GoogleChrome/modern-web-guidance: performance APIs (`scheduler.postTask`/`TaskController`, `fetchLater` + `activateAfter`, LoAF/INP subparts, `VisibilityStateEntry`, interaction-contentful-paint, fetch priority, lazy media, out-of-order streaming, `hidden="until-found"`), Web Components/FACE/Declarative Shadow DOM, customizable select, `field-sizing`, switch, SMS OTP/WebOTP, IME-safe Enter, `:user-valid`/`:user-invalid`, Invoker Commands, Interest Invokers, `moveBefore`, Custom Highlight API, scroll snap events, `text-scale`, generated-content alt text (checked 2026-11-15)
