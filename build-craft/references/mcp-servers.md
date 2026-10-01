# MCP Servers — Building Model Context Protocol Servers

Concrete rules for building correct, secure, testable MCP servers against the current spec: protocol basics, primitives, transports, stateless design, auth, errors, testing, deployment, injection defense. Checked 2026-09-30 against spec revision `2026-07-28`.

## Spec currency and protocol basics

- [ ] The server targets a dated spec revision and declares which one: current is **`2026-07-28`** (previous: `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`) — no "latest" hand-waving in code or docs.
- [ ] `2026-07-28` is **stateless**: the `initialize`/`notifications/initialized` handshake is gone; every request carries its protocol version and client capabilities in `params._meta` (`io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities`).
- [ ] Servers **MUST** implement `server/discover` to advertise supported protocol versions, capabilities, and identity; clients may call it as a backward-compatibility probe.
- [ ] Every result carries `resultType` (`"complete"` for ordinary results, `"input_required"` for multi-round-trip interim results); servers on older revisions omit it and clients treat that as complete.
- [ ] MCP owns JSON-RPC error codes `-32020`–`-32099` (`-32020` HeaderMismatch, `-32021` MissingRequiredClientCapability, `-32022` UnsupportedProtocolVersion); `-32000`–`-32019` stays implementation-defined — you never invent codes inside the spec range.

## The three primitives — expose the right one

- [ ] **Tools** (model-controlled): the model decides when to call — DB queries, API calls, file writes, anything with side effects or discovered-at-runtime lookups.
- [ ] **Resources** (app-controlled): the client/app injects context — file contents, schemas, config the app curates; the model never invokes them.
- [ ] **Prompts** (user-controlled): reusable templated workflows ("review this code", "triage this ticket") the user picks explicitly.
- [ ] Rule of thumb: side effects → tools; curated read-only context → resources; canned multi-step instructions → prompts. A read-only lookup the model discovers on its own is a tool, not a resource.
- [ ] No primitive smuggling: prompts never embed hidden tool-call scripts, and tool results never contain "now call tool X" instructions to the model.

## Transports — stdio or Streamable HTTP, nothing else

- [ ] Exactly two transports exist: **stdio** (local) and **Streamable HTTP** (remote). The old **HTTP+SSE** transport (dual endpoints + sessions) is **deprecated** — new integrations target Streamable HTTP only.
- [ ] stdio chosen when client and server run on the same machine: client spawns the process; each message is one newline-delimited JSON object; the server **never** writes non-protocol content to stdout (stdout corruption breaks the wire) and logs to stderr; the server exits promptly when stdin closes.
- [ ] Streamable HTTP chosen when the server must be reachable over the network: one endpoint, POST per JSON-RPC message, optional SSE (`text/event-stream`) responses; no `Mcp-Session-Id`, no sessions, safe behind plain load balancers.
- [ ] Streamable HTTP servers require `Mcp-Method`/`Mcp-Name` request headers; non-POST access to the endpoint returns `405`; a mismatched `Origin` header returns `403`.
- [ ] Streaming responses send SSE keep-alive comment lines (starting with `:`) and set `X-Accel-Buffering: no` so proxies don't swallow the stream; SSE resumability (`Last-Event-ID`) is removed — a broken stream means the client re-issues the request with a new ID.
- [ ] Timeouts and max message sizes configured on both transports; a hung tool call returns an error or is cancelled instead of hanging the client forever.

## Remote multi-tenant servers (added 2026-10-01)

- [ ] Tenant identity comes from per-request auth context, never from connection state: under the stateless revision every request carries its own authorization, so tool sets, rate-limit buckets, and handle authorizations are keyed to the authenticated tenant on each call — connection-scoped tenant memory is a defect.
- [ ] Handles are tenant-bound: a handle minted under one tenant's credentials fails authorization under another's, returning a tool execution error naming the tenant mismatch so the model re-creates the handle under the correct tenant.
- [ ] Tool-list narrowing per tenant is tested: the in-memory client test asserts that two tenants' credentials see different tool sets and cannot reach each other's handles.
- [ ] SSE streaming responses are bounded per request: keep-alive comment lines and `X-Accel-Buffering: no` per the Transports section, plus a stream duration cap so one tenant's long-lived stream cannot starve others — a broken stream is re-issued with a new ID, never resumed via `Last-Event-ID`.

