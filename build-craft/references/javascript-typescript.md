# JavaScript / TypeScript — Production Checklist

Concrete pass/fail rules for shipping production-grade JS/TS. Checked 2026-09-30.

## tsconfig strictness

- [ ] `"strict": true` is set explicitly (it is the default since TS 6 — keep it explicit so the intent is visible).
- [ ] `"noUncheckedIndexedAccess": true` — `arr[i]` is `T | undefined`, never silently `T`.
- [ ] `"exactOptionalPropertyTypes": true` — `{ x?: number }` rejects an explicit `undefined`; use `x?: number | undefined` when "present but undefined" is meaningful.
- [ ] `"noUnusedLocals": true` and `"noUnusedParameters": true` — dead code fails the build.
- [ ] `"noImplicitOverride": true` — subclass overrides must say `override`.
- [ ] `"verbatimModuleSyntax": true` — forces `import type` / `export type`; keeps runtime bundles free of type-only imports.
- [ ] `"isolatedModules": true` — required for esbuild/swc/transpile-only pipelines.
- [ ] `"moduleResolution": "bundler"` for frontend/Vite, `"NodeNext"` for pure Node backends; `"module": "ESNext"` or `"NodeNext"`.
- [ ] `"skipLibCheck": true` — don't typecheck third-party `.d.ts` files.
- [ ] Audit recipe: `npx tsc --noEmit` passes with zero errors and runs as a CI gate.

## Type discipline — no `any`

- [ ] Zero `any` in the codebase: `grep -rn ': any' src` returns nothing (excluding generated files).
- [ ] Unknown-shaped data is typed `unknown` and narrowed with type guards or a validator — never cast with `as` to skip validation.
- [ ] No non-null assertions (`!`) on values that come from indexing, parsing, or I/O; narrow with an `if` instead.
- [ ] `catch` clause variables treated as `unknown` (`useUnknownInCatchVariables`) and narrowed before use.
- [ ] Prefer string-literal unions over `enum` (`type Status = "active" | "inactive"`); use `as const` objects when runtime values are needed.
- [ ] Branded types for IDs that must not mix: `type UserId = string & { __brand: "UserId" }`.
- [ ] Public function signatures fully annotated (params + returns); exported library APIs ship `.d.ts`.

## Linting and formatting

- [ ] ESLint uses flat config (`eslint.config.js`) — ESLint 10 (Feb 2026) removed `.eslintrc` entirely; a lingering `.eslintrc.*` means the project hasn't migrated.
- [ ] `typescript-eslint` v8+ configured with type-aware rules (`projectService: true`); `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-floating-promises` enabled.
- [ ] `npx eslint . --max-warnings 0` passes in CI — warnings are errors.
- [ ] No `console.log` in production code paths — a lint rule (`no-console`) or a structured logger (Pino) enforces it; `console` only in CLI scripts and tests.
- [ ] One formatter, enforced in CI: Prettier or Biome — never hand-formatted diffs, never mixed.

## Runtime validation at boundaries

- [ ] Every trust boundary validates at runtime: HTTP request bodies, query params, env vars, webhook payloads, file uploads.
- [ ] Validation via zod (default, biggest ecosystem) or valibot (smaller bundle, edge runtimes) — parse, don't cast: `schema.parse(input)`, never `input as T`.
- [ ] Server Actions, route handlers, and API endpoints validate with zod before any business logic.
- [ ] Env vars parsed once at startup with a zod schema (`z.object({ DATABASE_URL: z.string().url(), ... }).parse(process.env)`) — fail fast, not mid-request.

## Modules, packages, and runtime

- [ ] ESM throughout: `"type": "module"` in `package.json`; no `require()` in new code.
- [ ] `packageManager` field pins the manager and version (e.g. `"packageManager": "pnpm@10.0.0"`); lockfile (`pnpm-lock.yaml` / `package-lock.json` / `bun.lockb`) committed, CI installs frozen.
- [ ] `engines` declares the Node floor (≥ 20.19 for modern tooling; ESLint 10 requires `^20.19 || ^22.13 || >=24`).
- [ ] No phantom dependencies: with pnpm, imports resolve only to declared deps; `depcheck` or equivalent run periodically.
- [ ] Native Node APIs preferred over deps where they exist (`fetch`, `node:test`, `node:assert`).

## Testing

- [ ] Vitest is the default for new projects (TS/ESM native, zero config with Vite); Jest only for legacy suites or React Native.
- [ ] `vitest run` green in CI; coverage threshold enforced (`--coverage`, fail under 80%).
- [ ] No `test.only` / `it.only` committed (eslint rule `no-focused-tests`); mocks restored between tests (`restoreMocks`).
- [ ] No real network or real timers in unit tests — `msw` for HTTP, fake timers for time; E2E via Playwright is separate.

## Dependencies and supply chain

- [ ] `npm audit` / `pnpm audit` (or `bun audit`) runs in CI; builds fail on Critical, High triaged within the sprint.
- [ ] No unbounded ranges (`*`, `latest`) in committed manifests; lockfile and manifest change in the same commit.
- [ ] New dependencies justified: check maintenance activity and CVE history before adding; prefer fewer, well-maintained deps.

## Audit recipe

```bash
npx tsc --noEmit                    # zero errors
npx eslint . --max-warnings 0       # zero warnings (flat config only)
npx vitest run --coverage           # green, coverage gate
npm audit --audit-level=high        # or: pnpm audit
grep -rn ': any\b\|!\.' src --include='*.ts' | grep -v test   # should be empty
grep -rn 'console\.log' src --include='*.ts'                 # should be empty
```

## Sources

- https://github.com/m10rten/typescript-bits/blob/HEAD/skills/typescript-best-practices/SKILL.md
- https://github.com/reidond/armar-server/blob/HEAD/.claude/skills/typescript-best-practices/SKILL.md
- https://github.com/kiefbc/dotfiles/blob/HEAD/claude/.claude/skills/typescript-idioms/references/ecosystem.md
- https://github.com/argeoalecha/skills-agents/blob/HEAD/skills/audit/skill.md
- https://github.com/praxstack/ai-visual-code-review/blob/HEAD/.agents/skills/praxstack/backend-pe-typescript/SKILL.md
