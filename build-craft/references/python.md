# Python — production checklist

Covers style, typing, environments, packaging, errors, logging, testing, HTTP/async, security, and performance basics for production Python. Complements `references/python-internals.md` (how CPython runs). Checked 2026-09-30.

## Style (ruff)

- [ ] `ruff check` passes with zero findings; config lives in `pyproject.toml`; per-file ignores justified.
- [ ] `ruff format --check` passes; `E501` ignored in favor of the formatter (88 cols default).
- [ ] Rule select at minimum: `E`, `F`, `I` (isort), `UP` (pyupgrade), `B` (bugbear), `S` (bandit security — makes standalone bandit redundant), plus `ASYNC` (blocking calls in async code), `C4` (comprehension efficiency), `SIM`, `RET`, `PTH` (pathlib), `TC` (`TYPE_CHECKING` imports), `PT` (pytest style), `EM`/`TRY` (exception hygiene), `PERF`, `RUF100` (unused `noqa`).
- [ ] `S101` (assert) ignored in tests only; every other `S` finding fixed or per-line justified.
- [ ] Naming: `snake_case` functions/variables/modules, `PascalCase` classes, `UPPER_SNAKE_CASE` constants; no `l`/`O`/`I` single-char names.
- [ ] Public modules/classes/functions have docstrings (triple-double-quotes, imperative one-line summary, args/returns/raises documented).
- [ ] No `TODO`/`FIXME` without a tracked ticket reference; no commented-out code.

## Typing