## Stateless design — handles, not sessions

- [ ] No per-connection state: list endpoints (`tools/list`, `resources/list`, `prompts/list`) never vary per connection; tool sets may vary by the authorization presented on the request, never by connection.
- [ ] Cross-call state uses explicit server-minted handles passed as ordinary tool arguments (e.g. `basket_id`): the model carries the handle forward, the server looks it up per call.
- [ ] Handles are validated on every call: authorization checked against the handle each time; unauthenticated handles carry enough entropy (e.g. UUIDv4) and a bounded lifetime stated in the creating tool's description.
- [ ] Expired or unknown handles return a tool execution error naming the problem so the model can recover by creating a new one — never a bare protocol error.
- [ ] Multi-round-trip interactions (confirmation, elicitation) follow the MRTR pattern: the server returns `resultType: "input_required"` with `inputRequests`, and the client retries the original request with `inputResponses` — the server never initiates its own JSON-RPC requests.

## Deprecated features — treat as migration debt

- [ ] **Roots, Sampling, and Logging** are formally Deprecated with a twelve-month window (2026-07-28): new servers do not add support for them.
- [ ] Roots → pass directories/files as tool parameters, resource URIs, or server config. Sampling → call the LLM provider API directly. Logging → stderr (stdio) or OpenTelemetry.
- [ ] OAuth 2.0 Dynamic Client Registration (RFC 7591) is deprecated in favor of **Client ID Metadata Documents** — new auth integrations use CIMD.
- [ ] Code review flags any use of the deprecated surface as migration debt even though it still works today.

## SDKs and version currency

- [ ] Python: the standalone **`fastmcp`** package (`from fastmcp import FastMCP`) is the current high-level path (v4.0.10 on PyPI, checked 2026-09-30) — **`from mcp.server.fastmcp import FastMCP` was removed in `mcp` 2.0.0** (PyPI `mcp` 2.2.0); imports from the old path break on install.
- [ ] The official Python SDK v1 line ends at `1.29.1` (maintenance/security only); v2 (`mcp` ≥ 2.0) speaks `2026-07-28`. The standalone FastMCP v4 line tracks the current spec; verify the exact line before pinning.
- [ ] TypeScript: the old single package `@modelcontextprotocol/sdk` (1.31.0 on npm) is the **legacy** line, capped at protocol `2025-11-25`; the current line is the split packages `@modelcontextprotocol/server` + `/client` + `/core` at 2.2.0, implementing `2026-07-28`.
- [ ] Upgrading the dependency is not the same as speaking the new revision: confirm the negotiated protocol version with a live handshake, never with a version number.
- [ ] Dependencies pinned with a lockfile; changelogs record tool additions, removals, and schema changes.

## Tools — schemas, annotations, deterministic output

- [ ] Every tool input validated against a strict schema (Pydantic / Zod): types, ranges, enums, string patterns, no extra properties; `inputSchema` is a valid JSON Schema object (defaults to 2020-12), using `{ "type": "object", "additionalProperties": false }` for parameterless tools.
- [ ] Validation failures are **tool execution errors**, not protocol errors: returned in the tool result with `isError: true`, naming the field and the reason in terms the model can self-correct from — never raw tracebacks.
- [ ] Tool descriptions are complete sentences stating purpose plus when (not) to use the tool; parameter descriptions state units, formats, and constraints; no hidden instructions anywhere in the metadata.
- [ ] Tool behavior hints set where the SDK supports them: mark read-only tools read-only, idempotent tools idempotent, destructive tools destructive — clients and gateways use these for confirmation and policy decisions.
- [ ] `tools/list` returns tools in a **deterministic order** across requests when the set is unchanged (enables client caching and improves LLM prompt-cache hit rates when tools sit in model context).
- [ ] Tools that return machine-readable data also declare `outputSchema` so clients can validate `structuredContent` against it.
- [ ] Untrusted string inputs are never interpolated into shell commands, SQL, or file paths — parameterize, allowlist, or sandbox instead.

