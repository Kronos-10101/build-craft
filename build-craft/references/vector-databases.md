# Vector Databases — embeddings and retrieval done right

How to turn text into vectors, store them, and retrieve them reliably for RAG and semantic search. Checked 2026-09-30.

## What embeddings are

- [ ] You can explain the contract: an embedding model maps text to a dense vector (e.g. 384–3072 floats) where geometric closeness ≈ semantic similarity.
- [ ] Documents and queries are embedded with the **same model** (or a matched query/passage pair) — mixing models silently destroys ranking.
- [ ] You chose the distance metric deliberately: cosine (direction only — normalize vectors to unit length first) vs dot product (identical to cosine on normalized vectors, cheaper) vs Euclidean.
- [ ] You measured that truncation to fewer dimensions (e.g. Matryoshka-style) keeps recall within your budget before deploying it to save memory.

## Making embeddings well

- [ ] You picked the embedding model from measured retrieval quality on your data (MTEB-style benchmarks are a starting filter, not the decision), not from brand familiarity.
- [ ] Every stored vector records its **model name + version + dimensions** alongside it; a model change triggers a full re-embed, never a mixed index.
- [ ] Ingestion embeds in batches (throughput, not one-by-one API calls), with retries and a dead-letter record for failures.
- [ ] You can explain why embedding the query differently from documents (instruction prefixes like "query:") helps asymmetric search, and you tested whether yours needs it.

## Chunking strategy for RAG

- [ ] Chunking follows document **structure**, not raw character counts: headings/paragraphs for prose (256–1024 tokens), function/class for code, Q&A pairs kept whole, table rows kept intact with the header repeated.
- [ ] Overlap is 10–20% of chunk size for prose (prevents severed context at cut points); ~0 for code split at function boundaries.
- [ ] You never split mid-sentence or mid-paragraph — the single most damaging and most common RAG mistake.
- [ ] Every chunk stores metadata: `source`, `section path`, `page/version`, stable `chunk_id` — retrieval without provenance is undebuggable.
- [ ] You A/B-tested at least two chunk sizes on a golden query set before locking the strategy in.

## Vector DB options — when to pick each

- [ ] **pgvector** (Postgres extension): you picked it when Postgres is already in the stack and the corpus is under ~10M vectors — one system, SQL `WHERE` + `<=>` distance, no new ops burden.
- [ ] **Qdrant** (OSS, Rust): you picked it for 10M–1B vectors when raw query latency and rich payload filtering matter; single-binary self-host or managed.
- [ ] **Weaviate** (OSS): you picked it when hybrid dense+BM25 in one query or multi-tenant filtered search is the core requirement.
- [ ] **Pinecone** (managed only): you picked it only when zero-ops is worth the price and SaaS-only is acceptable — dense vectors only, no self-host path.
- [ ] **Milvus** (distributed): you picked it only past ~1B vectors with a team that can operate its distributed components; otherwise it is overkill.
- [ ] You can state your corpus size, QPS, and p99 latency target — and the DB you chose is the cheapest one that meets them, not the most impressive.

## ANN indexes — HNSW vs IVF

- [ ] You can explain HNSW: a multi-layer proximity graph (sparse "highway" layers on top, all vectors at layer 0); search descends greedily, visiting O(log n) nodes instead of scanning all n.
- [ ] You can explain IVF: vectors are clustered (k-means), the query probes only the nearest `nprobe` clusters; add product quantization (PQ) to compress vectors 8–32× at some recall cost.
- [ ] You chose from the triangle deliberately: **HNSW** = best recall/latency, highest RAM (full vectors + graph in memory), no training phase, incremental inserts; **IVF-PQ** = far less RAM, needs offline centroid training, recall tuned via `nprobe`.
- [ ] You tuned the knobs on your data, not defaults: HNSW `M` (12–48) and `ef_search` (recall ↑, latency ↑); IVF `nprobe` (recall ↑, latency ↑).
- [ ] Exact brute-force k-NN exists in your eval harness as the recall@k ground truth — you never "tune" an approximate index against another approximate index.

## Hybrid search and metadata filtering

- [ ] You run **dense + BM25 in parallel and fuse** (e.g. reciprocal rank fusion) for production RAG — dense alone misses exact SKUs, error codes, names, and rare terms.
- [ ] You decided the fusion weights from measurement on your query set, and you can say which query classes each side wins.
- [ ] Filters (tenant, permissions, date ranges) are pushed into the index query (pre-filter/native filtered ANN), not applied after top-k — post-filtering silently returns fewer than k results.
- [ ] You tested a highly selective filter case explicitly: aggressive filtering on HNSW can collapse recall, and you know your engine's behavior there.

## Connecting the app properly

- [ ] One long-lived client per process (singleton), not a new connection per request; connection pooling configured for your QPS.
- [ ] Writes are batched upserts with stable IDs (idempotent re-ingestion); index builds happen offline/rolling, never blocking serve traffic.
- [ ] Query path sets explicit `top_k` (retrieve 20–100) and lets a cross-encoder **reranker** pick the final few for the LLM context — ANN is for cheap recall, the reranker is for precision.
- [ ] Timeouts, retries with backoff, and a degraded mode (keyword-only fallback) exist on the retrieval path — a vector DB outage must not 500 the app.

## Evaluating retrieval quality

- [ ] You built a golden set: 50+ real queries with judged relevant chunk IDs, versioned alongside the corpus.
- [ ] You report **recall@k** (fraction of relevant chunks in top-k) and ideally MRR/nDCG — "the demo looked good" is not a metric.
- [ ] You re-run the golden set on every change: chunking, embedding model, index params, or reranker — retrieval regressions are caught by the eval, not by users.
- [ ] You measured end-to-end: retrieval latency p95 plus answer faithfulness (citations point at retrieved chunks), not retrieval metrics alone.

## Sources

- https://layerbase.com/blog/vector-databases-compared-2026
- https://en.wikipedia.org/wiki/Hierarchical_navigable_small_world
- https://github.com/neurarch-ai/awesome-llm-system-design/blob/HEAD/topics/08-semantic-search-and-embeddings.md
- https://github.com/grigortodorov/rag-best-practices/blob/HEAD/examples/chunking-heuristics.md
- https://github.com/skillseal/skillseal/blob/HEAD/skills/rag-engineer/SKILL.md
- https://www.systemoverflow.com/learn/ml-search-ranking/search-scalability/approximate-nearest-neighbor-hnsw-ivf-pq
