# Security — production checklist

Concrete checks mapped to OWASP Top 10:2025 (final numbering — A01 Broken Access Control through A10 Mishandling of Exceptional Conditions), plus the OWASP API Top 10:2023, auth (passkeys, OIDC, JWT hardening), LLM application security, secrets, 2026 supply-chain practice (SLSA/Sigstore), TLS, headers, post-quantum readiness, data protection, and least privilege (checked 2026-10-01). Checked 2026-10-01.

## Contents

- OWASP Top 10:2025 — concrete checks (final edition)
- OWASP API Security Top 10:2023 — checks
- Auth — passwords, passkeys, OIDC, sessions, JWT
- Passkey implementation — Signal API, credential management, conditional create, immediate UI
- LLM application security (OWASP LLM Top 10:2025)
- Secrets management
- Supply chain / dependency security (2026 practice)
- Input validation & output encoding
- Sanitizing untrusted HTML — Sanitizer API and Trusted Types
- HTTPS / TLS & headers
- Cryptography and post-quantum readiness
- In-browser WebCrypto and Subresource Integrity (SRI)
- Data protection
- Detection and response
- Least privilege
- Destructive operations on derived paths
- Cookie hardening matrix
- Security headers — exact production values
- Connection-Allowlist — one network-layer allowlist
- Origin checks, local network access, and email verification
- Email authentication (SPF / DKIM / DMARC)
- Legal, privacy & compliance
- Ethical UI & anti-dark-pattern compliance
- Sources

## OWASP Top 10:2025 — concrete checks (final edition)

