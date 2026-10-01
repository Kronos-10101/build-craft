# Offensive Security — think like an attacker, build like a defender

Scope: how each attack class works from the attacker's point of view and the concrete prevention that kills it — mechanism first, then defense; defensive and explanatory, never operational instructions. Covers classic web attacks, API-specific attacks (OWASP API Top 10:2023), JWT/OAuth abuse, GraphQL abuse, and LLM/agent attacks (OWASP LLM Top 10:2025) (checked 2026-09-30).

## Reconnaissance and footprinting

- [ ] You can explain the attacker's workflow: passive OSINT first (WHOIS, DNS records, certificate-transparency logs, search dorks, job postings, leaked documents), then active probing (subdomain enumeration, port scanning, banner grabbing) — passive is undetectable, active leaves logs.
- [ ] You can state what recon feeds: phishing targets, tech-stack versions, exposed admin panels and forgotten subdomains — every later attack starts with information the defender published carelessly.
- [ ] Prevention you can defend: strip server and version headers, remove sensitive files from web roots and search indexes, keep DNS records minimal, and monitor certificate-transparency logs for lookalike domains.

## Phishing

- [ ] You can explain the mechanism: the attacker impersonates a trusted sender and gets the victim to click, reply, or call — mass email (phishing), targeted email (spear phishing), executives (whaling), SMS (smishing), voice (vishing); it wins on urgency and trust, not on technical exploits.
- [ ] Prevention you can defend: SPF/DKIM/DMARC with a reject policy, email gateway filtering and attachment sandboxing, phishing-resistant MFA (WebAuthn/passkeys) so stolen passwords are useless, regular awareness training with simulated campaigns, and a one-click report channel.

## Credential stuffing and password spraying

- [ ] You can explain the difference: stuffing replays stolen username/password pairs from breaches across many sites (exploits password reuse — each account sees only one or two attempts, so per-account lockout barely slows it); spraying tries a few common passwords against many accounts on one site (exploits weak passwords while staying under lockout thresholds).
- [ ] Prevention you can defend: MFA on every password-accepting path, rate limiting per IP and per account with progressive delays or CAPTCHA, breach-password screening at registration and password change, anomaly detection on aggregate login patterns, and lockout policies designed so they cannot be weaponized into account denial-of-service.

## SQL injection (and NoSQL/LDAP/XPath variants)

- [ ] You can explain the mechanism: attacker-controlled input breaks out of a string-built query — union-based appends a second query to exfiltrate other tables, error-based leaks schema through database error messages, boolean/time-based blind infers data one bit at a time when no output is visible; the same shape recurs in NoSQL operator injection (`$ne`, `$where`), LDAP filter injection, and XPath injection wherever untrusted input becomes query syntax.
- [ ] Prevention you can defend: parameterized queries or prepared statements (ORM bound parameters count) for every dynamic value — never string concatenation; least-privilege database accounts; generic error messages to clients. Parameterization is the fix; input validation and WAF are only depth.

## Cross-site scripting (XSS): stored, reflected, DOM-based

- [ ] You can explain the three types: reflected (payload in the request, executed in the immediate response — the attacker needs a lure); stored (payload persisted, executed for every later viewer — the most damaging); DOM-based (client-side JavaScript moves attacker-controlled data into an executable sink such as innerHTML — it never touches the server).
- [ ] Prevention you can defend: context-aware output encoding, framework auto-escaping never bypassed for user input, safe DOM APIs (textContent) instead of innerHTML, sanitization only where rich HTML is genuinely required, and Content Security Policy as defense-in-depth.

## Cross-site request forgery (CSRF)

- [ ] You can explain the mechanism: the victim is logged in and the browser auto-sends cookies, so a hidden form or request on the attacker's page performs a state-changing action on the trusted site as the victim — CSRF exploits ambient authority, not stolen credentials, and needs no technical sophistication once a vulnerable endpoint exists.
- [ ] Prevention you can defend: per-session CSRF tokens validated on every state-changing request, SameSite=Lax or Strict on session cookies, and never performing state changes on GET requests.

## Server-side request forgery (SSRF), including cloud metadata

