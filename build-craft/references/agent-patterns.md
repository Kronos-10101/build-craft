# Agent Patterns — Reasoning and Optimization

Named reasoning patterns, multi-agent topologies, 2026 dynamic workflow patterns, optimization levers, circumstance-specific tuning, and agent evals — with when each wins. Reasoning and optimization — not framework how-tos. Checked 2026-09-30.

## Workflows vs agents — Anthropic's split (Dec 2024)

- [ ] The distinction is explicit: **workflows** are LLMs and tools orchestrated through predefined code paths; **agents** are systems where the model dynamically directs its own process and tool use.
- [ ] Start at the simplest point and add autonomy only when it demonstrably improves outcomes — complexity is a cost to be justified by evals, not a default.
- [ ] **Prompt chaining**: decompose the task into sequential steps with programmatic gates between them — wins when each step is predictable and needs a quality check.
- [ ] **Routing**: classify the input, hand it to a specialist handler — wins when inputs are heterogeneous and handlers are well-separated.
- [ ] **Parallelization**: sectioning (split into independent subtasks) or voting (sample N times, pick the best) — wins when subtasks are independent or single-shot judgment is noisy.
- [ ] **Orchestrator-workers**: a central LLM decomposes, workers execute, the orchestrator synthesizes — wins when the subtask list can't be predicted upfront; the orchestrator is a single point of failure, so its routing decisions are logged.
- [ ] **Evaluator-optimizer**: a generator looped with an evaluator giving feedback — wins when evaluation criteria are clear and iteration measurably improves quality; avoid when first-attempt quality suffices, criteria are subjective, or latency budget is tight.

## Reasoning patterns — name the method, know when it wins

- [ ] **ReAct** (Thought → Action → Observation, Yao et al. 2022, arXiv:2210.03629) — the default for tool-using agents; wins when each observation should change the next step.
- [ ] **ReWOO** (Reasoning WithOut Observation, Xu et al. 2023, arXiv:2305.18323) — Planner writes a full plan of evidence steps (`#E1 = Tool[...]`) upfront from the question alone, a Worker executes them in order, a Solver synthesizes; 5× token efficiency vs ReAct on HotpotQA in the paper and robust under tool failure — wins when tool calls are expensive or parallelizable; loses when early results should change later calls.
- [ ] **Reflexion** (verbal reinforcement + episodic memory, Shinn et al. 2023, arXiv:2303.11366) — Actor, Evaluator, and Self-Reflection modules; verbal critiques are stored across trials and improve retries without weight updates — wins on trial-and-error tasks; costs extra LLM calls per attempt and needs a reliable success/failure signal.
- [ ] **Plan-and-Execute** — one planning call, then cheap execution steps with a replan trigger — wins when the task decomposes cleanly; loses without replanning when step 1's surprise invalidates the plan.
- [ ] **Chain-of-Thought** (Wei et al. 2022, arXiv:2201.11903) — wins for single hard reasoning steps *inside* a larger loop (math, logic); the trace is the product, not the loop.
- [ ] **Tree-of-Thoughts** (Yao et al. 2023, arXiv:2305.10601) — explores and prunes reasoning branches with self-evaluation — wins on hard search problems where ReAct gets stuck; loses on cost, because branch explosion is expensive.
- [ ] **Self-consistency**: sample N independent reasoning paths and take the majority answer — wins for noisy single-shot judgments; costs N× and never replaces verification.
- [ ] Reasoning traces are working scratchpad, never the deliverable: the chain-of-thought is hidden from the end user and never treated as the final answer without a separate synthesis step.
- [ ] For plan-upfront patterns (ReWOO, Plan-and-Execute), the failure policy per planned step is defined in advance — skip, abort, or replan — not improvised mid-run.
- [ ] The pattern choice is documented per agent with the reason; "we use ReAct everywhere" without justification is a smell.
- [ ] Hybrid patterns are documented as such: e.g. Plan-and-Execute for the skeleton with ReAct inside uncertain steps, or ReWOO for the expensive data-gathering phase feeding a ReAct loop.

## Multi-agent topologies

