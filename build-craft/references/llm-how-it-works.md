# How LLMs Work — mental models for builders

Scope: the concrete mechanics of modern decoder-only LLMs (tokens, embeddings, attention, training stages, decoding, KV cache, failure modes) so you can reason about cost, latency, and reliability from first principles. Model-ecosystem specifics live in `ml-landscape.md`.

## Tokens and tokenization

- [ ] You can explain that an LLM never sees raw text: input is split into integer token IDs first, and you measured token counts with a real tokenizer (tiktoken, or the model's own Hugging Face tokenizer) instead of estimating from word counts.
- [ ] You can explain BPE training: start from single bytes, repeatedly merge the most frequent adjacent pair, stop at a fixed vocabulary size — and you know vocab sizes differ by model generation (older GPT-3.5/4 ~100K tokens; Llama 3-class ~128K; current GPT-class ~200K), so the tokenizer is part of the model artifact.
- [ ] You can explain byte-level BPE: text is UTF-8 encoded first, so any Unicode tokenizes with no UNK fallback; an unseen word decomposes into shorter known fragments, never a mystery token.
- [ ] You can explain pre-tokenization: a regex split (on whitespace, punctuation, digit runs) happens before BPE merges, so a token never crosses a pre-token boundary — splitting "hello world" at different boundaries can yield different tokenizations.
- [ ] You defined token fertility (tokens per word) as your budgeting metric and can explain why code runs ~1.5–2× the token count of English prose for the same information: identifiers and symbols fragment into short merges.
- [ ] You can explain why a tokenizer version change re-prices your bill: token count is a property of the (tokenizer, text) pair, not of the text alone.
- [ ] You verified that invisible overhead (system-prompt formatting, chat-template role markers, BOS/EOS, tool-call delimiters) shows up in the measured token count, because providers bill on the tokenized request.
- [ ] You can explain the 2–3× non-English token penalty: BPE merges were learned mostly on English, so other languages fall back to shorter fragments — this is a cost and latency multiplier for multilingual products.
- [ ] You can explain why token counts never transfer across models: merges, vocab size, and pre-tokenization are all learned per tokenizer, so a count measured with GPT-class tokenization cannot price a Llama-class call.
- [ ] You can explain chat templates: providers format messages into a token sequence with trained role and control tokens (including tool-call delimiters), so the model never sees your raw JSON — a template mismatch silently degrades instruction-following.

## Embeddings and positional information

- [ ] You can explain the input pipeline: token ID → row lookup in a learned embedding matrix (vocab_size × d_model) → add/apply positional encoding → that vector is the token's real input to the network.
- [ ] You can explain why position is needed: self-attention is permutation-invariant, so without positional information "dog bites man" and "man bites dog" would be indistinguishable.
- [ ] You can explain RoPE (Rotary Position Embedding, Su et al. 2021): positions are encoded as rotation matrices applied to query/key vectors, which bakes relative-distance dependence directly into the attention score — and you know RoPE is the dominant scheme in 2026-era models, not the original sinusoidal or learned-absolute embeddings.
- [ ] You can explain the context-extension problem: RoPE's `theta` base frequency sets how far the model "reaches"; naive extrapolation past trained length degrades, which is why length-extension recipes (position interpolation, YaRN) exist and why advertised windows (e.g. 1M) require the model to have been trained or fine-tuned for them.
- [ ] You can explain the extension tradeoff: rescaling positional frequencies buys longer windows at the cost of short-text fidelity unless the model is fine-tuned on long data — "1M context via config override" is not the same as "1M context the model was trained for".
- [ ] You can explain the output side: the final block's vector is projected by an unembedding matrix (d_model × vocab_size) to logits, softmax turns logits into next-token probabilities, and many models tie the input and output embeddings to save parameters.
- [ ] You can explain why embedding-space arithmetic is a party trick, not a mechanism: cosine similarity of embeddings reflects co-occurrence statistics, not a clean semantic algebra the model computes with.

## The transformer block and self-attention

- [ ] You can explain the intuition: for each token, self-attention asks "which other tokens are relevant to me?", scores them, and builds a weighted mix of their representations — e.g. resolving what "it" refers to in a paragraph.
- [ ] You can write and explain the formula: Attention(Q,K,V) = softmax(QKᵀ/√d_k)V — dot products score relevance, √d_k scaling prevents softmax saturation, softmax yields weights, multiplying by V gives the weighted mix.
- [ ] You can explain Q/K/V as linear projections of the same token vector: Query ("what am I looking for?"), Key ("what do I contain?"), Value ("what do I contribute?").
- [ ] You can explain multi-head attention: h independent heads with their own Q/K/V projections run in parallel and concatenate, letting heads specialize (syntax, coreference, long-range links) — most 2026 models use grouped-query attention (GQA), where several query heads share one K/V head to shrink the KV cache.
- [ ] You can explain why attention is O(n²): every one of n tokens scores against all n keys, so compute and the attention matrix grow with the square of sequence length — the fundamental reason long context is expensive.
- [ ] You can explain causal masking: during generation each position may only attend to earlier tokens, making generation autoregressive — one token at a time, each conditioned on the full prefix.
- [ ] You can explain a decoder block's full stack: attention sublayer → per-position feed-forward network (usually 2–4× wider than d_model) → both wrapped in residual connections and layer norm, repeated N times — attention mixes information *across* positions, the FFN transforms each position *independently*.
- [ ] You can explain why training is parallel but inference is serial: training uses teacher forcing on the known full sequence (all positions at once); inference must wait for each generated token before computing the next.
- [ ] You can explain greedy vs beam search vs sampling: greedy and beam search are deterministic hunts for high-probability sequences (beam keeps k hypotheses but stays myopic), sampling draws from the distribution — you pick search for constrained outputs, sampling for open-ended ones.
- [ ] You can explain FlashAttention: it computes the exact same attention output by tiling Q/K/V into GPU SRAM with an online softmax, cutting HBM traffic from O(n²) to O(n) — an I/O optimization, not an approximation, and the default attention kernel in modern training/serving stacks.
- [ ] You can explain mixture-of-experts (MoE): each block's FFN is replaced by many expert FFNs with a learned router sending each token to the top-k experts — total parameters can be huge (DeepSeek V4-Pro: 1.6T total) while active parameters per token stay modest (49B); active params drive compute cost, total params drive memory.

## Pretraining, SFT, RLHF, DPO, RLVR

- [ ] You can explain the classic pipeline: pretraining (next-token prediction on trillions of tokens → a base model that completes text) → supervised fine-tuning (SFT on (instruction, response) pairs → assistant behavior) → preference optimization (RLHF/DPO → helpful/harmless persona) — this is the InstructGPT recipe.
- [ ] You can explain what each stage changes: pretraining builds knowledge and capability; SFT changes response format and instruction-following (same next-token loss, curated demonstrations); preference optimization changes which outputs the model prefers, not its raw knowledge.
- [ ] You can explain the Chinchilla scaling lesson: for a fixed compute budget, parameters and training tokens should scale together (~20 tokens per parameter at the compute-optimal point); most frontier models are "overtrained" past this point because inference cost then dominates and smaller models serve cheaper.
- [ ] You can explain classic RLHF: train a reward model on human preference pairs (A > B), then optimize the policy against it with PPO plus a KL penalty anchoring it to the SFT model to prevent reward hacking.
- [ ] You can explain DPO: it reparameterizes the RLHF objective so the optimal policy has a closed form, then trains directly on preference pairs with a classification-style loss — no separate reward model, no RL loop, same goal, simpler and more stable.
- [ ] You can explain RLVR (RL with verifiable rewards): for checkable domains (math, code, proofs) the reward is a deterministic rule (tests pass, proof verifies) instead of human preference — the DeepSeek-R1 recipe, where pure RL induced emergent reasoning behaviors like self-verification and backtracking with no human-labeled reasoning traces.
- [ ] You can explain the knowledge cutoff: the base model knows nothing past the end of its pretraining data; later stages do not reliably inject new facts, so anything fresh must come from retrieval, tools, or a newer model.
- [ ] You can explain the alignment tax: preference optimization can slightly degrade raw benchmark scores, which is why open-weight releases ship both base and instruct variants — you fine-tune the instruct one.
- [ ] You can explain distillation: a large teacher's outputs (often its logits as soft targets) train a small student, transferring style and reasoning traces but not the teacher's knowledge cutoff or grounding — which is why distilled models inherit fluent confidence without the teacher's facts.
- [ ] You decided against fine-tuning for knowledge updates: fine-tuning changes style and behavior distribution, it is a poor knowledge injector — you reach for RAG first (prompting → RAG → fine-tuning as the escalation order).

## Decoding parameters

- [ ] You can explain that decoding parameters are a sampling *policy* over the model's fixed logits: they reshape which token gets drawn but never change the underlying model.
- [ ] You can explain temperature: logits are divided by T before softmax; T<1 sharpens (more deterministic), T>1 flattens (more diverse), T→0 approaches greedy decoding.
- [ ] You can explain top-k: keep only the k highest-probability tokens, renormalize, sample — a fixed-size cutoff that ignores the distribution's shape.
- [ ] You can explain top-p (nucleus sampling): keep the smallest set whose cumulative probability ≥ p, so the cutoff adapts to the model's confidence on this step.
- [ ] You decided to pick one tail-cutoff (usually top-p) and leave the other at default, because top-k and top-p do overlapping work and combining them adds confusion, not control.
- [ ] You can explain repetition/frequency/presence penalties: they discount logits of already-generated tokens to break autoregressive echo loops — and you know OpenAI's split (frequency_penalty scales with repeat count to kill loops; presence_penalty is a flat discount on any seen token to push topic diversity).
- [ ] You can explain the practical filter order (penalties → top-k → top-p → temperature → sample): temperature rescales logits, so applying it before filtering would distort which tokens survive the cut.
- [ ] You decided on task-based configs: temperature ≈0.0–0.2 / top-p ≈0.9 for factual extraction and classification, ≈0.7/0.9 for general chat, ≈1.0/0.95 for creative work — and you change one knob at a time when debugging repetition.
- [ ] You can explain why identical prompts give different answers: stochastic sampling, not model drift — and you know even temperature 0 is not bitwise-deterministic on GPU hardware unless the provider exposes a seed.
- [ ] You can explain structured output: JSON/grammar-constrained decoding restricts the candidate set to valid continuations at each step (guaranteed-parse, still sampled), while `logit_bias` boosts/suppresses specific tokens and stop sequences end generation — these are logit-level controls, not prompt tricks.
- [ ] You can explain prompt caching: providers cache the prefill KV for repeated prefixes (system prompts, few-shot blocks) and bill cache reads at a fraction of normal input — so you design prompts with a stable prefix when cost matters.
- [ ] You can explain best-of-n / self-consistency: sample n completions and vote or keep the best — a test-time compute lever that trades tokens for reliability on reasoning tasks, orthogonal to temperature.

## Context windows and the KV cache

- [ ] You can explain the KV cache: during generation the model stores the K and V vectors of every previous token per layer, so each new token attends to cached history instead of recomputing O(n²) over the prefix.
- [ ] You can explain why the cache grows linearly with sequence length, batch size, layers, and K/V heads — and can exceed the model weights at long contexts, which is why long context is memory-expensive and why decode throughput drops with batch size.
- [ ] You can explain the two inference phases: prefill (the whole prompt processed in parallel, compute-bound, determines time-to-first-token) vs decode (one token at a time, memory-bandwidth-bound, determines tokens/second).
- [ ] You measured time-to-first-token and per-output-token time separately when diagnosing slowness, because the fixes differ: short prompt/shorter prefill vs smaller batch/more bandwidth.
- [ ] You can explain paged attention (vLLM): KV blocks are allocated in non-contiguous pages like OS virtual memory, killing fragmentation and enabling prefix sharing across requests — near-zero memory waste, 2–4× serving throughput.
- [ ] You can explain the architectural cache reducers: GQA (fewer K/V heads than query heads), sliding-window attention (fixed window caps memory, trades away distant recall), and MLA — DeepSeek's multi-head latent attention compresses the cache into a low-rank latent vector, the reason V4-class models serve 1M context economically.
- [ ] You can explain speculative decoding: a small draft model proposes several tokens, the big model verifies them in parallel (2–3× speedup, bit-identical output) — it exploits the fact that verification is cheap and generation is the bottleneck.
- [ ] You decided that context-window claims are verified on the model card, not the press release: native context, RoPE base, and any YaRN override all matter, and extending past native length without the right recipe degrades recall.
- [ ] You can explain prefix caching and chunked prefill: shared prefixes are computed once and reused across requests, and long prefills are chunked to bound time-to-first-token — the mechanisms behind cheap cached system prompts and responsive streaming APIs.

## Hallucinations

- [ ] You can explain the root cause: the pretraining loss rewards the most likely next token; truth is not in the loss function — the model optimizes for plausibility, so it guesses confidently when it lacks grounding.
- [ ] You can explain exposure bias: training used teacher forcing on ground-truth prefixes, but inference feeds the model's own outputs back in, so one wrong token compounds into a fabricated paragraph.
- [ ] You can explain why "I don't know" is rare: training data and benchmarks reward confident guessing and penalize abstention, so uncertainty surfaces as fluency.
- [ ] You can explain why lower temperature reduces but never eliminates hallucinations: it biases sampling toward the safest completions, not the true ones.
- [ ] You can explain how preference tuning can worsen hallucinations: the reward model favors confident, helpful-sounding answers, so the policy learns assertive style over substance — and sycophancy (affirming the user's false premise) is the same reward-hacking artifact.
- [ ] You can distinguish factuality (claim contradicts the world) from faithfulness (claim contradicts the retrieved context): faithfulness failures are the ones you can detect automatically.
- [ ] You decided to mitigate architecturally — RAG with cited sources, citation-required prompts, and a measured hallucination rate on a held-out eval set of known-false probes — rather than by prompt-tweaking alone, and you re-measure before claiming improvement.
- [ ] You can explain calibration: a well-calibrated model abstains at the right rate; you measure accuracy against stated confidence on your eval set and can fine-tune refusal behavior — uncalibrated confidence is the hallucination failure mode you can actually fix.
- [ ] You can explain why LLM-as-judge works for faithfulness but not factuality: the judge can reliably compare a claim against provided context, but it shares the generator's world-knowledge gaps, so it cannot certify facts the context doesn't contain.

## Sources

- https://arxiv.org/abs/1706.03762 — Attention Is All You Need (Vaswani et al. 2017): the transformer, self-attention, multi-head attention, sinusoidal position encodings
- https://arxiv.org/abs/2104.09864 — RoFormer (Su et al. 2021): rotary position embedding, relative-position dependence in attention, long-sequence flexibility
- https://arxiv.org/abs/2203.02155 — InstructGPT (Ouyang et al. 2022): SFT + reward-model + PPO RLHF pipeline, KL penalty, 1.3B InstructGPT preferred over 175B GPT-3
- https://arxiv.org/abs/2305.18290 — DPO (Rafailov et al. 2023): closed-form RLHF solution, classification-loss preference training without reward model or RL loop
- https://arxiv.org/abs/2501.12948 — DeepSeek-R1 (DeepSeek-AI 2025): pure-RL reasoning, emergent self-verification/backtracking, RLVR on verifiable tasks
- https://arxiv.org/abs/2309.06180 — PagedAttention / vLLM (Kwon et al. 2023): paged KV-cache management, near-zero waste, 2–4× serving throughput
- https://github.com/advaymonga/inference-server/blob/HEAD/papers/flashattention.md — FlashAttention (Dao et al., arXiv:2205.14135): O(n) HBM traffic via tiled online-softmax, exact output
- https://github.com/puneet-chandna/awesome-llm-papers/blob/HEAD/categories/efficiency.md — FlashAttention-2 (arXiv:2307.08691) and speculative decoding (Leviathan et al., arXiv:2211.17192): 2× speedup via parallelism, draft-verify decoding
- https://github.com/vicmcorrea/fleet/blob/HEAD/skills/long-context/SKILL.md — RoPE/YaRN/ALiBi references (arXiv:2104.09864, 2309.00071, 2108.12409): context-extension recipes and their fine-tuning requirements
