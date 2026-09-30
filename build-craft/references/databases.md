# Databases — production checklist

Covers normalization, indexing, migrations, backups/PITR, connection pooling, N+1 detection, and transactions. Managed-platform comparison lives in `managed-data-platforms.md`.

## Normalization vs denormalization

- [ ] Default to **3NF** for OLTP: 1NF atomic values/unique rows, 2NF non-key columns depend on the entire key, 3NF no transitive dependencies.
- [ ] Normalize where write integrity is critical (financial ledgers, inventory): each fact stored exactly once so anomalies are structurally impossible.
- [ ] Denormalize only with **measured evidence** — a specific slow query on a hot path, not speculation (read-heavy ~90:10+ workloads, dashboards, pre-computed aggregates).
- [ ] Every denormalization decision documented: what is redundant, why, expected read gain, sync strategy, accepted consistency risk; copies kept consistent via a defined mechanism (events, triggers, materialized views).
- [ ] Audit for anomaly smells: comma-separated VARCHAR lists (1NF), partial-key dependencies (2NF), transitive deps like `city → state` in a customers table (3NF).

## Indexing strategy

- [ ] Index columns in hot-query WHERE / JOIN / ORDER BY / GROUP BY — derived from the slow-query log, not guesses.
- [ ] **Always index foreign keys** used in joins (unindexed FKs cause full scans on child tables during referential checks).
- [ ] Composite index order: equality columns first, then range/sort; high-selectivity first; redundant single-column prefix indexes removed.
- [ ] Covering indexes (`INCLUDE`) for hot read paths; partial indexes for skewed data (`WHERE deleted_at IS NULL`); expression indexes for computed filters (`lower(email)`); GIN for full-text instead of leading-wildcard `LIKE '%foo'`.
- [ ] No over-indexing: never index "just in case"; no lone indexes on low-cardinality booleans.
- [ ] Every new index verified with `EXPLAIN ANALYZE` before/after; planner stats kept fresh (`ANALYZE`); monthly audit of unused indexes (`idx_scan = 0` over >30 days → drop).
- [ ] Indexes built with `CREATE INDEX CONCURRENTLY` on production tables; deep `OFFSET` pagination replaced with keyset pagination (`WHERE id < :last_seen ORDER BY id DESC LIMIT n`).

## Migrations discipline

- [ ] All schema changes in **versioned, timestamp-ordered migration files**; never manual SQL in production; never edit a deployed migration — write a new one.
- [ ] Every migration reversible: tested `.down.sql` per `.up.sql`, tested in staging first.
- [ ] **Zero-downtime expand/contract** for breaking changes: (1) expand — add nullable column, dual-write; (2) backfill in batches; (3) migrate reads; (4) contract — drop old column in a separate later migration.
- [ ] Banned: NOT NULL on a populated table without default, inline index on a large table, schema+data in one long migration, dropping a column before code stops reading it, destructive changes without a fresh backup.
- [ ] Migrations tested at **production data volume**; backward-compatible with deployed app V_N, forward-compatible with V_{N+1}.

## Backups & PITR

- [ ] Documented RPO/RTO per data tier (e.g. critical: RPO 5 min / RTO < 1 hr).
- [ ] Automated backups (physical base backup + continuous WAL archiving with unbroken log chains) enabling point-in-time recovery; archive failures monitored.
- [ ] **3-2-1**: 3 copies, 2 media types, 1 off-site (cross-region); immutable storage for ransomware protection.
- [ ] **Scheduled restore drills** — a never-restored backup is not a backup (weekly PITR checks, quarterly full DR drills); measured RTO/RPO recorded.
- [ ] Documented DR runbook with exact commands, keys, and owners; backup age/failure monitored with alerts.

## Connection pooling

- [ ] A connection pooler always used (PgBouncer or driver-side) — a PG connection is an OS process (~10 MB idle); unbounded connections = OOM.
- [ ] Pool sized from DB capacity: start ≈ DB CPU cores, 2–4× for OLTP; across instances: `per-instance = floor((max_connections − admin_overhead) / num_instances)`.
- [ ] PgBouncer: `pool_mode = transaction` for web apps, `default_pool_size ≈ 20–50`, `max_db_connections` hard cap, `reserve_pool_size ≈ 5`.
- [ ] Timeouts everywhere: `statement_timeout`, `idle_in_transaction_session_timeout` (e.g. 60s OLTP), pool acquire/wait timeouts; connections acquired/released in `finally`; migrations run on a **direct, non-pooled** connection.

## N+1 query detection

- [ ] Know the signature: 1 query for N parents + 1 per row for children — adding an index does not fix it.
- [ ] Dev query logging on; **query counts asserted in tests** — if the count grows when rows are added, it's N+1; list pages fire a fixed small number of queries.
- [ ] Fixed with eager loading (`selectinload`/`prefetch_related`/Prisma `include`), batched `IN (...)` queries, or the **DataLoader** pattern.
- [ ] Beware JOIN fan-out for multiple one-to-many relations — prefer batched `IN` or window functions.

## Transactions & isolation

- [ ] Every multi-statement business operation wrapped in a transaction; transactions give atomicity, **not** mutual exclusion.
- [ ] Isolation chosen deliberately: READ COMMITTED default; REPEATABLE READ for snapshot reads; SERIALIZABLE for money/inventory/uniqueness — with **mandatory bounded retry** on `serialization_failure (40001)`.
- [ ] Lost updates prevented via `SELECT … FOR UPDATE`, optimistic locking (version column) + retry, or SERIALIZABLE — never assuming BEGIN/COMMIT serializes writers.
- [ ] `FOR UPDATE SKIP LOCKED` for queue-style consumers; long-running transactions avoided; `lock_timeout` set; deadlocks designed out (consistent lock ordering).

## Sources

- https://en.wikipedia.org/wiki/Database_normalization · https://en.wikipedia.org/wiki/ACID_(computer_science)
- https://github.com/neondatabase/postgres-skills/blob/HEAD/skills/postgres-best-practices/references/connection-pooling.md
- https://github.com/gufranco/claude-engineering-rules/blob/HEAD/standards/postgresql.md
