# C — production checklist

Covers the C23 standard, compiler warnings, sanitizers, static analysis, CERT C / MISRA memory safety, toolchain hardening, CMake, testing, fuzzing, and style. Checked 2026-09-30.

## Language standard: C23

- [ ] C23 (ISO/IEC 9899:2024, published 2024-10-31, `__STDC_VERSION__ == 202311L`) is the baseline for new code; GCC 15 defaults to `gnu23`, Clang accepts `-std=c23` (partial support).
- [ ] Use the new keywords: `nullptr`/`nullptr_t`, `bool`/`true`/`false`, `constexpr` (objects only, not functions), `typeof`/`typeof_unqual`, `_BitInt(N)` with `BITINT_MAXWIDTH` for exact-width arithmetic; single-argument `static_assert`.
- [ ] Use the standardized attributes: `[[nodiscard]]` `[[maybe_unused]]` `[[deprecated]]` `[[fallthrough]]` `[[noreturn]]` `[[unsequenced]]` `[[reproducible]]`; `#embed`/`__has_embed` for binary blobs; `#elifdef`/`#elifndef`; `0b` binary literals; `'` digit separators.
- [ ] Know the porting gotchas: `void f()` now means no parameters; K&R function definitions and trigraphs removed; two's complement arithmetic mandated.
- [ ] Use the new libc surface: `<stdckdint.h>` (`ckd_add`/`ckd_sub`/`ckd_mul`) for overflow-checked arithmetic; `<stdbit.h>`; `memset_explicit` (replaces `explicit_bzero`); `strdup`/`strndup` in `<string.h>`; `reallocarray`; `memccpy` (glibc 2.43+, 2026-01-24).

## Compiler warnings

- [ ] Builds with `-Wall -Wextra -Werror` with **zero warnings**; `-Werror` enforced in CI on development builds.
- [ ] `-Wpedantic` for strict ISO C conformance; `-Wconversion -Wsign-conversion` for implicit narrowing and signed/unsigned mixups.
- [ ] Bug-catching warnings on: `-Wshadow -Wcast-align -Wnull-dereference -Wimplicit-fallthrough -Wstrict-prototypes -Wmissing-prototypes -Wwrite-strings`.
- [ ] `-Wformat=2` with `-Werror=format-security`; obsolete-C-as-errors: `-Werror=implicit -Werror=incompatible-pointer-types -Werror=int-conversion`.
- [ ] `-Wbidi-chars=any` (Trojan Source mitigation); `-fanalyzer` enabled (GCC 10+, taint analysis on by default since GCC 14: `-Wanalyzer-tainted-*`).
- [ ] No project-wide `-Wno-*` silencing without documented justification; suppressions are narrow-scope with an explanatory comment.
- [ ] Blanket `-Werror`: development only, never in distributed source (toolchain coupling) — selective `-Werror=<warning>` is acceptable everywhere (OpenSSF guidance, 2026-08-20).

## Sanitizers

- [ ] CI builds and runs tests with ASan + UBSan: `-fsanitize=address,undefined -fno-sanitize-recover=all -g -O1 -fno-omit-frame-pointer`; zero reports.
- [ ] Multithreaded code additionally runs under TSan (`-fsanitize=thread`) in a **separate** build — never combined with ASan; MSan where a fully-instrumented build is feasible.
- [ ] `-fsanitize=bounds` is mandatory in CI alongside ASan+UBSan (catches sub-object bounds violations the allocators miss); `-fstack-protector-strong` is enabled in CI test builds as well as release builds, never compiled out for "speed".
- [ ] LeakSanitizer (on by default under ASan): test suite exits with zero leaks.
- [ ] Production services: GWP-ASan (sampling-based heap checker — negligible CPU, no false positives) for heap use-after-free and overflows in live traffic.
- [ ] `_FORTIFY_SOURCE` disabled under ASan (causes false positives/negatives).

## Auto-vectorization (SIMD)

Compilers vectorize simple loops for free — but only when the loop is provably safe to vectorize. Hand-writing intrinsics before satisfying these is premature.

