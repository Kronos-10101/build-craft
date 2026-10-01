# Security — production checklist

Concrete checks mapped to OWASP Top 10:2025 (final numbering — A01 Broken Access Control through A10 Mishandling of Exceptional Conditions), plus the OWASP API Top 10:2023, auth (passkeys, OIDC, JWT hardening), LLM application security, secrets, 2026 supply-chain practice (SLSA/Sigstore), TLS, headers, post-quantum readiness, data protection, and least privilege (checked 2026-10-01).

## OWASP Top 10:2025 — concrete checks (final edition)

- [ ] **A01 Broken Access Control** (absorbs 2021's SSRF category) — deny-by-default server-side authorization on every route; object-level ownership checks on every read/update/delete (no IDOR via URL tampering); test by swapping IDs and hitting admin routes as a low-privilege user. SSRF: never fetch raw user-supplied URLs; allow-list schemes/hosts/ports; validate the resolved IP against link-local/metadata ranges (169.254.169.254), RFC1918, and localhost before and after redirects; disable HTTP-client redirects; enforce IMDSv2 on cloud instances.
- [ ] **A02 Security Misconfiguration** — debug/dev disabled in prod; stack traces and version headers suppressed; unnecessary services/ports removed; storage buckets not publicly writable; strict CORS (never `*` with credentials); default-deny ingress; IaC scanned (Checkov/tfsec) and reviewed like code.
- [ ] **A03 Software Supply Chain Failures** — SBOM per release, SCA in CI, signed builds with provenance (Sigstore/SLSA), pinned CI actions, Dependabot/Renovate; no `curl | sh` from unverified sources.
- [ ] **A04 Cryptographic Failures** — HTTPS everywhere; no sensitive data in plaintext at rest or in transit; no MD5/SHA-1/DES/RC4/static keys; keys in a KMS/HSM, never in code or config files.
- [ ] **A05 Injection** — zero string-built SQL (parameterized queries/prepared statements/ORM bound params only); no SQL/NoSQL/OS/LDAP/XPath/template injection sinks on untrusted input; XSS via context-aware output encoding + CSP; prompt injection treated as an injection class for LLM inputs (see LLM section).
- [ ] **A06 Insecure Design** — threat model documented before code (trust boundaries, abuse cases, attacker stories); business-logic flows (payments, auth, quotas) carry rate limits and anomaly checks; security controls are requirements, not patches.
- [ ] **A07 Authentication Failures** — MFA enforced for admin/privileged accounts and offered everywhere; brute-force defenses with no account enumeration (identical responses and timing); session/token lifecycle managed (rotation, expiry, server-side invalidation); credential-stuffing defenses on every login path.
- [ ] **A08 Software or Data Integrity Failures** — trusted pinned CI sources; signature-verified artifacts and updates; no insecure deserialization (`pickle`, `unserialize`, Java native serialization on untrusted data); CI/CD pipeline integrity (protected branches, required reviews, no self-mutating workflows).
- [ ] **A09 Security Logging & Alerting Failures** — security events logged (logins, privilege changes, access-denied, validation failures, token use anomalies) with timestamp/user/IP in tamper-protected storage **and alerted on**; logs are monitored, not just written — an alert nobody reads is a checkbox, not a control.
- [ ] **A10 Mishandling of Exceptional Conditions** (new in 2025) — exceptions never expose stack traces/SQL errors/internal paths to clients; fail closed (deny) on error, never fail open into an approved state; resource exhaustion guarded (timeouts, size limits, connection caps, recursion/depth limits).

## OWASP API Security Top 10:2023 — checks

- [ ] **API1 BOLA / API5 BFLA / API3 BOPLA** — ownership checks per object, per function, per property; no blind model binding (explicit bindable-field allow-lists); response DTOs project only permitted fields.
- [ ] **API2 Broken Authentication** — every endpoint authenticated by default (deny by default, then open the public ones deliberately); JWTs hardened per the Auth section; no security-through-obscurity versioning.
- [ ] **API4 Unrestricted Resource Consumption** — rate limits per client and per endpoint, request/response size caps, pagination ceilings, and cost-aware limits on expensive operations.
- [ ] **API6 Business-flow abuse** — automatable flows (signup, login, purchase, vote) carry bot detection, rate limits, and anomaly alerts; **API7 SSRF** covered under A01 above.
- [ ] **API8 Misconfiguration / API9 Inventory** — continuously discovered API inventory (no shadow or zombie versions); deprecated versions have a published sunset and are actually turned off; **API10 Unsafe Consumption** — every third-party API response validated like user input.

## Auth — passwords, passkeys, OIDC, sessions, JWT

- [ ] **Password hashing**: Argon2id (≥19 MiB memory, iterations ≥2); fallback scrypt/bcrypt (work factor ≥10); PBKDF2 ≥600k only if FIPS-140 required. Never MD5/SHA-1/fast hashes; unique per-user salt; optional server-side pepper outside the DB.
- [ ] **Password policy (NIST SP 800-63B)**: ≥15 chars single-factor (8 if MFA); up to ≥64 allowed; **no composition rules, no forced rotation** (change only on compromise evidence); new passwords screened against breached-password blocklists; paste + Unicode allowed.
- [ ] **Passkeys first (2026 default for new apps)**: WebAuthn/passkeys offered as the primary factor with conditional mediation (autofill UI); synced passkeys accepted, device-bound keys preferred for privileged roles; passwords retained only as fallback, and every password path still gets MFA.
- [ ] **MFA**: TOTP and/or WebAuthn/passkeys offered; enforced for admin/privileged accounts; re-auth before sensitive actions; SMS codes only as a last resort (SIM-swap risk).
- [ ] **OIDC/OAuth 2.1**: authorization code flow with PKCE enforced for all clients; exact-match redirect URIs; `state`/`nonce` validated; short-lived single-use codes; refresh tokens rotated and sender-constrained (DPoP or mTLS) where theft would be catastrophic.
- [ ] **JWT hardening**: pin the expected `alg` server-side and reject `none`; validate `iss`/`aud`/`exp`/`nbf` on every request; fetch JWKS over TLS from a fixed allow-listed URL; strong random HMAC secrets (≥256 bits); access tokens short-lived (minutes); never store tokens in localStorage (use `HttpOnly` cookies or secure OS storage); never put sensitive data in the payload unencrypted.
- [ ] **Sessions**: cryptographically random ≥128-bit opaque IDs, never in URLs; cookies `Secure; HttpOnly; SameSite=Lax/Strict`; rotate session ID on login and privilege change; idle timeout ~15–30 min + absolute ~4–8 h; server-side invalidation on logout/password change/disablement.
- [ ] **Brute-force defenses**: rate-limit logins per IP and per account (backoff/captcha after ~5 failures); identical generic responses and timing for valid/invalid accounts (no enumeration) on login/registration/reset.
- [ ] **Reset tokens**: single-use, cryptographically random, ≤1–2 h expiry, bound to the account, invalidated on use; never logged.
- [ ] **Constant-time comparisons**: webhook signatures, auth/reset tokens, and any secret comparison use `crypto.timingSafeEqual` (Node.js) / `hmac.compare_digest` (Python) — never `===`/`==` on secret material, which short-circuits on the first mismatch and leaks timing. Compare equal-length buffers only; length mismatches are rejected before comparison.

## LLM application security (OWASP LLM Top 10:2025)

- [ ] **LLM01 Prompt injection** — treat all model input as untrusted; delimit and validate user content, never concatenate it into system instructions; assume indirect injection through retrieved documents and tool outputs.
- [ ] **LLM05 Improper output handling** — validate and encode model output before it reaches any sink (DOM, SQL, shell, email); a model is not a sanitizer.
- [ ] **LLM02/LLM07 Disclosure & leakage** — no secrets, PII, or internal instructions in prompts or retrievable documents; retrieval filtered per tenant at the query layer (see `vector-databases.md`).
- [ ] **LLM06 Excessive agency** — every tool scoped to least privilege; irreversible actions require human confirmation; the agent cannot reach tools its task does not need.
- [ ] **LLM10 Unbounded consumption** — token, cost, and iteration caps per request and per user; runaway-loop detection; rate limits on expensive tools.
- [ ] **LLM03/LLM04 Supply chain & poisoning** — pin base models, adapters, and embedding models; validate data before it enters training or retrieval indexes; monitor for behavior drift.

## Secrets management

- [ ] **Never in git** — no keys/tokens/passwords/connection strings in code, tests, fixtures, `.env`, or CI logs. `.env*`, `*.pem`, `*.key` gitignored; only `.env.example` committed.
- [ ] Detection layers: pre-commit scanning (gitleaks/detect-secrets/trufflehog) blocking commits; CI secret-scan on every push; platform push protection enabled.
- [ ] Stored in a secrets manager (Vault, AWS Secrets Manager, etc.) or env vars — never code; local dev via OS keychain/gitignored env files; Kubernetes via External Secrets Operator, never checked-in base64.
- [ ] Rotation on schedule + immediate on suspected exposure; separate creds per environment; prefer short-lived OIDC workload identity over long-lived keys. Leaked secret → rotate first, then purge history (`git filter-repo`; `git revert` is not enough).
- [ ] No secrets in URLs, error messages, telemetry, or logs; masked in CI output; secret-store access audited.

## Supply chain / dependency security (2026 practice)

- [ ] Lockfiles committed and reproducible; CI installs strictly from the lockfile; `npm audit`/`pip-audit`/`cargo audit`/`govulncheck` run in CI and container images scanned (Trivy/Grype); builds fail on Critical; CVE SLA (Critical blocks deploy, High within the sprint).
- [ ] **SBOM** (CycloneDX/SPDX) generated at build time per release (syft/cdxgen), attached to the release artifact, and itself signed.
- [ ] **SLSA provenance**: releases carry signed provenance (SLSA Build L2 minimum via `actions/attest-build-provenance`; L3 via `slsa-github-generator` for critical artifacts) so consumers can verify what source and builder produced the artifact.
- [ ] **Sigstore keyless signing**: artifacts and images signed with cosign via CI OIDC identity — no long-lived signing keys to leak — with signatures recorded in the Rekor transparency log; admission policy (Kyverno/OPA) verifies signatures before deploy.
- [ ] npm packages published with provenance (`--provenance`); Dependabot/Renovate with grouped schedules and no auto-merge on major bumps without review; new dependencies evaluated (maintenance activity, CVE history, maintainer trust) with the justification recorded.

## Input validation & output encoding

- [ ] Server-side **allowlist** validation on all untrusted input (type/length/range/format); reject rather than coerce; request size limits (HTTP 413).
- [ ] Parameterized everything; no user input in SQL/shell/LDAP/XPath/template strings; no `eval`/dynamic `exec`.
- [ ] **Context-aware output encoding** (HTML body, JS context, URL, attribute); framework auto-escaping never bypassed for user input; CSP as defense-in-depth.
- [ ] File uploads: type validated by magic bytes (not extension), size limits, stored outside webroot with randomized names, served `Content-Disposition: attachment` + `nosniff`; never executed.

## HTTPS / TLS & headers

- [ ] TLS 1.2 minimum (prefer 1.3); SSLv2/v3, TLS 1.0/1.1 disabled; ECDHE/DHE with AEAD ciphers; valid certs with automated renewal; OCSP stapling; expiry monitoring.
- [ ] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; submit the domain to the HSTS preload list so the first request is already HTTPS-only.
- [ ] `Content-Security-Policy`: strict (`default-src 'self'`, nonces + `'strict-dynamic'`, `frame-ancestors 'none'`); never `unsafe-inline`/`unsafe-eval`; test in Report-Only first.
- [ ] `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` disabling unneeded APIs; do **not** set `X-XSS-Protection`; strip `X-Powered-By`.

## Cryptography and post-quantum readiness

- [ ] You can state the 2026 position: NIST finalized ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205) in August 2024; hybrid key exchange (e.g. X25519MLKEM768) is the recommended migration path, standardized for TLS 1.3; harvest-now-decrypt-later means long-lived ciphertext is already at risk.
- [ ] You maintain a cryptographic inventory (algorithms, key lengths, libraries, certificate lifetimes, protocol versions) — you cannot migrate what you cannot enumerate.
- [ ] New systems default to ML-KEM for key exchange and ML-DSA for signatures where library support exists; everywhere else, crypto is behind an abstraction layer so algorithms are swappable (crypto-agility), not hard-coded.
- [ ] Symmetric crypto uses AES-256 (Grover halves effective strength); password hashing stays Argon2id regardless of the PQC timeline.