- [ ] One authoritative checker gates CI: `mypy --strict` (keeps the plugin ecosystem: Django, SQLAlchemy, pydantic) or pyright strict — zero errors; every `type: ignore` carries a specific error code; `warn_unused_ignores = true`.
- [ ] `ty` (Astral's Rust checker, 10–100× faster than mypy/pyright) piloted locally via `uvx ty check`; not the merge gate until it reaches 1.0 (still 0.0.x beta, checked 2026-09-30).
- [ ] Checker version pinned; CI runs the same version developers run locally.
- [ ] All signatures fully annotated (params + returns); modern syntax `list[str]`, `X | None`; PEP 695 `type Alias = ...` / `def f[T](...)` on 3.12+ floors (grammar — cannot be backported).
- [ ] On 3.14+: deferred annotation evaluation is the language default — `from __future__ import annotations` no longer needed; libraries read annotations via `annotationlib`, never `__annotations__` directly.
- [ ] `typing_extensions` declared as a runtime dependency when supporting <3.12 (`Self`, `override`, `ReadOnly`); imported unconditionally, not version-gated.
- [ ] No `Any` leaking from untyped third-party deps without a documented reason.
- [ ] Data modeling: pydantic v2 at the trust boundary (HTTP bodies, env vars, files, LLM output — runtime validation + coercion); `@dataclass(frozen=True, slots=True)` for internal value objects; `TypedDict` for dict shapes you don't construct.

## Environments & dependencies (uv)

- [ ] uv is the default for new projects: `uv sync` installs from the lockfile, `uv run` executes in the project environment with no activation step, `uvx <tool>` runs one-shot tools (replaces pipx/npx).
- [ ] `uv.lock` committed; CI installs with `uv sync --locked` so builds are reproducible.
- [ ] Dev-only dependencies in PEP 735 `[dependency-groups]` (`uv add --dev`), not in `[project]`; one-off scripts use PEP 723 `# /// script` metadata blocks (`uv run script.py`, lockable via `uv lock --script`).
- [ ] `requires-python` declared; floor is >=3.12 in 2026 (3.10 reaches EOL October 2026); CI tests the floor and the latest.
- [ ] No system-Python installs; no unpinned `pip install <pkg>` in Dockerfiles or CI.

## Packaging

- [ ] `pyproject.toml` is the single config source (PEP 621 `[project]`); build backend is hatchling for pure-Python packages (setuptools only for C extensions); no `setup.py`-as-metadata.
- [ ] `src/` layout (`src/<pkg>/`); version defined once; entry points via `[project.scripts]`; `py.typed` marker (PEP 561) shipped for typed libraries; SPDX license expression (PEP 639).
- [ ] PEP 751 `pylock.toml` noted as the emerging interchange lockfile format; `uv.lock` stays primary for uv-managed projects.
- [ ] Releases use trusted publishing (PEP 740 OIDC via `pypa/gh-action-pypi-publish`) — no long-lived PyPI API tokens in release workflows.

## Error handling

- [ ] No bare `except:` and no blanket `except Exception:` swallowing; catch the narrowest type.
- [ ] Every `except` re-raises, raises a domain error, or logs — never `except: pass`.
- [ ] `raise NewError(...) from exc` when translating errors; bare `raise` for plain re-raise.
- [ ] Domain exceptions derive from a project-level base (e.g. `AppError(Exception)`), never `BaseException`; `except*` with exception groups where parallel failures aggregate.
- [ ] Resource cleanup via `with` context managers; no mutable default arguments (`def f(x=[])` banned).

## Logging

- [ ] Services use structlog: JSON events, `.bind()` context, `contextvars` for request/correlation IDs merged into every log line; stdlib logging bridged underneath for third-party logs.
- [ ] Scripts/CLIs: stdlib logging is fine (loguru acceptable for CLIs); one module-level logger per file (`logging.getLogger(__name__)`); handlers configured once at the entry point.
- [ ] Lazy `%`-style formatting in stdlib log calls, never f-strings.
- [ ] Correct levels (DEBUG/INFO/WARNING/ERROR/CRITICAL); no INFO spam in hot loops.
- [ ] Never log secrets/PII; security events (auth success/failure, validation rejections) logged with actor + correlation ID.

## Testing (pytest)

- [ ] Tests in `tests/` mirroring `src/`; suite green in CI with `pytest --cov=<pkg> --cov-branch --cov-fail-under=80`.
- [ ] Coverage ≥ 80% line + branch; critical paths (auth, money) at 100%.
- [ ] Fixtures for setup, `parametrize` for cases, `pytest.raises` for errors; ruff `PT` rules on; descriptive names; assert behavior, not internals.
- [ ] No test depends on external services (mock network/DB); tests isolated and order-independent.
- [ ] Slow/integration tests marked (`@pytest.mark.slow`) so unit tests run separately.

## HTTP & async

- [ ] httpx is the default HTTP client: one `AsyncClient` per application lifespan (connection pooling — never constructed per request); explicit timeouts on every call (ruff `S113` flags missing ones).
- [ ] Never call sync `requests` (or any blocking client) inside `async def` — ruff `ASYNC212` catches this; use `httpx.AsyncClient`.
- [ ] Retries via tenacity: transient failures only (timeouts, connection errors, 429/5xx); exponential backoff with jitter; `reraise=True`; honor `Retry-After`; never retry non-idempotent POSTs without idempotency keys.
- [ ] `asyncio.TaskGroup` is the default fan-out primitive — bare `create_task` needs justification; blocking calls wrapped in `run_in_executor`; ruff `ASYNC` rules enabled.

## Security

- [ ] Ruff `S` rules enabled (full bandit coverage: `S101` asserts, `S105`–`S107` hardcoded secrets, `S301`–`S323` pickle/insecure-hash/eval/SSL) — standalone bandit redundant.
- [ ] No `pickle.loads` / `yaml.load` (without `safe_load`) on untrusted input; no `eval`/`exec` on external input.
- [ ] `subprocess` with arg lists and `shell=False`; no f-string SQL — parameterized queries or ORM only; t-strings (PEP 750, 3.14+) for building SQL/HTML/shell — never f-string interpolation into them.
- [ ] Secrets from env/secret manager only; dependency vulnerabilities scanned in CI (`uv audit`, or `pip-audit` on non-uv projects); `gitleaks` in CI (ruff has no secrets-detection rules); passwords hashed with argon2/bcrypt, tokens via `secrets`.
- [ ] `Path.resolve()` + `is_relative_to(base)` for file paths; no `verify=False` on outbound TLS.

## Performance basics

- [ ] Profile before optimizing (cProfile / py-spy) — no speculative micro-optimization; the full profiling ladder is in `references/python-internals.md`.
- [ ] `set`/`dict` for membership tests, comprehensions over append-loops, generators for large data, `lru_cache` (with `maxsize`) for repeated pure calls, `"".join()` for string building.
- [ ] Hot loops pushed into C (NumPy/pandas vector ops, never Python `for` over rows); async code never blocks the event loop.

## Audit recipe

```bash
uv sync --locked
ruff check . && ruff format --check .
mypy --strict src/            # or pyright; pilot: uvx ty check
pytest --cov=pkg --cov-branch --cov-fail-under=80 -m "not slow"
uv audit                      # or pip-audit
gitleaks detect --source .
grep -rnE "except:|print\(|pickle\.loads?|eval\(|exec\(|shell=True|verify=False|[^x]requests\." src/
```

## Sources

- https://docs.astral.sh/uv/concepts/projects/dependencies/
- https://docs.astral.sh/uv/guides/scripts/
- https://docs.astral.sh/ruff/rules/
- https://docs.astral.sh/ty/
- https://peps.python.org/pep-0751/
- https://docs.python.org/3/whatsnew/3.14.html
- https://docs.python.org/3/whatsnew/3.13.html
- https://packaging.python.org/
