# How LLMs Work — mental models for builders

Concrete mental models of what an LLM is doing when you call it, so you can reason about token costs, sampling knobs, and failure modes from first principles.

## Tokens and tokenization (BPE)

- [ ] You can explain that an LLM never sees raw text: input is first split into integer token IDs, and you measured token counts with a real tokenizer (e.g. tiktoken) instead of guessing.
- [ ] You can explain BPE training: start from single characters/bytes, repeatedly merge the most frequent adjacent pair into a new token, stop at a fixed vocabulary size (GPT-3.5/4 vocab ~100,258).
- [ ] You can explain byte-level BPE: text is encoded as UTF-8 first, so any Unicode text can be tokenized with no UNK fallback; any unseen word decomposes into known subwords at worst.
- [ ] You decided to budget ~0.75 words/token for English prose but ~3–4 characters/token (often ~1 token per identifier fragment) for code when estimating context usage, because code tokenizes more fragmentarily than prose.
- [ ] You can explain why a different tokenizer version changes billing: token count is a property of the tokenizer+text pair, not of the text alone.
- [ ] You can explain pre-tokenization: a regex split (e.g. on whitespace and punctuation) happens before BPE merges, so a token never crosses a pre-token boundary and splitting "hello world" at different boundaries can yield different tokenizations.
- [ ] You verified that invisible overhead (system-prompt formatting, special tokens like role markers) shows up in your measured token count, because providers bill on the tokenized request, not your message text.
- [ ] You can explain why token counts differ across languages: BPE merges were learned mostly on English text, so non-English text falls back to shorter fragments and consumes 2–3× more tokens for the same information.

## Embeddings: the model's input representation

- [ ] You can explain the input pipeline: token ID → row lookup in a learned embedding matrix (vocab_size × d_model) → add positional encoding → that vector is the token's actual input to the network.
- [ ] You can explain why positional information is needed: self-attention is permutation-invariant, so without positional encodings "dog bites man" and "man bites dog" would be indistinguishable to the model.
- [ ] You can explain the two common schemes: fixed sinusoidal positional encodings (original transformer) vs learned positional embeddings, both added to token embeddings before the first block.
- [ ] You can explain the output side: after the last block, the final vector is projected by an unembedding matrix (d_model × vocab_size) to logits over the vocabulary, and softmax turns logits into next-token probabilities.

## The transformer and self-attention

- [ ] You can explain the intuition: for each token, self-attention asks "which other tokens in the sequence are relevant to me?", scores them, and builds a weighted mix of their representations — e.g. resolving what "it" refers to.
- [ ] You can explain Q/K/V: each token's vector is linearly projected into a Query ("what am I looking for?"), a Key ("what do I contain?"), and a Value ("what information do I contribute?").
- [ ] You can write and explain the formula: Attention(Q,K,V) = softmax(QKᵀ/√d_k)V — dot products score relevance, √d_k scaling prevents softmax saturation, softmax turns scores into weights, multiply by V gives the weighted mix.
- [ ] You can explain multi-head attention: the model runs h independent attention heads in parallel (each with its own Q/K/V projections) and concatenates the results, letting different heads learn different relationship types (syntax, coreference, long-range links).
- [ ] You can explain why attention is O(n²): every one of n tokens scores against all n keys, so compute and the attention matrix grow with sequence length squared — this is the fundamental cost behind context-window pricing.
- [ ] You can explain causal masking: during generation the model may only attend to previous tokens (the future is masked out), which is what makes generation autoregressive — one token at a time, each conditioned on everything before it.
- [ ] You can explain a decoder block's other parts: each attention sublayer is followed by a per-position feed-forward network (usually 2–4× wider than d_model), both wrapped in residual connections and layer norm, and you stacked N of these blocks to get the full model.
- [ ] You can explain why training is parallel but generation is serial: during training the full target sequence is known (teacher forcing), so all positions compute attention in one pass; at inference each token must wait for the previous one.
- [ ] You can explain the division of labor in a block: attention mixes information *across* positions, the feed-forward network transforms each position's vector *independently* — mixing positions then mixing features, repeated N times.

## Pretraining vs supervised fine-tuning vs RLHF

- [ ] You can explain the three stages: pretraining (next-token prediction on trillions of tokens → base model that completes text), SFT (training on (instruction, response) pairs → assistant behavior), RLHF (preference optimization → helpful/harmless/honest persona).
- [ ] You can explain what each stage changes: pretraining builds knowledge and capability; SFT changes the response format and instruction-following; RLHF/DPO changes which outputs the model prefers, not its raw knowledge.
- [ ] You can explain classic RLHF: train a reward model on human preference pairs (response A > B), then optimize the policy against that reward with PPO plus a KL penalty keeping it near the SFT model to prevent reward hacking.
- [ ] You can explain DPO: skips the separate reward model and RL loop, training directly on preference pairs with a classification-style loss — simpler and more stable, same goal.
- [ ] You can explain RLVR (RL with verifiable rewards): for checkable domains (math, code), reward is a deterministic rule (tests pass / proof checks) instead of human preference — this is the DeepSeek-R1 recipe that induced emergent reasoning/backtracking.
- [ ] You can explain that SFT uses the same next-token-prediction loss as pretraining, just on curated (instruction, response) demonstrations — it changes behavior distribution, not capability.
- [ ] You can explain the knowledge cutoff: the base model knows nothing past the end of its pretraining data, so anything fresher must come from retrieval, tools, or a model trained on newer data.
- [ ] You decided against fine-tuning for knowledge updates because later stages don't reliably inject new facts — you reach for RAG instead, per the "prompting first, then RAG, then fine-tuning" decision rule.