- [ ] **A01 Broken Access Control** (absorbs 2021's SSRF category) — deny-by-default server-side authorization on every route; object-level ownership checks on every read/update/delete (no IDOR via URL tampering); test by swapping IDs and hitting admin routes as a low-privilege user. SSRF: never fetch raw user-supplied URLs; allow-list schemes/hosts/ports; validate the resolved IP against link-local/metadata ranges (169.254.169.254), RFC1918, and localhost before and after redirects; disable HTTP-client redirects; enforce IMDSv2 on cloud instances.
- [ ] **SSRF nuance (sharpens A01)**: resolve **all** DNS records for the host, not the first answer, and reject the URL if any record lands in a private or reserved range, covering IPv4 (loopback, RFC1918, link-local including 169.254.169.254, unique-local) and IPv6 (`::1`, `fe80::/10`, `fc00::/7`) alike; redirects are forbidden outright, not re-validated after the hop. Name the remaining gap in the threat model: validation and connection resolve DNS separately, so a short-TTL record can rebind to an internal address between check and use (DNS-rebinding TOCTOU). On high-risk surfaces (webhooks, import-from-URL, link previews, image proxies), close it by connecting to the pinned resolved IP or by routing the fetch through a filtering agent.
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

## Passkey implementation — Signal API, credential management, conditional create, immediate UI

The Auth section above states the policy (passkeys first); this section is the implementation depth behind it.

- [ ] **Signal API keeps server and authenticator in sync**: call `PublicKeyCredential.signalAllAcceptedCredentials()` when the credential management page loads and immediately after any delete, passing the server's current accepted credential ID list so the password manager drops credentials the server no longer holds; call `PublicKeyCredential.signalCurrentUserDetails()` immediately after an account `name`/`displayName` change succeeds; call `PublicKeyCredential.signalUnknownCredential()` only when the server says the credential is unknown (a 404 on authentication, or a failed verification after registration) and the user is unauthenticated, so orphaned credentials do not linger in the provider.
- [ ] **Signal API inputs are strict**: `rpId` always comes from the server-provided WebAuthn options (`publicKey.rp.id` / `publicKey.rpId`), never derived client-side from `window.location.hostname`, which mismatches parent-domain and related-origin RP IDs; every signal method is feature-detected first (`if (PublicKeyCredential.signalUnknownCredential)`) and skipped silently where unsupported; renaming one credential's nickname is a server-side label change only and does not trigger `signalCurrentUserDetails()`.
- [ ] **Credential IDs are unpadded Base64URL everywhere**: credential IDs and passkey user IDs are stored, returned, and passed to the Signal API as unpadded Base64URL strings (characters `[A-Za-z0-9_-]` only, no `=` padding, `length % 4 !== 1`); validate the format before any signal call and skip malformed IDs instead of throwing on page load. Seed and mock data obey the same rule: human-readable placeholders in an ID field throw in native validation.
- [ ] **AAGUID identifies the provider for display only**: at registration, store the AAGUID from the attestation data and map it through a provider registry to render the provider name and icon (Google Password Manager, iCloud Keychain, 1Password) in the management list; a zeroed AAGUID (`00000000-0000-0000-0000-000000000000`) falls back to a generic label. AAGUID is a UX hint, never an access or trust decision: platform passkeys do not cryptographically attest it, so it can be altered or simulated.
- [ ] **Credential CRUD endpoints are authenticated and complete**: list (`GET /api/credentials`, returning the credentials plus the server's `rpId` and the user's Base64URL passkey user ID), rename (`PUT /api/credential/:id`), delete (`DELETE /api/credential/:id`, followed by `signalAllAcceptedCredentials()` with the remaining IDs), and account update (`PUT /api/user`, followed by `signalCurrentUserDetails()`). Every endpoint checks the signed-in user's ownership of the credential it touches; a credential ID in the URL is not authorization.
- [ ] **Conditional create promotes a password sign-in, silently**: offer passkey creation with `mediation: 'conditional'` only immediately after a successful full password sign-in, and only after every required MFA factor has passed; never after magic-link, OTP, or federated sign-ins. Gate on `PublicKeyCredential.getClientCapabilities()` reporting `conditionalCreate`; the server relaxes the user-presence requirement only for credentials created on this path, and a failed verification calls `signalUnknownCredential()` so no orphan is left behind.
- [ ] **Immediate UI mode is fail-fast contextual sign-in**: `navigator.credentials.get({ password: true, publicKey, uiMode: 'immediate' })` runs only inside a user-initiated handler (header sign-in click, checkout, a micro-action such as save or favorite), only after `getClientCapabilities()` reports `immediateGet`, with no non-empty `allowCredentials` and no `AbortSignal`; `NotAllowedError` (no local credential, or the chooser dismissed) falls back to the standard sign-in flow with the user's intent preserved. Never use it on the dedicated sign-in page, where it suppresses cross-device QR and security-key options and dead-ends users with no local credential, and never for step-up reauthentication, which must restrict the prompt to the signed-in user's own credentials.

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

## Sanitizing untrusted HTML — Sanitizer API and Trusted Types

- [ ] **Native Sanitizer first**: insert untrusted HTML with `Element.setHTML()`, which parses, sanitizes, and inserts in one step for the exact insertion context; when the markup must be inspected or transformed before it reaches the live DOM, parse with `Document.parseHTML()` and move the sanitized nodes in. Never serialize sanitized nodes back to a string and re-parse with `innerHTML`, which reopens mutation XSS (mXSS).
- [ ] **Restrict with an explicit `Sanitizer` config**: pass a `Sanitizer` built from `elements` and `attributes` allowlists sized to the use case; elements outside the list are removed together with their content, so wrappers whose text must survive go in `replaceWithChildrenElements` (the wrapper is dropped, its children kept). The default configuration already strips scripts, event handlers, and other XSS-unsafe markup, and a custom config can only narrow it on the safe path.
- [ ] **`setHTMLUnsafe()` is the named escape hatch**: `Element.setHTMLUnsafe()` / `Document.parseHTMLUnsafe()` with a permissive custom `Sanitizer` is the only route that may allow XSS-unsafe elements or attributes; every call site is individually justified, reviewed, and greppable. Unreviewed use is a defect, not a shortcut.
- [ ] **Fallback loads only where needed**: where the native API is missing, load DOMPurify (code-split, feature-detected) rather than shipping it to every browser, and align its config with the native behavior (ARIA/data attributes, content of removed elements) so the fallback is not the weaker path.
- [ ] **Sanitize on the server too**: client-side sanitization protects the page that renders the content; the same content rendered in another client, a server-rendered page, or an email gets sanitized again at that sink, with rules that do not conflict.
- [ ] **Trusted Types policies own the DOM sinks**: values reaching `innerHTML`, `document.write`, script URLs, and similar sinks are `TrustedHTML`/`TrustedScript`/`TrustedScriptURL` objects produced by a named policy from `trustedTypes.createPolicy()` (sanitize or escape inside the policy, nowhere else); a `default` policy covers legacy call sites during migration. Policy names are allowlisted in CSP via the `trusted-types` directive, including the `dompurify` policy when the fallback delegates to DOMPurify.
- [ ] **Roll out `require-trusted-types-for` report-only first**: ship `Content-Security-Policy-Report-Only: require-trusted-types-for 'script'` and work the violation reports to zero before enforcing with `Content-Security-Policy: require-trusted-types-for 'script'`; enforcing on day one breaks every unconverted sink at once.

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

## In-browser WebCrypto and Subresource Integrity (SRI)

The Cryptography section above sets migration policy; this section covers doing crypto in the browser and pinning third-party subresources, which that section does not reach.

- [ ] **Envelope encryption uses a KEM, not a shared long-lived key**: the recipient generates a KEM key pair once; per message, the sender calls `crypto.subtle.encapsulateKey()` against the recipient's public key to get a fresh shared key plus a ciphertext capsule, encrypts the payload under that key, and sends `{ capsule, iv, ciphertext }`; the recipient recovers the same key with `decapsulateKey()`. Every encryption uses a fresh 12-byte (96-bit) IV, and an (IV, key) pair is never reused.
- [ ] **Modern WebCrypto key formats are explicit**: current algorithms reject the legacy `'raw'` format, so KEM and ML-DSA keys move as `'raw-public'` / `'raw-seed'` and symmetric keys as `'raw-secret'`; importing or exporting with the wrong format or usage list throws, which is treated as a build-time bug to catch in tests, not a runtime surprise. KEM key pairs are generated with `extractable: false` and usages limited to `encapsulateKey`/`decapsulateKey`.
- [ ] **AEAD choice**: `ChaCha20-Poly1305` (fixed 256-bit key, no length parameter, 128-bit tag appended) is the default where devices may lack AES hardware acceleration and constant-time behavior matters; `AES-GCM` is chosen for FIPS or existing-suite interoperability. Plain CBC/CTR without authentication is never an option.
- [ ] **ML-DSA parameter set is picked by need, defaulting to 65**:

  | Parameter set | Security level | Public key | Signature | Pick when |
  | :--- | :--- | :--- | :--- | :--- |
  | `ML-DSA-44` | NIST Category 2 (~128-bit) | 1312 bytes | 2420 bytes | Bandwidth-constrained channels, 128-bit security suffices |
  | `ML-DSA-65` | NIST Category 3 (~192-bit) | 1952 bytes | 3309 bytes | **Default for general-purpose signing** |
  | `ML-DSA-87` | NIST Category 5 (~256-bit) | 2592 bytes | 4627 bytes | Policy requires the highest margin (e.g. CNSA 2.0) |

- [ ] **Keys persist in IndexedDB as objects, never as exported bytes**: `CryptoKey` and `CryptoKeyPair` objects are stored directly via structured cloning; a non-extractable private key can be used across sessions without its bytes ever leaving the `CryptoKey`, and there is no key material in `localStorage`, cookies, or logs. Support is probed with the static `SubtleCrypto.supports()` on the constructor (not on `crypto.subtle`), with a documented classical fallback (X25519 + HKDF + AES-GCM for encryption, Ed25519 for signatures) where KEM or ML-DSA support is absent.
- [ ] **SRI digests are computed at build time**: every third-party script or stylesheet carries `integrity="sha384-..."` (sha384 by default; sha512 or sha256 where required), with the digest generated in CI from the known-good local artifact, never copied from a vendor page by hand. A mismatch fails closed: the script does not execute and the stylesheet does not apply.
- [ ] **SRI only works on pinned URLs**: subresources are referenced by immutable, version-pinned or content-addressed URLs; a floating `latest` URL both breaks on the vendor's next deploy and trains the team to delete the digest. A genuinely mutable vendor tag that cannot be pinned omits `integrity` and is constrained by CSP (`strict-dynamic`/nonces) or iframe sandboxing instead, with the exception recorded.
- [ ] **Cross-origin SRI carries its CORS mode**: HTML uses `crossorigin="anonymous"` alongside `integrity`; in CSS, resources loaded via `url()` (fonts, backgrounds, `@import`, masks) use the `integrity("sha384-...")` modifier paired with `cross-origin(anonymous)` inside the `url("..." ...)` call, since several properties otherwise fetch in `no-cors` mode and cannot be hash-verified at all. Each modifier appears at most once per `url()`; multiple hashes go space-separated inside the single `integrity()` string.
- [ ] **Multi-digest rule is strongest-algorithm-wins**: where one URL may legitimately serve several known-good payloads (staged CDN rollout, negotiated builds), list space-separated digests; the browser checks only the strongest algorithm present and accepts a match against any digest of that algorithm. A weaker digest listed beside a stronger one is dead weight, not a fallback, and fallback CSS declarations are written as separate declarations, never as a comma-separated second `url()` in the same `src`, which would silently bypass a failed integrity check.

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

## Destructive operations on derived paths

- [ ] **Trust follows who wrote the target value, not the channel it arrived on**: a delete, move, or overwrite is only as safe as the value naming its target, and a value supplied by another process (its argv, its output, a shared state file) is as attacker-controlled as a form field. A shape check on the string proves well-formedness, not authorization to destroy what it names.
- [ ] **Three preconditions, all read before the call**: (1) the resolved target, with symlinks resolved, sits under an allowlisted root; (2) it is at least one level below that root, so the root itself is never the target; (3) ownership evidence for the target was read beforehand, before any teardown step that would remove the evidence and make "absent" indistinguishable from "not mine".
- [ ] **Know the check's two limits**: a marker file inside the tree is self-attestation (anything that can write the tree can write the marker), so the expected owner comes from authenticated state and the marker itself needs integrity protection before it counts; and resolving a path then operating on its name is a check/use race wherever another process can swap an ancestor, so on shared volumes the target is held by descriptor or operated on with no-follow, beneath-the-root calls for the duration.
- [ ] **Refusal is terminal**: on any failed precondition, log the rejected target and stop. Never fall back to a broader or default path; a cleanup that widens its target when the narrow one is refused is the exact failure this section exists to prevent.

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

## Connection-Allowlist — one network-layer allowlist

CSP governs outbound traffic per resource directive and misses whole channels; `Connection-Allowlist` is the complementary single list enforced at the network layer.

- [ ] **One list covers the channels CSP misses**: the header restricts a document or worker to an explicit endpoint list across `fetch()`/`XMLHttpRequest`, subresources, `navigator.sendBeacon()`, `<a ping>`, top-level and frame navigations, resource hints (`dns-prefetch`, `preconnect`), Speculation Rules, `WebSocket`/`WebTransport`, and WebRTC. Exfiltration paths that no `connect-src` entry ever sees are the reason it exists; it pairs with CSP as defense-in-depth and does not replace it (it has no client-side polyfill).
- [ ] **Format is an RFC 9651 inner list**: the value is one parenthesized, space-separated list, `Connection-Allowlist: (response-origin "https://api.example.com" "https://*.cdn.example.com/*"); report-to=conn-reports`. The unquoted token `response-origin` permits the document's own origin; external endpoints are double-quoted URLPattern strings; parameters (`report-to`, `redirects`, `webrtc`) sit after the closing parenthesis, unquoted, and items are never comma-separated. A header that fails structured-field parsing fails closed to an empty allowlist and blocks everything, so the emitted value is tested, not eyeballed; `Connection-Allowlist: ()` is the deliberate revoke-everything form.
- [ ] **Blocking defaults are the point**: by default all `3xx` redirects are blocked (`redirects=block`, even between allowlisted or same-origin URLs) and all WebRTC traffic is blocked (`webrtc=block`); append `; redirects=allow` or `; webrtc=allow` only for an endpoint that genuinely needs it, knowing the initial request must still match the list. WebSocket endpoints are written with `http:`/`https:` patterns (the browser normalizes `ws:`/`wss:` before matching), and expected navigation targets (outbound links, form actions, OAuth and payment redirects) belong in the list or the navigation breaks.
- [ ] **Violations are reported, rollout is staged**: every policy carries a `Reporting-Endpoints` header and a `; report-to=<name>` parameter; reports arrive with type `connection-allowlist` and a body naming the blocked URL (or `webrtc`) and the disposition. Roll out with `Connection-Allowlist-Report-Only` alone, or dual-send an enforcing baseline plus a report-only stricter candidate, before tightening the enforcing list.
- [ ] **Scope follows the response type**: the header is honored only on document, iframe, and worker script responses, so middleware keys it on `Sec-Fetch-Dest` (with `Vary: Sec-Fetch-Dest` where responses differ); dedicated and shared workers get a matching list, and a service worker's list is a superset of every document it controls, since it fetches on their behalf.

## Origin checks, local network access, and email verification

- [ ] **Compare origins with the Origin API, not strings**: build both sides with `Origin.from()` (from a URL string, a `URL`, an anchor element, `self`, or a browser-dispatched `MessageEvent`) and compare structurally. String comparison is spoofable in both directions: unrelated opaque contexts both serialize to `"null"` and compare equal, while default ports, casing, and trailing-dot hosts make equal origins compare unequal.
- [ ] **Pick the comparison that matches the boundary**: `isSameOrigin()` (exact scheme, host, port) gates privileged actions such as `postMessage` commands and credential attachment, where a sibling subdomain is a different origin and is rejected; `isSameSite()` (schemeful, registrable-domain based, public-suffix aware, so two tenants on a shared suffix such as `github.io` are not same-site) classifies cross-subdomain redirects and internal versus external links. `Origin.from()` calls on untrusted input sit in `try`/`catch`, and a `TypeError` means deny.
- [ ] **Opaque origins are handled explicitly**: check `origin.opaque`; reject opaque candidates (sandboxed iframes, `data:` URLs) for redirects, and where a specific sandboxed widget is a legitimate peer, pin the opaque `Origin` extracted once via `Origin.from(event)` and compare against that pin. The no-API fallback compares parsed URL tuples after rejecting `"null"`, and identifies a sandboxed sender by `event.source` or a dedicated `MessageChannel` instead of by origin string.
- [ ] **Local Network Access is permission-gated by address space**: requests are checked only when they cross from a less private space into a more private one, along the lattice public, then local, then loopback. Reaching the local space (RFC1918 ranges, link-local, IPv6 unique-local `fc00::/7`, `.local` hostnames) from a public origin needs the `local-network` permission; reaching loopback (`127.0.0.0/8`, `::1`, `localhost`) from public or local needs `loopback-network`. Query state with `navigator.permissions.query()` under those two names only (the legacy combined name is never queried), default the `Permissions-Policy` to `self`, and delegate to an embedded iframe only explicitly via its `allow` attribute and the policy header. Deprecated Private Network Access preflight headers are not added to new code.
- [ ] **Test LNA with the address-space override**: an app served from `localhost` sits in the most private space and never triggers the prompts, so local testing uses the Chromium flag `--ip-address-space-overrides=127.0.0.1:8080=public,[::1]:8080=public` (or the site-settings toggles) before any claim that the permission flow works.
- [ ] **Email Verification Protocol (origin trial, progressive enhancement only)**: where supported, a hidden input with `autocomplete="email-verification-token"` sits in the same form as the `autocomplete="email"` input, alongside a single-use server-side nonce; the browser obtains an Email Verification Token from the domain's issuer and binds it to this origin and nonce in a Key Binding JWT (an `EVT + KB-JWT` SD-JWT presentation). The server verifies delegation before trusting any issuer claim (the `_email-verification.<domain>` DNS TXT record must name that exact issuer, and the issuer's `/.well-known/email-verification` metadata must match it), verifies signatures against the issuer JWKS with an established SD-JWT/JOSE library (never hand-rolled), passes the expected nonce into verification so key binding cannot be skipped, and consumes the nonce on first use. An empty token (unsupported browser, non-participating domain, no active issuer session) falls back to the ordinary OTP or magic-link flow; the protocol is in origin trial, so no sign-up flow depends on it.

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
- https://github.com/GoogleChrome/modern-web-guidance (Apache-2.0) — security guides: passkey implementation and management, Sanitizer API, Trusted Types, Connection-Allowlist, Origin API, Local Network Access, Email Verification Protocol, in-browser WebCrypto (KEM, ML-DSA, ChaCha20-Poly1305), and Subresource Integrity
- https://github.com/addyosmani/agent-skills (MIT) — security-and-hardening skill: destructive operations on derived paths, SSRF resolution and DNS-rebinding nuance
