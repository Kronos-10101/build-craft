# Offensive Security — think like an attacker, build like a defender

Scope: how each attack class works from the attacker's point of view and the concrete prevention that kills it — mechanism first, then defense; defensive and explanatory, never operational instructions (checked 2026-09-30).

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

## SQL injection

- [ ] You can explain the mechanism: attacker-controlled input breaks out of a string-built query — union-based appends a second query to exfiltrate other tables, error-based leaks schema through database error messages, boolean/time-based blind infers data one bit at a time when no output is visible.
- [ ] Prevention you can defend: parameterized queries or prepared statements (ORM bound parameters count) for every dynamic value — never string concatenation; least-privilege database accounts; generic error messages to clients. Parameterization is the fix; input validation and WAF are only depth.

## Cross-site scripting (XSS): stored, reflected, DOM-based

- [ ] You can explain the three types: reflected (payload in the request, executed in the immediate response — the attacker needs a lure); stored (payload persisted, executed for every later viewer — the most damaging); DOM-based (client-side JavaScript moves attacker-controlled data into an executable sink such as innerHTML — it never touches the server) (checked 2026-09-30, Wikipedia: Cross-site scripting).
- [ ] Prevention you can defend: context-aware output encoding, framework auto-escaping never bypassed for user input, safe DOM APIs (textContent) instead of innerHTML, sanitization only where rich HTML is genuinely required, and Content Security Policy as defense-in-depth.

## Cross-site request forgery (CSRF)

- [ ] You can explain the mechanism: the victim is logged in and the browser auto-sends cookies, so a hidden form or request on the attacker's page performs a state-changing action on the trusted site as the victim — CSRF exploits ambient authority, not stolen credentials, and needs no technical sophistication once a vulnerable endpoint exists.
- [ ] Prevention you can defend: per-session CSRF tokens validated on every state-changing request, SameSite=Lax or Strict on session cookies, and never performing state changes on GET requests.

## Server-side request forgery (SSRF)

- [ ] You can explain the mechanism: the attacker controls a URL the server fetches, turning the trusted server into a proxy — reaching localhost, internal services, and cloud metadata endpoints, or port-scanning the internal network from the inside.
- [ ] Prevention you can defend: never fetch raw user-supplied URLs; allow-list schemes, hosts, and ports; resolve DNS and validate the resulting IP against private, link-local, and loopback ranges before and after redirects; disable redirects where possible; enforce outbound network controls.

## Insecure direct object references (IDOR / BOLA)

- [ ] You can explain the mechanism: the attacker swaps an object identifier in the URL or body (or targets nested, batch, or GraphQL resources) to reach someone else's data — authentication proves who you are, never what you own.
- [ ] Prevention you can defend: server-side ownership and tenant checks on every object on every method, deny by default, and treat unguessable IDs (UUIDs) as defense-in-depth only — never as the access control.

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

## Man in the middle (MITM)

- [ ] You can explain the mechanism: the attacker positions between client and server (ARP spoofing, rogue Wi-Fi access points, DNS spoofing), then reads or alters traffic; SSL stripping downgrades HTTPS to HTTP for victims who never typed https://, and forged certificates only work if the victim ignores the browser warning.
- [ ] Prevention you can defend: HTTPS everywhere with HSTS to kill SSL stripping, TLS 1.2 minimum (prefer 1.3), certificate pinning in first-party and mobile apps, VPN on untrusted networks, and never training users to click through certificate warnings.

## Privilege escalation basics

- [ ] You can explain the two directions: vertical (low-privilege user to root or administrator) and horizontal (user A reaching user B's resources at the same level); the classic vectors are misconfigured sudo entries, abusable SUID binaries and capabilities, writable cron scripts, credentials lying in files and history, and unpatched kernel CVEs — escalation is what turns a foothold into full control.
- [ ] Prevention you can defend: least privilege everywhere (no passwordless sudo to shells or editors, minimal SUID set, no files writable by lower-privileged users that run as root), prompt patching of kernels and services, secrets kept out of files and shell history, and monitoring for anomalous privilege use.

## Supply-chain attacks

- [ ] You can explain the mechanisms: typosquatting (malicious lookalike package names), dependency confusion (a public package shadowing an internal name), compromised maintainer accounts publishing malicious updates, malicious install scripts that run before you ever import the package, and hijacked CI actions — the attacker poisons something you trusted instead of attacking you directly.
- [ ] Prevention you can defend: commit lockfiles and install strictly from them, pin CI actions to SHAs instead of tags, scope internal packages to a private registry, audit new dependencies and run SCA scans in CI, generate an SBOM per release, and require signed builds with provenance verification at admission.

## Sources

- http://en.wikipedia.org/wiki/Cross-site_scripting
- https://github.com/koadt/oss-oopssec-store/blob/HEAD/content/vulnerabilities/server-side-request-forgery.md
- https://github.com/florianbuetow/claude-code/blob/HEAD/plugins/appsec/shared/frameworks/owasp-api-top10.md
- https://github.com/xizhuomengcontin/vibe-coding-cn/blob/HEAD/research/vibe-cybersecurity-cn/skills/reference-only/anthropic-cybersecurity-skills/skills/testing-api-for-broken-object-level-authorization/SKILL.md
- https://github.com/zalliminal/hunter-blog/blob/HEAD/content/glossary/en/sql-injection.mdx
- https://github.com/anon-divyanth/opencode-backup/blob/HEAD/skills/cross-site-scripting/SKILL.md
- https://github.com/aryanwaghere24/cybersecurity---one-topic-a-day/blob/HEAD/Day-06-Cross-Site-Request-Forgery-CSRF.md
- https://securelayer7.net/learn-pdf/application-security/command-injection.pdf
- https://github.com/cobalthq/cobalt-product-public-docs/blob/HEAD/content/en/BestPractices/prevent-ssti.md
- https://github.com/dependably/dependably-community/blob/HEAD/skills/remediation/fix-unsafe-deserialization/SKILL.md
- https://github.com/ali-hey-0/owasp/blob/HEAD/week5/xxe/xxe.md
- https://github.com/owasp/wstg/blob/HEAD/document/4-Web_Application_Security_Testing/07-Injection/11.1-File_Inclusion.md
- https://github.com/mwakidenis/cybersecurity-threats-guide/blob/HEAD/04-social-engineering/README.md
- https://cybersecuritytime.com/credential-stuffing-vs-password-spraying/
- https://github.com/barrytd/security-lab-portfolio/blob/HEAD/labs/2026-07-04-tryhackme-fundamentals/protocols-and-servers-2.md
- https://github.com/aryanwaghere24/cybersecurity---one-topic-a-day/blob/HEAD/Day-08-Privilege-Escalation.md
- https://github.com/intense-visions/harness-engineering/blob/HEAD/agents/skills/codex/owasp-dependency-security/SKILL.md
- https://github.com/0tieno/securecloudx/blob/HEAD/public/labs/lab-example.md