- [ ] You can explain the mechanism: the attacker controls a URL the server fetches, turning the trusted server into a proxy — reaching localhost, internal services, and cloud metadata endpoints (169.254.169.254), or port-scanning the internal network from the inside; in clouds this becomes credential theft when the metadata service hands out instance role credentials.
- [ ] Prevention you can defend: never fetch raw user-supplied URLs; allow-list schemes, hosts, and ports; resolve DNS and validate the resulting IP against private, link-local, and loopback ranges before and after redirects (TOCTOU-safe: validate the resolved address, not just the hostname); disable redirects where possible; enforce IMDSv2 (metadata requires a PUT token) so a bare GET cannot exfiltrate credentials; enforce outbound network controls.

## Insecure direct object references (IDOR / BOLA)

- [ ] You can explain the mechanism: the attacker swaps an object identifier in the URL or body (or targets nested, batch, or GraphQL resources) to reach someone else's data — authentication proves who you are, never what you own; this is API1:2023, the top API risk.
- [ ] Prevention you can defend: server-side ownership and tenant checks on every object on every method, deny by default, and treat unguessable IDs (UUIDs) as defense-in-depth only — never as the access control. Push the tenancy check into the database query itself — `SELECT * FROM docs WHERE id = ? AND tenant_id = ?` — rather than fetching the row and checking in memory, so a forgotten in-memory check fails closed instead of leaking; DB row-level security (RLS) policies are the strongest version of this.

## API-specific attacks: BOPLA, BFLA, business-flow abuse

- [ ] You can explain mass assignment / broken object property level authorization (API3:2023): the attacker adds unexpected fields (e.g. `role: admin`, `isPaid: true`) to a legitimate request body and the framework binds them onto the model — excessive data exposure is its mirror image, where the API returns fields the client should never see (password hashes, internal flags).
- [ ] You can explain broken function level authorization (API5:2023): admin or internal endpoints reachable by ordinary users because the check lived in the UI rather than the API; and unrestricted access to sensitive business flows (API6:2023): automating legitimate flows at scale — credential validation, coupon redemption, voting, scraping — that were designed for humans.
- [ ] You can explain unsafe consumption of APIs (API10:2023): trusting third-party API responses without validation, turning a compromised upstream into injection or SSRF inside your own system; and improper inventory management (API9:2023): shadow, deprecated, and staging API versions still reachable and still vulnerable.
- [ ] Prevention you can defend: explicit allow-lists of bindable fields per endpoint (never blind model binding), response DTOs that project only the fields the caller may see, authorization checks on every function and verb server-side, rate limits and anomaly detection on business flows, validation of all upstream responses, and a continuously discovered API inventory with old versions decommissioned.

## JWT attacks

- [ ] You can explain the classic bypasses: `alg: none` (server skips verification entirely); algorithm confusion (attacker flips RS256 to HS256 and signs with the public key, which the server then uses as the HMAC secret); weak HMAC secrets cracked offline and reused to forge any token.
- [ ] You can explain header-parameter injection: `kid` resolving to a file path (traversal) or a database lookup (SQL injection in the key fetch); `jku`/`x5u` pointing the server at an attacker-hosted key set (SSRF plus key trust); inline `jwk` where the server trusts an attacker-supplied key over its configured one.
- [ ] You can explain claim abuse: tampered `sub`/`role`/`scope`, cross-service token reuse when `aud`/`iss` are not validated, expired tokens accepted when `exp` is ignored, and ID tokens accepted where access tokens are required.
- [ ] Prevention you can defend: pin the expected algorithm server-side (never read it from the token), reject `none` explicitly, validate `iss`/`aud`/`exp`/`nbf` on every request, never accept `jku`/`x5u`/inline `jwk` from untrusted parties, fetch JWKS over TLS from a fixed allow-listed URL, use strong random HMAC secrets, and keep tokens out of URLs and localStorage.

## OAuth 2.0 / OIDC attacks

- [ ] You can explain the flow attacks: redirect-URI manipulation (registering or abusing a loose match to steal the authorization code), code interception on public clients, PKCE downgrade (stripping `code_challenge` when the server does not enforce it), and CSRF on the login flow itself via missing `state`.
- [ ] Prevention you can defend: exact-match redirect URIs (no wildcards, no open redirectors), authorization code + PKCE enforced for all clients including confidential ones (OAuth 2.1), `state` and `nonce` validated, short-lived codes single-use, and tokens bound to the client via DPoP or mTLS where theft would be catastrophic.

