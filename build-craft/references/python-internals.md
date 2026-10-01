# Python Internals — how CPython runs and how to optimize it

How CPython actually executes code — eval loop, specialization, the GIL, free threading, the JIT, subinterpreters, GC — and the disciplined order for making it faster. Complements `references/python.md` (style/tooling). Checked 2026-09-30.

## The eval loop & specialization (PEP 659)

- [ ] You can name the pipeline: source → AST → bytecode (`dis.dis(f)`) → the CPython eval loop executing one adaptive instruction at a time.
- [ ] Adaptive instructions quicken and specialize at runtime (`LOAD_ATTR`/`LOAD_GLOBAL`/`CALL` families with inline caches) — 10–60% on attribute-heavy code; specialization is on by default in GIL builds.
- [ ] Know the core rule: every Python-level operation is interpreter dispatch overhead — the win is doing *less* Python, not faster Python.
- [ ] `PYTHON_JIT=0/1` forces the experimental JIT off/on at interpreter startup (3.13+).

## The GIL: what it blocks

- [ ] The GIL is a per-process mutex: only one thread executes Python bytecode at a time; the switch interval is 5 ms (`sys.getswitchinterval()` returns `0.005`); the GIL releases around I/O.
- [ ] CPU-bound pure-Python threads do NOT parallelize on GIL builds — they interleave; `threading` is for I/O concurrency and GIL-releasing native code only.
- [ ] Parallelism advice always states its interpreter assumption: "on GIL builds (the default), use multiprocessing for CPU-bound work."

## Free-threaded Python (PEP 779)

