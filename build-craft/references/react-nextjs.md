# React / Next.js — Production Checklist

Concrete pass/fail rules for React 19.2 + Next.js 16.3 App Router apps. General TS/ESLint/testing conventions live in `javascript-typescript.md`; visual design lives in `design-polish.md` and `design-distinct.md`. Version-sensitive claims dated 2026-09-30.

## Version baseline (Next.js 16.3, React 19.2)

- [ ] `next` is at/above 16.3.6 and `react`/`react-dom` on 19.2.x (verified via `npm ls next react`; 16.3.6 is Active LTS, checked 2026-09-30) — 16.3.6 patches the September 2026 `next/og` RCE (CVE-2026-94545); nothing below it runs in production.
- [ ] Turbopack is the default bundler for `dev` and `build` — a custom `webpack` key in `next.config.ts` fails the build; opt out only with `next dev --webpack` / `next build --webpack`.
- [ ] `middleware.ts` is gone — request interception lives in `proxy.ts` exporting `export function proxy(request: Request)`, and Proxy runs on the Node.js runtime only (no edge runtime option).
- [ ] `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are awaited Promises everywhere: `const { id } = await params`. Any sync access (`params.id` without `await`) fails review.
- [ ] `next lint` is removed — lint via the `eslint` CLI with flat config (`eslint-config-next/core-web-vitals`); `next build` no longer runs linting.
- [ ] `next.config.ts` (TypeScript) is the config format; `images.remotePatterns` is used, never the removed `images.domains`.

## React Compiler

- [ ] A compiler decision is recorded in the repo: either `reactCompiler: true` in `next.config.ts` (stable but opt-in in Next.js 16, checked 2026-09-30) or deliberately disabled — not left unconsidered.
- [ ] With the compiler ON: no new hand-written `memo` / `useMemo` / `useCallback` in code it already optimizes; pre-existing ones are removed only after profiling shows they are redundant.
- [ ] With the compiler OFF: `memo` / `useMemo` / `useCallback` appear only with measured render-bottleneck evidence (React DevTools Profiler or Performance Tracks), never as habit.
- [ ] `eslint-plugin-react-hooks` is v7 (not v6 — the React 19.2 blog's v6 reference was obsoleted one week later, checked 2026-09-30), with compiler lint rules enabled wherever the compiler is adopted.

## Server vs Client Components

- [ ] Components are Server Components by default; `'use client'` appears only where interactivity, hooks, or browser APIs genuinely require it.
- [ ] `'use client'` boundaries are narrow and at the leaves — never mark a large tree client to simplify implementation.
- [ ] Composition pattern used: Server Components passed as `children` into Client Components, so server-rendered parts stay out of the client bundle.
- [ ] Server-only logic and large dependencies (DB clients, heavy parsers) never imported into client components — a `server-only` import guard fails the build if they leak.
- [ ] Client bundle audited for server modules (`next build` output / bundle analyzer); First Load JS per route stays under ~200 KB.

## Data fetching and Cache Components

- [ ] Data is fetched on the server in Server Components — no `useEffect` fetch waterfalls on the client.
- [ ] Independent async work is parallelized (`Promise.all` / parallel `await`s); dependent chains kept explicit and minimal.
- [ ] Suspense boundaries are intentional: `loading.tsx` per route segment streams UI progressively instead of blocking the whole route.
- [ ] Dynamic data waterfalls wrapped in `<Suspense fallback={<Skeleton />}>` — a slow query never blocks sibling content; skeleton geometry mirrors the final layout (loading-state standard in `design-polish.md`).
- [ ] The caching model is declared, not inherited: either the legacy model (fetch uncached by default — caching opted in per call with `cache: 'force-cache'` / `revalidate` / `unstable_cache`) or Cache Components with `cacheComponents: true` in `next.config.ts` (opt-in, stable, the intended future default — checked 2026-09-30).
- [ ] With Cache Components on: no request-time APIs (`cookies()`, `headers()`, `searchParams`) inside a `'use cache'` scope — values are read outside and passed in as arguments (args are part of the cache key); `'use cache: private'` used for per-user cached data; personalized output is never cached under shared arguments.
- [ ] With Cache Components on: every `'use cache'` function sets a `cacheLife('…')` profile and a `cacheTag('…')`, and every dynamic read outside a cached scope sits under `<Suspense>` — otherwise the build errors; both facts verified in build output.
- [ ] Revalidation uses the 16 APIs, not the deprecated one-arg form: `updateTag(tag)` for immediate read-your-writes inside Server Actions, `revalidateTag(tag, 'max')` (or another profile) for stale-while-revalidate, `refresh()` for uncached current-route data — bare `revalidateTag(tag)` is deprecated.
- [ ] Route Handlers are called from Client Components only (plus webhooks/public APIs) — never from Server Components, which call the data layer directly.

## Routing conventions

- [ ] Route groups (`app/(marketing)/`, `app/(app)/`) organize sections without affecting URLs; private folders (`_components`) hold non-route code.
- [ ] Every route segment that can fail has `error.tsx`; every dynamic route has `not-found.tsx`; the app has `global-error.tsx` and `global-not-found.tsx`; parallel routes ship `default.tsx` where required.
- [ ] `generateStaticParams` used for known dynamic routes; `dynamicParams` set deliberately per route.
- [ ] `generateMetadata` (or static `metadata`) on every indexable route: title, description, canonical URL; OG images via `opengraph-image.tsx` where social sharing matters.
- [ ] `app/sitemap.ts` and `app/robots.ts` exist for indexable sites; JSON-LD structured data injected from Server Components for eligible content types.

## Server Actions and forms

- [ ] Mutations go through Server Actions (`'use server'`) with zod (or Standard Schema) validation of every input — authenticate, authorize, validate; never trust a `userId` passed as an argument instead of reading it from the session.
- [ ] CSRF is provided (POST-only + Origin/Host check), but auth/authz/validation are not; closure-captured values are encrypted with a per-build key, while `.bind(null, …)` arguments are NOT encrypted — never bind secrets. `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is set so action IDs survive deploys (checked 2026-09-30).
- [ ] Forms use `useActionState` (React 19, not the renamed `useFormState`) with structured `{ ok, errors }` returns — errors are returned, not thrown (thrown errors hit the nearest error boundary); a plain `<form action={fn}>` works with JavaScript disabled (progressive enhancement).
- [ ] `useFormStatus` (from `react-dom`) is used only inside a child of the `<form>`, never in the component rendering the form.
- [ ] Optimistic UI via `useOptimistic` for near-certain mutations with rollback + error toast on failure; `updateTag` gives read-your-writes, not global cache disabling.
- [ ] `after()` from `next/server` used for post-response work (logging, analytics, background writes) — never blocks the response.

