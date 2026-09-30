# ML Model Landscape — choosing models in 2026

Scope: the flagship models, model classes, and selection rules you can verify as of 2026-09-30; every version-sensitive claim is dated.

## Flagship models by lab (checked 2026-09-30)

- [ ] You listed OpenAI's current flagship line as GPT-6 Astra (announced Sep 3, 2026) with GPT-6.1 Sol (launched Sep 29, 2026) as the cost-efficient tier at $2/$10 per MTok — one-fifth of Astra — and you verified both are closed weights (checked 2026-09-30)
- [ ] You verified that OpenAI scrapped GPT-6.1 Astra on Sep 28, 2026 after internal safety tests, so you do not plan around it (checked 2026-09-30)
- [ ] You listed Anthropic's current lineup as Claude Opus 5.5 (Sep 22, 2026; $4/$20 per MTok), Claude Sonnet 5.5 (Sep 28, 2026; $2/$10 per MTok), Claude Fable 5.1 (Sep 1, 2026, top reasoning tier), and restricted-access Mythos 5.1 — all closed weights (checked 2026-09-30)
- [ ] You listed Google DeepMind's current lineup as Gemini 3.8 Flash (Sep 2, 2026), Gemini 3.8 Live / Live Extended Thinking (Sep 15, 2026, speech-to-speech), and Gemini 3.5 Transcribe for STT — all closed; Gemini 4 Pro is expected Oct 2026 but unreleased, so you do not cite it as available (checked 2026-09-30)
- [ ] You listed Meta's open-weight flagships as Llama 4 Scout (17B active/109B total, 10M context) and Llama 4 Maverick (17B active/400B total, 1M context) under the custom Llama license (checked 2026-09-30)
- [ ] You verified Meta's current frontier flagship is the closed, API-only Muse Spark (Apr 2026), while Muse Glimmer 30B (Aug 10, 2026) is Apache 2.0 open weights distilled from Spark — so Meta now runs a split open/closed strategy (checked 2026-09-30)
- [ ] You listed Mistral's current open-weight stack as Devstral 2 123B (modified MIT license), Devstral Small 2 24B (Apache 2.0), Mistral Large 3 and Mistral Small 4 (Apache 2.0) — you treat Mistral as open-weights-first (checked 2026-09-30)
- [ ] You listed DeepSeek's current open-weight lineup as V4-Pro-0813 (1.6T total / 49B active, 1M context), V4-Flash-0731 (284B / 13B, API $0.14/$0.27 per MTok), and V4.1-Flash (Sep 10, 2026, new causal encoder-decoder architecture) — all MIT-licensed (checked 2026-09-30)
- [ ] You listed xAI's current flagship as Grok 4.7 (released Sep 21, 2026; 500K context; $2/$6 per MTok; text+image in, text out), closed weights; Grok 4.8 was announced as in-training on Sep 13 but is unreleased, so you do not plan around it (checked 2026-09-30)
- [ ] You listed Alibaba's current lineup as Qwen3.8-Max (Aug 3, 2026; 2.4T total / 95B active; weights released Aug 13), Qwen3.8-27B (Aug 14, Apache 2.0), and Qwen3.8-Flash-Next (Aug 26, open-weight preview of the Qwen4 architecture); Qwen4 is confirmed in-training (Sep 22) but unreleased (checked 2026-09-30)

## Open weights vs closed weights (checked 2026-09-30)

- [ ] You verified that "open weights" means downloadable checkpoints you can self-host, modify, and usually fine-tune — you do not get training data or training code, and you budget integration work for quirks like baked-in precision or non-standard chat templates (checked 2026-09-30)
- [ ] You listed the 2026 license ladder from most to least permissive: MIT (DeepSeek V4) > Apache 2.0 (Muse Glimmer, Mistral models, Qwen3.8-27B) > modified MIT with revenue-based restrictions (Devstral 2 123B) > custom Llama community license (Llama 4) > CC BY-NC non-commercial (Mistral Voxtral TTS) (checked 2026-09-30)
- [ ] You decided to pick open weights when you need data privacy or self-hosting, fine-tuning control, air-gapped deployment, or zero per-token API cost — e.g. DeepSeek V4-Flash-0731 runs on dual RTX 4090-class hardware (checked 2026-09-30)
- [ ] You decided to pick closed models when you need frontier capability, zero GPU operations, a vendor SLA, or the fastest path to production — and you confirm a zero-data-retention API tier before sending sensitive data (checked 2026-09-30)

## Model classes (checked 2026-09-30)