## GraphQL abuse

- [ ] You can explain the discovery attacks: introspection queries exposing the full schema in production, and field-suggestion errors leaking valid field names even with introspection disabled (`"Did you mean 'passwordHash'?"`).
- [ ] You can explain the denial-of-service shapes unique to GraphQL: deeply nested queries over cyclic type relationships, alias amplification (the same expensive field requested under hundreds of aliases in one operation), batching abuse (thousands of operations in one HTTP request, bypassing per-request rate limits), and directive flooding (`@include`/`@skip` storms exhausting the parser).
- [ ] You can explain the authorization gap: missing per-field and per-mutation checks, subscriptions that are never re-authorized after token expiry, and federation setups where the gateway and subgraphs enforce different policies.
- [ ] Prevention you can defend: disable introspection in production and suppress field suggestions, enforce query depth/complexity/cost limits (or persisted-query allowlists — the strongest control), cap batching and aliases, apply rate limits per operation rather than per HTTP request, and authorize every field, mutation, and subscription resolver server-side.

## Remote code execution: command injection and template injection

- [ ] You can explain the mechanisms: command injection concatenates user input into a shell command, so separators (`;`, `&&`, `|`) let the attacker's commands run with the application's privileges; server-side template injection (SSTI) feeds user input into the template engine as source instead of data, so template expressions — and sometimes file access or RCE — execute server-side.
- [ ] Prevention you can defend: never build shell commands from input — use argument-array APIs with no shell, or native libraries, plus strict allow-list validation where input is unavoidable; for templates, keep templates fixed and pass untrusted values only as data, never compiling templates from user input.

## Insecure deserialization

- [ ] You can explain the mechanism: the application rebuilds objects from untrusted bytes (pickle, Java native serialization, PHP unserialize, .NET BinaryFormatter), so a crafted payload triggers gadget chains or magic methods during loading — deserialization is execution, not parsing.
- [ ] Prevention you can defend: never deserialize untrusted input with a type-constructing deserializer — use data-only formats (JSON with a fixed schema) instead; if native serialization is unavoidable, enforce an allow-list of permitted classes (e.g. Java ObjectInputFilter) and cryptographically sign any serialized data you round-trip through clients.

## Local and remote file inclusion (LFI / RFI)

- [ ] You can explain the mechanism: a file path built from user input lets the attacker traverse to sensitive files (`../` to /etc/passwd or application source) — LFI — and escalates to code execution through log poisoning or stream wrappers; RFI includes a remote URL as code when the runtime allows it.
- [ ] Prevention you can defend: map user choices to a fixed allow-list of files using identifiers, never raw paths; canonicalize resolved paths and verify they stay inside the intended directory; disable remote includes (allow_url_include=Off); run with least privilege.

## XML external entity injection (XXE)

- [ ] You can explain the mechanism: a crafted DOCTYPE declares external entities, so the XML parser reads local files, makes network requests (a form of SSRF), or expands nested entities exponentially (billion-laughs denial of service) — all during parsing, before any application logic runs.
- [ ] Prevention you can defend: disable DTD and external-entity processing entirely in every XML parser in the application, prefer libraries safe by default, set entity-expansion limits, and validate XML uploads against a schema.

## Prototype pollution and HTTP request smuggling

- [ ] You can explain prototype pollution: attacker-controlled JSON keys like `__proto__` merge into JavaScript objects and poison every object's prototype, turning a data bug into logic bypass or — with the right gadget — RCE; and request smuggling: frontend and backend disagreeing on where one HTTP request ends and the next begins (Content-Length vs Transfer-Encoding), letting the attacker prepend requests that execute as the next victim's.
- [ ] Prevention you can defend: use `Map` or null-prototype objects for key-value data, freeze prototypes, validate and sanitize keys on merge/recursive-clone paths; for smuggling, reject ambiguous requests outright, normalize to HTTP/1.1 with a single unambiguous framing, and let the edge (CDN/LB) enforce it.

## Prompt injection and LLM/agent attacks