## Images and fonts

- [ ] Zero raw `<img>` tags — all content images use `next/image` with explicit `width`/`height` (or `fill` with a sized parent), so CLS stays near zero.
- [ ] Exactly one `priority` image per page (the LCP candidate); `sizes` matches the actual responsive layout breakpoints; no `priority` on below-the-fold images or galleries.
- [ ] Remote images declared in `images.remotePatterns`; `formats: ['image/avif', 'image/webp']`; any `quality` value is within `images.qualities` (default `[75]`; others are coerced to the nearest allowed).
- [ ] Decorative images get `alt=""`; meaningful `alt` otherwise; `placeholder="blur"` for local/static imports (auto) and `blurDataURL` for remote images.
- [ ] All typefaces loaded via `next/font` (variable mode) declared in the root layout — self-hosted, zero external font requests; `display: "swap"` with `adjustFontFallback` (default) so no layout shift on font load.

## Auth (proxy.ts)

- [ ] `proxy.ts` does only cheap checks (session cookie / JWT presence and shape) with a scoped `matcher` — it runs on every prefetch, so no DB calls and no heavy logic there.
- [ ] Real authorization (DB-backed role/ownership checks) happens inside Server Actions and Route Handlers, not in `proxy.ts` — defense in depth, since proxy is a routing convenience, not a security boundary.
- [ ] Auth library is Auth.js v5 / `next-auth` (now maintained by the Better Auth team since July 2026, checked 2026-09-30) or Better Auth; sessions via JWT or database sessions — never hand-rolled tokens.

## Bundle and performance discipline

- [ ] Heavy components and third-party libraries loaded via `next/dynamic` (with `ssr: false` where SSR is meaningless) — never in the entry chunk.
- [ ] Third-party scripts use `next/script` with an explicit strategy (`lazyOnload` / `afterInteractive`), never raw `<script>` in layouts; Google Analytics ships via `@next/third-parties`, not hand-rolled tags; each tag has an owner and a measured purpose.
- [ ] `npm run build` passes locally before every production deploy; Core Web Vitals monitored in production (Vercel Analytics or equivalent RUM).

## React 19.2 patterns

