# ML Model Landscape — choosing models in 2026

Scope: the flagship models, model classes, and selection rules as verified on 2026-09-30. Version-sensitive claims are dated; anything marked [unverified] is a carried-over claim I could not independently re-confirm this session. Internals of how models work live in `llm-how-it-works.md`.

## Flagship models by lab (checked 2026-09-30)

- [ ] You listed OpenAI's current state as: GPT-6.1 Astra scrapped Sep 28–29, 2026 after internal safety tests (Reuters) — you do not plan around it; GPT-6.1 Sol released at DevDay Sep 30, 2026 as the token-efficiency tier (~1/5 the tokens of Astra per task on DeepSWE 1.1 per OpenAI reporting) — and you verify Sol pricing on platform.openai.com before budgeting, because secondary sources report it inconsistently (checked 2026-09-30)
- [ ] You listed Anthropic's current lineup as Claude Sonnet 5.5 (Sep 28, 2026; $2/$10 per MTok; 30%+ faster and fewer tokens per task than Sonnet 5; first Sonnet with frontier-grade cyber safeguards), Claude Opus 5.5 (week prior; $4/$20 per MTok flagship), Haiku 5.5 due soon — plus the Fable/Mythos tier above Opus — all closed weights (checked 2026-09-30)
- [ ] You listed Google's current stack as Gemini 3.8 Flash (GA Sep 2, 2026; $0.75/$3.75 intro through 2026-12-31, then $1.50/$7.50; 1M input context; thinking levels low/medium/high; DeepSWE v1.1 73.7%) and Gemini 3.1 Pro Preview as the top reasoning tier; Gemini 4 is in pretraining per Google and unreleased — you do not cite it as available (checked 2026-09-30)
- [ ] You listed xAI's (now branded SpaceXAI) Grok 4.7 (Sep 21, 2026; closed; 500K context; text+image in, text out; reasoning low→xhigh; $2/$6 per MTok below 200K prompt tokens, $4/$12 above; a 2×-price Fast variant on Cursor/Grok Build) (checked 2026-09-30)
- [ ] You listed DeepSeek's current open-weight line as V4-Pro (1.6T total / 49B active, 1M context, MIT; note the `deepseek-v4-pro` API endpoint was redirected to V4.1 Flash on Sep 14, 2026), V4-Flash-0731 (304B-class, $0.14/$0.27 per MTok API, MIT), and V4.1-Flash (Sep 10, 2026; 552B backbone with 8B prefill/16B decode active, multimodal, MIT) (checked 2026-09-30)
- [ ] You listed Alibaba's Qwen3.8 line as: Qwen3.8-Max (Aug 3, 2026; 2.4T / 95B active; API $2/$6 per MTok), weights released Aug 12 under a **custom Qwen license** — not MIT/Apache, so you read its terms before commercial use; the open checkpoint is text-only (vision is API-only) and native context is 262K (1M needs a YaRN override, which Qwen warns can hurt short-text performance) (checked 2026-09-30)
- [ ] You listed Qwen3.8-27B (Apache 2.0, multimodal — the multimodal one in the family) and Qwen3.8-Flash-Next (Aug 26, 2026: open-weight preview of the Qwen4 architecture, 176B total / 6B active, sparse attention + DeltaNet hybrid); Qwen4 is confirmed in training (Sep 22) but unreleased (checked 2026-09-30)
- [ ] You listed Meta's current state as closed flagship Muse Spark (Apr 2026; Spark 1.2 hosted since July, 1M context, $1.25/$4.25 per MTok) plus Apache 2.0 open-weight Muse Glimmer 30B (Aug 10, 2026; distilled from Spark; 131K context; ~17GB quant; runs an agent loop on a 24GB consumer GPU; leads its class on MCP Atlas at 75.5) — Meta now runs a split open/closed strategy and Llama 4 is the superseded generation (checked 2026-09-30)
- [ ] You listed Mistral as open-weights-first: Devstral 2 123B (Dec 9, 2025; modified MIT; 256K context; agentic coding, 72.2% SWE-bench Verified), Devstral Small 24B (Apache 2.0), Mistral Large 3 / Small 4 / Ministral 3 (Apache 2.0), Voxtral TTS (CC BY-NC 4.0, 9 languages, zero-shot voice cloning) (checked 2026-09-30)
- [ ] You listed OpenAI's prior-generation GPT-5.6 family (Sol/Terra/Luna, Aug 2026; per secondary trackers Sol ~$5/$30, Terra ~$2.50/$15, Luna ~$1/$6 per MTok) as the generation GPT-6 replaces — relevant for migration planning, not for new builds (checked 2026-09-30)
- [ ] You listed Grok Build (terminal-native coding agent) and Cursor day-one availability as distribution facts for Grok 4.7, because your harness choice constrains your model choice (checked 2026-09-30)
- [ ] You listed the other verified open-weight contenders: Moonshot Kimi K3 (2.8T MoE, open weights, #1 on LMArena Frontend Code Arena, Sep 2026), Zhipu GLM-5.2 (744B, MIT, $1.40/$4.40 per MTok, ~168 tok/s — datacenter-class speed), and OpenAI gpt-oss (20B/120B open-weight reasoning/agentic line; the 20B fits a 16GB card) (checked 2026-09-30)
- [ ] You listed Anthropic's enterprise surface as part of the model choice: ~80% of its business is enterprise, Sonnet 5.5 ships day-one on the Claude Platform, AWS, GCP, and Azure with zero data retention, and GitHub added it to Copilot the same day (checked 2026-09-30)
- [ ] You listed Google's Gemini 3 Deep Think (Feb 2026) as the closed hardest-math/science tier behind AI Ultra and enterprise early access — not a general API default you can route production traffic to (checked 2026-09-30)

## Open weights vs closed weights (checked 2026-09-30)

- [ ] You verified that "open weights" means downloadable checkpoints you can self-host, modify, and fine-tune — you do NOT get training data or training code, and you budget integration work for quirks like baked-in precision or non-standard chat templates (checked 2026-09-30)
- [ ] You listed the 2026 license ladder most→least permissive: MIT (DeepSeek V4, GLM-5.2) > Apache 2.0 (Muse Glimmer, Mistral models, Qwen3.8-27B) > modified MIT (Devstral 2 — read the modification) > custom vendor license (Qwen3.8-Max) > CC BY-NC non-commercial (Voxtral TTS); you treat license as unverified until you read the actual LICENSE file (checked 2026-09-30)
- [ ] You decided to pick open weights for data privacy/self-hosting, fine-tuning control, air-gapped deployment, or API-price escape — while remembering that frontier-class open models (2.4T Qwen3.8-Max, 744B GLM-5.2) need datacenter GPUs (roughly 8×H200 at FP8), not workstations (checked 2026-09-30)
- [ ] You decided to pick closed models for frontier capability, zero GPU ops, vendor SLA, or fastest path to production — and you confirm a zero-data-retention API tier before sending sensitive data (checked 2026-09-30)
- [ ] You treat "open weights" as unverified until a checkpoint is actually downloadable on Hugging Face — you do not build on press-release promises (checked 2026-09-30)
- [ ] You account for permissionless forks: popular open weights get "abliterated" (safety-stripped) re-uploads within days of release (DeepSeek V4.1 Flash) — you pin official org repos (deepseek-ai, Qwen, Meta) and verify checksums (checked 2026-09-30)

## Model classes (checked 2026-09-30)

- [ ] You list reasoning effort as a per-task axis, not a per-model choice: flagships expose thinking modes and effort tiers (Grok low→xhigh; Gemini low/med/high; Claude/GPT effort settings), so you set effort per task — low/Flash for interactive, high/xhigh for batch agents (checked 2026-09-30)
- [ ] You list architecture as dense vs MoE and always report total AND active params: active params drive compute cost, total params drive VRAM (e.g. V4-Pro 1.6T/49B; Qwen3.8-Flash-Next 176B/6B) (checked 2026-09-30)
- [ ] You verify exact input/output modalities on the model card before assuming "multimodal": Llama-class text+image, Gemini 3.8 native text/image/video/audio/PDF — vendor definitions differ (checked 2026-09-30)
- [ ] You listed 2026 audio as: TTS via Gemini 3.8 Flash TTS (Sep 23, 2026; 100+ languages, 2000+ voices, 30-second voice cloning behind a consent-recording requirement) or Mistral Voxtral TTS (9 languages, CC BY-NC 4.0); STT and speech-to-speech claims are [unverified] this session — confirm on ai.google.dev before depending on them (checked 2026-09-30)
- [ ] You treat video generation (Veo 3.1, Kling 3.0, Sora 2 sunset) as [unverified] this session — carried from earlier notes, do not start new work on the basis of it without a fresh check (checked 2026-09-30)
- [ ] You treat the embedding shortlist as [unverified] this session (Qwen3-Embedding-8B, BGE-M3, text-embedding-3, Cohere embed-v4) — check the live MTEB leaderboard, which is split by domain (English, multilingual, code, law), before committing (checked 2026-09-30)
- [ ] You define the 2026 local-deployment sweet spot as a 27B-class dense model at Q4_K_M in ~17–24GB VRAM, and you prefer a smaller model at a high quant over a bigger model at a terrible quant; you verify a GGUF exists on Hugging Face before committing (GGUF is the runnable format for llama.cpp/Ollama; safetensors is for training) (checked 2026-09-30)
- [ ] You check output-token limits, not just input windows: DeepSeek V4 allows up to 384K output tokens while Gemini 3.8 Flash caps at 65,536 — long-form codegen and batch summarization hit output limits first (checked 2026-09-30)
- [ ] You use prompt-caching economics: Sonnet 5.5 charges $0.20/MTok for cache reads vs $2.50/MTok for writes, so long stable system prompts and repeated context get dramatically cheaper — you design prompts with stable prefixes (checked 2026-09-30)
- [ ] You check which models are natively harness-trained for agents: Grok 4.7 trains on the Grok Bot harness, Glimmer is distilled for tool use and failure recovery — a harness-trained model fails less than a chat model with tool-prompting bolted on (checked 2026-09-30)
- [ ] You check knowledge cutoffs per model before relying on recency (e.g. Grok 4.7: May 2026) — anything fresher needs retrieval or tools regardless of the release date (checked 2026-09-30)
- [ ] You check batch/Flex inference tiers for async workloads: Gemini Batch and Flex trade latency for price on classification, extraction, and eval jobs that don't need interactivity (checked 2026-09-30)

## How to choose a model for a task (checked 2026-09-30)

- [ ] You compare price per task, not price per token: a cheaper-per-token model can cost more per task if it burns tokens — you check the Artificial Analysis blended cost against your own workload's token profile (checked 2026-09-30)
- [ ] You cross-check vendor benchmark claims against independent sources (AA Intelligence Index — noting scores are effort-tier-specific, so read the tier label; LMArena Elo; SWE-bench Pro) before believing them, and you run a 200–1000 row eval on your own data before committing to a model for retrieval or agent work (checked 2026-09-30)
- [ ] You discount leaderboard claims for gaming: the Llama-4-Maverick incident (private pre-release variants tested against public leaderboards) and style/length vote bias are real, so you weight Style-Control boards and reproducible harnesses over raw Elo (checked 2026-09-30)
- [ ] You match context window to the job — 1M tokens is the 2026 frontier default, 10M-scale on special long-context SKUs — and you verify the window on the model card (native vs YaRN-extended), not the press release (checked 2026-09-30)
- [ ] You trade latency against capability with reasoning effort and you measure p99 end-to-end latency, not just time-to-first-token, for anything user-facing (checked 2026-09-30)
- [ ] You classify data privacy before choosing: self-hosted open weights for regulated data; for APIs you confirm zero-retention tiers and region residency (e.g. Anthropic offers zero data retention across Claude Platform/AWS/GCP/Azure) (checked 2026-09-30)
- [ ] You check license and cost at scale: per-token price × corpus size × refresh rate for embeddings, seat/usage billing for chat (GitHub Copilot bills provider list pricing under usage-based billing) (checked 2026-09-30)
- [ ] You prefer API-compatible options to reduce lock-in: DeepSeek, xAI, and Mistral La Plateforme expose OpenAI-compatible APIs — and DeepSeek's API even supports OpenAI's Responses format — so you pick the second-best model when it is compatible with the best (checked 2026-09-30)
- [ ] You confirm tokenizer and model-ID compatibility when migrating: pinned IDs die on schedules press releases never mention (Gemini 3 Pro Preview was shut down Mar 9, 2026, with the old ID silently aliased) — you pin IDs, watch deprecation pages, and test the alias (checked 2026-09-30)
- [ ] You budget for agentic token multipliers: agent loops burn 5–50× the tokens of single-turn use, so token-efficient models (GPT-6.1 Sol, Gemini 3.8 Flash, DeepSeek V4-Flash) change agent economics more than per-token price alone — you measure tokens-per-task, not tokens-per-call (checked 2026-09-30)

## Where to track new releases (checked 2026-09-30)

- [ ] You check LMArena (lmarena.ai) for blind human-preference Elo across 140+ models plus spinoff arenas (Agent, WebDev, Frontend Code) — verified it exists and is the standard preference leaderboard, with caveats above (checked 2026-09-30)
- [ ] You check Artificial Analysis (artificialanalysis.ai) for the Intelligence Index plus price/speed tracking — verified it publishes these, with effort-tier labels you must read (checked 2026-09-30)
- [ ] You treat official lab channels as release truth (deepmind.google/ai.google.dev model cards, Anthropic/OpenAI announcement posts, api-docs.deepseek.com changelog) and press coverage as secondary until the lab confirms (checked 2026-09-30)
- [ ] You track Hugging Face model pages for weight availability, LICENSE files, and quant formats — you treat "open weights" as unverified until a checkpoint is downloadable (checked 2026-09-30)
- [ ] You use aireleasetracker.com as a secondary aggregator for release dates, verified API pricing, and open/closed status — not as a primary source (checked 2026-09-30)
- [ ] You watch provider status and deprecation pages (Google's deprecations page, DeepSeek's API changelog) because model IDs die on schedules that press releases never mention (checked 2026-09-30)
- [ ] You check OpenRouter and per-provider pages for live pricing variance: the same open-weight model prices differently per host (e.g. Muse Glimmer ~$0.30/$1.10 per MTok baseline with provider-side variance) (checked 2026-09-30)
- [ ] You treat GitHub-hosted research ledgers and model docs as secondary corroboration, never as release truth — useful for specs and timelines, not for pricing or availability (checked 2026-09-30)
- [ ] You re-verify every dated claim in this file before a load-bearing decision: the landscape turns over monthly, and a September snapshot is stale by November (checked 2026-09-30)

## Sources

- https://www.tbsnews.net/tech/openai-shelves-new-ai-model-release-over-safety-concerns-1557486 — GPT-6.1 Astra scrapped after safety tests (Reuters, Sep 29, 2026)
- https://zubiqo.com/news/openai-pivots-to-gpt-6-1-sol-at-devday-after-rogue-astra-safety-delay-8itdqb — GPT-6.1 Sol at DevDay Sep 30, 2026: token-efficiency tier vs Astra
- https://www.reuters.com/technology/anthropic-rolls-out-second-claude-55-model-it-builds-toward-ipo-2026-09-28/ — Claude Sonnet 5.5 release and pricing
- https://9to5mac.com/2026/09/28/anthropic-upgrades-claude-with-new-sonnet-5-5-model-details-here/ — Sonnet 5.5 details, Opus 5.5 prior week, Fable/Mythos tier
- https://www.thestreet.com/technology/anthropic-claude-sonnet-5-5-cybersecurity — Sonnet 5.5 cyber safeguards, Haiku 5.5 due soon
- https://thinkreview.dev/blog/why-gemini-flash-kept-shipping — Gemini Flash cadence: 3.8 Flash GA Sep 2, 2026, $0.75/$3.75 intro, Gemini 4 in pretraining
- https://github.com/bofai/docs/blob/HEAD/docs/llmservice/models/gemini-3-8-flash.md — Gemini 3.8 Flash: 1M context, thinking levels, tool support (via ai.google.dev)
- https://www.alextech.ai/en/news/gemini-38-flash-tts-google-focuses-on-vocal-expressiveness/ — Gemini 3.8 Flash TTS: 100+ languages, 2000 voices, 30-sec voice cloning with consent
- https://www.progressiverobot.com/2026/09/24/spacexai-grok-4-7-aixploria/ — Grok 4.7 specs: Sep 21, 2026, 500K context, $2/$6 (<200K) / $4/$12 above, low→xhigh reasoning, SpaceXAI branding
- https://mer.vin/news/grok-4-7-arrives-with-the-same-price-and-a-hidden-pricing-tier/ — Grok 4.7 pricing tiers and Fast variant
- https://github.com/pedro-bright/the-ledger/blob/HEAD/content/events/2026/30-deepseek-v4-pro-release.md — DeepSeek V4-Pro/Flash: Apr 24, 2026, 1.6T/49B, 284B/13B, 1M context, MIT
- https://github.com/kzinmr/ai-topics/blob/HEAD/wiki/concepts/deepseek-v4.md — V4-Flash-0731: 304B, $0.14/$0.27 per MTok, Intelligence Index 50, OpenAI-compatible Responses format
- https://tech-insider.org/deepseek-v4-1-flash-uncensored-abliterated-huggingface-2026/ — V4.1-Flash Sep 10, 2026 (552B backbone, 8B/16B active, multimodal, MIT); V4-Pro API redirect Sep 14, 2026
- https://aws.amazon.com/blogs/machine-learning/deploying-qwen3-8-2-4t-a95b-on-amazon-sagemaker-hyperpod-with-vllm/ — Qwen3.8-2.4T-A95B open weights Aug 12, 2026; 2.4T/95B, NVFP4 deployment on HyperPod
- https://github.com/kreuzhofer/dgx-manager/blob/HEAD/docs/qwen3.8-model-survey.md — Qwen3.8 family: 27B Apache 2.0 multimodal, Max open checkpoint text-only, native 262K context (1M via YaRN)
- https://tech-insider.org/kimi-k3-vs-qwen3-8-max-vs-glm-5-2-2026/ — Qwen3.8-Max custom license (not fully permissive); Kimi K3 open weights; GLM-5.2 MIT
- https://github.com/semianalysisai/inferencex-app/blob/HEAD/packages/app/content/models/qwen-3-8-flash-next.mdx — Qwen3.8-Flash-Next: 176B total / 6B active, preview of Qwen4 architecture
- https://explainx.ai/blog/meta-muse-glimmer-open-weight-30b-agentic-model-2026 — Muse Glimmer: 30B, Apache 2.0, distilled from Muse Spark, Aug 10, 2026
- https://tech-insider.org/meta-muse-glimmer-open-weight-ai-model-2026/ — Glimmer details: single consumer GPU, 4-bit quant, Zuckerberg confirmation
- https://github.com/fewshot-works/academy/blob/HEAD/site/blog/2026-08-12-open-weight-models-agent-benchmarks/index.md — Muse Spark 1.2 hosted $1.25/$4.25; GPT-5.6 family; Grok 4.6; MCP Atlas 75.5
- https://github.com/redhat-et/physical-ai-platform-intel/blob/HEAD/deliverables/intel/companies/mistral-ai-deep-dive.md — Mistral license table: Large 3 / Small 4 / Ministral 3 Apache 2.0; Voxtral TTS CC BY-NC 4.0
- https://github.com/aftabibrahimkazi/inkwake/blob/HEAD/skills/models/opencode/devstral-2.md — Devstral 2: 123B dense, modified MIT, 256K ctx, 72.2% SWE-bench Verified
- https://www.swfte.com/ai/lmarena-ai — LMArena September 2026 snapshot: Fable 5/Opus 5 top text, Kimi K3 #1 Frontend Code, open models in frontier band
- https://www.swfte.com/ai/leaderboard — Kimi K3 (2.8T MoE open), GLM-5.2 (744B MIT, $1.40/$4.40), DeepSeek V4 Pro value leader
- https://ofox.ai/blog/llm-leaderboard-best-ai-models-ranked-2026/ — AA Intelligence Index Aug 31, 2026: Opus 5/Fable 5 top, effort tiers, blended pricing
- https://github.com/vacantfury/llm_guardrail_security/blob/HEAD/text_docs/shared/ai_leaderboards.md — leaderboard integrity: Llama-4-Maverick incident, style/length bias, SWE-bench Verified saturation
- https://github.com/sandraschi/sandraschi/blob/HEAD/LOCAL_LLM_STACK.md — 2026 open-weight champions: gpt-oss 20B/120B, Qwen 3.6 27B, Gemma 4, GGUF/Q4_K_M guidance
- https://github.com/daizedong/market-intel/blob/HEAD/skills/market-intel/reference/domains/frontier-research.md — lmarena.ai rebrand (arena.ai), Papers-with-Code sunset, HF as primary weight source
