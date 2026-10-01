# LLM App Patterns — Production Patterns

Concrete production patterns for LLM apps: wrappers vs frameworks, routing and gateways, structured output, caching, batch, retries, evals, streaming UX, cost control. Checked 2026-09-30.

## Wrappers vs frameworks

- [ ] Default to a thin wrapper (direct API calls + your own loop) when the task is one model call, a fixed pipeline, or a simple tool loop — full control, zero framework overhead.
- [ ] Reach for a framework (LangChain / LangGraph) only when you need what it gives: graph orchestration, checkpointing, multi-agent coordination — not for a chain of two prompts.
- [ ] The wrapper-vs-framework decision is documented: what the framework adds versus its cost (abstraction, version churn, debugging opacity).

## Model routing and gateways

- [ ] Requests routed by complexity, not uniformly: cheap model for FAQ/classification, mid-tier for summarization, flagship only for hard reasoning — expect 40–60% savings vs flagship-everything.
- [ ] The router itself is cheap (heuristics or a small classifier), well under the cost of the call it routes.
- [ ] A gateway centralizes cross-cutting concerns: auth and key rotation, rate limits, logging, caching, guardrails, and cost attribution per team or feature.
- [ ] Fallbacks configured: on provider outage or persistent 5xx, traffic fails over to a secondary provider/model automatically — but a fallback never replays an irreversible tool call unless the action is idempotent or its outcome is already known.
- [ ] Model versions pinned (dated version IDs, not floating aliases); prompt+model versions tied to eval runs; rollouts behind flags with instant rollback; model changes shadow-tested on live traffic before cutover.
- [ ] Cost and latency logged per request (tokens in/out, model id, milliseconds); per-feature budgets with alerts at 70/90/100% of spend.

## Structured output — constrained decoding, not prompt-and-pray

- [ ] Native constrained decoding used whenever downstream code parses the output — never regex-parse free text.
- [ ] **OpenAI**: `response_format: { type: "json_schema", strict: true }` (Chat Completions) or `text.format` (Responses API).
- [ ] OpenAI strict-mode rules: `additionalProperties: false` everywhere and **all** properties in `required` (optional fields become `type: ["T", "null"]`); value-constraint keywords (`pattern`, `minimum`, `maximum`, `minLength`, `format`) are accepted but **not enforced**; nesting ≤ 5 levels.
- [ ] **Anthropic**: structured outputs GA (2026) — `output_config.format: { type: "json_schema" }` plus `strict: true` on tools.
- [ ] Anthropic limits are sharper than OpenAI's: no recursive schemas, no external `$ref`, no `minimum`/`maximum`/`minLength`/`maxLength`, `additionalProperties` must be `false`, max 20 strict tools; first-use grammar compilation can take up to 180s and is cached 24h — warm it before latency-sensitive traffic.
- [ ] **Gemini**: `responseJsonSchema` + `responseMimeType: "application/json"` — guarantees syntactically valid JSON, not semantic correctness.
- [ ] Provider quirks checked before shipping: e.g. some providers make structured output and `stream: true` mutually exclusive — verify streaming works with your chosen mode.
- [ ] Schemas are designed to be constraint-satisfiable: strict subsets enforced on both sides, because constrained decoding guarantees structure, not that the answer is right.
- [ ] Validation failures trigger one guided retry (the error message goes back to the model), then a defined fallback path — dead-letter queue, human review, or a safe default — never silent garbage.

## Prompt caching — prefix stability is the whole game

- [ ] Long stable prefixes (system prompt, few-shot examples, tool definitions) placed first so provider prompt caching hits; variable content (timestamps, user IDs, live state) goes last — one dynamic byte before the cacheable region busts the entire prefix.
- [ ] **Anthropic**: explicit `cache_control: { type: "ephemeral" }` breakpoints (max 4 per request), cache hierarchy tools → system → messages.
- [ ] Anthropic TTL and pricing: default TTL is **5 minutes** (changed from 1h on 2026-03-06), `1h` TTL available at 2x write cost; writes cost 1.25x/2x, reads cost 0.1x; minimum cacheable prefix is model-dependent (**1024–4096 tokens**) and silently no-ops below it.
- [ ] **OpenAI**: automatic prefix caching, no code needed — ≥1024 tokens, ~50% discount (up to ~90% on gpt-5.x), TTL 5–10 min.
- [ ] `prompt_cache_key` keeps cache routing stable across turns; `prompt_cache_retention: "24h"` available on newer models.
- [ ] Anthropic break-even is ~2 reads within the TTL at 5-min pricing — a prompt called once per hour should use the 1h TTL or skip caching, not pay the write surcharge for nothing.
- [ ] Changing tool definitions or the model invalidates the whole cache; changing `tool_choice` or toggling thinking/images invalidates messages only — tool definitions are kept stable across turns in agentic loops.
- [ ] Cache hit rate monitored via usage fields (`cache_read_input_tokens` / `cache_creation_input_tokens`, `cached_tokens`): high creation with zero reads means the prefix is unstable or the TTL is being missed — fix the layout, don't add more breakpoints.

## Semantic caching

- [ ] A semantic cache (embedding similarity over past Q/A pairs) sits in front of the LLM for repeated or similar queries; hits skip the model entirely.
- [ ] The similarity threshold is tuned on real traffic: too low serves wrong answers, too high yields no hits; cached answers carry the source prompt hash for audit.
- [ ] Cache entries have TTLs and invalidation on underlying data change; user-scoped data is never served cross-user.