- [ ] **Supervisor / orchestrator-workers** — one router agent decomposes and delegates to specialists; wins when subtasks need different tools or prompts; the supervisor is a single point of failure, so its routing decisions are logged.
- [ ] **Hierarchical** — supervisors over supervisors; wins for very large task graphs; adds coordination overhead per level.
- [ ] **Swarm / peer-to-peer** — agents hand off to each other directly; wins when the workflow is emergent rather than plannable; hardest to debug, weakest auditability — avoid for high-stakes workflows.
- [ ] **Debate / critic** — one agent proposes, another critiques, iterate; wins for verification-heavy tasks (code review, factual claims); costs 2×+ per round.
- [ ] **Sequential pipeline** — agents in fixed order, each transforming the output; wins when the stages are known upfront; this is a workflow, not model-directed agency.
- [ ] Multi-agent is chosen only when a single agent demonstrably fails: tool/prompt specialization must justify the coordination cost, latency, and failure points.
- [ ] Inter-agent communication is structured (schemas, not free text) so handoffs are parseable, testable, and debuggable.
- [ ] The topology is versioned with the agent: changing worker count, routing rules, or supervisor prompts is a config change that goes through evals, not a silent tweak.

## Agent memory architecture (added 2026-10-01)

- [ ] The three memory layers are physically separated: **Episodic** (the conversation/trajectory log — what happened, append-only), **Semantic** (vector RAG over durable facts — user preferences, project conventions, retrieved by relevance), **Procedural** (SKILL.md files, tool definitions, playbooks — versioned how-to knowledge).
- [ ] Writes go to exactly one layer: a runbook update is a procedural change (reviewed, versioned); a user preference is a semantic fact (attributed, TTL'd); a debugging trace is an episodic record (append-only) — nothing is silently stored in two places.
- [ ] Retrieval is layer-aware: the agent pulls procedural knowledge for *how* to act, semantic facts for *what is true*, episodic traces for *what was tried* — a single undifferentiated "memory" query is a smell.
- [ ] Cross-layer confusion is tested: the eval set includes cases asserting the model distinguishes a retrieved fact (may be stale — check TTL) from a procedure (follow it) from a past trajectory (do not repeat it blindly).

## Dynamic workflow patterns (Anthropic, Claude Code, June 2026)

- [ ] These six composable patterns cover dynamic multi-agent orchestration where the model writes the harness: **classify-and-act** (classifier routes to different agents/models), **fan-out-and-synthesize** (split, run one agent per item, barrier-merge), **adversarial verification** (a separate verifier per spawned agent checks output against a rubric), **generate-and-filter** (generate N ideas, filter/dedupe by rubric), **tournament** (N agents compete on the same task, pairwise judging picks the winner), **loop-until-done** (keep spawning until the stop condition — no new findings, zero errors — instead of a fixed pass count).
- [ ] The key structural move: give each subagent its own context window with one isolated definition of done — this is the documented fix for three named failure modes: **agentic laziness** (declares done after partial progress), **self-preferential bias** (verifier has skin in the game), and **goal drift** (the objective quietly degrades across long turns).
- [ ] Token cost is the explicit trade-off: workflows use more tokens — reserve these patterns for complex high-value tasks, set token budgets, and keep simple tasks single-agent.
- [ ] Fan-out barriers have timeouts and a partial-failure policy: proceed with N-of-M results, or fail — a single stuck subagent never hangs the merge forever.
- [ ] Subagent outputs are validated against a schema at the barrier before synthesis — a malformed fan-out result fails loudly instead of poisoning the merge.
- [ ] Model routing per subagent is deliberate: cheap/fast model for fan-out classification and simple checks, flagship model only for hard reasoning and synthesis.

## Optimizing an agent — the levers

- [ ] Fewer, better tools: tool count cut to the minimum covering the task; each tool's description disambiguates it from the others; related operations consolidated into single tools.
- [ ] Prompt discipline: the system prompt states the goal, the available actions, the output format, and the stop condition — in that order, with no redundant restatements.
- [ ] Model routing by subtask difficulty: prototype with the strongest model on everything to establish a baseline, then downscale to smaller/cheaper models per subtask wherever evals still pass — per OpenAI's agent-building guidance.
- [ ] Parallel tool calls: independent calls batched in one model turn instead of sequential rounds.
- [ ] Caching: identical tool calls deduplicated within a run (memoize by args); prompt caching enabled for the stable system-prompt prefix.
- [ ] Context hygiene: tool results truncated or summarized to what is needed; old observations compacted or dropped under a written policy; the model never re-reads megabytes of raw tool output to extract one field.
- [ ] Structured outputs enforced (JSON Schema / structured-output mode) to kill the parse-failure/retry loop class of errors.
- [ ] Temperature near 0 for tool-calling and decision steps; reserve higher temperature for ideation steps only — determinism where actions are taken, creativity where ideas are generated.
- [ ] Goal-first early exit: each iteration asks "is the goal met?" before spending the remaining budget — runs that finish early stop early.
- [ ] Dead tools are eliminated: production telemetry shows which tools are never called, and they are removed — an unused tool is pure selection noise.
- [ ] Budgets enforced per run: caps on steps, tokens, and cost — measured in production, not assumed.
- [ ] Retries happen only on retryable errors (see the error-handling schemas in ai-agents.md), with bounded attempts — a deterministic failure is not retried into success.
- [ ] Repeated lookups are eliminated: if trajectories show the agent re-fetching the same data, the value is cached, memoized, or pushed into the prompt up front.
- [ ] Distillation considered for stable subtasks: a fine-tuned small model on collected trajectories can replace repeated flagship calls.
- [ ] Tool schemas are versioned: changing a tool's schema without versioning breaks the agent silently — schema changes go through evals.

## Making an agent better for a SPECIFIC circumstance

- [ ] Narrow the tools: the agent gets only the tools that circumstance needs — a 4-tool specialist beats a 20-tool generalist on its home turf.
- [ ] Specialize the prompt: domain vocabulary, the exact output schema, and 2–3 few-shot examples drawn from that distribution.
- [ ] Constrain the action space: allowlisted operations, fixed schemas, bounded parameters — the agent cannot wander outside the circumstance.
- [ ] Eval on that distribution: the eval set is sampled from the real inputs of that circumstance, not generic benchmarks.
- [ ] The 3–5 actual failure modes of the circumstance are enumerated, each with a specific mitigation.

## Agent evals

- [ ] Task success rate: % of tasks where the goal is verifiably achieved (tests pass, world state matches) — the headline metric.
- [ ] Trajectory evals: the path is scored, not just the outcome — a right answer via wrong tools (e.g. refund issued without calling the refund tool) counts as failure; check tool choice, order, arguments, and whether approval was sought.
- [ ] Measure outcome, not self-report: if the agent says "I booked the meeting," verify the calendar state — the transcript claim is evidence, the world state is the verdict (Anthropic evals guidance).
- [ ] Efficiency tracked: tool calls per task, tokens per task, cost per successful task — a $5 success is not production-ready.
- [ ] Multiple graders, not one: factuality, tool-use, policy compliance, and formatting graders (OpenAI agent-evals guidance) — one grader is rarely enough.
- [ ] Repeated trials: agent outputs are nondeterministic, so success rates are measured over multiple runs per case, not one.
- [ ] LLM-as-judge pitfalls handled: the judge is a stronger model than the agent, pinned version, temperature 0, explicit rubric, randomized answer order (position bias), verbosity recorded; human agreement audited on a 10–20% sample.
- [ ] Held-out eval set: prompt and tool tuning happens on a dev set; promotion decisions use a separate held-out set so improvements aren't overfit to the evals.
- [ ] Safety is a separate gate: any safety violation fails the change regardless of success-rate movement — safety is not averaged into a score.
- [ ] Eval cases carry difficulty and cost metadata so regressions are stratified — a 5% drop on hard cases reads differently than on easy ones.
- [ ] The eval harness itself has a budget: full eval runs complete within a known time and cost, so they actually run on every change instead of being skipped.
- [ ] Evals gate changes: PR gate on a versioned golden set (fail on >5% success-rate drop or any safety violation); every production failure becomes a new eval case; evals are re-run on every change (eval-driven development).
- [ ] Eval runs are reproducible: pinned judge version, temperature, dataset version, and seeds are recorded with every result — an eval you cannot rerun is an anecdote.
- [ ] Judge calibration tracked over time: judge–human agreement re-measured whenever the judge model changes; drift invalidates historical comparisons.
- [ ] For agents with retrieval, RAGAS-style metrics gate deployment alongside task success: **Faithfulness** (claims supported by the retrieved context), **Answer Relevance** (the answer addresses the asked question), **Context Precision** (retrieved chunks are actually relevant) — measured on the held-out set with a pinned judge (added 2026-10-01).
- [ ] Thresholds are set per metric and documented; a change that regresses any one of the three fails the gate even if headline task success is flat — success rate alone does not catch groundedness regressions.

## Sources

- https://arxiv.org/abs/2305.18323
- https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code
- https://github.com/luthercalvinriggs/research/blob/HEAD/ai/tools/dynamic-workflows-anthropic-primary-source.md
- https://github.com/ria-spec/one-agent/blob/HEAD/docs/theory/sources/anthropic-dynamic-workflows/original.en.md
- https://github.com/kevxn97/fieldnote/blob/HEAD/vault/wiki/sources/a-practical-guide-to-building-agents.md
- https://github.com/sticklane/claude/blob/HEAD/docs/external-playbooks.md
- https://github.com/joseparrenogarcia/newsletter-engine/blob/HEAD/posts/ai-roles-to-hire/research2.md
