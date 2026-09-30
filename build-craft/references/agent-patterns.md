# Agent Patterns — Reasoning and Optimization

Named reasoning patterns, multi-agent topologies, optimization levers, circumstance-specific tuning, and evals — with when each wins. Checked 2026-09-30.

## Reasoning patterns — name the method, know when it wins

- [ ] **ReAct** (Thought → Action → Observation, Yao et al. 2022) — the default for tool-using agents; wins when each observation should change the next step.
- [ ] **ReWOO** (Reasoning WithOut Observation) — wins when tool calls are expensive: the model plans all tool calls upfront from the question alone, then executes without interleaved observations; loses when early results should change later calls.
- [ ] **Reflexion** (verbal self-critique + episodic memory, Shinn et al. 2023) — wins on trial-and-error tasks where self-critique improves retries; costs extra LLM calls per attempt.
- [ ] **Plan-and-Execute** — wins when the task decomposes cleanly: one planning call, then cheap execution steps; loses when step 1's surprise invalidates the plan (no replanning = brittle).
- [ ] **Chain-of-Thought** — wins for single hard reasoning steps inside a larger loop (math, logic); the trace is the product, not the loop.
- [ ] **Tree-of-Thoughts** — wins on hard search problems where ReAct gets stuck (explores and prunes reasoning branches); loses on cost — branch explosion is expensive.
- [ ] The pattern choice is documented per agent with the reason; "we use ReAct everywhere" without justification is a smell.
- [ ] Hybrid patterns allowed: e.g. Plan-and-Execute for the skeleton with ReAct inside uncertain steps — documented as such.

## Multi-agent patterns

- [ ] **Supervisor / orchestrator-workers** — one router agent decomposes and delegates to specialists; wins when subtasks need different tools or prompts; the supervisor is a single point of failure, so its routing decisions are logged.
- [ ] **Hierarchical** — supervisors over supervisors; wins for very large task graphs; adds coordination overhead per level.
- [ ] **Swarm / peer-to-peer** — agents hand off to each other directly; wins when the workflow is emergent rather than plannable; hardest to debug.
- [ ] **Debate / critic** — one agent proposes, another critiques, iterate; wins for verification-heavy tasks (code review, factual claims); costs 2×+ per round.
- [ ] **Sequential pipeline** — agents in fixed order, each transforming the output; wins when the stages are known upfront; this is a workflow, not model-directed agency.
- [ ] Multi-agent is chosen only when a single agent demonstrably fails: tool/prompt specialization must justify the coordination cost.
- [ ] Inter-agent communication is structured (schemas, not free text) so handoffs are parseable, testable, and debuggable.

## Optimizing an agent

- [ ] Fewer, better tools: tool count cut to the minimum covering the task; each tool's description disambiguates it from the others.
- [ ] Prompt discipline: the system prompt states the goal, the available actions, the output format, and the stop condition — in that order, with no redundant restatements.
- [ ] Model routing by subtask difficulty: cheap/fast model for classification and simple tool calls, flagship model only for hard reasoning steps.
- [ ] Parallel tool calls: independent calls batched in one model turn instead of sequential rounds.
- [ ] Caching: identical tool calls deduplicated within a run (memoize by args); prompt caching enabled for the stable system-prompt prefix.
- [ ] Context hygiene: tool results truncated or summarized to what is needed; the model never re-reads megabytes of raw tool output to extract one field.
- [ ] Budgets enforced per run: caps on steps, tokens, and cost — measured in production, not assumed.
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
- [ ] Trajectory evals: the path is scored, not just the outcome — a right answer via wrong tools (e.g. refund issued without calling the refund tool) counts as failure.
- [ ] Efficiency tracked: tool calls per task, tokens per task, cost per successful task — a $5 success is not production-ready.
- [ ] LLM-as-judge pitfalls handled: the judge is a stronger model than the agent, pinned version, temperature 0, explicit rubric, randomized answer order (position bias), verbosity recorded; human agreement audited on a 10–20% sample.
- [ ] Evals gate changes: PR gate on a versioned golden set (fail on >5% success-rate drop or any safety violation); every production failure becomes a new eval case.
- [ ] Judge calibration tracked over time: judge–human agreement re-measured whenever the judge model changes; drift invalidates historical comparisons.

## Sources

- https://github.com/muvon/octomind-tap/blob/HEAD/skills/ai-agent-design/SKILL.md
- https://github.com/gary-gaga/agent-skills/blob/HEAD/ai-engineering/agent-evaluation/SKILL.md
- https://github.com/sumansingh226/python-to-ai-ml-journey/blob/HEAD/src/Ai/topis/Agentic%20Evaluation%20Systems%20&%20Benchmarks.md
- https://github.com/mfmrifath/ai-engineering-roadmap/blob/HEAD/projects/p4-llm-eval-harness/README.md
