# Python — production checklist

Covers style, typing, errors, logging, testing, packaging, security, and performance for production Python.

## Style (PEP 8 / PEP 257 / ruff)

- [ ] `ruff check` passes with zero findings (per-file ignores justified in `pyproject.toml`).
- [ ] `ruff format --check` passes; formatter config lives in `pyproject.toml`.
- [ ] Imports sorted stdlib → third-party → first-party; one import per line; no `import *`; absolute over relative.
- [ ] Naming: `snake_case` functions/variables/modules, `PascalCase` classes, `UPPER_SNAKE_CASE` constants; no `l`/`O`/`I` single-char names.
- [ ] Line length ≤ 88; two blank lines between top-level defs, one between methods; files end with newline.
- [ ] Public modules/classes/functions have docstrings (triple-double-quotes, imperative one-line summary, args/returns/raises documented).
- [ ] Lint rules beyond E/F enabled: at minimum `I` (isort), `UP` (pyupgrade), `B` (flake8-bugbear); CI fails on violations.
- [ ] No `TODO`/`FIXME` without a tracked ticket reference; no commented-out code.

## Typing (mypy strict)

- [ ] `mypy --strict` passes with zero errors; every `type: ignore` carries a specific error code.
- [ ] All signatures fully annotated (params + returns); modern syntax `list[str]`, `X | None`.
- [ ] `warn_unused_ignores = true` and `no_implicit_optional = true` enabled.
- [ ] No `Any` leaking from untyped third-party deps without a documented reason.

## Error handling

- [ ] No bare `except:` and no blanket `except Exception:` swallowing; catch the narrowest type.
- [ ] Every `except` re-raises, raises a domain error, or logs — never `except: pass`.
- [ ] `raise NewError(...) from exc` when translating errors; bare `raise` for plain re-raise.
- [ ] Domain exceptions derive from a project-level base (e.g. `AppError(Exception)`), never `BaseException`.
- [ ] Resource cleanup via `with` context managers; no mutable default arguments (`def f(x=[])` banned).

## Logging

- [ ] No `print()` in app/library code — `logging` only.
- [ ] One module-level logger per file (`logging.getLogger(__name__)`); handlers configured once at the entry point.
- [ ] Lazy `%`-style formatting in log calls, never f-strings.
- [ ] Correct levels (DEBUG/INFO/WARNING/ERROR/CRITICAL); no INFO spam in hot loops.
- [ ] Never log secrets/PII; security events (auth success/failure, validation rejections) logged with actor + correlation ID.

## Testing (pytest)

- [ ] Tests in `tests/` mirroring `src/`; suite green in CI with `pytest --cov=<pkg> --cov-branch --cov-fail-under=80`.
- [ ] Coverage ≥ 80% line + branch; critical paths (auth, money) at 100%.
- [ ] Fixtures for setup, `parametrize` for cases, `pytest.raises` for errors; descriptive names; assert behavior, not internals.
- [ ] No test depends on external services (mock network/DB); tests isolated and order-independent.
- [ ] Slow/integration tests marked (`@pytest.mark.slow`) so unit tests run separately.

## Packaging

- [ ] `pyproject.toml` is the single config source (`[build-system]` + PEP 621 `[project]`); no `setup.py`-as-metadata.
- [ ] `src/` layout (`src/<pkg>/`); `requires-python` declared; CI tests against it.
- [ ] Version defined once; entry points via `[project.scripts]`; dev uses a virtualenv, never system Python.

## Security

- [ ] No `pickle.loads` / `yaml.load` (without `safe_load`) on untrusted input; no `eval`/`exec` on external input.
- [ ] `subprocess` with arg lists and `shell=False`; no f-string SQL — parameterized queries or ORM only.
- [ ] Secrets from env/secret manager only; `gitleaks` in CI; tokens via `secrets`, passwords hashed with bcrypt/argon2.
- [ ] `Path.resolve()` + `is_relative_to(base)` for file paths; no `verify=False` on outbound TLS; `pip-audit` in CI on locked deps.

## Performance basics

- [ ] Profile before optimizing (cProfile / py-spy); no speculative micro-optimization.
- [ ] `set`/`dict` for membership tests, comprehensions over append-loops, generators for large data, `lru_cache` for repeated pure calls, `"".join()` for string building.
- [ ] Async code never blocks the event loop (no `time.sleep`/`requests` inside `async def`).

## Audit recipe

```bash
ruff check . && ruff format --check .
mypy --strict src/
pytest --cov=pkg --cov-branch --cov-fail-under=80 -m "not slow"
pip-audit
bandit -r src/
gitleaks detect --source .
grep -rnE "except:|print\(|pickle\.loads?|eval\(|exec\(|shell=True|verify=False" src/
```

## Sources

- https://peps.python.org/pep-0008/ · https://peps.python.org/pep-0257/ · https://peps.python.org/pep-0621/
- https://docs.astral.sh/ruff/ · https://mypy.readthedocs.io/
- https://docs.pytest.org/ · https://cheatsheetseries.owasp.org/
- https://packaging.python.org/
