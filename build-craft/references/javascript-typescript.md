# JavaScript / TypeScript — Production Checklist

Concrete pass/fail rules for the TypeScript language and its toolchain: compiler strictness, type discipline, lint/format, runtime validation, modules/packages, unit testing, dependency supply chain. Checked 2026-09-30. (React/Next.js framework patterns live in `react-nextjs.md`; browser HTML/a11y mechanics in `web-frontend.md`.)

## Compiler version and tsconfig strictness

- [ ] `typescript` pinned to a current major: `^6.0.x` (stable Mar 2026, last JS-codebase release) or `7.x` (Go-native, GA Jul 2026); nothing below 5.9.3, nothing unpinned at `latest`.
- [ ] `"strict": true` set explicitly (it is the default since TS 6 — keep it explicit so the intent is visible).
- [ ] If `typescript@7.x` is the checker, the lint toolchain still runs TS 6.x: type-aware linting needs the stable programmatic API, which lands in TS 7.1 (typescript-eslint v8.58+ supports TS 6).
- [ ] `"noUncheckedIndexedAccess": true` — `arr[i]` is `T | undefined`, never silently `T`.
- [ ] `"exactOptionalPropertyTypes": true` — `{ x?: number }` rejects an explicit `undefined`; use `x?: number | undefined` when "present but undefined" is meaningful.
- [ ] `"noUnusedLocals": true` and `"noUnusedParameters": true` — dead code fails the build.
- [ ] `"noImplicitOverride": true` — subclass overrides must say `override`.
- [ ] `"verbatimModuleSyntax": true` — forces `import type` / `export type`; keeps runtime bundles free of type-only imports.
- [ ] `"isolatedModules": true` — required for esbuild/swc/transpile-only pipelines.
- [ ] `"erasableSyntaxOnly": true` when Node executes `.ts` directly via native type stripping — `tsc` errors on `enum`s, parameter properties, and namespaces that stripping cannot run.
- [ ] `"moduleResolution": "bundler"` for bundled apps, `"NodeNext"` for pure Node packages; `"module": "ESNext"` or `"NodeNext"`.
- [ ] No options TS 6 deprecates and TS 7 removes as hard errors: `grep -E '"baseUrl"|"moduleResolution":\s*"node"' tsconfig*.json` is empty; target is ES2022+ (no ES5/AMD/UMD emit).
- [ ] `"skipLibCheck": true` — don't typecheck third-party `.d.ts` files.
- [ ] Audit recipe: `npx tsc --noEmit` (or the native `tsc` binary from `typescript@7`) passes with zero errors as a CI gate.

## Type discipline — no `any`

- [ ] Zero `any`: `grep -rn ': any' src` returns nothing (excluding generated files and vendored code).
- [ ] Zero `// @ts-ignore`; every `// @ts-expect-error` carries an inline comment naming why.
- [ ] Unknown-shaped data is typed `unknown` and narrowed with type guards or a validator — never cast with `as` to skip validation.
- [ ] No non-null assertions (`!`) on values that come from indexing, parsing, or I/O; narrow with an `if` instead.
- [ ] `catch` clause variables treated as `unknown` (`useUnknownInCatchVariables`) and narrowed before use.
- [ ] String-literal unions over `enum` (`type Status = "active" | "inactive"`); `as const` objects when runtime values are needed (and no `enum` at all if Node type-stripping runs the code).
- [ ] Branded/nominal types for IDs that must not mix: `type UserId = string & { readonly __brand: unique symbol }` (and a distinct `declare const` brand per ID type) — plain string aliases let `UserId` and `OrderId` silently interchange; each domain ID gets its own brand plus constructor/parse functions.
- [ ] Public function signatures fully annotated (params + returns); published libraries generate `.d.ts` (`declaration: true`).

## Type-check performance at scale

- [ ] On `typescript@7`, the CI typecheck uses the native binary's parallel knobs (`--checkers` / `--builders`) rather than falling back to single-threaded JS `tsc`.
- [ ] Monorepos use project references (`composite: true` + `references`) so `tsc --build` type-checks each package once; no whole-repo `tsc --noEmit` re-checking every package.
- [ ] Libraries that publish types set `"isolatedDeclarations": true` so `.d.ts` generation doesn't depend on cross-file inference.
- [ ] Typecheck time is a timed CI step and a 2×+ slowdown triggers investigation, not a shrug.

## Lint and format

- [ ] ESLint uses flat config (`eslint.config.*` present; zero `.eslintrc.*` files — ESLint 10, Feb 2026, removed legacy config).
- [ ] `typescript-eslint` v8.58+ configured with type-aware rules (`projectService: true`); `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-floating-promises` enabled.
- [ ] `npx eslint . --max-warnings 0` passes in CI — warnings are errors.
- [ ] If Biome 2.x is the linter+formatter: `biome.json` committed, `npx @biomejs/biome check .` green in CI; the type-aware gap is a documented decision (Biome's inferred-type rules catch ~75% of what typescript-eslint's type-aware rules catch, not 100%).
- [ ] If oxlint is the linter: `.oxlintrc.json` committed, `npx oxlint --deny-warnings` green in CI; type-aware rules left off only by documented decision.
- [ ] No `console.log` in production code paths — a lint rule (`no-console`) or a structured logger (Pino) enforces it; `console` only in CLI scripts and tests.
- [ ] Exactly one formatter enforced in CI (`biome format --check .` or `prettier --check .`) — never hand-formatted diffs, never mixed.

## Runtime validation at trust boundaries

