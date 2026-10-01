# Modern C++ — production checklist

How to write better C++17/20/23/26: check the toolchain first, then ownership, move semantics, sum types, error handling, concepts, ranges, coroutines, concurrency, and low-level optimization. Complements `c-language.md` (C + toolchain). Checked 2026-09-30.

## Check the toolchain before suggesting features

Many machines do not have C++23/C++26-capable compilers. Never recommend a feature the user's toolchain cannot compile.

- [ ] First, check what is installed: `g++ --version`, `clang++ --version`, and the MSVC version (`cl` / Visual Studio Installer) — before recommending any post-C++17 feature.
- [ ] Map version to *real* support with feature-test macros (`__cpp_lib_format`, `__cpp_lib_expected`, `__cpp_lib_generator`, …) and the cppreference compiler-support tables — never assume a feature from the `-std=` flag alone; partial/buggy implementations are common.
- [ ] Gate every modern feature on its macro or a configure-time check; provide a fallback path (e.g. fmt when `__cpp_lib_format` is absent) rather than failing the build.
- [ ] When the toolchain is too old, judge whether an upgrade is actually necessary for the task at hand — C++17 plus a few libraries covers most work; don't demand GCC 16 for a CRUD service.
- [ ] Concrete upgrade paths: Debian/Ubuntu (`apt install g++-N`, ubuntu-toolchain-r PPA for newer), macOS (Xcode Command Line Tools, or `brew install llvm` for a newer Clang), Windows (Visual Studio Installer → MSVC v14x / Build Tools); manage parallel toolchains with `update-alternatives`, `mise`, or CMake's `CMAKE_CXX_COMPILER`.
- [ ] In CI, pin the exact compiler version and test the oldest standard/floor you claim to support.

## C++26 reality (shipped 2026-03-28, working draft N5046)

- [ ] Contracts (P2900 `pre`/`post`): GCC 16 only — Clang and MSVC have no support (checked 2026-09-30); don't design portable code around contracts yet.
- [ ] Static reflection (`^^` operator, `std::meta::info`, `[::]` splicing): GCC 16, partial — experiment, don't ship.
- [ ] `#embed` (GCC 15, Clang 19), pack indexing (GCC 15, Clang 19), `_` placeholder (GCC 14, Clang 18), `[[indeterminate]]` / erroneous (not UB) uninitialized reads (GCC 16) — macro-gate each one.
- [ ] Deferred or removed: trivial relocatability was pulled from C++26 (implementation bugs); `std::memory_order::consume` and `std::kill_dependency` are deprecated (use acquire); pattern matching (`inspect`) missed C++26 as well.
- [ ] `std::execution` senders (P2300): no mainstream standard-library implementation exists — use the stdexec reference library or wait; `std::execution::task<T>` was approved for C++26.

## What's broadly safe (C++23, compiler reality as of 2026-09-30)

- [ ] `std::expected` + monadic ops (`.and_then` / `.transform` / `.or_else`): GCC 13, Clang 17, MSVC 19.36 — safe to use broadly.
- [ ] `std::print`/`std::println`: GCC 14, Clang 17–18, MSVC 19.37 — prefer over iostreams for new code; gate `std::format` on `__cpp_lib_format` (GCC 13+, Clang 17+), else use fmt.
- [ ] `std::mdspan`: GCC 16, Clang 17–18, MSVC 19.39 — only just landed in libstdc++; verify your standard library before using.
- [ ] `<flat_map>`/`<flat_set>`: GCC 15, Clang 20, MSVC 19.51 — universal only recently; prefer over node-based maps for small, cache-friendly tables.
- [ ] `std::generator` (C++23): GCC 14, MSVC 19.43 — Clang/libc++ still lagging; don't use in Clang-targeted code.
- [ ] `<rcu>` / `<hazard_pointer>`: no implementation anywhere yet — don't suggest them.
- [ ] `[[assume]]` (GCC 13, Clang 19, MSVC 19.51), `std::unreachable`, `std::byteswap`, `std::start_lifetime_as` (C++23 — Clang lagging): each macro-gated.

## RAII & smart pointers

- [ ] Every resource (memory, file, socket, lock, handle) is owned by an object whose destructor releases it; no manual cleanup on any path (Core Guidelines R.1).
- [ ] No bare `new`/`delete` in application code — `std::make_unique`/`std::make_shared` everywhere (R.11).
- [ ] `unique_ptr` is the default owner; `shared_ptr` only for genuinely shared ownership; `weak_ptr` breaks cycles (R.20, R.21, R.24).
- [ ] Raw `T*`/`T&` means non-owning observer; never transfer ownership through a raw pointer (I.11); functions that merely *use* an object take `T&`/`const T&`, not smart pointers (F.7).
- [ ] Rule of Zero by default: if you write any of destructor/copy/move, review all five (Rule of Five); prefer members that manage themselves.
- [ ] Non-memory resources wrapped once (custom deleter or small RAII class), e.g. `unique_ptr<FILE, decltype(&fclose)>`.