- [ ] Vectorizable-loop shape: countable trip count, no early `break`/`return`/data-dependent exit, no function calls or I/O in the body, stride-1 contiguous access.
- [ ] No aliasing across the arrays (`restrict`-qualified pointers or compiler-provable non-overlap); data aligned to the vector width (`aligned_alloc` / `__builtin_assume_aligned`) — misaligned or possibly-aliased loops silently scalarize.
- [ ] Explicit intent: `#pragma omp simd` on the hot loop when the compiler hesitates; loop-unrolling guarded by `#pragma GCC unroll N` (or `clang loop unroll`) only after measuring — blind unrolling can trash the I-cache.
- [ ] Verify, don't assume: compile with `-fopt-info-vec-missed` and confirm the loop vectorized; confirm with a benchmark that SIMD actually beat the scalar loop on the target CPU (checked 2026-10-01).

## Static analysis

- [ ] `.clang-tidy` checked in with at least `bugprone-*`, `cert-*`, `clang-analyzer-*`; findings = 0 in CI.
- [ ] Every `NOLINT` names the specific check with a justification; blanket `NOLINT` forbidden.
- [ ] cppcheck runs with `--enable=warning,performance,portability --error-exitcode=1` and is clean.
- [ ] GCC `-fanalyzer` runs in CI; CodeQL `cert-c-default.qls` suite where available; analyzer tool versions pinned/documented.

## CERT C / MISRA / memory safety

- [ ] CERT C rules now cite ISO/IEC 9899:2024; MISRA C 2025 (March 2025) is the current edition covering C90–C18 — know which standard your industry actually requires.
- [ ] No `gets()` — `fgets()` instead; no `strcpy`/`strcat`/`sprintf`/`strncpy` — `strncpy` is banned outright (no NUL guarantee on truncation, wasteful zero-padding); bounded variants only.
- [ ] Bounded strings: `strlcpy`/`strlcat` (glibc ≥2.38) or `snprintf`, and the return value is always checked for truncation — a bounded copy whose truncation went unverified fails review.
- [ ] No `strncat` without proving the destination was NUL-terminated first; `strdup`/`strndup` (C23) for copies where the source is trusted-length.
- [ ] Prefer `reallocarray(nmemb, size)` / `calloc` over `malloc(nmemb * size)` — overflow-safe sizing; `ckd_add`/`ckd_sub`/`ckd_mul` for arithmetic feeding allocation/copy sizes; never rely on signed-integer overflow.
- [ ] `realloc(p, 0)` is undefined behavior in C23 — never rely on free-on-zero-realloc.
- [ ] Wipe secrets with `memset_explicit` (immune to dead-store elimination), not `memset` or `explicit_bzero`.
- [ ] No untrusted data in format-string position — never `printf(user_input)`; always `printf("%s", user_input)`.
- [ ] String buffers reserve space for the null terminator; only null-terminated strings passed to string functions.
- [ ] No out-of-bounds subscripts or pointer arithmetic forming invalid pointers; VLA sizes validated in range.
- [ ] Every `malloc`/`calloc`/`realloc` return checked for NULL; zero-size allocations rejected.
- [ ] `realloc` uses the temp-pointer idiom (`p2 = realloc(p, n)`, check, then assign) — never assigns back onto the pointer being reallocated.
- [ ] Every allocation freed on **all** paths including error paths; no use-after-free, no double-free; pointers set to NULL after free where ownership is shared.
- [ ] No aliasing violations (no access through incompatible pointer types); pointers NULL-checked before dereference; every fallible stdlib call's return checked.
- [ ] Variables initialized before use; every `switch` has a `default`; no implicit fallthrough; prototypes visible at definition.

## Toolchain hardening flags

- [ ] Baseline (OpenSSF Compiler Options Hardening Guide, 2026-08-20): `-O2 -D_FORTIFY_SOURCE=3 -fstack-protector-strong -fstack-clash-protection -fPIE -pie -Wl,-z,RelRO,-z,Now -Wl,-z,noexecstack`.
- [ ] `-fhardened` (GCC 14+) as the umbrella flag — `gcc --help=hardened` shows the exact set for your release; explicit command-line options always take precedence.
- [ ] x86-64: `-fcf-protection=full -fzero-call-used-regs=used-gpr`; AArch64: `-mbranch-protection=standard -fzero-call-used-regs=used-gpr`.
- [ ] Production builds: `-fno-delete-null-pointer-checks -fno-strict-overflow -fno-strict-aliasing -ftrivial-auto-var-init=zero`.
- [ ] `-D_GLIBCXX_ASSERTIONS` (C++) — bounds checks in the standard library.

