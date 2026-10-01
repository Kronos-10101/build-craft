# AI Agents — Building Agentic Systems

Pass/fail rules for constructing tool-using agents: the loop, tools, error handling, stop conditions, memory, planning mode, human checkpoints, and framework choice. Construction discipline — not reasoning theory. Checked 2026-09-30.

## The agent loop (perceive → reason → act → observe)

- [ ] The loop is explicit in code: perceive state → reason (LLM call) → act (tool dispatch) → observe result → repeat. No hidden implicit loops.
- [ ] The model never executes anything directly — it emits a structured tool request; the harness (your code) runs it and feeds the result back.
- [ ] Exit conditions are enumerated in code, not implied: a final-output tool call, a model turn with no tool call, an unrecoverable error, or a budget cap reached.
- [ ] Start at the simplest point on Anthropic's ladder (augmented LLM → workflow → agent); promote to full model-directed looping only when the path cannot be written in advance.
- [ ] State is a single explicit object (messages + scratchpad + step count) passed between iterations, never implicit globals.
- [ ] No model token becomes control flow on safety-critical branches: retry limits, approval checks, and budget checks are deterministic code around the model, not prompts.
- [ ] Tool outputs are treated as data, never as instructions: content returned by tools cannot silently re-route the plan (prompt-injection surface).
- [ ] Parallel tool calls have a concurrency cap and shared deadline; a fan-out of tool calls can itself exceed the run budget.
- [ ] The run ends with a deterministic teardown: open sessions closed, temp resources released, final state persisted — not left to the model's discretion.

## Tools / function calling done right

- [ ] Few, thoughtful tools — not one per API endpoint: consolidate related operations into a single tool (e.g. one `schedule_event`, not `list_users` + `list_events` + `create_event`), per Anthropic's tool-design guidance.
- [ ] Related tools are namespaced with a shared prefix (`asana_search`, `jira_search`); namespacing measurably reduces tool-selection errors.
- [ ] Tool descriptions say what the tool does AND when to use it versus the other tools — written as if explaining to a new teammate; small description refinements measurably move tool-selection accuracy.
- [ ] Every tool has a JSON Schema input definition with types, required fields, enums, and `additionalProperties: false`.
- [ ] Tool count is small (rule of thumb ≤ 8–12 per agent); overlapping tools are merged — more tools means worse tool selection.
- [ ] Long or noisy tools accept a `response_format` (`detailed` | `concise`) enum and default to the compact form.
- [ ] Pagination, range selection, and truncation are built into tool results with sensible defaults; the model is steered toward efficient reads, not unbounded dumps.
- [ ] Every tool returns structured results (typed dict / pydantic model) with an explicit `ok` flag, a machine-readable error code, and a `retryable` flag.
- [ ] Side-effecting tools are idempotent where possible (client-supplied idempotency keys) so retries are safe.
- [ ] Tool arguments are validated against the schema by the harness before execution — a schema-invalid call fails fast with the validation error fed back, not passed to the tool.
- [ ] Tool results are scrubbed of secrets and PII before entering the context window; the model never sees raw credentials even when a tool returns them.
- [ ] Independent tool calls are batched in parallel in one model turn instead of sequential rounds.

## Tool failures and error-handling schemas

- [ ] Tool errors are fed back to the model as observations with what failed and a suggested next action — never raised as exceptions that kill the loop.
- [ ] Error messages steer recovery: they say how to fix the call (e.g. "pass a cursor, not an offset") rather than emitting opaque codes alone.
- [ ] The error schema is stable across every tool (`ok`, `code`, `message`, `retryable`, `suggested_fix`) so the agent branches on codes without parsing prose.
- [ ] Retries happen only for `retryable` codes, with bounded attempts and backoff; a tool that fails persistently trips a circuit breaker that stops the agent instead of hammering a dead tool.
- [ ] Every tool call has its own timeout; a hung tool returns a timeout observation, never a frozen loop.
- [ ] Code-execution tools run in a sandbox (dedicated interpreter, container, or e2b-style remote sandbox) — never on the host with ambient credentials.
- [ ] Partial failures are resumable: completed steps' results persist in state, so a retried run does not redo side effects.

## Stop conditions, stagnation, and budgets

