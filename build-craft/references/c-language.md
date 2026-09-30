# C — production checklist

Covers compiler warnings, sanitizers, static analysis, CERT C memory safety, toolchain hardening, CMake, testing, and style.

## Compiler warnings

- [ ] Builds with `-Wall -Wextra -Werror` (gcc and/or clang) with **zero warnings**; `-Werror` enforced in CI.
- [ ] `-Wpedantic` for strict ISO C conformance; `-Wconversion -Wsign-conversion` for implicit narrowing and signed/unsigned mixups.
- [ ] Bug-catching warnings on: `-Wshadow -Wcast-align -Wnull-dereference -Wimplicit-fallthrough -Wstrict-prototypes -Wmissing-prototypes -Wwrite-strings`.
- [ ] `-Wformat=2` with `-Werror=format-security` so format-string mismatches fail the build.
- [ ] No project-wide `-Wno-*` silencing without documented justification; suppressions are narrow-scope with an explanatory comment.

## Sanitizers

- [ ] CI builds and runs tests with ASan + UBSan: `-fsanitize=address,undefined -fno-sanitize-recover=all -g -O1 -fno-omit-frame-pointer`; zero reports.
- [ ] Multithreaded code additionally runs under TSan (`-fsanitize=thread`, never combined with ASan); MSan where a fully-instrumented build is feasible.
- [ ] LeakSanitizer (on by default under ASan): test suite exits with zero leaks.

## Static analysis

- [ ] `.clang-tidy` checked in with at least `bugprone-*`, `cert-*`, `clang-analyzer-*`; findings = 0 in CI.
- [ ] Every `NOLINT` names the specific check with a justification; blanket `NOLINT` forbidden.
- [ ] cppcheck runs with `--enable=warning,performance,portability --error-exitcode=1` and is clean.
- [ ] Analyzer tool versions pinned/documented.

## CERT C / memory safety

- [ ] No `gets()` — `fgets()` instead; no `strcpy`/`strcat`/`sprintf` — bounded variants only (`snprintf`, `strncpy` with explicit `'\0'`, `strncat`).
- [ ] No untrusted data in format-string position — never `printf(user_input)`; always `printf("%s", user_input)`.
- [ ] String buffers reserve space for the null terminator; only null-terminated strings passed to string functions.
- [ ] No out-of-bounds subscripts or pointer arithmetic forming invalid pointers; VLA sizes validated in range.
- [ ] Integer arithmetic feeding allocation/copy sizes is overflow-checked **before** use; no reliance on signed-integer overflow.
- [ ] Every `malloc`/`calloc`/`realloc` return checked for NULL; zero-size allocations rejected.
- [ ] `realloc` uses the temp-pointer idiom (`p2 = realloc(p, n)`, check, then assign) — never assigns back onto the pointer being reallocated.
- [ ] Every allocation freed on **all** paths including error paths; no use-after-free, no double-free; pointers set to NULL after free where ownership is shared.
- [ ] No aliasing violations (no access through incompatible pointer types); pointers NULL-checked before dereference; every fallible stdlib call's return checked.
- [ ] Variables initialized before use; every `switch` has a `default`; no implicit fallthrough; prototypes visible at definition.

## Toolchain hardening flags

- [ ] `-D_FORTIFY_SOURCE=3` — compile-time + runtime buffer-overflow checks in libc functions.
- [ ] `-fstack-protector-strong` — stack canaries for functions with vulnerable buffers.
- [ ] `-fPIE` + `-pie` — position-independent executable (ASLR for the main binary).
- [ ] `-Wl,-z,RelRO,-z,Now` — read-only relocations + immediate binding (GOT protection).
- [ ] `-D_GLIBCXX_ASSERTIONS` (C++) — bounds checks in the standard library.

## Build system (CMake)

- [ ] `cmake_minimum_required(VERSION 3.20)` (3.28+ for new projects); target-based only (`target_include_directories`, `target_link_libraries`, `target_compile_options` with PUBLIC/PRIVATE/INTERFACE).
- [ ] No legacy globals (`include_directories()`, `link_libraries()`, `add_definitions()`); no project-wide `add_compile_options()`.
- [ ] No `file(GLOB …)` for sources — listed explicitly; `CMAKE_C_STANDARD` + `CMAKE_C_STANDARD_REQUIRED ON` set.
- [ ] Out-of-source builds only (`cmake -S . -B build`); `CMAKE_EXPORT_COMPILE_COMMANDS=ON`.
- [ ] Tests via `enable_testing()` / `include(CTest)` + `add_test()`; CI runs `ctest --output-on-failure`.

## Testing

- [ ] Unit tests in Unity (+ CMock) or cmocka; each suite its own executable, registered with ctest, run in CI.
- [ ] Test binaries also build with `-fsanitize=address,undefined` in CI — zero sanitizer reports.
- [ ] Line/branch coverage measured (gcov/lcov) with a documented target; fuzz targets (libFuzzer) for anything parsing untrusted input.

## Style

- [ ] `.clang-format` checked in at repo root; `clang-format --dry-run --Werror` enforced in CI.
- [ ] Braces on every `if`/`for`/`while` body, even one-liners; consistent naming (`snake_case` functions/variables, `ALL_CAPS` macros).

## Sources

- https://github.com/owasp/cheatsheetseries/blob/HEAD/cheatsheets/C-Based_Toolchain_Hardening_Cheat_Sheet.md
- http://releases.llvm.org/17.0.1/tools/clang/docs/AddressSanitizer.html
- https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/