## Build system (CMake)

- [ ] `cmake_minimum_required(VERSION 3.10...4.0)` range form — CMake 4.0 removed compatibility with <3.5; `CMAKE_POLICY_VERSION_MINIMUM` bounds policy behavior for the 4.x line.
- [ ] Target-based only (`target_include_directories`, `target_link_libraries`, `target_compile_options` with PUBLIC/PRIVATE/INTERFACE); `C_STANDARD 23` (`c_std_23` compile feature).
- [ ] No legacy globals (`include_directories()`, `link_libraries()`, `add_definitions()`); no project-wide `add_compile_options()`.
- [ ] No `file(GLOB …)` for sources — listed explicitly; `CMAKE_C_STANDARD` + `CMAKE_C_STANDARD_REQUIRED ON` set.
- [ ] Out-of-source builds only (`cmake -S . -B build`); `CMAKE_EXPORT_COMPILE_COMMANDS=ON`; build presets in `CMakePresets.json`.
- [ ] Tests via `enable_testing()` / `include(CTest)` + `add_test()`; CI runs `ctest --output-on-failure` (CMake 4.0 adds `--sarif-output` for CI ingestion).

## Testing

- [ ] Unit tests in Unity (+CMock/Ceedling), cmocka, or Criterion; each suite its own executable, registered with ctest, run in CI.
- [ ] Test binaries also build with `-fsanitize=address,undefined` in CI — zero sanitizer reports.
- [ ] Line/branch coverage measured (gcov/llvm-cov, `-O0` for accurate line coverage) with a documented target.

## Fuzzing

- [ ] libFuzzer is maintenance-mode upstream — default to AFL++ for new harnesses, or LibAFL's `libafl_libfuzzer` drop-in shim (same `LLVMFuzzerTestOneInput` interface, actively maintained).
- [ ] Harness compiled with `-fsanitize=fuzzer,address,undefined`; seed corpus + dictionaries checked in; `-jobs` for parallel campaigns; crashes replayed directly (`./fuzz <crash>`); `-runs=0` replays the corpus without fuzzing.
- [ ] Everything parsing untrusted input gets a fuzz target; continuous fuzzing via OSS-Fuzz (open source) or ClusterFuzzLite.
- [ ] `_FORTIFY_SOURCE` disabled in fuzz builds (same false-positive reason as ASan).

## Style

- [ ] `.clang-format` checked in at repo root; `clang-format --dry-run --Werror` enforced in CI.
- [ ] Braces on every `if`/`for`/`while` body, even one-liners; consistent naming (`snake_case` functions/variables, `ALL_CAPS` macros).

## Sources

- https://en.wikipedia.org/wiki/C23_(C_standard_revision)
- https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/expressions-exp/exp39-c/
- https://github.com/ossf/wg-best-practices-os-developers/blob/HEAD/docs/Compiler-Hardening-Guides/Compiler-Options-Hardening-Guide-for-C-and-C++.md
- https://github.com/google/oss-fuzz/blob/HEAD/docs/index.md
- https://github.com/trailofbits/testing-handbook/blob/HEAD/content/docs/fuzzing/c-cpp/10-libfuzzer/index.md
- https://github.com/aflplusplus/libafl/blob/HEAD/crates/libafl_libfuzzer/README.md
- https://github.com/kitware/cmake/blob/HEAD/Help/release/4.0.rst
- https://lists.gnu.org/archive/html/info-gnu/2026-01/msg00005.html
- https://developers.redhat.com/articles/2024/04/03/improvements-static-analysis-gcc-14-compiler
- https://www.jamasoftware.com/legacy/requirements-management-guide/meeting-regulatory-compliance-and-industry-standards/misra-c/
- https://github.com/github/codeql-coding-standards/blob/HEAD/change_notes/2025-04-09-new-cert-c-recommendation-query-suite.md
- https://zine.dev/2023/07/strlcpy-and-strlcat-added-to-glibc/
- https://manpages.debian.org/bookworm/manpages-dev/realloc.3.en.html
- https://github.com/google/tcmalloc/blob/HEAD/docs/gwp-asan.md