## Const-correctness & move semantics

- [ ] `const` on every variable/parameter/member function that doesn't mutate; `constexpr` (and `consteval`/`constinit` where the guarantee matters) for compile-time-computable values.
- [ ] Understand the three value categories: lvalue (named, has address), xvalue (expiring, e.g. `std::move(x)`), prvalue (temporary); rvalue references bind to xvalues/prvalues only.
- [ ] Move constructor/assignment are `noexcept` so containers actually move instead of copying on reallocation.
- [ ] Sink parameters by value then `std::move` (`void set(std::string s) { s_ = std::move(s); }`); never `std::move` a `const` object (silently copies).
- [ ] Small trivially-copyable types (≤16 bytes: `string_view`, `span`, pairs) passed by value, not `const&` — avoids pointer indirection.

## Sum types: `optional`, `variant`, `expected`

- [ ] Nullable single values use `std::optional<T>` — never sentinel values (`-1`, `""`) or out-params; check `.has_value()`/`.value_or()` before `.value()`.
- [ ] Closed type alternatives use `std::variant<Ts...>` with `std::visit` — never a `void*` or hand-rolled tagged `enum` + `union`.
- [ ] Recoverable errors use `std::expected<T, E>` with `[[unlikely]]` on the error branch — monadic chaining over manual checks; no exceptions for control flow, no error codes ignored silently.
- [ ] `std::optional<T&>` (C++26) replaces the `T*`-or-nullptr idiom where a reseatable non-owning reference is needed.

## Exceptions: when, and what they cost

- [ ] Default per Core Guidelines E.2: throw when a function can't perform its task — exceptions for constructors/operators, deep call chains, and genuinely rare failures (<0.1%).
- [ ] Prefer `std::expected<T, E>` when failure is routine/expected, the caller must know *why* it failed, the codebase is exception-free, or the failure path is hot; `std::optional<T>` for plain absence.
- [ ] Cost model: zero runtime cost on the happy path (metadata in side tables), but ~1000ns per throw/catch (~100× slower than a return) plus binary bloat from always-present unwind tables — exceptions are for the rare path only.
- [ ] `noexcept` where a function cannot or must not throw (E.12); never dynamic exception specifications; never `throw 42` — typed hierarchies, throw by value, catch by reference (E.14/E.15).

## Concepts & ranges

- [ ] Template parameters constrained with concepts (`template<std::integral T>`) instead of bare `typename T` — errors at the call site, not 200 lines deep.
- [ ] Define a concept when the same constraint repeats ≥3 times; use standard concepts (`std::ranges::range`, `std::convertible_to`) before inventing new ones.
- [ ] Debug constraint failures at the point of use, not 200 lines deep: put explicit `requires` clauses on the template and add a `static_assert` with a plain-language message naming the failed requirement — raw concept-failure spew is unactionable; named concepts make the failed constraint readable in diagnostics (checked 2026-10-01).
- [ ] Prefer constrained abbreviations (`template<std::integral T>`) over trailing `requires` when the constraint is simple; use the full `requires` clause when the failure message needs to name the specific property (`requires { { t.size() } -> std::convertible_to<std::size_t>; }`).
- [ ] Algorithms over raw loops: `std::ranges::sort/filter/transform` with views (`views::filter | views::transform`) — lazy, composable, no intermediate containers.
- [ ] Never name the iterator pair when a range overload exists; prefer `ranges::to<std::vector>()` (C++23) over manual `push_back` loops.

## Coroutines — when to actually use them

