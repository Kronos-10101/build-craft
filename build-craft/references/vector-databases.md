# Vector Databases — Embeddings and Retrieval Done Right

How to turn text into vectors, store them, and retrieve them reliably for RAG and semantic search. Versions and prices are approximate, checked 2026-09-30.

## The embedding contract

- [ ] You can explain the contract: an embedding model maps text to a dense vector (e.g. 384–3072 floats) where geometric closeness ≈ semantic similarity.
- [ ] Documents and queries are embedded with the **same model** (or a matched query/passage pair) — mixing models silently destroys ranking.
- [ ] The distance metric is deliberate: cosine (direction only — normalize to unit length first) vs dot product (identical to cosine on normalized vectors, cheaper) vs Euclidean — and the index is built for the metric you chose, not a different one.
- [ ] Every stored vector records **model name + version + dimensions** alongside it; a model change triggers a full re-embed, never a mixed index.
- [ ] Truncation to fewer dimensions (e.g. Matryoshka-style) is measured to keep recall within budget before deploying it to save memory — never assumed free.

## Picking the embedding model

- [ ] The model is picked from measured retrieval quality on your data (MTEB-style benchmarks are a starting filter, not the decision), not from brand familiarity.
- [ ] For asymmetric search (short query, long documents) you tested whether instruction prefixes ("query:" / "passage:") or a matched query-passage model pair improves recall — and the choice is recorded.
- [ ] The embedding endpoint's rate limits, batch API, and per-token pricing are known before ingestion design: ingestion at 1M chunks is a cost line item, not an afterthought.
- [ ] Ingestion embeds in batches with retries and a dead-letter record for failures — never one-by-one API calls.

## Chunking strategy for RAG

- [ ] Chunking follows document **structure**, not raw character counts: headings/paragraphs for prose (256–1024 tokens), function/class for code, Q&A pairs kept whole, table rows kept intact with the header repeated.
- [ ] Overlap is 10–20% of chunk size for prose (prevents severed context at cut points); ~0 for code split at function boundaries.
- [ ] You never split mid-sentence or mid-paragraph — the single most damaging and most common RAG mistake.
- [ ] Every chunk stores metadata: `source`, `section path`, `page/version`, stable `chunk_id` — retrieval without provenance is undebuggable.
- [ ] At least two chunk sizes were A/B-tested on a golden query set before locking the strategy in.
- [ ] Late chunking / contextual retrieval (attaching document-level context to each chunk) was evaluated for corpora where chunks lose meaning in isolation — and either adopted or rejected with a measured reason.

## ANN index families — HNSW vs IVF-PQ vs DiskANN