- [ ] 3.14 declares free threading officially supported (not experimental) — but it remains opt-in via a separate `python3.14t` build, not the default interpreter.
- [ ] Cost model: ~5–10% single-thread overhead and ~15–20% higher memory on free-threaded builds; specialization (PEP 659) is enabled in 3.14t (it was disabled in 3.13t).
- [ ] Biased refcounting: each object's owning thread uses fast non-atomic INCREF/DECREF, other threads use atomics; immortal objects (PEP 683, 3.12+) skip refcounting entirely (`sys._is_immortal` added in 3.14).
- [ ] C extensions opt in via the `Py_mod_gil` slot returning `Py_MOD_GIL_NOT_USED` (multi-phase init) or `PyUnstable_Module_SetGIL` (single-phase); importing a non-declaring module re-enables the GIL process-wide with a `RuntimeWarning`.
- [ ] Escape hatches exist: `-X gil` / `PYTHON_GIL=0` re-enable the GIL inside a free-threaded build.
- [ ] The JIT does NOT work on free-threaded builds (true in 3.14; JIT+free-threading is a 3.16/3.17 roadmap goal per PEP 836).
- [ ] Production posture: test your suite on the `3.14t` build now, but don't deploy free-threaded to production yet and don't restructure assuming the GIL is gone — code that was "accidentally thread-safe" under the GIL now races; every shared-mutable structure gets real locks.
- [ ] Building for free-threaded: C extensions compile against the `t` ABI and declare GIL-independence (the `Py_mod_gil` slot or `PyUnstable_Module_SetGIL` above); build the extension's test matrix against both `python3.14` and `python3.14t`, and run the threaded stress tests under ThreadSanitizer where a TSan-instrumented interpreter is available (checked 2026-10-01).
- [ ] Profiling free-threaded CPU code: use thread-aware samplers (py-spy thread mode, `perf`, or Tachyon's gil mode in 3.15) — never cProfile, whose per-thread overhead misleads; measure scaling against the GIL-build baseline and profile per-thread hotspots, not just process totals.

## The JIT (PEP 744, copy-and-patch)

- [ ] 3.13: experimental, off by default, opt-in build flag; 3.14: ships in the official macOS/Windows binaries, enabled with `PYTHON_JIT=1`; observed impact ranges from −10% to +20%.
- [ ] `sys._jit.is_available()` / `is_enabled()` introspect it (3.14); in 3.14 native debuggers cannot unwind JIT frames.
- [ ] 3.15 (rc2, 2026-09-30): upgraded with an LLVM build-time dependency, a recording tracer, and basic register allocation — ~8–9% geo-mean on x86-64 Linux, ~12–13% on AArch64 macOS; still experimental and off by default; PEP 836 targets a ≥5% floor in 3.16.
- [ ] Rule: never promise JIT speedups — measure `PYTHON_JIT=1` vs `0` on your own workload.

## Subinterpreters (PEP 734)

- [ ] 3.14 adds `concurrent.interpreters` to the stdlib with an actor/CSP-style API, plus `InterpreterPoolExecutor` in `concurrent.futures`.
- [ ] Each subinterpreter has had its own GIL since 3.12 (PEP 684) — true multi-core parallelism without processes.
- [ ] Data crosses interpreters via pickle (immutables shared efficiently); only `memoryview` and `Queue` share mutable data; it is NOT a security sandbox; limits are startup cost, memory, and sparse multi-interpreter-safe extension support.
- [ ] Gotcha: 3.14 changed the default multiprocessing start method on Unix from `fork` to `forkserver` — libraries relying on fork-inherited state break; port or pin the start method explicitly.

## GC & allocators

- [ ] 3.14 shipped a new incremental GC (3.14.0–3.14.4) and then REVERTED it in 3.14.5 after production memory-pressure reports, restoring the 3.13 generational GC — GC behavior differs *within* the 3.14 line, so know your patch version.
- [ ] mimalloc (added 3.13) is the default and required allocator for free-threaded builds (per-thread heaps, mostly lock-free); optional in GIL builds via `PYTHONMALLOC=mimalloc`.
- [ ] Immortal objects (PEP 683): static constants (e.g. interned strings, small ints) skip INCREF/DECREF entirely.

## sys.monitoring (PEP 669)

- [ ] `sys.monitoring` (3.12+) is a namespace on `sys`, not an importable module; tools get per-code-object event control (`CALL`, `LINE`, `BRANCH_LEFT`/`BRANCH_RIGHT`, …) with `DISABLE` for near-zero overhead — a debugger runs free except at instrumented points.
- [ ] 3.14: pdb/bdb gained `sys.monitoring` backends (used by default); PEP 768 adds a safe zero-overhead external-debugger attach interface (`sys.remote_exec`).

## Profile before optimizing

- [ ] A profile artifact exists before any optimization: no guessing, no "it feels slow".
- [ ] `python -m cProfile -s cumulative` in dev (deterministic, exact call counts — trust relative rankings, not absolute percentages).
- [ ] `py-spy record -o flame.svg` on live PIDs (sampling, near-zero overhead; `--nonblocking` for latency-sensitive services) — never `cProfile` a live service.
- [ ] `line_profiler` (`kernprof`) only after the hot *function* is known, to find the hot *line*; memory growth via `tracemalloc` snapshots; `@lru_cache` always has a `maxsize` on long-lived processes.
- [ ] 3.15 (rc2): a new `profiling` package makes `cProfile` an alias and deprecates `profile` (removal in 3.17); adds Tachyon, a sampling profiler up to 1 MHz with wall/cpu/gil modes.

## Algorithmic wins first

- [ ] Big-O reviewed before any micro-optimization: an O(n²)→O(n) fix beats any interpreter trick by orders of magnitude.
- [ ] Hot loops pushed into C: vectorize with NumPy/pandas ops instead of Python `for` loops; `iterrows()` replaced with column ops.
- [ ] Lookup structures correct: `set`/`dict` for membership (O(1)), not list scans; repeated work memoized or precomputed.
- [ ] I/O batched: one bulk query/insert instead of N round trips — the network/DB is usually the bottleneck, not the eval loop.

## Faster runtimes & native extensions

- [ ] **PyPy** 7.3.23 (PyPy3.11): evaluated for long-running pure-Python CPU workloads (JIT, often 2–10×) — rejected when C-extension compat or warmup time rules it out; there is no free-threaded PyPy build.
- [ ] **GraalPy** 25.x (tracks Python 3.12, JVM-based, native-image capable): niche — install via `uv python install graalpy-3.12` for evaluation only.
- [ ] **Mojo** 1.0 (Aug 2026, Apache-2.0): no longer a Python superset — gaining speed requires rewriting in `fn` style; Linux/macOS only.
- [ ] **Numba** (`@numba.njit`) picked for numeric hot loops on NumPy arrays — near-C speed, no rewrite; types must be stable or it falls back to object mode.
- [ ] **Cython** picked when you need C-level control, GIL release (`nogil`), or to wrap C libraries; `.pyx` compiled in CI, not committed as generated C; Cython 3.1.0 adds a `freethreading_compatible` directive.
- [ ] **mypyc** picked to speed up already-type-annotated Python by compiling it — cheapest path when the codebase is fully typed.
- [ ] Rule: profile → algorithmic fix → vectorize → Numba/Cython — never start at Cython.

## Concurrency model choice

- [ ] I/O-bound, thousands of connections → `asyncio` (one thread, no GIL contention, no IPC overhead); blocking calls wrapped with `run_in_executor`; 3.14 gives asyncio first-class free-threading support (parallel event loops scaling across cores).
- [ ] I/O-bound, simple fan-out → `ThreadPoolExecutor`; CPU-bound → `ProcessPoolExecutor` with picklable top-level functions, or subinterpreters on 3.14+.
- [ ] Shared state between processes via explicit channels (queues/pipes/shared memory), never ad-hoc globals; `multiprocessing` spawn cost budgeted at startup, not per request.

## Zero-copy & serialization

- [ ] `memoryview`/`bytes`/`bytearray` for binary parsing — no `bytes(x)` copies in the hot path.
- [ ] Pickle protocol 5 (PEP 574) out-of-band data: `PickleBuffer` + `buffer_callback`/`buffers` let NumPy arrays serialize with zero copies (default in-band use still copies).
- [ ] High-throughput socket I/O: pre-allocate one `bytearray` and `sock.recv_into(buf)` (or a `memoryview` slice over it) per read; parse frames with `memoryview` slices and `struct.unpack_from` — never `bytes()` per packet or per-frame slicing in the hot loop, or buffer copies dominate CPU.

## Micro-optimizations (only after profiling)

- [ ] `__slots__` on classes with millions of instances — kills per-instance `__dict__`; skipped when dynamic attributes are needed.
- [ ] String building: `''.join(chunks)` over `+=` in loops; f-strings over `%`/`.format`; regexes precompiled at module level.
- [ ] Attribute/method lookup hoisted out of loops (`append = lst.append`); module-level constants, not recomputed literals.

## Startup & import time

- [ ] `python -X importtime` attributes startup cost — heavy imports moved lazy or behind the CLI subcommand that needs them (torch/TF imported inside the function that needs them).
- [ ] 3.15 (rc2): PEP 810 adds explicit lazy imports (`lazy import` syntax, `-X lazy_imports` / `PYTHON_LAZY_IMPORTS`, `sys.set_lazy_imports`).

## Sources

- https://peps.python.org/pep-0779/
- https://peps.python.org/pep-0744/
- https://peps.python.org/pep-0836/
- https://peps.python.org/pep-0659/
- https://docs.python.org/3.14/whatsnew/3.14.html
- https://docs.python.org/3.15/whatsnew/3.15.html
- https://docs.python.org/3.14/library/concurrent.interpreters.html
- https://docs.python.org/3.14/library/sys.monitoring.html
- https://en.wikipedia.org/wiki/Global_interpreter_lock
- https://en.wikipedia.org/wiki/Mojo_(programming_language)
- https://github.com/quansight-labs/free-threaded-compatibility/blob/HEAD/docs/porting-extensions.md