## Decoding parameters: temperature, top-p, top-k, repetition penalty

- [ ] You can explain that an LLM outputs logits per token, converts them to probabilities with softmax, and decoding parameters are a *policy* on that distribution — they never change the underlying model.
- [ ] You can explain temperature: logits are divided by T before softmax; T<1 sharpens the distribution (more deterministic), T>1 flattens it (more diverse); T→0 is greedy decoding.
- [ ] You can explain top-k: only the k highest-probability tokens are kept as candidates, then renormalized and sampled — a fixed-size cutoff that ignores distribution shape.
- [ ] You can explain top-p (nucleus sampling): keep the smallest set of tokens whose cumulative probability ≥ p, so the cutoff adapts to how confident the model is on this step.
- [ ] You can explain repetition/frequency penalty: lowers the logits of tokens already generated, breaking the autoregressive loop where the model re-scores its own output highly and repeats it; penalty 1.0 = off, 1.1–1.2 = mild.
- [ ] You decided on decoding configs from task type: temperature ≈0.0–0.2 with top-p ≈0.9 for factual extraction/classification, 0.7/0.9 for general chat, ≈1.0/0.95 for creative writing — and you changed only one knob at a time when debugging repetition.
- [ ] You can explain why sampling the same prompt twice can give different answers: decoding is stochastic, so nondeterminism comes from sampling policy, not from model updates.
- [ ] You can explain the practical filter order: penalties first, then top-k, then top-p, then temperature, then sample — because temperature rescales logits, applying it before filtering would distort which tokens survive the cut.
- [ ] You can explain why many APIs say don't combine top-k with top-p: both are tail-cutoffs, so using both mostly adds confusion rather than control; you picked one (usually top-p) and left the other at its default.
- [ ] You can explain OpenAI's split of repetition penalty: frequency_penalty scales the logit discount by how many times the token already appeared (kills loops), presence_penalty applies a flat discount to any token seen at least once (pushes topic diversity).

## Context windows and the KV cache

- [ ] You can explain the KV cache: during generation the model stores the K and V vectors of every previous token per layer, so each new token only computes its own attention against cached history instead of recomputing O(n²) over the whole prefix.
- [ ] You can explain why KV cache memory grows linearly with sequence length (and batch size, layers, heads) and can exceed model weights at long contexts — this is why long context is expensive and why throughput drops.
- [ ] You can explain why generation has two phases: prefill (processes the whole prompt in parallel, compute-bound, determines time-to-first-token) vs decode (one token at a time, memory-bandwidth-bound).
- [ ] You decided that a 100k-token context costs roughly n²/2 attention operations at prefill and ~2·layers·heads·n·d bytes of cache, so you measured with small inputs before scaling, because cost is superlinear in context length.
- [ ] You can explain the main mitigations: paged attention (vLLM — block-paged allocation kills fragmentation and enables prefix sharing), KV quantization (INT8/INT4 halves/quarters cache), sliding-window attention (Mistral — fixed window caps memory, trades away distant recall).
- [ ] You can explain grouped-query attention (GQA): several query heads share one K/V head pair, which shrinks the cache multiplier architecturally — the choice most modern open models (Llama family) use.
- [ ] You measured time-to-first-token (prefill) and per-output-token time (decode) separately when diagnosing slowness, because the fix for slow prefill (shorter prompt) differs from the fix for slow decode (smaller batch, more bandwidth).

## Hallucinations

- [ ] You can explain the root cause: the pretraining loss rewards predicting the most likely next token, and truth is not in the loss function — the model optimizes for plausibility, not correctness, so it guesses confidently when it lacks grounding.
- [ ] You can explain exposure bias: the model was trained with teacher forcing on ground-truth prefixes but at inference feeds its own outputs back in, so one wrong token compounds into a full fabricated paragraph.
- [ ] You can explain why confident hallucinations are expected: training and benchmarks penalize "I don't know" and reward guessing, so uncertainty is expressed as fluency.
- [ ] You decided to mitigate hallucinations architecturally (RAG with retrieved sources, citation requirements, evals over known-false outputs) rather than by prompt-tweaking alone, and you measured hallucination rate on a held-out eval set before claiming improvement.
- [ ] You can explain why lower temperature reduces (but doesn't eliminate) hallucinations: it biases sampling toward the highest-probability tokens, which are usually the safest-but-not-necessarily-true completions.
- [ ] You can explain why RLHF can make hallucination worse in some cases: the reward model rewards confident, helpful-sounding answers, so the policy can learn to state unverified claims assertively (reward hacking on style over substance).
- [ ] You can explain sycophancy as an alignment artifact: RLHF also rewards agreeing with the user's stated premise, so the model affirms false premises ("as you said, the Earth is flat...") unless grounded by retrieved facts or evals.

## Sources

- https://en.wikipedia.org/wiki/Byte-pair_encoding
- https://en.wikipedia.org/wiki/Transformer_(deep_learning)
