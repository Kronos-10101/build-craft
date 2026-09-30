# Web Frontend — production checklist

Covers semantic HTML, accessibility (WCAG 2.2 AA), Core Web Vitals, responsive design, SEO, asset optimization, and no-JS fallbacks.

## Semantic HTML

- [ ] `<!DOCTYPE html>`, one `<html lang="…">`, one `<title>` per page.
- [ ] Landmarks: one `<header>`, one `<nav>`, one `<main>`, one `<footer>` per page; all content inside a landmark.
- [ ] Exactly one `<h1>` per page; no skipped heading levels; headings describe the following section.
- [ ] Native elements for their purpose: `<button>` for actions, `<a href>` for navigation, real form controls, `<ul>/<ol>` for lists, `<table>` with `<th scope>` for data. No div-as-button.
- [ ] Every meaningful `<img>` has non-empty `alt`; decorative images use `alt=""`.
- [ ] Every form control has an associated `<label>`; related fields grouped with `<fieldset>`/`<legend>`; errors linked via `aria-describedby`.
- [ ] Link text meaningful on its own — no bare "click here".

## Accessibility (WCAG 2.2 AA)

- [ ] Target conformance: WCAG 2.2 Level AA.
- [ ] All functionality keyboard-operable: every control reachable via Tab, activated with Enter/Space, no keyboard traps.
- [ ] Visible focus indicator via `:focus-visible`; never bare `outline: none` on `:focus`; focused element never fully obscured by sticky UI.
- [ ] Pointer targets ≥ 24×24 CSS px (aim 44×44 on touch).
- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for large text); non-text UI components ≥ 3:1; color never the only channel for meaning.
- [ ] First rule of ARIA: don't use it if a native element does the job; every control exposes accessible name, role, and state; icon-only buttons get `aria-label`.
- [ ] Custom composite widgets (tabs, combobox, menu, dialog) follow the WAI-ARIA APG keyboard pattern; modals trap and restore focus.
- [ ] Dynamic updates announced via `aria-live` (`polite` routine, `assertive` only for true interruptions).
- [ ] No cognitive-function test on auth without an alternative; password managers/paste allowed; any drag operation has a single-pointer alternative; honor `prefers-reduced-motion`; videos captioned, audio transcribed.

## Core Web Vitals & performance

- [ ] LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 — "good" at the 75th percentile of real visits, mobile and desktop separately.
- [ ] Lighthouse Performance ≥ 90 (lab guidance, not a substitute for field data).
- [ ] No main-thread task blocks > 50ms during interaction; non-critical JS deferred; third-party scripts audited.
- [ ] RUM instrumentation present (`web-vitals` or equivalent) shipping field data; CrUX / PageSpeed Insights consulted.
- [ ] Fonts use `font-display: swap` with sized fallbacks.

## Responsive design

- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">`; no `user-scalable=no`.
- [ ] Usable at 360px and 1440px with no horizontal scrolling, clipped text, or overlapping elements; readable at 200% zoom.
- [ ] Fluid layout: relative units (`%`, `rem`, `fr`, `clamp()`); media queries adapt rather than amputate features.

## SEO basics

- [ ] Unique `<title>` (< ~60 chars) and meta description (< ~160 chars) per page; canonical URL set per piece of content.
- [ ] Descriptive human-readable URLs; JSON-LD structured data where applicable; Googlebot can access CSS/JS; no `noindex` on indexable pages.

## Asset optimization

- [ ] JS/CSS minified, bundled, tree-shaken; fingerprinted with long-term caching (`Cache-Control: immutable`); HTML fresh or short-lived.
- [ ] Images in modern formats (AVIF → WebP → fallback), sized via `srcset`/`sizes`, explicit `width`/`height`; below-the-fold lazy-loaded; SVG for icons.
- [ ] LCP element preloaded / `fetchpriority="high"`; render-blocking CSS minimized; critical CSS inlined.
- [ ] Third-party scripts audited, deferred, each justified by owner/purpose and measured for INP impact.

## No-JS / progressive enhancement

- [ ] Core content and critical journeys usable with JavaScript disabled; where JS is required, a `<noscript>` notice or static fallback explains it.
- [ ] Interactive features degrade gracefully: forms submit without AJAX, navigation works as real links, no blank-screen state when scripts fail.

Note: only ~30–40% of accessibility issues are automatable (axe-core, Lighthouse) — the rest need manual keyboard and screen-reader passes. FID is retired; INP is the interactivity metric.

## Sources

- https://www.w3.org/TR/WCAG22/ · https://en.wikipedia.org/wiki/Web_accessibility
- https://web.dev/articles/vitals · https://developer.chrome.com/docs/lighthouse/performance/performance-scoring
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://www.w3.org/WAI/ARIA/apg/