- [ ] Every loop has hard stop conditions: max steps (e.g. 25), max wall-clock time, max tokens, max cost per run — checked before each iteration, not after.
- [ ] Stagnation detection exists: if the last N actions produced no new information (same tool, same args, same observation), the loop breaks and escalates.
- [ ] Divergence detection exists: no goal-progress signal for K consecutive steps means the agent is wandering, not converging — break and escalate.
- [ ] Budgets are measured in production and enforced, not assumed: cost per run is logged alongside steps and tokens.
- [ ] Infinite-retry prevention: repeated identical failures escalate to a human or fail outright, never loop silently.

## Memory types and context hygiene

- [ ] Short-term (working) memory: current conversation + recent tool results inside the context window; truncated or summarized under a documented policy when it grows.
- [ ] Long-term semantic memory: durable facts (user preferences, project conventions) in a vector or KV store, retrieved by relevance — used when knowledge must persist across sessions.
- [ ] Episodic memory: past trajectories (what was tried, what worked) — used for self-improvement loops and debugging recurring failures.
- [ ] Memory writes are explicit decisions (agent or code chooses what to store), never automatic logging of everything — unbounded memory is unbounded cost and noise.
- [ ] Retrieved memory is attributable (the agent can say which memory influenced a decision); stale memories carry TTLs or invalidation rules.
- [ ] The context-hygiene policy is written down: which old observations get compacted or dropped first (superseded search results before tool schemas before the goal itself).
- [ ] Tool results stay terse: the agent extracts the fields it needs and never re-reads megabytes of raw tool output to find one field.
- [ ] Procedural memory is separated from episodic and semantic: durable how-to knowledge (SKILL.md files, tool definitions, playbooks, runbooks) is versioned and loaded per agent like code, not smeared across prompts — the agent knows *how* from procedure, *what happened* from episodic memory, and *what is true* from semantic memory.
- [ ] The three layers carry distinct write policies: procedural changes go through review and versioning; semantic facts carry TTLs and attribution; episodic trajectories are append-only logs for debugging and self-improvement — one store pretending to be all three is a defect.

## Delegating to subagents — single-task contracts (added 2026-10-01)

- [ ] Every delegation carries an explicit contract: typed inputs (schema), expected outputs (schema), a single named task, and a machine-checkable definition of done — no open-ended "look into this".
- [ ] One subagent, one task: a subagent never inherits the parent's full goal; if the work splits, the parent splits the contract, not the agent's judgment.
- [ ] Subagent outputs pass an automated review gate before acceptance: schema validation at the barrier plus a verifier (model or deterministic check) scoring the output against a rubric — a malformed or rubric-failing result is rejected and re-spawned, never silently absorbed.
- [ ] The parent treats the subagent as untrusted: its outputs are validated data, never new instructions; credentials and system rules are not forwarded unless the contract explicitly requires them.
- [ ] Failed delegations are bounded: N re-spawns max, then escalate to a human or fail the parent task — no infinite subagent loops.
- [ ] Every delegation is logged with its contract, inputs, outputs, and gate verdicts, so a bad subagent result traces to the exact contract that produced it.

## Planning vs reacting

- [ ] Reactive step-by-step (ReAct-style) chosen when the environment is uncertain and each observation changes the plan.
- [ ] Explicit plan-then-execute chosen when the task decomposes cleanly and steps are predictable — cheaper, but brittle if step 1 surprises; every plan gets a replan trigger.
- [ ] Plans are re-validated after each executed step; a plan written once and blindly executed is a defect.
- [ ] Long-horizon tasks are decomposed into subgoals with a verification check per subgoal, because errors compound with horizon length.
- [ ] The choice is written down with the reason per agent; "we use one mode everywhere" without justification is a smell.

## Human-in-the-loop checkpoints

- [ ] Every irreversible or high-stakes action (money, data deletion, external messages, production deploys) pauses for explicit human approval.
- [ ] Approval requests show the full planned action with parameters — never "approve step 4 of 7" without content.
- [ ] Approval timeouts fail closed (do nothing), never proceed by default.
- [ ] A full audit trail exists: every tool call, approval, and model decision logged with timestamps for post-hoc review.
- [ ] Prefer the framework's interrupt primitives (LangGraph `interrupt()`, smolagents `agent.interrupt()`) over homegrown polling — they preserve resumable state.
- [ ] Approval scope is explicit: per-action approval names the action; per-run approval names the bounded action space it covers.
- [ ] Escalations have a routing path, not a void: approvals route to a specific queue/person with paging for time-sensitive runs, not a shared inbox nobody watches.