- [ ] `ref` is a normal prop — no `forwardRef` wrappers in new components; context renders directly as `<Context value>` without `.Provider`.
- [ ] `useEffectEvent` extracts non-reactive logic (event handlers reading latest props/state) from effects — no re-subscribing to read fresh values.
- [ ] `<Activity>` hides UI while preserving state and unmounting effects, instead of CSS-`hidden` mounts that keep everything alive (checked 2026-09-30).
- [ ] The `use()` hook is used for promises/context in render where it simplifies code — same promise instance, not as a replacement for proper server data fetching.
- [ ] No `useEffect` for data fetching, subscriptions that belong in event handlers, or syncing props to state — each has a non-effect idiom; effects synchronize with external systems only.
- [ ] State architecture: values computable from other state are derived during render — no `useState` mirrors synced by effects; client state lives in Zustand with granular per-component selectors (subscribers re-render only on what they select) — Context providers reserved for genuinely app-wide values (locale, theme, session), never as a bulky global store.
- [ ] Keys are stable and unique (`id`, never array index for reorderable lists); no key changes that remount and lose state.

## GSAP animations

Official GreenSock AI skills: `greensock/gsap-skills` — the README states "Official AI skills for GSAP" (8 skills, checked 2026-10-02).

- [ ] Animations use `useGSAP()` from `@gsap/react` with a scope argument, or `gsap.context()` with `ctx.revert()` cleanup inside `useEffect` — never bare tweens left leaking on unmount.
- [ ] Animations triggered from event handlers go through `contextSafe`, not recreated contexts per click.
- [ ] No GSAP during SSR: animation setup runs only after mount (client-only code path or `useGSAP`), never during server render.
- [ ] ScrollTrigger: pin/scrub declared with explicit `toggleActions` (e.g. `"play reverse play reverse"`); scrubbed tweens use `ease: "none"`.
- [ ] `markers: true` is dev-only — stripped from production builds.
- [ ] `ScrollTrigger.refresh()` runs after any layout change (fonts loaded, content injected, resize) so trigger positions stay correct.
- [ ] GSAP performance rules: `gsap.quickTo()` for high-frequency updates (drag/scrub handlers); stagger instead of many independent tweens; off-screen animations killed, not left running; `will-change` only on currently animating elements (transform/opacity-only animation is enforced in design-polish.md).

## Observability

- [ ] `instrumentation.ts` `register()` is used for server-startup hooks only (DB warm-up, OpenTelemetry registration) — it runs once per runtime, never for request-time logic.
- [ ] Server logs are structured (JSON) with a request/correlation ID; no `console.log` in production code paths; `after()` carries background writes so they don't block responses.
- [ ] Unexpected errors in `error.tsx` / `global-error.tsx` are reported to an error tracker, not swallowed — the fallback UI is minimal by design.

## Environment variables

- [ ] Secrets live in server-only env vars; only values explicitly safe for the browser get the `NEXT_PUBLIC_` prefix.
- [ ] All env vars validated at startup with a zod schema — missing/invalid config fails the build, not the first request.
- [ ] `.env.local` gitignored; `.env.example` committed documenting every required variable.

## Sources

- https://react.dev/learn/react-compiler
- https://nextjs.org/blog/upcoming-nextjs-security-release-september-22-2026
- https://essamamdani.com/blog/nextjs-16-architecture-performance-briefing
- https://github.com/omegap1/foundational-skills/blob/HEAD/skills/react-19-2-and-compiler/SKILL.md
- https://github.com/goresawata27/notes/blob/HEAD/content/learning-notes/react/react-19-2.md
- https://github.com/hayao0819/dotfiles/blob/HEAD/modules/home-manager/llm/skills/writing-next/reference/caching.md
- https://github.com/ngocsotn/knowledge/blob/HEAD/frontend/nextjs/caching.md
- https://github.com/hayao0819/dotfiles/blob/HEAD/modules/home-manager/llm/skills/writing-next/reference/server-actions.md
- https://github.com/ntwrcht/blvck-skills/blob/HEAD/skills/engineering/next-engineer/references/server-actions.md
- https://github.com/leahycc/claude-skills/blob/HEAD/skills/nextjs-app-router/resources/assets.md
- https://github.com/builtform/launchpad/blob/HEAD/plugins/launchpad/scaffolders/next-pattern.md
- https://dev.to/jtorchia/nextjs-v1636-vs-v15526-whats-in-each-branch-according-to-the-changelog-578n
- https://oday-bakkour.com/blog/next-js-rce-dev-stack-release-audit-2026-09-24
- https://github.com/aayushmaan-54/blog/blob/HEAD/src/content/writing/blogs/nextjs-server-actions-explained.mdx
- https://github.com/greensock/gsap-skills — GreenSock's official AI skills (README: "Official AI skills for GSAP"); the react, scrolltrigger, and performance skills were read for the GSAP section above (checked 2026-10-02)