## Data protection

- [ ] Encryption at rest for databases, backups, and object storage via KMS-managed keys with rotation; backups tested by restore, not by existence.
- [ ] Data retention policy defined and enforced — personal data deleted on schedule and on request; backups honor deletion within their documented window.
- [ ] PII minimized at collection, masked in logs and non-production environments, and never used as an identifier where a surrogate key works.

## Detection and response

- [ ] Security alerts route to a human or runbook with an SLA — logins from impossible geographies, privilege escalations, mass 4xx/5xx spikes, and WAF blocks are alerted, not just stored.
- [ ] You have a written incident-response outline: who declares an incident, how to contain (revoke tokens, rotate secrets, block IPs), how to preserve evidence, and when to notify users/regulators.
- [ ] `security.txt` published at `/.well-known/security.txt` with a contact and disclosure policy; dependencies monitored for new CVEs continuously (not at release time).

## Least privilege

- [ ] DB: one user per service with minimal privileges (no DROP/ALTER/GRANT for app users); read-only users for reporting; DB not publicly exposed.
- [ ] IAM: minimal per-service roles, no wildcard `*` actions/resources; MFA on human admins; short-lived scoped CI/CD tokens via OIDC.
- [ ] Containers: non-root `USER`, read-only root filesystem where possible, `--cap-drop=ALL`, CPU/memory limits, minimal base images (distroless/slim), images scanned and signature-verified pre-deploy.
- [ ] Network: deny-by-default firewall/security groups; app/DB/cache in separate subnets; only required ports; admin interfaces on private networks or behind VPN/SSO.