- [ ] You can explain direct prompt injection: attacker input in the user turn overrides system instructions ("ignore previous instructions"), steering the model to leak data or take unauthorized actions; and indirect injection: the payload arrives through retrieved content — a poisoned document, a tool response, a web page — so the model acts on attacker text it was told to trust.
- [ ] You can explain the 2025 LLM attack surface beyond injection: system-prompt leakage (extracting secrets and guardrails from the prompt), excessive agency (an agent with more tools and permissions than its task needs), vector-store poisoning (malicious chunks retrieved and trusted), sensitive-information disclosure through outputs, and unbounded consumption (runaway agent loops burning money).
- [ ] Prevention you can defend: treat all model output as untrusted data — validate before it reaches any sink (browser, SQL, shell); keep secrets and authorization logic out of prompts; scope every tool to least privilege with human confirmation on irreversible actions; filter retrieval per tenant at the query layer; cap tokens, cost, and loop iterations; log and monitor tool calls like any other privileged operation.

## Man in the middle (MITM)

- [ ] You can explain the mechanism: the attacker positions between client and server (ARP spoofing, rogue Wi-Fi access points, DNS spoofing), then reads or alters traffic; SSL stripping downgrades HTTPS to HTTP for victims who never typed https://, and forged certificates only work if the victim ignores the browser warning.
- [ ] Prevention you can defend: HTTPS everywhere with HSTS to kill SSL stripping, TLS 1.2 minimum (prefer 1.3), certificate pinning in first-party and mobile apps, VPN on untrusted networks, and never training users to click through certificate warnings.

## Privilege escalation basics

- [ ] You can explain the two directions: vertical (low-privilege user to root or administrator) and horizontal (user A reaching user B's resources at the same level); the classic vectors are misconfigured sudo entries, abusable SUID binaries and capabilities, writable cron scripts, credentials lying in files and history, and unpatched kernel CVEs — escalation is what turns a foothold into full control.
- [ ] Prevention you can defend: least privilege everywhere (no passwordless sudo to shells or editors, minimal SUID set, no files writable by lower-privileged users that run as root), prompt patching of kernels and services, secrets kept out of files and shell history, and monitoring for anomalous privilege use.

## Supply-chain attacks

- [ ] You can explain the mechanisms: typosquatting (malicious lookalike package names), dependency confusion (a public package shadowing an internal name), compromised maintainer accounts publishing malicious updates, malicious install scripts that run before you ever import the package, and hijacked CI actions — the attacker poisons something you trusted instead of attacking you directly.
- [ ] Prevention you can defend: commit lockfiles and install strictly from them, pin CI actions to SHAs instead of tags, scope internal packages to a private registry, audit new dependencies and run SCA scans in CI, generate an SBOM per release, and require signed builds with provenance verification (Sigstore/SLSA) at admission.

## Sources

- https://github.com/j3ke-developer/claude-red/blob/HEAD/Skills/auth/offensive-jwt/SKILL.md
- https://github.com/anon-divyanth/opencode-backup/blob/HEAD/skills/jwt-attacks/SKILL.md
- https://github.com/purpleailab/decepticon/blob/HEAD/./packages/decepticon/decepticon/skills/standard/exploit/web/jwt/SKILL.md
- https://github.com/ankitsingh015/huntmcp/blob/HEAD/data/writeups/jwt-authentication-bypass.md
- https://github.com/anon-divyanth/opencode-backup/blob/HEAD/skills/graphql-vulnerabilities/SKILL.md
- https://github.com/zenneyy/zen-ai/blob/HEAD/zen/skills/protocols/graphql.md
- https://github.com/pyufz/tgsec-yufeifei/blob/HEAD/domains/api-security/hunter-6000/offensive-graphql/SKILL.md
- https://github.com/joaorafaelalmeida/security-in-software-engineering-the-playbook/blob/HEAD/09-Security-Testing/articles/owasp-api-security-top-10-2023.md
- https://github.com/owasp/devsecopsguideline/blob/HEAD/current-version/2-Process/2-4-Test/2-4-4-API-Security.md
- https://github.com/ai-governance-curriculum/security-learning/blob/HEAD/lessons/mod-107-llm-agent-security/01-owasp-llm-top-10-landscape.md
- https://github.com/patcy-ai/patcypay-assist
- https://github.com/abdulahad-2005/osprey/blob/HEAD/skills/web/oauth-and-jwt.md