- [ ] You can explain HNSW: a multi-layer proximity graph — sparse "highway" layers on top, every vector at the bottom layer; search descends greedily, visiting O(log n) nodes instead of scanning all n.
- [ ] You can explain IVF-PQ: vectors are clustered by k-means, the query probes only the nearest `nprobe` clusters; product quantization compresses vectors 8–32× at some recall cost.
- [ ] You can explain DiskANN: a disk-resident graph index (Milvus, pgvectorscale's StreamingDiskANN) that serves billion-scale corpora larger than RAM from SSD — the third option when HNSW's RAM footprint becomes the bill.
- [ ] You chose from the triangle deliberately: **HNSW** = best recall/latency, highest RAM, no training phase, incremental inserts; **IVF-PQ** = far less RAM, needs offline centroid training and re-training as data drifts, recall tuned via `nprobe`; **DiskANN** = scale past RAM at the cost of build complexity and higher p99.
- [ ] The knobs are tuned on your data, not defaults: HNSW `M` (12–48) and `ef_search` (recall ↑, latency ↑); IVF `nprobe` (recall ↑, latency ↑).
- [ ] Exact brute-force k-NN exists in the eval harness as the recall@k ground truth — you never "tune" an approximate index against another approximate index.

## Quantization — trading recall for memory

- [ ] The memory math is done before choosing: 10M × 1536-dim float32 is ~60 GB raw — halfvec/int8 halves it, binary quantization takes it to ~2 GB, each with a measured recall cost.
- [ ] You measured which quantization your corpus tolerates before deploying it: binary (32× smaller), int8/scalar (~2–4×), RaBitQ-style (~8 bit/dim at <1% recall loss claimed) — vendor claims verified on your golden set.
- [ ] pgvector's `halfvec` (50% RAM vs `vector`) is the default type for new tables; binary quantization is used only after measured recall stays in budget.
- [ ] Quantized candidates are rescored against full-precision vectors wherever the engine supports it (rescore-by-rerank), recovering most of the recall loss.
- [ ] Quantization settings are versioned with the index: changing them is an index rebuild, and the rebuild time is known in advance.

## Engine picks — when to use which

- [ ] **pgvector** (Postgres extension, v0.8.x checked 2026-09-30): picked when Postgres is already in the stack and the corpus is under ~10M vectors — one system, SQL `WHERE` + `<=>`, no new ops. Four types: `vector` (≤2000 dims indexable), `halfvec` (≤4000), `bit` (≤64000), `sparsevec` (≤1000); HNSW and IVFFlat indexes. The 0.8 headline feature is `hnsw.iterative_scan` (relaxed/strict order, `max_scan_tuples` default 20,000): filtered HNSW queries keep scanning until LIMIT is satisfied instead of returning short — set it rather than working around it. Upgrading 0.6→0.8 needs no reindex for iterative scan.
- [ ] **pgvectorscale / VectorChord** (Postgres extensions): picked when you must stay in Postgres past pgvector's comfortable range — StreamingDiskANN + statistical binary quantization (pgvectorscale) or RaBitQ quantization with `vchordrq`/`vchordg` indexes (VectorChord, pgvector-type compatible) push a single Postgres box far past RAM-sized corpora.
- [ ] **Qdrant** (OSS, Rust, Apache-2.0): picked for 10M–1B vectors when query latency and rich payload filtering matter — native dense + sparse hybrid search in one query, scalar/product/binary quantization, on-disk HNSW, GPU-accelerated index builds (2026 releases), Raft-based replication, single-binary self-host or managed cloud (free 1 GB cloud tier, no card).
- [ ] **Weaviate** (OSS, BSD-3): picked when mature BM25 + dense hybrid in one query, multi-tenant filtered search, or pluggable vectorizer/reranker modules are the core requirement; 2026 releases added a native MCP server so agents query it directly.
- [ ] **Pinecone** (managed only, SaaS): picked only when zero-ops is worth the price and SaaS-only is acceptable — serverless default, dense vectors only, namespaces for multitenancy, plus inference (embed) and rerank APIs. Pricing approx: Standard ~$50/mo minimum, ~$0.33/GB-mo storage, ~$16–18/M read units, ~$4–4.50/M write units; Starter free tier (2 GB, 1M RU/mo, 2M WU/mo) covers prototyping. Read units dominate real bills — modeled at your QPS before committing.
- [ ] **Milvus** (distributed, Apache-2.0): picked only past ~100M–1B vectors with a team that can operate its distributed components; v2.6 replaced the Kafka/Pulsar dependency with its own Woodpecker WAL, and 11 index types (HNSW, IVF, DiskANN, …) cover every scale tier. Zilliz Cloud if managed. Otherwise overkill.
- [ ] You can state corpus size, QPS, and p99 latency target — and the engine chosen is the cheapest one that meets them, not the most impressive.

## Hybrid search and filtered search

- [ ] Production RAG runs **dense + BM25 in parallel and fuses** (reciprocal rank fusion, k=60 default) — dense alone misses exact SKUs, error codes, names, and rare terms; keyword alone misses paraphrase. Pure vector search is a demo, not a product.
- [ ] Fusion weights are decided from measurement on your query set, and you can say which query classes each side wins.
- [ ] Filters (tenant, permissions, date ranges) are pushed into the index query (pre-filter/native filtered ANN), not applied after top-k — post-filtering silently returns fewer than k results.
- [ ] A highly selective filter case is tested explicitly: aggressive filtering on HNSW collapses recall — on pgvector 0.8+ `hnsw.iterative_scan` is enabled; on other engines the native filtered-search behavior is verified, not assumed.

## Multitenancy

- [ ] The isolation model is chosen deliberately: separate indexes/collections (strongest isolation, most ops overhead) vs namespaces/partitions (Pinecone namespaces, Qdrant collections + payload sharding, Weaviate multi-tenancy classes) vs a tenant filter column (cheapest, weakest).
- [ ] With filter-based tenancy, every query path includes the tenant predicate — a missing predicate is a cross-tenant data leak, and it's enforced by test, not convention.
- [ ] Per-tenant vector-count skew is considered: one giant tenant must not destroy recall or latency for small ones — verified with a skewed test, not assumed.
- [ ] Tenant onboarding/offboarding is a defined operation: bulk delete of one tenant's vectors is tested (not "delete index and rebuild everything").

## Reranking — precision after cheap recall

- [ ] The pipeline over-retrieves (ANN top 20–100) and lets a cross-encoder **reranker** (bge-reranker, Cohere rerank, Pinecone rerank) pick the final few for the LLM context — ANN is for cheap recall, the reranker is for precision.
- [ ] The reranker's latency and cost are budgeted: cross-encoders score query×candidate pairs and are 10–100× more expensive per candidate than ANN — the ANN top-k is sized to fit the budget.
- [ ] Reranker choice is A/B-tested on the golden set, not assumed from vendor claims; a "no reranker" baseline exists for comparison.
- [ ] Where latency is tight, a two-stage fallback exists: rerank top-20 by default, skip reranking (ANN order only) under a latency SLO breach — and the fallback path is tested.

## Connecting the app properly

- [ ] One long-lived client per process (singleton), not a new connection per request; connection pooling configured for your QPS.
- [ ] Writes are batched upserts with stable IDs (idempotent re-ingestion); index builds happen offline/rolling, never blocking serve traffic.
- [ ] Timeouts, retries with backoff, and a degraded mode (keyword-only fallback) exist on the retrieval path — a vector DB outage must not 500 the app.
- [ ] Embedding and query traffic is authenticated and rate-limited; embedding API keys are never shipped to the browser.

## Evaluating retrieval quality

- [ ] A golden set exists: 50+ real queries with judged relevant chunk IDs, versioned alongside the corpus.
- [ ] You report **recall@k** (fraction of relevant chunks in top-k) and ideally MRR/nDCG — "the demo looked good" is not a metric.
- [ ] The golden set re-runs on every change: chunking, embedding model, index params, quantization, or reranker — regressions are caught by the eval, not by users.
- [ ] End-to-end is measured: retrieval latency p95 plus answer faithfulness (citations point at retrieved chunks), not retrieval metrics alone.
- [ ] Failure cases are sampled and labeled (wrong chunk retrieved vs right chunk but bad answer) so fixes go to retrieval or generation, not both blindly.

## Cost heuristics

- [ ] The embedding bill is modeled before ingestion: 1M chunks × 512 tokens at typical API rates is a real line item — and re-embedding after a model change costs it again.
- [ ] Serverless vector pricing is modeled at your QPS before committing: read-unit billing is cheap at prototype scale and brutal past ~100M queries/mo (Pinecone read units dominate real invoices).
- [ ] Self-hosted sizing starts from the memory math, not vibes: raw vectors + HNSW graph overhead (~1.5–2× raw) must fit RAM, or you pick IVF-PQ, DiskANN, or quantization deliberately.
- [ ] Index rebuild time for your corpus size is measured (10M vectors ≈ 15–45 min depending on engine) and rebuilds are planned operations, not surprises.

## Red flags before committing

- [ ] The distance metric in the index matches the one used at query time — a cosine index queried with dot-product scores silently misranks.
- [ ] Dimensionality is consistent end to end: index, query vectors, and any truncation/quantization agree, or queries fail or misrank.
- [ ] Sparse/BM25 support is confirmed where hybrid matters: not every "hybrid" claim is native — some engines need a sparse-vector workaround or plugin.
- [ ] A managed-only engine (Pinecone) is accepted as a hard dependency: no self-host exit exists, and the contract, not the docs page, states the SLA.
- [ ] The vector store is not used as a primary database: vectors are derived data — the source documents live in Postgres/object storage, and the index can be rebuilt from them.

## Sources

- https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/
- https://dev.to/ahmed_mahmoud360/hybrid-search-in-postgres-with-pgvector-field-notes-on-hnsw-tsvector-and-why-pure-vector-search-1a18
- https://dev.to/agdex_ai/top-vector-databases-for-ai-agents-in-2026-qdrant-vs-pinecone-vs-weaviate-vs-pgvector-vs-milvus-4ng2
- https://dev.to/krunalkanojiya/pinecone-vs-weaviate-vs-milvus-vs-qdrant-which-vector-db-in-2026-26dc
- https://github.com/gburd/pg_turbovec/blob/HEAD/docs/COMPETITIVE_LANDSCAPE_2026-06.md
- https://en.wikipedia.org/wiki/Hierarchical_navigable_small_world
- https://www.marktechpost.com/2026/05/10/best-vector-databases-in-2026-pricing-scale-limits-and-architecture-tradeoffs-across-nine-leading-systems/
