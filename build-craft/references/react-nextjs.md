# React / Next.js — Production Checklist

Concrete pass/fail rules for React 19 + Next.js App Router apps. Checked 2026-09-30 against Next.js 16 docs.

## Version baseline (Next.js 16, React 19)

- [ ] On Next.js 16+: Turbopack is the default bundler for `dev` and `build` — a custom `webpack` key in `next.config.ts` will fail the build; opt out only with the `--webpack` flag.
- [ ] `middleware.ts` is deprecated — request interception lives in `proxy.ts` exporting `export function proxy(request: Request)`. It runs on Node.js only (no edge runtime option).
- [ ] `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are async-only Promises — always `await` them: `const { id } = await params`. The old sync access is gone.
- [ ] `next lint` is removed — lint via the `eslint` CLI directly; `next build` no longer runs linting automatically.
- [ ] `next.config.ts` (TypeScript) is the standard config format; `images.remotePatterns` is used, not the removed `images.domains`.

## Server vs Client Components

- [ ] Components are Server Components by default; `'use client'` appears only where interactivity, hooks, or browser APIs genuinely require it.
- [ ] `'use client'` boundaries are narrow and at the leaves — never mark a large tree client just to simplify implementation.
- [ ] Composition pattern used: Server Components passed as `children` into Client Components, so the server-rendered parts stay out of the client bundle.
- [ ] Server-only logic and large dependencies (DB clients, heavy parsers) never imported into client components — a `server-only` import guard fails the build if they leak.
- [ ] Audit: check the client bundle for server modules (`next build` output / bundle analyzer); First Load JS per route under ~200 KB.

## Data fetching

- [ ] Data is fetched on the server in Server Components — no `useEffect` fetch waterfalls on the client.
- [ ] Independent async work is parallelized (`Promise.all` / parallel `await`s); dependent chains kept explicit and minimal.
- [ ] Suspense boundaries are intentional: `loading.tsx` per route segment streams UI progressively instead of blocking the whole route.
- [ ] Cache intent is explicit — since Next.js 15, `fetch` is not cached by default; use the `'use cache'` directive / `cache: 'force-cache'` / `unstable_cache` deliberately, with a documented revalidation strategy.
- [ ] Route Handlers are called from Client Components only — never from Server Components (that adds a pointless extra server hop); Server Components call the data layer directly.
- [ ] Request-time APIs (`cookies()`, `headers()`, `searchParams`) are used intentionally: each one opts the route into dynamic rendering — wrap in Suspense so the static shell still streams.

## Routing conventions

- [ ] Route groups (`app/(marketing)/`, `app/(app)/`) organize sections without affecting URLs; private folders (`_components`) hold non-route code.
- [ ] Every route segment that can fail has `error.tsx`; every dynamic route has `not-found.tsx`; the app has `global-error.tsx` and `global-not-found.tsx`.
- [ ] `generateStaticParams` used for known dynamic routes; `dynamicParams` / `revalidate` set deliberately per route.
- [ ] `generateMetadata` (or static `metadata`) on every indexable route: title, description, canonical URL; OG images via `opengraph-image.tsx` where social sharing matters.
- [ ] `app/sitemap.ts` and `app/robots.ts` exist for indexable sites; JSON-LD structured data injected from Server Components for eligible content types.

## Server Actions and mutations

- [ ] Mutations go through Server Actions (`'use server'`) with zod validation of every input — treat actions as sensitive server entry points: authenticate, authorize, validate.
- [ ] Optimistic UI via `useOptimistic` for near-certain mutations; rollback with an error toast on failure.
- [ ] After mutations, revalidate surgically (`revalidateTag` / `revalidatePath`), not by disabling caching globally.
- [ ] `after()` from `next/server` used for post-response work (logging, analytics, background writes) — never block the response on it.

## Images and fonts

- [ ] Zero raw `<img>` tags — all images use `next/image` with explicit `width`/`height` (or `fill` with a sized parent) so CLS stays near zero.
- [ ] The LCP image gets `priority`; below-the-fold images are lazy by default; `sizes` reflects the actual layout slots.
- [ ] Remote images declared in `images.remotePatterns`; no hotlinking undeclared hosts.
- [ ] All typefaces loaded via `next/font` (self-hosted, zero external requests); `display: swap` with metric-matched fallbacks — no layout shift on font load.

## Auth at the edge

- [ ] `proxy.ts` does only cheap checks (session cookie / JWT presence and shape) — it runs on every prefetch, so no DB calls there.
- [ ] Real authorization (DB-backed role/ownership checks) happens inside Server Actions and Route Handlers, not in `proxy.ts`.
- [ ] Auth library is Auth.js v5 (the `next-auth` successor) or equivalent; sessions via JWT or database sessions — never hand-rolled tokens.

## Bundle and performance discipline

- [ ] Heavy components and third-party libraries loaded via `next/dynamic` — never in the entry chunk.
- [ ] No `memo` / `useMemo` / `useCallback` without measured evidence of a render bottleneck.
- [ ] Third-party scripts use `next/script` with an explicit strategy (`lazyOnload` / `afterInteractive`) and each tag has an owner and a measured purpose.
- [ ] `npm run build` passes locally before every production deploy; Core Web Vitals monitored in production (Vercel Analytics or equivalent RUM).

## React 19 patterns

- [ ] `ref` is a normal prop — no `forwardRef` wrappers in new components.
- [ ] The `use()` hook used for reading promises/context in render where it simplifies code; not as a replacement for proper data fetching architecture.
- [ ] `useOptimistic` for instant-feeling mutations with server reconciliation; `useTransition` for non-urgent updates that shouldn't block typing or navigation.
- [ ] No `useEffect` for data fetching, subscriptions that belong in event handlers, or syncing props to state — each has a non-effect idiom; effects are for synchronizing with external systems only.
- [ ] Keys are stable and unique (`id`, never array index for reorderable lists); no key changes that remount and lose state.

## Environment variables

- [ ] Secrets live in server-only env vars; only values explicitly safe for the browser get the `NEXT_PUBLIC_` prefix.
- [ ] All env vars validated at startup with a zod schema — missing/invalid config fails the build, not the first request.
- [ ] `.env.local` gitignored; `.env.example` committed documenting every required variable.

## Sources

- https://nextjs.org/docs/app/guides/production-checklist
- https://github.com/lysandre001/skills-registry/blob/HEAD/userlg--skills-agent--nextjs-best-practices/SKILL.md
- https://github.com/diegosouzapw/omni-skills/blob/HEAD/skills_omni/vercel-react-best-practices/SKILL.md
- https://github.com/everydaydevopsio/ballast/issues/99
- https://essamamdani.com/blog/nextjs-16-architecture-performance-briefing
- https://github.com/petrilahdelma/digitaltableteur/blob/HEAD/docs/NEXTJS_16_UPGRADE_PLAN.md