- [ ] Every trust boundary validates at runtime: HTTP request bodies, query params, env vars, webhook payloads, file uploads, queue messages.
- [ ] Validation via zod v4 (default, biggest ecosystem), valibot 1.x (smallest bundle, edge runtimes), or ArkType 2.x — chosen explicitly; parse, don't cast: `schema.parse(input)`, never `input as T`.
- [ ] Schemas are Standard Schema v1-compatible so the validator is swappable without touching call sites.
- [ ] Route handlers and API endpoints validate with the schema before any business logic; `.safeParse` used where a 400 response is the outcome.
- [ ] Env vars parsed once at startup with a schema (`z.object({ DATABASE_URL: z.string().url(), ... }).parse(process.env)`) — fail fast, not mid-request.
- [ ] Boundary schemas live in a shared module next to the boundary they guard — no ad hoc inline validation in handlers.

## Modules, packages, and runtime

- [ ] ESM throughout: `"type": "module"` in `package.json`; no `require()` in new code; new packages are ESM-only unless a named consumer forces dual CJS emit.
- [ ] Node floor is an LTS line: ≥ 22 (22 is Maintenance LTS to 2027-04-30), 24 preferred (Active LTS "Krypton", EOL 2028-04-30); Node ≤ 20 fails (EOL Apr 2026).
- [ ] `engines` declares the Node floor (e.g. `"engines": { "node": ">=22" }`); `.nvmrc` / `.node-version` and the CI matrix agree with it.
- [ ] Package manager pinned via the `packageManager` field with Corepack enabled in CI; lockfile committed; CI installs frozen (`npm ci` / `--frozen-lockfile`).
- [ ] With pnpm 11: `allowBuilds` in `pnpm-workspace.yaml` lists every package permitted to run install scripts (it replaced `onlyBuiltDependencies`; unlisted scripts now fail the install).
- [ ] No phantom dependencies: with pnpm, imports resolve only to declared deps; `depcheck` or equivalent run periodically.
- [ ] Published packages validated before release: `npx attw --pack` and `npx publint` green; the `exports` map covers `types`, `import`, and `default` for every entry point.
- [ ] Native Node APIs preferred over deps where they exist (`fetch`, `node:test`, `node:assert`); package scripts run via `node --run` instead of a task-runner dependency.

## Testing

- [ ] Vitest 4.1+/5.x (5.0 released Sep 2026) is the default for new projects; Jest only for legacy suites; one runner per package, never mixed.
- [ ] `vitest run` green in CI; coverage via `@vitest/coverage-v8` with an enforced threshold (fail under 80% or the repo's stated number).
- [ ] No `test.only` / `it.only` committed (`no-focused-tests` rule or equivalent); mocks restored between tests (`restoreMocks: true` in config or `vi.restoreAllMocks()` in setup).
- [ ] No real network or real timers in unit tests — `msw` for HTTP, fake timers for time; DOM tests via Vitest browser mode; E2E via Playwright is a separate job.
- [ ] `node:test` used only where it fits (zero-dependency libraries): no DOM, coverage still experimental, module mocking behind a flag — a documented tradeoff, never the default for app code.
- [ ] Flaky tests are quarantined and tracked, not silently retried: CI exposes the flaky set and any retry budget is capped.

## Dependencies and supply chain

- [ ] `npm audit` / `pnpm audit` (or `bun audit`) runs in CI; builds fail on Critical; High triaged within the sprint.
- [ ] New dependencies justified: check maintenance activity and CVE history before adding; prefer fewer, well-maintained deps.
- [ ] No unbounded ranges (`*`, `latest`) in committed manifests; lockfile and manifest change in the same commit.
- [ ] pnpm's `minimumReleaseAge` left at its default (24h) or set explicitly — known-good supply-chain hygiene against fresh-release hijacks.
- [ ] Install scripts audited: only allowlisted builds can run (`allowBuilds`, or npm `ignore-scripts` + explicit allow) so a compromised postinstall can't execute silently.

## Audit recipe

```bash
npx tsc --noEmit                    # zero errors (TS 6+; TS 7 native binary)
npx eslint . --max-warnings 0       # flat config only; or: npx @biomejs/biome check .
npx vitest run --coverage           # green, coverage gate
npm audit --audit-level=high        # or: pnpm audit / bun audit
npx attw --pack && npx publint      # published packages only
grep -rn ': any\b\|@ts-ignore' src --include='*.ts' | grep -v test   # should be empty
grep -rn 'console\.log' src --include='*.ts'                        # should be empty
grep -E '"baseUrl"|"moduleResolution":\s*"node"' tsconfig*.json     # should be empty
```

## Sources

- https://github.com/microsoft/typescript/releases
- https://github.com/laststance/laststance.io/blob/HEAD/src/app/articles/All-TypeScript-release-blog-list/content.mdx
- https://github.com/typescript-eslint/typescript-eslint/blob/HEAD/packages/typescript-eslint/CHANGELOG.md
- https://github.com/quad4-software/ai/blob/HEAD/.agents/skills/typescript/SKILL.md
- https://github.com/vitest-dev/vitest/blob/HEAD/docs/blog/vitest-4-1.md
- https://github.com/paldom/node-skills/blob/HEAD/skills/node-testing/references/testing-playbook.md
- https://ecorpit.com/nodejs-native-typescript-type-stripping-2026/
- https://www.pkgpulse.com/guides/nodejs-22-vs-nodejs-24-2026
- https://github.com/jlevy/tbd/blob/HEAD/packages/tbd/docs/guidelines/pnpm-monorepo-patterns.md
- https://dev.to/gabrielanhaia/zod-4-vs-valibot-vs-arktype-a-type-system-teardown-4lha
- https://github.com/opendatahub-io/notebooks/blob/HEAD/docs/architecture/decisions/0012-typescript-developer-tooling.md
- https://www.alekseialeinikov.com/en/blog/topics/programming/biome-2026-replace-eslint-prettier-benchmark