- [ ] You listed LLM reasoning controls as a selection axis: current flagships expose thinking/non-thinking modes and reasoning-effort settings (DeepSeek V4 dual modes; Grok low→xhigh; OpenAI reasoning effort), so you set effort per task, not per model (checked 2026-09-30)
- [ ] You listed vision-language coverage as: Llama 4 Maverick natively multimodal (text+image), Gemini 3.8 multimodal by default, Qwen3.8 text+image in — and you verify exact input modalities on the model card because "multimodal" differs per vendor (checked 2026-09-30)
- [ ] You listed 2026 audio options as: TTS via Mistral Voxtral TTS (9 languages, CC BY-NC 4.0) or OpenAI's gpt-4o-mini-tts; dedicated STT via Gemini 3.5 Transcribe (85+ languages, ~4.0% streaming WER); speech-to-speech via Gemini 3.8 Live, ranked #1 on the Artificial Analysis speech-to-speech leaderboard — you route dictation vs conversation to different models (checked 2026-09-30)
- [ ] You listed 2026 video generation as: Veo 3.1 (GA on Vertex/Gemini API, native audio, ~1090 AA Video Arena Elo) and Kling 3.0 (~1108 Elo) as the live leaders; OpenAI's Sora 2 API retired Sep 24, 2026, so you start no new work on it; Runway Gen-4.5 and ByteDance Seedance 2.5 are the other named options (checked 2026-09-30)
- [ ] You listed 2026 embedding options as: Qwen3-Embedding-8B (open-weight leader on MTEB multilingual), BGE-M3 (self-hosted production default), and API defaults OpenAI text-embedding-3 / Cohere embed-v4 — and you check the live MTEB leaderboard because it is split by domain (English, multilingual, code, law) (checked 2026-09-30)
- [ ] You defined "small" in 2026 as 3B–32B models runnable on consumer GPUs; GGUF is the quantized runnable format for llama.cpp/Ollama (safetensors is for training), Q4_K_M is the community default quant (~30% of full size, low degradation), and you verify a GGUF exists on Hugging Face before committing to local deployment (checked 2026-09-30)
- [ ] You listed the 2026 local sweet spot as a 27B-class model at Q4_K_M in ~17–24GB VRAM (e.g. Qwen3.6 27B at ~82 tok/s on an RTX 4090), and you prefer a smaller model at a high quant over a bigger model at a terrible quant (checked 2026-09-30)

## How to choose a model for a task (checked 2026-09-30)

- [ ] You compare price per task, not price per token, because a cheaper-per-token model can cost more per task if it burns tokens — you check cost against the Artificial Analysis Intelligence Index and your own workload (checked 2026-09-30)
- [ ] You cross-check vendor benchmark claims against independent sources (AA Intelligence Index, LMArena Elo, vals.ai SWE-bench harness) before believing them, and you run a 200–1000 row eval on your own data for retrieval work (checked 2026-09-30)
- [ ] You match context window to the job: 1M tokens is the 2026 frontier default (DeepSeek V4, Qwen3.8-Max, Claude Opus 5.5, Gemini), 10M on Llama 4 Scout for whole-repo RAG — and you verify the window on the model card, not the press release (checked 2026-09-30)
- [ ] You trade latency against capability with reasoning effort: low effort / Flash-class models for interactive work, high/xhigh for batch agents — and you measure p99 end-to-end latency, not just time-to-first-token (checked 2026-09-30)
- [ ] You classify data privacy before choosing: self-hosted open weights for regulated data; for APIs you confirm zero-retention tiers and region residency before sending anything sensitive (e.g. Veo 3.1 is hosted only in us-central1) (checked 2026-09-30)
- [ ] You check license and cost at scale: per-token price × corpus size × refresh rate for embeddings, and seat/usage billing for chat (GitHub Copilot bills provider list pricing) (checked 2026-09-30)
- [ ] You prefer API-compatible options to reduce lock-in: DeepSeek, xAI, and Mistral La Plateforme expose OpenAI-compatible APIs, so you pick the second-best model when it is compatible with the best (checked 2026-09-30)

## Where to track new releases (checked 2026-09-30)

- [ ] You check LMArena (lmarena.ai, formerly LMSYS Chatbot Arena, now Arena Intelligence) for blind human-preference Elo across 140+ models — verified it exists and is the standard preference leaderboard (checked 2026-09-30)
- [ ] You check Artificial Analysis (artificialanalysis.ai) for the Intelligence Index plus price/speed comparisons and modality-specific leaderboards (video, speech-to-speech) — verified it publishes these (checked 2026-09-30)
- [ ] You check the live MTEB leaderboard (huggingface.co/spaces/mteb/leaderboard) for embeddings — verified it is the canonical embedding benchmark, now split by domain (checked 2026-09-30)
- [ ] You treat official lab channels as release truth — blog.google, deepmind.google model cards, and Anthropic/OpenAI announcement posts — and you treat press coverage as secondary until the lab confirms (checked 2026-09-30)
- [ ] You track Hugging Face model pages for weight availability, licenses, and quant formats — you treat "open weights" as unverified until a checkpoint is actually downloadable (checked 2026-09-30)

