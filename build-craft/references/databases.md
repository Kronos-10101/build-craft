# Databases — production checklist

Covers data modeling and types, normalization, indexing (strategy + type matrix), EXPLAIN discipline, migrations, transactions and isolation, N+1 detection, connection pooling, backups/PITR, replication, Postgres 17/18/19 features, and maintenance. Managed-platform comparison lives in `managed-data-platforms.md`.

## Data modeling & types

- [ ] Identifiers use `uuid` (prefer `uuidv7()` as the default on PG 18+ — time-ordered, good B-tree locality, unlike random UUIDv4 which fragments indexes); never `varchar` for IDs.
- [ ] Times are `timestamptz`, never `timestamp` (timezone-naive columns corrupt ordering across DST and regions); variable strings are `text`, never `varchar(n)`; money is `numeric`, never float; documents are `jsonb`, never `json`.
- [ ] Boolean columns are `NOT NULL DEFAULT false` unless three-state semantics are genuinely intended; `now()` inside long transactions is replaced by `clock_timestamp()` where wall-clock time matters.
- [ ] Constraints enforced at the database level — `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys — because application validation is not the last line of defense; native PG enums only where the value set is stable (altering them mid-transaction has version-specific caveats).
- [ ] Collation chosen deliberately (ICU or the PG 17 built-in provider) so ordering is consistent across hosts — never assume libc collation equality between environments.
- [ ] Temporal/uniqueness business rules use range types and exclusion constraints (with GiST), including PG 18 temporal constraints as `PRIMARY KEY`/`UNIQUE`/`FOREIGN KEY` arguments for valid-time tables and slowly-changing dimensions.

## Normalization vs denormalization

- [ ] Default to **3NF** for OLTP: 1NF atomic values/unique rows, 2NF non-key columns depend on the entire key, 3NF no transitive dependencies.
- [ ] Normalize where write integrity is critical (financial ledgers, inventory): each fact stored exactly once so anomalies are structurally impossible.
- [ ] Denormalize only with **measured evidence** — a specific slow query on a hot path, not speculation (read-heavy ~90:10+ workloads, dashboards, pre-computed aggregates).
- [ ] Every denormalization decision documented: what is redundant, why, expected read gain, sync strategy, accepted consistency risk; copies kept consistent via a defined mechanism (events, triggers, materialized views).
- [ ] Audit for anomaly smells: comma-separated VARCHAR lists (1NF), partial-key dependencies (2NF), transitive deps like `city → state` in a customers table (3NF).

## Indexing strategy

- [ ] Indexes derived from the slow-query log (`pg_stat_statements` in `shared_preload_libraries`), not from guesses; every new index verified with `EXPLAIN ANALYZE` before/after.
- [ ] Composite index order: equality columns first, then range/sort; high-selectivity first; redundant single-column prefix indexes removed (PG 18 B-tree skip scan lets the planner use multicolumn indexes without the leading column — re-verify assumed needs).
- [ ] Covering indexes (`INCLUDE`) for hot read paths; partial indexes for skewed data (`WHERE deleted_at IS NULL`); expression indexes for computed filters (`lower(email)`).
- [ ] **Every foreign key used in joins is indexed** — unindexed FKs cause full scans on child tables during referential checks and delete cascades.
- [ ] No over-indexing: each index pays a write cost; never index "just in case"; no lone indexes on low-cardinality booleans; monthly audit of unused indexes (`idx_scan = 0` over >30 days → drop).
- [ ] Indexes built with `CREATE INDEX CONCURRENTLY` on production tables (it cannot run inside a transaction block — migration tools must opt out of their default transaction wrapping); failed concurrent builds leave an `INVALID` index — drop and retry; rebuilds use `REINDEX CONCURRENTLY`.

## Index type matrix

- [ ] **B-tree** (default): equality, ranges, `ORDER BY`, `LIKE 'prefix%'` — the answer unless a specific access pattern says otherwise.
- [ ] **GIN**: `jsonb` containment, arrays, full-text (`tsvector`), and trigram fuzzy search (`gin_trgm_ops` from `pg_trgm` for `ILIKE '%foo%'`) instead of leading-wildcard `LIKE`; parallel GIN builds on PG 18 for large tables.
- [ ] **GiST**: range types, geometric data, KNN ordering; required backing for exclusion constraints.
- [ ] **BRIN**: huge time-series/log tables where physical row order correlates with the indexed column; parallel BRIN builds since PG 17.
- [ ] **hash**: equality-only lookups where hash indexes fit; WAL-logged and crash-safe since PG 10.
- [ ] **HNSW** (`pgvector`): approximate nearest-neighbor vector search with tuned `m`/`ef_construction` for the recall/latency target; exact scans only acceptable below ~10k rows; up to 2,000 dims full precision (4,000 half-precision, 64,000 binary-quantized).
- [ ] One access pattern per index — the matrix above is consulted before creating anything; "create all types and see" is a failed review.

## EXPLAIN discipline & query analysis

- [ ] Tuning starts only from `EXPLAIN (ANALYZE, BUFFERS)` — estimated vs actual rows compared; a >10x misestimate means stale statistics (`ANALYZE`) or a selectivity problem, not a missing index.
- [ ] Red flags actioned, never admired: `Seq Scan` on large tables, high `read` vs `hit` buffers, nested-loop row explosions, sorts spilling to disk (raise `work_mem` for the query or fix the sort), partition pruning verified via `EXPLAIN` (partitions actually excluded).
- [ ] Top queries by `total_time` in `pg_stat_statements` reviewed weekly; `auto_explain` captures plans for the slowest; slow-query log has a threshold and an owner.
- [ ] CTEs used freely for readability (they inline since PG 12); `MATERIALIZED` added only to force single evaluation of an expensive CTE referenced multiple times.
- [ ] Repeated query shapes use parameterized/prepared statements — with the caveat that PgBouncer in transaction mode breaks prepared statements, so the pooler choice and the query layer are decided together (see Pooling).
- [ ] JOIN fan-out for multiple one-to-many relations fixed with batched `IN (...)` queries or window functions, not wider joins.

## Migrations discipline

- [ ] All schema changes in **versioned, timestamp-ordered migration files**, guarded by an advisory lock so only one writer runs them; never manual SQL in production; never edit a deployed migration — write a new one.
- [ ] Every migration reversible: tested `.down.sql` per `.up.sql`, tested in staging first; migrations tested at **production data volume**, backward-compatible with deployed app V_N and forward-compatible with V_{N+1}.
- [ ] **Zero-downtime expand/contract** for breaking changes: (1) expand — add nullable column, dual-write; (2) backfill in batches with progress logging and throttling (never one giant transaction — it holds locks and blocks autovacuum); (3) migrate reads; (4) contract — drop the old column in a separate later migration.
- [ ] Banned: `NOT NULL` on a populated table without a default and a batched backfill, inline `CREATE INDEX` on a large table, schema + data in one long migration, dropping a column before code stops reading it, destructive changes without a fresh backup.
- [ ] Bulk imports use `COPY ... ON_ERROR` (PG 17) so one bad row doesn't abort the load; `MERGE ... RETURNING` (PG 17) used for upsert-with-output where `INSERT ... ON CONFLICT` is insufficient.
- [ ] The `pg_dump` client version matches the server major; migrations and DDL run on a **direct, non-pooled** connection, never through PgBouncer/pgcat.

## Transactions & isolation

- [ ] Every multi-statement business operation wrapped in a transaction; transactions give atomicity, **not** mutual exclusion — writers that must not interleave are explicitly synchronized.
- [ ] Isolation chosen deliberately: READ COMMITTED default; REPEATABLE READ for snapshot reads; SERIALIZABLE for money/inventory/uniqueness — with a **mandatory bounded retry** (3–5 attempts, jittered) on `serialization_failure (40001)` and deadlocks (`40P01`).
- [ ] Lost updates prevented via `SELECT … FOR UPDATE`, optimistic locking (version column) + retry, or SERIALIZABLE — never by assuming `BEGIN`/`COMMIT` serializes writers.
- [ ] `FOR UPDATE SKIP LOCKED` for queue-style consumers; consistent lock ordering designed in to prevent deadlocks; `lock_timeout` set so lock waits fail fast instead of hanging.
- [ ] Timeouts everywhere: `statement_timeout` globally, `idle_in_transaction_session_timeout` (e.g. 60s OLTP); transactions kept to seconds, never minutes; long batch work commits in bounded chunks.

## N+1 query detection

- [ ] The signature is known cold: 1 query for N parents + 1 per row for children — adding an index does not fix it.
- [ ] Dev query logging on; **query counts asserted in tests** — if the count grows when rows are added, it's N+1; list pages fire a fixed small number of queries.
- [ ] Fixed with eager loading (`selectinload`/`prefetch_related`/Prisma `include`), batched `IN (...)` queries, or the **DataLoader** pattern.
- [ ] Serialization layers audited for lazy attribute access (the ORM attribute that fires a query inside a loop is the usual culprit).

## Connection pooling

- [ ] A connection pooler is mandatory in production (PgBouncer, pgcat, or Supavisor) — a PG connection is an OS process (~5–10 MB idle); unbounded connections mean OOM and context-switch thrash.
- [ ] PgBouncer: `pool_mode = transaction` for web apps, `default_pool_size ≈ 20–50`, `max_db_connections` hard cap, `reserve_pool_size ≈ 5`, `auth_type = scram-sha-256`, TLS between pooler and Postgres.
- [ ] Prepared statements + PgBouncer transaction mode are incompatible — either run pgcat (supports prepared statements in transaction mode), or disable the driver's statement cache; the combination is decided explicitly, not discovered in production.
- [ ] Pool sized from DB capacity: start ≈ DB CPU cores, 2–4× for OLTP; across instances: `per-instance = floor((max_connections − admin_overhead) / num_instances)`.
- [ ] Pool health checks and metrics (wait queue depth, acquire latency) monitored with alerts; connections acquired/released in `finally`; pool acquire timeout set so saturation fails fast instead of hanging requests.

## Backups & PITR

- [ ] Documented RPO/RTO per data tier (e.g. critical: RPO 5 min / RTO < 1 hr); the backup strategy is chosen to meet them, not the other way round.
- [ ] Automated backups: physical base backup + continuous WAL archiving with unbroken log chains enabling point-in-time recovery (pgBackRest or wal-g to object storage); archive failures monitored and alerted.
- [ ] PG 17+: incremental physical backups (`pg_basebackup --incremental` + `pg_combinebackup`) to shrink backup windows on large databases.
- [ ] **3-2-1**: 3 copies, 2 media types, 1 off-site (cross-region); immutable storage for ransomware protection; backups encrypted with keys stored separately from the data.
- [ ] **Scheduled restore drills** — a never-restored backup is not a backup: weekly PITR checks, quarterly full DR drills, measured RTO/RPO recorded; a documented DR runbook with exact commands, keys, and owners.
- [ ] Before any major version upgrade: full `pg_dump` + globals backup, restore into a clean instance of the target major, run the app test suite against it, and rehearse a timed rollback.

## Replication

- [ ] Physical streaming replication for HA: `wal_level = replica`, lag monitored via `pg_stat_replication.replay_lag` with alerts; `synchronous_commit` + `synchronous_standby_names` for zero-data-loss tiers, accepting the write-latency cost deliberately.
- [ ] Logical replication for cross-version, cross-cluster, or selective replication: `wal_level = logical` on the publisher, slot budgets (`max_wal_senders`, `max_replication_slots`) sized and monitored — an unconsumed slot retains WAL and can fill the disk.
- [ ] DDL is never replicated — schema changes are applied to the subscriber first; sequence state is not replicated (reset sequences after failover/cutover); large single transactions are known lag-spike sources.
- [ ] PG 17+: failover-capable logical slots (`failover = true` on slot creation + `sync_replication_slots = true` on the standby) so logical replication survives failover; `pg_upgrade` migrates valid logical slots and subscriptions; `pg_createsubscriber` converts a physical standby into a logical subscriber.
- [ ] Tables without a primary key need `REPLICA IDENTITY FULL` for UPDATE/DELETE to replicate; PG 15+ propagates the parent's replica identity to partitions automatically.
- [ ] Read-your-writes against async standbys is an explicit design decision (sticky routing, session tokens, or — once GA — PG 19's `WAIT FOR LSN`); it is never assumed to work by default.

## Postgres versions (checked 2026-09-30)

- [ ] New deployments target **PostgreSQL 18** (GA September 2025; latest 18.6 as of 2026-08-13): native `uuidv7()` (`uuidv4()` alias for `gen_random_uuid()`), async I/O subsystem (`io_method = worker` default, `io_uring` opt-in on Linux), B-tree skip scan, parallel GIN builds, virtual generated columns as the default, `OLD`/`NEW` in `RETURNING`, OAuth 2.0 auth in libpq, planner statistics surviving major upgrades.
- [ ] On PG 17 (latest 17.11): SQL/JSON `JSON_TABLE` and the fuller JSON suite, incremental physical backups, `MERGE ... RETURNING`, logical-replication failover slots, `pg_createsubscriber`, split/merge partitions, partitioned-table identity columns and exclusion constraints, `COPY ... ON_ERROR`, faster lower-memory `VACUUM` (TID store), `pg_wait_events`.
- [ ] **PostgreSQL 19 is beta** (Beta 4 released 2026-09-24; GA expected October 2026; two features — SQL/PGQ property graphs and `ALTER TABLE ... MERGE/SPLIT PARTITION` — were reverted during beta): never a production target until GA plus minor stabilization; track `WAIT FOR LSN`, online data checksums (`pg_enable_data_checksums()`), and `REPACK CONCURRENTLY`.
- [ ] Data checksums enabled at `initdb` time and verified with `pg_controldata`; until PG 19 is GA, enabling them on an existing cluster still means the offline `pg_checksums` path.
- [ ] **PostgreSQL 14 reaches end-of-life 2026-11-12** — any cluster still on 14 has an upgrade plan in flight; one major version per fleet (dev/CI/staging/prod identical), newest supported minor within that major after release-note review.

## Maintenance & health

- [ ] Autovacuum never disabled; write-heavy tables get tuned scale factors/costs; bloat monitored; `pg_repack` used for online reorganization without long locks; `VACUUM` progress observable via `pg_stat_progress_vacuum` (index-level detail on PG 17+).
- [ ] `ANALYZE` run after bulk loads and schema changes; planner statistics kept fresh; `pg_stat_statements` reviewed for plan regressions after upgrades.
- [ ] Row-level security enabled on all tenant-scoped tables with policies bound to a session setting (e.g. `current_setting('app.current_org_id')`); a CI test proves cross-tenant isolation.
- [ ] Disk, IOPS, and WAL-volume headroom monitored; WAL growth treated as an early warning; connection counts and pool saturation graphed alongside query latency.
- [ ] Extension inventory pinned and reviewed (`pg_stat_statements`, `pgcrypto`, `pg_trgm`, `btree_gin`, `pgaudit`, `pg_repack`, `vector`): every extension justified, version-compatible with the target major before upgrades.

## Sources

- https://www.postgresql.org/
- https://github.com/gufranco/claude-engineering-rules/blob/HEAD/standards/postgresql.md
- https://github.com/ashworks1706/sparkyai/blob/HEAD/.claude/skills/postgres-strict/SKILL.md
- https://github.com/niledatabase/niledatabase/blob/HEAD/www/app/blog/2025-05-09-uuidv7.mdx
- https://dev.to/alexgeorgiev17/postgresql-19s-data-checksums-can-now-be-switched-on-without-stopping-the-server-fn
- https://dev.to/alexgeorgiev17/postgresql-19s-wait-for-lsn-command-replaces-the-read-your-writes-polling-loop-1e5m
- https://daily.dev/posts/what-s-new-in-postgresql-19-loq0z6h4n
- https://github.com/palabs-v1/ai_friend/blob/HEAD/.claude/skills/postgresql-best-practices/references/postgresql-replication.md
- https://github.com/egorribun/university_ecosystem/blob/HEAD/docs/pgcat-migration-guide.md
- https://www.postgresql.org/message-id/171647211660.2021729.3176357833987428015%40wrigleys.postgresql.org
