# AI Agents — Building Agentic Systems

Concrete pass/fail rules for designing tool-using agents: the loop, tools, memory, planning, human checkpoints, and framework choice. Checked 2026-09-30.

## The agent loop (perceive → reason → act → observe)

- [ ] The loop is explicit in code: perceive state → reason (LLM call) → act (tool dispatch) → observe result → repeat. No hidden implicit loops.
- [ ] Every loop has hard stop conditions: max steps (e.g. 25), max wall-clock time, max cost per run — checked before each iteration, not after.
- [ ] Stagnation detection exists: if the last N actions produced no new information (same tool, same args, same observation), the loop breaks and escalates.
- [ ] State is a single explicit object passed between iterations (messages + scratchpad + step count), never implicit globals.
- [ ] Minimum sufficient autonomy: start as a single LLM call or fixed workflow; add model-directed looping only when the path can't be written in advance.
- [ ] The model never executes anything directly — it emits a structured tool request; the harness (your code) runs it and feeds the result back.

## Tools / function calling done right

- [ ] Every tool has a JSON Schema input definition with types, required fields, enums, and `additionalProperties: false`.
- [ ] Tool descriptions say what the tool does AND when to use it versus the other tools — the model picks tools by description.
- [ ] Tool count is small (rule of thumb ≤ 8–12 per agent); overlapping tools are merged — more tools means worse tool selection.
- [ ] Every tool returns structured results (typed dict / pydantic model) with an explicit `ok` flag and machine-readable error codes.
- [ ] Tool errors are fed back to the model as observations with a suggested next action — never raised as exceptions that kill the loop.
- [ ] Side-effecting tools are idempotent where possible (client-supplied idempotency keys) so retries are safe.
- [ ] Dangerous tools (delete, send, pay, deploy) require a confirmation step or human approval before execution.
- [ ] Independent tool calls are batched in parallel in one model turn instead of sequential rounds.

## Memory types and when each matters

- [ ] Short-term (working) memory: current conversation + recent tool results inside the context window; truncated or summarized under a documented policy when it grows.
- [ ] Long-term semantic memory: durable facts (user preferences, project conventions) in a vector or KV store, retrieved by relevance — used when knowledge must persist across sessions.
- [ ] Episodic memory: past trajectories (what was tried, what worked) — used for self-improvement loops and debugging recurring failures.
- [ ] Memory writes are explicit decisions (agent or code chooses what to store), never automatic logging of everything — unbounded memory is unbounded cost and noise.
- [ ] Retrieved memory is attributable (the agent can say which memory influenced a decision); stale memories carry TTLs or invalidation rules.

## Planning vs reacting

- [ ] Reactive step-by-step (ReAct-style) chosen when the environment is uncertain and each observation changes the plan.
- [ ] Explicit plan-then-execute chosen when the task decomposes cleanly and steps are predictable — cheaper, but brittle if step 1 surprises.
- [ ] Plans are re-validated after each executed step; a plan written once and blindly executed is a defect.
- [ ] Long-horizon tasks are decomposed into subgoals with a verification check per subgoal, because errors compound with horizon length.

## Human-in-the-loop checkpoints

- [ ] Every irreversible or high-stakes action (money, data deletion, external messages, production deploys) pauses for explicit human approval.
- [ ] Approval requests show the full planned action with parameters — never "approve step 4 of 7" without content.
- [ ] Approval timeouts fail closed (do nothing), never proceed by default.
- [ ] A full audit trail exists: every tool call, approval, and model decision logged with timestamps for post-hoc review.

## Frameworks — what each is best for (checked 2026-09-30)

- [ ] **LangChain** — pick for linear pipelines and RAG with LCEL; skip when you need branching agent control (that is LangGraph).
- [ ] **LangGraph** — pick for production stateful agents: graphs, conditional branching, checkpointing, built-in human-in-the-loop; the default for serious production agents.
- [ ] **CrewAI** — pick for the fastest prototype of role-based multi-agent teams; skip when you need fine-grained control over agent interaction.
- [ ] **AutoGen (AG2)** — pick for research-style conversational multi-agent systems and strong code-execution integration.
- [ ] **smolagents** — pick for minimalist code-writing agents (small core, HuggingFace ecosystem) and quick experiments.
- [ ] **OpenAI Agents SDK** — pick when OpenAI-only and you want lightweight handoffs with built-in tracing; you handle persistence externally.
- [ ] The framework choice is documented with reasons: all frameworks are the same loop underneath (messages → LLM → tool router → results) and differ only in state, routing, and coordination.

## Sources

- https://en.wikipedia.org/wiki/Agentic_AI
- https://github.com/muvon/octomind-tap/blob/HEAD/skills/ai-agent-design/SKILL.md
- https://github.com/dazeb/dennysentinel.com/blob/HEAD/src/content/blog/ai-agent-frameworks-2026-guide.md
- https://github.com/vikashask/python-all-in-one/blob/HEAD/LangChain%20LangGraph/AI-Agent-Complete-Guide/frameworks/00-Framework-Overview.md
