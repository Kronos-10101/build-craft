# LLM App Patterns — Production Patterns

Concrete production patterns for LLM apps: wrappers vs frameworks, routing and gateways, structured output, caching, retries, evals, streaming UX. Checked 2026-09-30.

## Wrappers vs frameworks

- [ ] Default to a thin wrapper (direct API calls + your own loop) when the task is one model call, a fixed pipeline, or a simple tool loop — full control, zero framework overhead.
- [ ] Reach for a framework (LangChain / LangGraph) only when you need what it gives: graph orchestration, checkpointing, multi-agent coordination — not for a chain of two prompts.
- [ ] The wrapper-vs-framework decision is documented: what the framework adds versus its cost (abstraction, version churn, debugging opacity).

## Model routing and gateways

- [ ] Requests routed by complexity, not uniformly: cheap model for FAQ/classification, mid-tier for summarization, flagship only for hard reasoning — expect 40–60% savings vs flagship-everything.
- [ ] The router itself is cheap (heuristics or a small classifier), well under the cost of the call it routes.
- [ ] A gateway centralizes cross-cutting concerns: auth and key rotation, rate limits, logging, caching, guardrails, and cost attribution per team or feature.
- [ ] Fallbacks configured: on provider outage or persistent 5xx, traffic fails over to a secondary provider/model automatically.
- [ ] Model versions pinned (dated version IDs, not floating aliases); prompt+model versions tied to eval runs; rollouts behind flags with instant rollback.
- [ ] Cost and latency logged per request (tokens in/out, model id, milliseconds); per-feature budgets with alerts at 70/90/100% of spend.

## Structured output

- [ ] JSON mode or function calling used whenever downstream code parses the output — never regex-parse free text.
- [ ] Schemas are strict (required fields, enums, no additional properties); validation failures trigger one guided retry, then a defined fallback path.
- [ ] Constrained decoding (grammar / JSON-schema-constrained generation) used where the serving stack supports it — guarantees instead of hope.

## Prompt caching

- [ ] Long stable prefixes (system prompt, few-shot examples, tool definitions) placed first so provider prompt caching hits; variable content goes last.
- [ ] Cache hit rate monitored; a cache that never hits is misconfigured — check prefix stability and cache TTL semantics.

## Semantic caching

- [ ] A semantic cache (embedding similarity over past Q/A pairs) sits in front of the LLM for repeated or similar queries; hits skip the model entirely.
- [ ] The similarity threshold is tuned on real traffic: too low serves wrong answers, too high yields no hits; cached answers carry the source prompt hash for audit.
- [ ] Cache entries have TTLs and invalidation on underlying data change; user-scoped data is never served cross-user.

## Retries with backoff on 429s

- [ ] Retries only on retryable errors (429, 5xx, timeouts) — never on 4xx validation errors.
- [ ] Exponential backoff with jitter; the `Retry-After` header honored when present; max ~3–5 attempts.
- [ ] A retry budget caps retries as a fraction of traffic so a provider outage does not become a self-inflicted DDoS.

## Eval-driven iteration

- [ ] A golden eval set (50–200 cases sampled from real usage) exists before prompt or model changes; every change is measured against it.
- [ ] CI gates on evals: the change fails if success rate drops >5% vs baseline or cost per task rises >20%.
- [ ] Every production failure becomes a new eval case; the set is versioned; evals are wired into the change workflow or deleted.
- [ ] Prompt templates versioned in git (never inline strings); each version linked to the eval run that approved it.
- [ ] Guardrails on the request path before real users arrive: input injection screening and output PII/toxicity checks.

## Streaming UX

- [ ] Token streaming enabled for user-facing generation (SSE / WebSocket); time-to-first-token tracked as a metric.
- [ ] The UI handles the full stream lifecycle: partial render, cancellation, mid-stream errors, and retry — not just the happy path.
- [ ] Tool calls and structured outputs stream as discrete events the UI renders progressively, not as one blocked response.

## Sources

- https://github.com/fabiandistler/agents/blob/HEAD/skills/llm-application-engineering/SKILL.md
- https://github.com/rubonal4649/ai-engineering-from-scratch/blob/HEAD/phases/11-llm-engineering/13-production-app/docs/en.md
- https://neuraltrust.ai/blog/ai-gateway-llm-cost-optimization
- https://github.com/ather-techie/ai-system-design-interview/blob/HEAD/2-system-design/README.md