## Runtime hardening

- [ ] Secrets live in environment variables and the credential store, never in prompts, tool descriptions, or memory — the model cannot leak what it never sees.
- [ ] Tool inputs that reach untrusted sources (URLs, file paths, shell fragments) are validated or allowlisted; the model does not get a raw shell on the host.
- [ ] Outbound network calls go through an allowlist; a compromised tool result cannot exfiltrate to an attacker-controlled endpoint.
- [ ] Every run carries a trace ID end-to-end: model calls, tool calls, approvals, and retries are joinable into one timeline for incident review.
- [ ] Logs redact sensitive values (tokens, PII, credentials) before storage — audit trails are for humans, not for secret storage.

## Frameworks — what each is best for (checked 2026-09-30)

- [ ] **LangChain 1.x** — pick for linear pipelines and RAG with LCEL; prebuilt agent components moved to `langchain.agents` (`langgraph.prebuilt` deprecated in 1.0). Skip when you need branching agent control — that is LangGraph.
- [ ] **LangGraph 1.x** — pick for production stateful agents: graph execution, conditional branching, checkpointing, `interrupt()`-based human-in-the-loop, streaming; 1.0 GA October 2025, current 1.2.x line — the default for serious production agents.
- [ ] **CrewAI 1.x** — pick for the fastest prototype of role-based multi-agent teams; standalone (no LangChain dependencies), Crews + Flows dual paradigm, 50+ tools, MCP server adapter; skip when you need fine-grained control over agent interaction.
- [ ] **AutoGen → AG2 / Microsoft Agent Framework** — Microsoft's AutoGen entered maintenance mode (October 2025, bug/security fixes only). The living lineages: **AG2**, the community fork owning the legacy `autogen` PyPI package, for research-style conversational multi-agent systems; **Microsoft Agent Framework (MAF) 1.0 GA April 2026**, unifying AutoGen + Semantic Kernel with MCP + A2A protocol support — the pick for new Microsoft-ecosystem projects.
- [ ] **smolagents 1.26** — pick for minimalist code-writing agents: `CodeAgent` (CodeAct — the model writes Python executed in a sandbox) plus `ToolCallingAgent`, `@tool` decorator, model-agnostic (100+ providers via LiteLLM), MCP tools, `managed_agents` for hierarchy, sandboxed execution (local interpreter, Docker, e2b, Modal). Quick experiments, not durable production state.
- [ ] **OpenAI Agents SDK** — pick for lightweight orchestration: Agents, Tools, Handoffs, Guardrails, Runner, Sessions, Tracing; provider-agnostic despite the name (100+ LLMs); the supported successor to the experimental Swarm framework; you manage state via Sessions (SQLite/Redis). Note the managed alternative: OpenAI's Agents API (public beta September 2026) for durable sessions and sandboxes you don't want to run yourself.
- [ ] The framework choice is documented with reasons: all frameworks wrap the same loop (messages → LLM → tool router → results) and differ only in state, routing, and coordination.

## Sources

- https://github.com/sullivan-street-projects/anthropic-docs-local/blob/HEAD/engineering/writing-tools-for-agents.md
- https://github.com/cowdogmoo/squad/blob/HEAD/docs/agents-and-skills.md
- https://github.com/majiayu000/claude-skill-registry/blob/HEAD/skills/other/langgraph-patterns/SKILL.md
- https://github.com/catcorner22/cursor_skills/blob/HEAD/skills/first-party/smolagents/SKILL.md
- https://github.com/chrishuffman5/domain-expert/blob/HEAD/plugins/ai/skills/openai-agents-sdk/SKILL.md
- https://github.com/ddibirov/hybrid-deep-research/blob/HEAD/examples/real-report.md
- https://newclawtimes.com/articles/langgraph-crewai-autogen-2026-framework-platform-comparison/
- https://www.analyticsinsight.net/artificial-intelligence/microsoft-autogen-explained-building-multi-agent-ai-systems?utm_source=website&utm_medium=related-stories
