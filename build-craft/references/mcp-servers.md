# MCP Servers — Building Model Context Protocol Servers

Concrete rules for building correct, secure, testable MCP servers: protocol basics, primitives, transports, auth, testing, deployment. Checked 2026-09-30.

## Protocol basics

- [ ] MCP is JSON-RPC 2.0 over a transport; every message carries `jsonrpc`, `id`/`method`/`params` or `result`/`error` — malformed messages get JSON-RPC error responses, never crashes.
- [ ] Capabilities negotiation happens at initialize: the server declares what it offers (tools, resources, prompts); the client declares what it supports (sampling, roots).
- [ ] The server advertises a name and version; version bumps follow semver so clients can detect breaking tool changes.

## The three primitives — expose the right one

- [ ] **Tools** (model-controlled): expose when the model should decide to call something to act or fetch — DB queries, API calls, file writes. The model chooses when.
- [ ] **Resources** (app-controlled): expose when the client/app should inject context — file contents, schemas, config. The client chooses what to attach; the model never invokes them.
- [ ] **Prompts** (user-controlled): expose reusable templated workflows — "review this code", "summarize this ticket". The user picks them explicitly.
- [ ] Rule of thumb: side effects → tools; read-only context the app curates → resources; canned multi-step instructions → prompts. A read-only lookup the model discovers on its own is a tool, not a resource.

## Transports

- [ ] **stdio** for local servers: the client spawns the process; simplest, no network surface; chosen when server and client run on the same machine.
- [ ] **Streamable HTTP** for remote servers: chosen when the server must be reachable over the network or shared across machines.
- [ ] HTTP servers are stateless-safe or document their session handling explicitly; no reliance on sticky in-memory state unless sessions are part of the design.
- [ ] Timeouts and max message sizes configured on both transports; a hung tool call never hangs the client forever.

## SDKs

- [ ] Python: **FastMCP** (`from mcp.server.fastmcp import FastMCP`) — decorators turn typed functions into tools; type hints generate input schemas automatically.
- [ ] TypeScript: the official **@modelcontextprotocol/sdk** (or FastMCP-ts) — Zod schemas define tool inputs.
- [ ] Tool descriptions are complete sentences stating purpose plus when to use the tool; parameter descriptions state units, formats, and constraints.

## Input validation

- [ ] Every tool input validated against a strict schema (Pydantic / Zod): types, ranges, enums, string patterns, `additionalProperties: false`.
- [ ] Validation failures return structured MCP errors naming the field and the reason — never raw tracebacks.
- [ ] Untrusted string inputs are never interpolated into shell commands, SQL, or file paths (parameterize, allowlist, or sandbox instead).

## Auth for remote servers

- [ ] Remote (HTTP) servers require auth: OAuth 2.1 or API keys in headers; stdio local servers rely on OS user permissions.
- [ ] OAuth scopes are minimal (read-only scope for read tools); credentials are per-server, never shared across servers; short-lived tokens preferred.
- [ ] Secrets come from env vars or a secret manager — never committed, never embedded in tool descriptions.

## Error handling, logging, observability

- [ ] Tool errors return MCP error objects with codes and messages; transient vs permanent failures distinguished so the model knows whether to retry.
- [ ] Structured logs per tool call: tool name, arguments (secrets redacted), latency, outcome — correlatable with the client's trace.
- [ ] Remote servers expose a health/status signal so operators can see liveness without invoking business tools.

## Testing an MCP server

- [ ] Unit tests per tool with mocked backends; schema validation tested with valid, invalid, and adversarial inputs.
- [ ] In-memory client test: server plus test client spun up in-process (no ports) exercising tools, resources, and prompts end to end.
- [ ] Tool descriptions reviewed by a human for clarity and for hidden-instruction injection before every release.

## Deployment checklist

- [ ] Pinned dependencies with a lockfile; versioned releases; changelog entries for tool additions, removals, and schema changes.
- [ ] Resource limits set: CPU/memory caps, request timeouts, per-client rate limits.
- [ ] Local servers run with the least OS privilege needed; sandboxed (container) when they touch untrusted data.

## Security — prompt injection via tools

- [ ] Tool descriptions treated as untrusted model input: no hidden instructions, no "ignore previous instructions", no exfiltration directives — reviewed before publishing.
- [ ] Tool outputs treated as data, never instructions: the server never emits text telling the model to call other tools or reveal secrets.
- [ ] Least-privilege tools: each tool can only do its own job (a weather tool cannot read files); destructive tools gated behind confirmation.
- [ ] Tool definitions pinned or hashed by clients where supported, so a server update cannot silently rug-pull a tool's behavior.

## Sources

- https://en.wikipedia.org/wiki/Model_Context_Protocol
- https://github.com/opentidehq/opentide/blob/HEAD/.agents/skills/python-mcp-server-generator/SKILL.md
- https://github.com/chaitanyagiri/munder-difflin/blob/HEAD/blog/src/posts/mcp-security-tool-poisoning.md
- https://github.com/joaoariedi/hefesto/blob/HEAD/skills/mcp-security/SKILL.md