## Error handling — two channels, never leaks

- [ ] Protocol errors (JSON-RPC: unknown tool, malformed request, server errors) versus tool execution errors (`isError: true`: API failures, validation failures, business-logic failures) are kept distinct and tested separately.
- [ ] Tool errors distinguish transient from permanent failures so the model knows whether retrying is sane (transient: rate-limited, upstream 5xx; permanent: bad input, permission denied).
- [ ] No stack traces, file paths, credentials, or internal hostnames in any error surfaced to the model or client; internal detail goes to server logs.
- [ ] Resource-not-found surfaces as JSON-RPC `-32602` (Invalid Params) per the current spec, not a legacy `-32002`.

## Auth for remote servers

- [ ] Remote (HTTP) servers require auth: OAuth 2.1 or bearer API keys in headers; stdio local servers rely on OS user permissions — never the reverse.
- [ ] OAuth 2.1 resource-server posture: RFC 9728 protected-resource metadata for authorization-server discovery; RFC 8707 resource indicators so tokens are audience-bound to the specific MCP server; credentials keyed by issuer and never reused across authorization servers; a present `iss` (RFC 9207) validated before redeeming an authorization code.
- [ ] OAuth scopes are minimal (read-only scope for read tools); credentials are per-server, never shared across servers; short-lived tokens preferred; tool lists may narrow to the caller's granted scopes.
- [ ] Secrets come from env vars or a secret manager — never committed, never embedded in tool descriptions or resources.

## Testing an MCP server

- [ ] Unit tests per tool with mocked backends; schema validation tested with valid, invalid, and adversarial inputs (injection strings, oversized payloads, type confusion).
- [ ] In-memory client test: server plus test client spun up in-process (no ports) exercising tools, resources, and prompts end to end, including `server/discover` and a stateless round-trip.
- [ ] A handshake test asserts the exact negotiated protocol revision — SDK version numbers alone don't prove which revision is on the wire.
- [ ] Tool descriptions reviewed by a human for clarity and for hidden-instruction injection before every release.
- [ ] CI runs a deprecation scan: Roots/Sampling/Logging capabilities, HTTP+SSE usage, and DCR all fail the build as migration debt.

## Observability and deployment

- [ ] Structured logs per tool call: tool name, arguments (secrets redacted), latency, outcome, request id — correlatable with the client's trace; OpenTelemetry trace context propagates via `_meta` (`traceparent`, `tracestate`, `baggage`).
- [ ] List/read results carry `ttlMs` (freshness hint, milliseconds) and `cacheScope` (`"public"`/`"private"`) so clients and intermediaries can cache safely.
- [ ] Remote servers expose a health/status signal so operators see liveness without invoking business tools.
- [ ] Resource limits set: CPU/memory caps, request timeouts, per-client rate limits; tool invocations rate-limited at the server per the spec's security requirements.
- [ ] Local servers run with the least OS privilege needed; sandboxed (container) when they touch untrusted data.

## Security — tool poisoning and least privilege

- [ ] Tool descriptions treated as untrusted model input surface: no hidden instructions, no "ignore previous instructions", no exfiltration directives — reviewed before publishing.
- [ ] Tool outputs treated as data, never instructions: the server never emits text telling the model to call other tools or reveal secrets; outputs are sanitized.
- [ ] Least-privilege tools: each tool can only do its own job (a weather tool cannot read files); destructive tools gated behind explicit confirmation; clients show tool inputs to the user before calling to prevent silent exfiltration.
- [ ] Tool definitions pinned or hashed by clients where supported, so a server update cannot silently rug-pull a tool's behavior.

## Sources

- https://modelcontextprotocol.io/specification/2026-07-28/changelog
- https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- https://github.com/tenequm/skills/blob/HEAD/skills/mcp-best-practices/references/spec-2026-07-28.md
- https://github.com/uwuclxdy/agenticat/blob/HEAD/skills/mcp-stateless/references/sdks.md
- https://github.com/mitre/mcp/blob/HEAD/docs/fastmcp-upgrade-plan.md
- https://github.com/redis/mcp-redis/issues/163