## Batch APIs — the half-price lane

- [ ] Any workload whose output isn't needed within ~5 minutes goes to a **batch API**, not real-time: OpenAI, Anthropic, and Gemini all offer ~50% off standard token prices with a 24h completion SLA (typical P50 is hours, not a day).
- [ ] Batch shapes differ per provider (inline arrays vs uploaded JSONL files, status vocabularies, result retrieval as JSONL files) — the submission/retrieval layer is provider-specific code behind one internal interface.
- [ ] The known traps are handled: batch has its own separate rate-limit budget; failures are per-row, not per-batch — row-level status is parsed, never fail the whole job on 12 bad rows out of 10,000.
- [ ] Prompt caching does not stack with batch on OpenAI, so the cost model compares cached-real-time vs batch explicitly before choosing the lane.
- [ ] Batch jobs are idempotent and resumable: re-running a job after a partial failure doesn't duplicate work or double-bill.

## Retries with backoff on 429s

- [ ] Retries only on retryable errors (429 transient, 5xx, 529 overloaded, timeouts, connection errors) — never on 400/401/403/404; a 401 pages someone, it doesn't retry.
- [ ] A quota-exhaustion 429 (daily cap, spend limit) is **not** retried blindly — it queues for the reset window or escalates; only transient throttling gets backoff.
- [ ] The `Retry-After` header is honored as the minimum wait on 429s before falling back to local backoff math.
- [ ] Backoff is capped exponential with full jitter (`min(cap, base * 2^attempt)` plus random jitter), max ~3–5 attempts.
- [ ] Every retry loop carries an overall task deadline so retries can't run forever or in lockstep across workers.
- [ ] SDK retry defaults are set explicitly (`max_retries` forwarded to the Anthropic/OpenAI clients — their defaults are 2 and silently under-configure) rather than assumed.
- [ ] A retry budget caps retries as a fraction of traffic (e.g. ≤10% of requests may be retries) so a provider outage doesn't become a self-inflicted DDoS; a circuit breaker trips to the fallback provider past the budget.
- [ ] Proactive throttling: `x-ratelimit-remaining-*` headers are read (via raw-response access) and the client backs off at ~20% remaining capacity instead of waiting to get 429'd.

## Eval-driven iteration

- [ ] A golden eval set (50–200 cases sampled from real usage) exists before prompt or model changes; every change is measured against it — quality, cost, and latency jointly.
- [ ] CI gates on evals: the change fails if success rate drops >5% vs baseline or cost per task rises >20%.
- [ ] Every production failure becomes a new eval case; the set is versioned; evals are wired into the change workflow or deleted.
- [ ] Prompt templates versioned in git (never inline strings); each version linked to the eval run that approved it.
- [ ] Guardrails on the request path before real users arrive: input injection screening and output PII/toxicity checks.
- [ ] Model or provider swaps go through the eval gate plus shadow traffic — never straight to production on a changelog promise.

## Streaming UX

- [ ] Token streaming enabled for user-facing generation (SSE / WebSocket); time-to-first-token tracked as a metric with an alert threshold.
- [ ] The UI handles the full stream lifecycle: partial render, cancellation, mid-stream errors, and retry — not just the happy path.
- [ ] Tool calls and structured outputs stream as discrete events the UI renders progressively, not as one blocked response.
- [ ] Client disconnect cancels the in-flight request server-side — the model doesn't keep burning tokens into a closed socket.
- [ ] Partial structured-output fragments are validated only at stream end; the UI never acts on an incomplete fragment.

## Cost and latency management

- [ ] Per-request telemetry is the minimum: tokens in/out, cache read/write split, model id, latency, retry count — joined to the feature and team that spent it.
- [ ] Context is budgeted: a max input-token cap per request class with truncation/summarization policy, so a pathological conversation can't spend unboundedly.
- [ ] A client-side token bucket (admission control) sits ahead of provider limits for high-fanout workloads, smoothing bursts instead of eating 429s.
- [ ] Output tokens are the expensive half of most bills — verbosity is budgeted and capped per request class, not just inputs.
- [ ] Non-interactive bulk work is routed to batch (see above) before any other cost optimization is attempted — it's the largest single lever.

## Sources

- https://github.com/navapbc/rebar/blob/HEAD/docs/experiments/workflow-remediation-pocs/structured-output-research.md
- https://github.com/betalyra/effect-uai/blob/HEAD/plans/structured-outputs.md
- https://github.com/jtrefon/compass/blob/HEAD/Documentation/provider-context-caching-research.md
- https://github.com/tschuehly/pi-workbench/blob/HEAD/docs/research/sources/prompt-cache-economics.md
- https://github.com/mitchins/smolrouter/blob/HEAD/docs/PROPOSAL_offline_batch_corralling.md
- https://github.com/kalilurrahman/kr-token-ops-hub/blob/HEAD/public/library/trends/batch-api-arbitrage-2026.md
- https://github.com/mamta352/ailearnings/blob/HEAD/source/blog/posts/llm-rate-limits.md
- https://github.com/sigilipelli/llm-dev-mastery-path/blob/HEAD/docs/level-1/08-errors-rate-limits-cost.md