## Cookie hardening matrix

| Cookie attribute | Production requirement | Purpose |
| :--- | :--- | :--- |
| `Secure` | Mandatory on all cookies | Transmitted only over HTTPS. |
| `HttpOnly` | Mandatory on auth/session cookies | Inaccessible to client-side JS — neutralizes XSS token theft. |
| `SameSite=Lax` | Default for general session cookies | Prevents CSRF on cross-origin POSTs. |
| `SameSite=Strict` | Recommended for sensitive operations | Blocks cookie transmission on all cross-site navigations. |
| `__Host-` prefix | Recommended for the primary session cookie | Scoped to origin only: no subdomains, `Secure`, path=`/`. |

- [ ] Auth/session cookies satisfy every Mandatory row; primary session cookie uses the `__Host-` prefix where supported. (`__Host-` requires `Secure`, no `Domain` attribute, and `Path=/` — a cookie violating any of these is rejected by the browser.)

## Security headers — exact production values

Every production web server, reverse proxy (Nginx, Caddy), or edge configuration (Cloudflare, Vercel, Netlify) must deliver:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-...' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.yourdomain.com; frame-ancestors 'none';
```

- [ ] CSP contains no `unsafe-inline`/`unsafe-eval` in `script-src` (nonces or `'strict-dynamic'` instead); `frame-ancestors 'none'` blocks all framing including clickjacking; `Permissions-Policy` disables every sensor/API the page does not actively use; `X-Frame-Options: DENY` or `SAMEORIGIN` is set as belt-and-braces behind `frame-ancestors` (covered in the OWASP A02 / HTTPS sections above — this block is the copy-paste canonical form).
- [ ] Responses from API servers strip `Server` and `X-Powered-By` version headers; `X-XSS-Protection` is not set (legacy, can introduce vulnerabilities).

## Email authentication (SPF / DKIM / DMARC)

Applies to any app that sends transactional email — forged mail from your domain destroys deliverability and enables phishing.

- [ ] **SPF**: DNS TXT record `v=spf1 ...` listing exactly which servers may send mail for the domain; ends in `-all` (hard fail), not `~all`.
- [ ] **DKIM**: outbound mail signed with a domain key; DNS record `v=DKIM1; ...` publishes the public key under the selector.
- [ ] **DMARC**: DNS record `p=reject; ...` with SPF and DKIM alignment (`adkim`/`aspf` set to `s` or `r`); roll out via `p=none` → `quarantine` → `reject` while watching aggregate reports (`rua`) before enforcing.
- [ ] Reverse DNS (PTR) matches the sending hostname; marketing and transactional mail use separate subdomains/DKIM selectors so a marketing reputation hit never blocks password resets.

## Legal, privacy & compliance

### Privacy policy (mandatory contents)

- [ ] The policy explicitly details: categories of personal data collected and how they are collected; purpose of processing and legal basis (GDPR Art. 6: consent, contract, legitimate interests); exact retention schedule per category; named third-party processors (analytics, payment processors, cloud hosting); data subject rights (access, rectification, erasure, data portability, objection); direct contact address and DPO contact; last-updated timestamp.

### Cookie consent architecture

| Requirement | GDPR (EU / UK) | CCPA / CPRA (California / US states) |
| :--- | :--- | :--- |
| Consent model | **Opt-in**: zero non-essential cookies/telemetry fire before affirmative consent. | **Opt-out**: telemetry may fire initially, but the user must be able to opt out instantly. |
| GPC signal | Honor `Sec-GPC: 1` (Global Privacy Control) automatically. | Legally mandated recognition of `Sec-GPC: 1` as a valid opt-out. |
| Opt-out surface | "Cookie Preferences" modal. | Footer link titled **"Do Not Sell or Share My Personal Information"**. |
| Banner design | "Accept All" and "Reject All" with equal prominence (see anti-dark-pattern section). | Clear mechanism, no coercive dark patterns or deceptive loops. |
| Data subject rights | Access, rectification, erasure, portability, restriction of processing. | Know, delete, correct, limit use of sensitive personal information. |
| Response window | 30 calendar days. | 45 calendar days. |

- [ ] No non-essential analytics, pixels, or trackers fire before opt-in consent under GDPR; the opt-out link exists and works under CCPA/CPRA; `Sec-GPC: 1` is honored automatically for all visitors.

### Consent implementation notes

- [ ] Tag managers and analytics SDKs are gated behind the consent state — consent mode defaults to denied and upgrades to granted only after affirmative opt-in (GDPR); under CCPA/CPRA the opt-out immediately stops selling/sharing and suppresses targeted trackers.
- [ ] Consent choices are persisted and re-prompted only on policy change, not on every visit; the banner never uses dark patterns (see the Ethical UI section below) and closing the banner without choosing equals "reject", not silent consent.
- [ ] Data subject requests (access, erasure, portability) have a documented intake path and owner; the 30/45-day response clocks are tracked, not aspirational.
- [ ] Third-party tracker inventory: every third-party script, pixel, embed, and SDK is inventoried with its owner, purpose, data shared, and consent category; anything without a purpose is removed; the inventory is re-audited on every release.

### Business identity & form consent

- [ ] Legal imprint: real business name, registered or physical address, contact email and phone, and company registration / VAT number where the jurisdiction requires it (EU Impressumspflicht) — linked from the footer on every page.
- [ ] Per-form consent: every form collecting personal data states what is collected and why, links the privacy policy, and keeps marketing opt-ins as separate unchecked checkboxes — consent is per purpose, never bundled into the submit button.

### Terms & commercial policies

- [ ] Clear Terms of Service, billing terms, cancellation terms, and refund policy, all prominently linked in the footer — not hidden three clicks deep.
- [ ] Policies are versioned with effective dates; material changes to ToS or privacy terms are announced to users before they take effect, not applied retroactively.
- [ ] Asset licensing verified: commercial rights and attribution compliance confirmed for every embedded font, icon, illustration, and stock photo/video.

## Ethical UI & anti-dark-pattern compliance

Dark patterns are a regulatory liability (FTC enforcement, EU Digital Services Act, GDPR consent rules) and destroy trust. Every item below is a hard gate.

- [ ] **Equal-weight accept/reject**: consent and opt-in modals give "Reject All" the same size, style, and contrast as "Accept All" — no tiny gray decline text.
- [ ] **No confirmshaming**: decline copy is neutral ("No thanks", "Skip") — never guilt-trips like "No, I prefer to stay uninformed".
- [ ] **Cancellation parity**: if sign-up takes 1 click, cancellation takes ≤ 2 clicks; cancellation is never buried in a settings maze or gated behind a phone call.
- [ ] **Transparent pricing**: all costs visible before the user commits — no drip pricing, hidden fees, or surprise charges at the final checkout step.
- [ ] **No fake countdown timers**: a displayed countdown must reflect a real deadline; timers that reset on page refresh are deceptive and carry regulatory risk.
- [ ] **No pre-checked consent boxes**: marketing opt-ins, newsletter signups, and add-on purchases are unchecked by default — pre-checked consent violates GDPR opt-in requirements.
- [ ] **No basket sneaking**: never add items, services, or insurance to a cart without the user's explicit, affirmative action.
- [ ] **Honest scarcity**: "Only X left" or "Y people are viewing" indicators must reflect real data — fabricated urgency is a regulatory liability and burns user trust.

## Sources

- https://github.com/deepaksinghcs14/deadeye-cc/blob/HEAD/internal/vapt/owasp.md
- https://github.com/gener8v/gener8v.claude-skills/blob/HEAD/skills/owasp-top10-review/SKILL.md
- https://github.com/basriakkaya/basriakkaya.com/blob/HEAD/src/content/blog/owasp-top-10-2025-reasoning-guide.md
- https://github.com/joaorafaelalmeida/security-in-software-engineering-the-playbook/blob/HEAD/09-Security-Testing/articles/owasp-api-security-top-10-2023.md
- https://github.com/owasp/devsecopsguideline/blob/HEAD/current-version/2-Process/2-4-Test/2-4-4-API-Security.md
- https://github.com/j3ke-developer/claude-red/blob/HEAD/Skills/auth/offensive-jwt/SKILL.md
- https://github.com/ai-governance-curriculum/security-learning/blob/HEAD/lessons/mod-107-llm-agent-security/01-owasp-llm-top-10-landscape.md
- https://github.com/owasp/devsecopsguideline/blob/HEAD/current-version/2-Process/2-3-Build/2-3-6-Supply-Chain-Security/2-3-6-2-Artifact-Signing-and-Provenance.md
- https://github.com/selvarajmurugesan90/ops-engineering-skills/blob/HEAD/./plugins/devsecops/skills/supply-chain-security-slsa-sbom/SKILL.md
- https://github.com/kubaik/kubaik.github.io/blob/HEAD/docs/slsa-and-sigstore-the-2026-supply-chain-baseline/index.md
- https://github.com/ashwani983/ashwani983.github.io/blob/HEAD/posts/others/2026-09-24-post-quantum-cryptography-explained.md
- https://www.sitg-consulting.com/post/post-quantumcryptographyin2026
- https://gdpr-info.eu/ (GDPR text, Art. 6 legal bases, Art. 12–23 data subject rights)
- https://oag.ca.gov/privacy/ccpa (California CCPA/CPRA requirements)
- https://globalprivacycontrol.org/ (GPC signal specification)