- [ ] C++20 coroutines are a stackless, library-customizable primitive: consuming is easy, authoring a custom promise type is not — prefer a library type.
- [ ] Use coroutines for: lazy generators (`std::generator`, C++23 — mind the Clang gap above), high-concurrency async I/O (thousands of connections, e.g. with Asio), state machines / parsers.
- [ ] Do NOT use coroutines for: simple parallelism (use `std::thread`/thread pool), a handful of async ops (futures/callbacks are simpler), CPU-bound work (coroutines don't add threads).
- [ ] Remember: no standard executor and no `std::task` until C++26 — you need a library (Asio, cppcoro, stdexec) today; budget the dependency.
- [ ] Keep the async surface behind your own `task<T>` alias so a future move to `std::execution` senders is mechanical, not a rewrite.

## Modules (adopt cautiously)

- [ ] Default stays headers + `#pragma once` — modules are real but adoption is still low; don't present them as the default idiom (checked 2026-09-30).
- [ ] `import std;` support: GCC 15+, Clang 18+, MSVC 19.5+; CMake 4.5 module scanning works only with Ninja generators; header units are unsupported anywhere.
- [ ] Consider modules only for isolated, heavy-to-parse internal libraries where you control the compiler and generator end to end.
- [ ] Never mix `import std;` and `#include` of std headers in one translation unit — all-or-nothing per project.

## Concurrency

- [ ] Default to `memory_order_seq_cst` atomics — relax to acquire/release only deliberately and with a comment (CP.100/CP.101); `consume` is deprecated.
- [ ] Approved double-checked-locking tuning is acquire-load first, relaxed-load inside the lock, release-store on write — but don't hand-roll it: use thread-safe static locals or `std::call_once` (CP.110).
- [ ] `volatile` has nothing to do with synchronization — it belongs only at hardware/non-C++ memory boundaries (CP.200).
- [ ] C++20 `atomic::wait`/`notify`, `counting_semaphore`, `latch`, `barrier`: universally available (GCC 11, Clang 11, MSVC 19.28) — prefer over condition-variable boilerplate.
- [ ] False sharing killed: `alignas(std::hardware_destructive_interference_size)` (`<new>`, C++17 — typically 64B on x86-64, implementation-defined) on contended atomics; reads never cause it, only writes.

## Low-level optimization

- [ ] `perf` (or VTune) profile BEFORE optimizing: `perf record -g` + flame graph for hot functions, `perf stat -e cache-misses,branch-misses` for the why.
- [ ] Data-oriented layout: struct-of-arrays over array-of-structs when loops touch a subset of fields; sequential access for prefetcher friendliness.
- [ ] Hot paths allocation-free: pre-allocate (`reserve`, arenas/pools) at init; no `new`/`make_unique`/unreserved `push_back` inside the loop.
- [ ] Skewed branches hinted `[[likely]]`/`[[unlikely]]` (C++20); `[[assume]]` (C++23) where you've proven the invariant; unpredictable branches in hot loops replaced with branchless math/cmov.
- [ ] SIMD: write simple loops the compiler can auto-vectorize (countable trip count, no early exits or calls in the body, stride-1 contiguous access, no aliasing — `__restrict__` where proven, aligned data via `std::assume_aligned`/`aligned_alloc`) before hand-writing intrinsics; `#pragma omp simd` when the compiler hesitates, loop-unroll pragmas only after measuring; confirm vectorization with `-fopt-info-vec-missed` and check the generated assembly.
- [ ] `std::bit_cast` over `memcpy` punning; `std::byteswap` (C++23) over hand-rolled byte swaps.

## Views & formatting pitfalls

- [ ] `std::string_view` is a read-only view, `std::span` a read/write view (SL.str.2/SL.str.11) — never store a view past its owner's lifetime; never return a view to a local.
- [ ] `std::format`/`std::print` over iostreams for new code; fall back to fmt when `__cpp_lib_format` is absent.

## Tooling: sanitizers, clang-tidy, packages, SBOM

- [ ] Sanitizers: ASan+UBSan in one build (`-fsanitize=address,undefined -fno-sanitize-recover=all`); TSan in a SEPARATE build — ASan/TSan, ASan/MSan, and TSan/MSan are mutually incompatible pairs; MSan is Clang-only and needs a fully-instrumented build; LSan rides with ASan. Typical overheads: ASan ~2×, UBSan ~1.1×, TSan 5–15×.
- [ ] clang-tidy enabled: `cppcoreguidelines-*`, `bugprone-*`, `cert-*`, `concurrency-*`, `modernize-*`, `performance-*`, `portability-*`, `clang-analyzer-*`; every `NOLINT` names the check with a justification.
- [ ] One package manager per project: Conan 2.x by default (profiles, lockfiles, cross-compilation, CI ergonomics); vcpkg for Windows/Microsoft-first shops — always manifest mode (`vcpkg.json`), binary caching on (`VCPKG_BINARY_SOURCES`), never commit `vcpkg_installed/`.
- [ ] Supply chain: SBOM (CycloneDX/SPDX) emitted on every build; CVE feeds (NIST NVD + GitHub Advisory) gated in CI (e.g. grype `--fail-on critical`).

## Sources

- https://en.cppreference.com/w/cpp/compiler_support
- https://en.cppreference.com/cpp/thread/hardware_destructive_interference_size
- https://en.wikipedia.org/wiki/C%2B%2B26
- https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
- https://github.com/cppalliance/wg21-papers/blob/HEAD/source/cpp26-task.md
- https://github.com/mpusz/mp-units/blob/HEAD/docs/getting_started/cpp_compiler_support.md
- https://github.com/x-ecutionner/cmake/blob/HEAD/Help/manual/cmake-cxxmodules.7.rst
- https://wrocpp.github.io/toolset/cpp-supply-chain-2026/