## Sources

- https://techcrunch.com/2026/09/29/openai-launches-gpt-6-1-sol-says-it-nearly-matches-gpt-6-astra-and-costs-less/ — consulted for GPT-6.1 Sol launch and pricing
- https://www.tbsnews.net/tech/openai-shelves-new-ai-model-release-over-safety-concerns-1557486 — consulted for GPT-6.1 Astra cancellation (Reuters wire)
- https://www.reuters.com/technology/anthropic-rolls-out-second-claude-55-model-it-builds-toward-ipo-2026-09-28/ — consulted for Claude Sonnet 5.5 release and pricing
- https://9to5mac.com/2026/09/28/anthropic-upgrades-claude-with-new-sonnet-5-5-model-details-here/ — consulted to cross-check Sonnet 5.5 and the Claude 5.5 family
- https://www.scriptbyai.com/anthropic-claude-timeline/ — consulted for the Claude release timeline (Opus 5.5, Fable 5.1, Mythos 5.1)
- https://blog.google/innovation-and-ai/technology/developers-tools/build-real-time-voice-applications-gemini-audio/ — consulted for Gemini 3.8 Live and Gemini 3.5 Transcribe (Google primary source)
- https://www.theregister.com/ai-and-ml/2026/08/10/zuck-rekindles-open-weights-llama-drama-with-muse-glimmer/5285666 — consulted for Muse Glimmer and Meta's open-weights reversal
- https://explainx.ai/blog/meta-llama-4-open-source-models-guide-2026 — consulted for Llama 4 Scout/Maverick specs
- https://siliconangle.com/2025/12/09/mistral-ais-devstral-2-open-weights-vibe-coding-model-built-rival-best-proprietary-systems/ — consulted for Devstral 2 licenses and API pricing
- https://github.com/redhat-et/physical-ai-platform-intel/blob/HEAD/deliverables/intel/companies/mistral-ai-deep-dive.md — consulted to cross-check Mistral model licenses (Apache 2.0 vs CC BY-NC)
- https://vdf.ai/blog/deepseek-on-premises-enterprise-deployment/ — consulted for the DeepSeek V4 checkpoint lineup, params, and MIT licenses
- https://github.com/kzinmr/ai-topics/blob/HEAD/wiki/entities/deepseek.md — consulted to cross-check DeepSeek V4 specs and open-weight status
- https://www.marktechpost.com/2026/09/21/spacexai-releases-grok-4-7/ — consulted for Grok 4.7 specs, context window, and pricing
- https://www.winzheng.com/en/article/xai-grok-4-8-2-5t-cpp-stack-agi-roadmap-grok-47-delay — consulted to cross-check Grok 4.7 status and Grok 4.8 in-training claim
- https://cellcog.ai/blog/qwen-4-release-date/ — consulted for Qwen3.8-Max open weights and Qwen 4 in-training status
- https://www.yottalabs.ai/post/qwen-4-release-date-what-is-known-how-to-prepare-2026 — consulted to cross-check Qwen 4 tiers and release status
- https://local-ai-zone.github.io/blog/qwen3-8-flash-next-deep-dive.html — consulted for Qwen3.8 family specs and API pricing
- https://tech-insider.org/ca/sora-2-vs-veo-3-1-vs-kling-3-0-2026/ — consulted for video models (Veo 3.1, Kling 3.0, Sora 2 sunset)
- https://github.com/itsrajkumar/ai-engineer-dotnet/blob/HEAD/Week-03-Embeddings-and-Data-Processing/Day-01-Embedding-Theory/README.md — consulted for 2026 embedding model shortlist and MTEB notes
- https://github.com/boreilly-dc/sota-reference/blob/HEAD/rag/embedding-models.md — consulted to cross-check MTEB domain-split leaderboards
- https://www.swfte.com/ai/lmarena-ai — consulted for LMArena September 2026 snapshot and open-model standings
- https://github.com/ozzyczech/wiki/blob/HEAD/AI/Benchmarks.md — consulted to verify LMArena, Artificial Analysis, and HF Open LLM Leaderboard exist
- https://dev.to/mrsaynothing/how-to-run-gguf-models-locally-ollama-llamacpp-vllm-59ek — consulted for GGUF quant guidance and the GGUF vs safetensors split
- https://github.com/quotesystemx/go-agent-llm-orchestrator/blob/HEAD/.agent/skills/local-llm-tuning/SKILL.md — consulted to cross-check quantization tradeoffs
- https://github.com/thesved/epic-skills/blob/HEAD/.claude/skills/_model-cache/research/2026-08-12/04-open-weights-field.md — consulted for Meta's Llama→Muse transition timeline
