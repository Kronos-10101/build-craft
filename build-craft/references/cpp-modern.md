# Modern C++ — production checklist

How to write better C++17/20/23/26: ownership, move semantics, sum types, concepts, ranges, coroutines, and low-level optimization. Complements `c-language.md` (tooling); this file is C++-specific. Checked 2026-09-30.

## RAII & smart pointers

- [ ] Every resource (memory, file, socket, lock, handle) is owned by an object whose destructor releases it; no manual cleanup on any path (Core Guidelines R.1).
- [ ] No bare `new`/`delete` in application code — `std::make_unique`/`std::make_shared` everywhere (R.11).
- [ ] `unique_ptr` is the default owner; `shared_ptr` only for genuinely shared ownership; `weak_ptr` breaks cycles (R.20, R.21, R.24).
- [ ] Raw `T*`/`T&` means non-owning observer; never transfer ownership through a raw pointer (I.11); functions that merely *use* an object take `T&`/`const T&`, not smart pointers (F.7).
- [ ] Rule of Zero by default: if you write any of destructor/copy/move, review all five (Rule of Five); prefer members that manage themselves.
- [ ] Non-memory resources wrapped once (custom deleter or small RAII class), e.g. `unique_ptr<FILE, decltype(&fclose)>`.

## Const-correctness & move semantics

- [ ] `const` on every variable/parameter/member function that doesn't mutate; prefer `constexpr` for compile-time-computable values.
- [ ] Understand the three value categories: lvalue (named, has address), xvalue (expiring, e.g. `std::move(x)`), prvalue (temporary); rvalue references bind to xvalues/prvalues only.
- [ ] Move constructor/assignment are `noexcept` so containers actually move instead of copying on reallocation.
- [ ] Sink parameters by value then `std::move` (`void set(std::string s) { s_ = std::move(s); }`); never `std::move` a `const` object (silently copies).
- [ ] Small trivially-copyable types (≤16 bytes: `string_view`, `span`, pairs) passed by value, not `const&` — avoids pointer indirection.

## Sum types: `optional`, `variant`, `expected`

- [ ] Nullable single values use `std::optional<T>` — never sentinel values (`-1`, `""`) or out-params; check `.has_value()`/`.value_or()` before `.value()`.
- [ ] Closed type alternatives use `std::variant<Ts...>` with `std::visit` — never a `void*` or tagged `enum` + `union` hand-rolled.
- [ ] Recoverable errors use `std::expected<T, E>` (C++23) with `[[unlikely]]` on the error branch — no exceptions for control flow, no error codes ignored silently.
- [ ] `std::optional<T&>` (C++26) replaces the `T*`-or-nullptr idiom where a reseatable non-owning reference is needed.

## Concepts & ranges

- [ ] Template parameters constrained with concepts (`template<std::integral T>`) instead of bare `typename T` — errors at the call site, not 200 lines deep.
- [ ] Define a concept when the same constraint repeats ≥3 times; use standard concepts (`std::ranges::range`, `std::convertible_to`) before inventing new ones.
- [ ] Algorithms over raw loops: `std::ranges::sort/filter/transform` with views (`views::filter | views::transform`) — lazy, composable, no intermediate containers.
- [ ] Never name the iterator pair when a range overload exists; prefer `ranges::to<std::vector>()` (C++23) over manual `push_back` loops.

## Coroutines — when to actually use them

- [ ] C++20 coroutines are a stackless, library-customizable primitive: consuming is easy, authoring a custom promise type is not — prefer a library type.
- [ ] Use coroutines for: lazy generators (`std::generator`, C++23), high-concurrency async I/O (thousands of connections, e.g. with Asio), state machines / parsers.
- [ ] Do NOT use coroutines for: simple parallelism (use `std::thread`/thread pool), a handful of async ops (futures/callbacks are simpler), CPU-bound work (coroutines don't add threads).
- [ ] Remember: C++20 ships no executor and no `task<T>` — you need a library (Asio, cppcoro) or C++26 `std::execution`; budget the dependency.
- [ ] Keep the async surface behind your own `task<T>` alias so a future move to `std::execution` senders doesn't touch call sites.

## Modules (adopt cautiously)

- [ ] Default stays headers + `#pragma once` — modules are real but low-adoption six years on; don't present them as the default idiom (checked 2026-09-30).
- [ ] Consider modules only for isolated, heavy-to-parse internal libraries where you control the whole build (CMake 4.x + Ninja + one compiler).
- [ ] Never mix `import std;` and `#include` of std headers in one translation unit — redeclaration pain; it's all-or-nothing per project.

## Low-level optimization

- [ ] `perf` (or VTune) profile BEFORE optimizing: `perf record -g` + flame graph for hot functions, `perf stat -e cache-misses,branch-misses` for the why.
- [ ] Data-oriented layout: struct-of-arrays over array-of-structs when loops touch a subset of fields; sequential access for prefetcher friendliness.
- [ ] False sharing killed: per-thread write targets padded to `std::hardware_destructive_interference_size` (C++17, typically 64B); reads never cause it, only writes.
- [ ] Hot paths allocation-free: pre-allocate (`reserve`, arenas/pools) at init; no `new`/`make_unique`/unreserved `push_back` inside the loop.
- [ ] Skewed branches hinted `[[likely]]`/`[[unlikely]]` (C++20); unpredictable branches in hot loops replaced with branchless math/cmov.
- [ ] SIMD: write simple loops the compiler can auto-vectorize (contiguous, no aliasing — `__restrict__` where proven) before hand-writing intrinsics; check the generated assembly.
- [ ] C++26 notes (experiment, don't ship): static reflection (`^^`), contracts (`pre`/`post`), `std::execution` senders — GCC 16.1 only; hardened stdlib bounds-checking worth enabling in debug.

## Sources

- https://github.com/black141312/ada/blob/HEAD/skills/cpp-raii/SKILL.md
- https://github.com/photostructure/coding-skills/blob/HEAD/plugins/cpp/skills/project-setup/references/modern-cpp-conventions.md
- https://github.com/kiefbc/dotfiles/blob/HEAD/claude/.claude/skills/cpp-idioms/references/ecosystem.md
- https://github.com/andersonniprus/cpp-advanced-skill/blob/HEAD/references/10_performance_and_dod.md
- https://github.com/randalburns/pppe26-public/blob/HEAD/examples/false_sharing/false_sharing.md
- https://github.com/cppalliance/capy/blob/HEAD/doc/reference/coro-tutorial.md
- https://en.wikipedia.org/wiki/C%2B%2B26
