# Security — production checklist

Concrete checks mapped to OWASP Top 10:2025, plus auth, secrets, supply chain, TLS, headers, and least privilege.

## OWASP Top 10:2025 — concrete checks

- [ ] **A01 Broken Access Control** — deny-by-default server-side authorization on every route; object-level ownership checks on every read/update/delete (no IDOR via URL tampering); test by swapping IDs and hitting admin routes as a low-privilege user. SSRF: never fetch raw user-supplied URLs; allow-list schemes/hosts/ports; block link-local/metadata ranges (169.254.169.254, RFC1918, localhost); disable HTTP-client redirects.
- [ ] **A02 Cryptographic Failures** — HTTPS everywhere; no sensitive data in plaintext; no MD5/SHA-1/DES/RC4/static keys.
- [ ] **A05 Injection** — zero string-built SQL (parameterized queries/prepared statements/ORM bound params only); no SQL/OS/LDAP/XPath/template injection sinks on untrusted input; XSS via output encoding + CSP.
- [ ] **A06 Insecure Design** — threat model documented before code (trust boundaries, abuse cases); business-logic flows (payments, auth, quotas) carry rate limits and anomaly checks.
- [ ] **A02:2025 Security Misconfiguration** — debug/dev disabled in prod; stack traces and version headers suppressed; unnecessary services/ports removed; storage buckets not publicly writable; strict CORS (never `*` with credentials); default-deny ingress.
- [ ] **A03 Software Supply Chain Failures** — SBOM per release, SCA in CI, signed builds/provenance, pinned CI actions, Dependabot/Renovate.
- [ ] **A08 Integrity Failures** — trusted pinned CI sources; signature-verified artifacts; no `curl | sh` from unverified sources; no insecure deserialization (`pickle`, `unserialize` on untrusted data).
- [ ] **A09 Logging & Alerting Failures** — security events logged (logins, privilege changes, access-denied, validation failures) with timestamp/user/IP in tamper-protected storage **and alerted on**.
- [ ] **A10 Mishandling of Exceptional Conditions** — exceptions never expose stack traces/SQL errors/internal paths to clients; fail closed (deny) on error; resource exhaustion guarded (timeouts, size limits, connection caps).

## Auth

- [ ] **Password hashing**: Argon2id (≥19 MiB memory, iterations ≥2); fallback scrypt/bcrypt (work factor ≥10); PBKDF2 ≥600k only if FIPS-140 required. Never MD5/SHA-1/fast hashes; unique per-user salt; optional server-side pepper outside the DB.
- [ ] **Password policy (NIST SP 800-63B)**: ≥15 chars single-factor (8 if MFA); up to ≥64 allowed; **no composition rules, no forced rotation** (change only on compromise evidence); new passwords screened against breached-password blocklists; paste + Unicode allowed.
- [ ] **MFA**: TOTP and/or WebAuthn/passkeys offered; enforced for admin/privileged accounts; re-auth before sensitive actions.
- [ ] **Sessions**: cryptographically random ≥128-bit opaque IDs, never in URLs; cookies `Secure; HttpOnly; SameSite=Lax/Strict`; rotate session ID on login and privilege change; idle timeout ~15–30 min + absolute ~4–8 h; server-side invalidation on logout/password change/disablement.
- [ ] **Brute-force defenses**: rate-limit logins per IP and per account (backoff/captcha after ~5 failures); identical generic responses and timing for valid/invalid accounts (no enumeration) on login/registration/reset.
- [ ] **Reset tokens**: single-use, cryptographically random, ≤1–2 h expiry, bound to the account, invalidated on use; never logged.

## Secrets management

- [ ] **Never in git** — no keys/tokens/passwords/connection strings in code, tests, fixtures, `.env`, or CI logs. `.env*`, `*.pem`, `*.key` gitignored; only `.env.example` committed.
- [ ] Detection layers: pre-commit scanning (gitleaks/detect-secrets/trufflehog) blocking commits; CI secret-scan on every push; platform push protection enabled.
- [ ] Stored in a secrets manager (Vault, AWS Secrets Manager, etc.) or env vars — never code; local dev via OS keychain/gitignored env files.
- [ ] Rotation on schedule + immediate on suspected exposure; separate creds per environment; prefer short-lived OIDC workload identity over long-lived keys. Leaked secret → rotate first, then purge history (`git filter-repo`; `git revert` is not enough).
- [ ] No secrets in URLs, error messages, telemetry, or logs; masked in CI output; secret-store access audited.

## Supply chain / dependency scanning

- [ ] Lockfiles committed and reproducible; CI installs strictly from the lockfile.
- [ ] SCA in CI per ecosystem (`npm audit`, `pip-audit`, `cargo audit`, `govulncheck`); container images scanned (Trivy/Snyk/Grype); builds fail on Critical.
- [ ] **SBOM** (CycloneDX/SPDX) auto-generated per release (syft/cdxgen), attached as a release artifact.
- [ ] Dependabot/Renovate with grouped schedules; CVE SLA: Critical fix immediately/block deploy, High within the sprint.
- [ ] Minimize dependency count; evaluate new deps (maintenance activity, CVE history); dev vs prod deps separated.

## Input validation & output encoding

- [ ] Server-side **allowlist** validation on all untrusted input (type/length/range/format); reject rather than coerce; request size limits (HTTP 413).
- [ ] Parameterized everything; no user input in SQL/shell/LDAP/XPath/template strings; no `eval`/dynamic `exec`.
- [ ] **Context-aware output encoding** (HTML body, JS context, URL, attribute); framework auto-escaping never bypassed for user input; CSP as defense-in-depth.
- [ ] File uploads: type validated by magic bytes (not extension), size limits, stored outside webroot with randomized names, served `Content-Disposition: attachment` + `nosniff`; never executed.

## HTTPS / TLS & headers

- [ ] TLS 1.2 minimum (prefer 1.3); SSLv2/v3, TLS 1.0/1.1 disabled; ECDHE/DHE with AEAD ciphers; valid certs with automated renewal; OCSP stapling; expiry monitoring.
- [ ] `Strict-Transport-Security: max-age=63072000; includeSubDomains`; `Secure` on all sensitive cookies; no mixed content; Qualys SSL Labs A/A+.
- [ ] `Content-Security-Policy`: strict (`default-src 'self'`, nonces + `'strict-dynamic'`, `frame-ancestors 'none'`); never `unsafe-inline`/`unsafe-eval`; test in Report-Only first.
- [ ] `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` disabling unneeded APIs; do **not** set `X-XSS-Protection`; strip `X-Powered-By`.

## Least privilege

- [ ] DB: one user per service with minimal privileges (no DROP/ALTER/GRANT for app users); read-only users for reporting; DB not publicly exposed.
- [ ] IAM: minimal per-service roles, no wildcard `*` actions/resources; MFA on human admins; short-lived scoped CI/CD tokens via OIDC.
- [ ] Containers: non-root `USER`, read-only root filesystem where possible, `--cap-drop=ALL`, CPU/memory limits, minimal base images (distroless/slim), images scanned pre-deploy.
- [ ] Network: deny-by-default firewall/security groups; app/DB/cache in separate subnets; only required ports; admin interfaces on private networks or behind VPN/SSO.

## Sources

- https://owasp.org/Top10/2025/
- https://pages.nist.gov/800-63-3/sp800-63b.html
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
