# System Design Deep — HLD and LLD from scratch

How to run a design end-to-end: requirements, capacity math, component design (HLD), then classes, patterns, and concurrency (LLD). Complements `system-design.md`, which covers distributed-systems patterns.

## Running the HLD process

- [ ] Follow a loop, not a brain-dump: clarify requirements → estimate scale → draw the simplest working architecture → find the bottleneck → scale the bottleneck → add reliability → state trade-offs.
- [ ] Never start drawing before asking questions: jumping straight into components is the most common way strong candidates fail.
- [ ] Scope the width and depth up front: which features are in, which are explicitly out (no feature creep mid-design).

## Requirements: functional vs non-functional

- [ ] Functional requirements listed first: what the system does (shorten URL, book a seat, send a notification).
- [ ] Non-functional requirements listed with numbers: availability (99.9%?), p95 latency target, DAU, consistency model, durability, regions.
- [ ] A system that meets every functional requirement can still fail: NFRs drive every downstream choice (cache size, shard count, DB type).
- [ ] Conflicts surfaced explicitly: availability vs consistency (CAP), latency vs durability, cost vs reliability — each resolved with a stated reason.

## Capacity estimation with real numbers

- [ ] Memorized constants: 1 day = 86,400 s (≈100K for mental math), 2^10 ≈ 1K … 2^50 ≈ 1 PB, 1M req/day ≈ 12 req/s, 1B req/day ≈ 12K req/s.
- [ ] Latency orders of magnitude known: L1 ~1 ns, RAM ~100 ns, SSD ~16–100 μs, same-datacenter RTT ~0.5 ms, cross-continent RTT ~150 ms.
- [ ] QPS derived from DAU × actions/user/day ÷ 86,400, then peak = 2–5× average — stated out loud with assumptions, not computed silently.
- [ ] Storage, bandwidth, and cache memory all estimated: storage = actions/day × bytes × retention; bandwidth = bytes × QPS; cache = working set of hot data.
- [ ] Each estimate connected to a decision: high QPS → load balancer + horizontal scaling; high storage → sharding; high reads → Redis/CDN; high writes → queues + partitioning.

## HLD: components and data flow

- [ ] Architecture drawn as a request path: client → DNS/CDN → load balancer → API servers → cache → DB → queue → workers, with arrows showing data flow.
- [ ] Every box earns its place: each component named with the NFR or estimate that justifies it ("cache because reads are 100× writes").
- [ ] Single points of failure identified and removed or mitigated (no single LB, no single DB without a replica).
- [ ] Data model sketched: SQL vs NoSQL choice tied to access patterns (transactions/relationships → SQL; massive throughput/flexible schema → NoSQL), key tables/collections and relationships named.
- [ ] One or two components deep-dived on demand (sharding scheme, cache strategy, consistent hashing) rather than going shallow everywhere.

## API sketch

- [ ] Key endpoints listed with method, path, and request/response shape (`POST /shorten {longUrl} → {shortUrl}`), derived from the functional requirements.
- [ ] REST vs gRPC chosen deliberately: REST for public/third-party APIs, gRPC for internal low-latency service-to-service.
- [ ] Pagination, idempotency, and error conventions noted on the sketch (not deferred to "later").

## LLD: SOLID in practice

- [ ] Single Responsibility: every class has one reason to change — a class doing pricing *and* persistence *and* notifications is split.
- [ ] Open/Closed: new behavior added by adding classes, not editing existing ones — proven when the interviewer adds a requirement mid-round.
- [ ] Liskov Substitution: subtypes honored everywhere a base type is expected — no subclass that throws on an inherited method.
- [ ] Interface Segregation: small focused interfaces (`MovieSearch`, `BookingOperations`) instead of one fat interface everything implements.
- [ ] Dependency Inversion: high-level modules depend on abstractions — services take a `DatabaseManager` interface, not `new MySQLDatabase()` inside the constructor (enables in-memory fakes in tests).

## Design patterns worth knowing (and which to avoid)

- [ ] Strategy: one behavior with interchangeable variants (pricing rules, eviction policies, rate-limit algorithms).
- [ ] State: behavior depends on a mode with legal transitions (order lifecycle, elevator, vending machine) — or a plain enum + transition table when the hierarchy would be overkill.
- [ ] Observer: one change must notify N parties (notifications, event systems) — reach for it only with ≥2 real listeners.
- [ ] Factory: creation logic depends on input and deserves one home (`NotificationFactory`) — not when there is a single concrete type.
- [ ] Command: actions must be queued, logged, retried, or undone (job queues, undo stacks).
- [ ] Builder: objects with many optional construction parameters; Decorator: layering optional runtime behavior (middleware, pricing add-ons).
- [ ] Singleton used sparingly and justified: it is global mutable state that hurts testing and concurrency — an injected single instance almost always wins.
- [ ] Pattern smell avoided: a pattern introduced only when you can name the variation it solves *in this problem*; start concrete and refactor when the second case appears; never stack patterns to show off.

## Class and object modeling

- [ ] Nouns from the requirements become candidate classes (Vehicle, Spot, Ticket) before any pattern is chosen.
- [ ] Class diagram shows relationships: has-a (composition) vs is-a (inheritance), interfaces vs concrete classes, who depends on whom.
- [ ] Responsibilities and seams explicit even without classes: plain objects, closures, and discriminated unions are fine if the boundaries are clear.
- [ ] Only the 2–3 core classes coded in the round — the core flow, not the entire system.
- [ ] Thread-safety addressed where shared state exists (concurrent bookings, singleton init): locks, immutability, or confinement named explicitly.

## Concurrency models: threads vs actors vs CSP

- [ ] Threads + shared memory: maximum control, maximum foot-guns — shared state needs locks/atomics; deadlocks and data races are the failure modes.
- [ ] Actor model (Erlang, Akka): everything is an actor with a mailbox; communication is asynchronous message passing, no shared state, topology can change at runtime — designed for distributed systems.
- [ ] CSP (Go goroutines + channels): anonymous processes communicating over channels; sender and receiver rendezvous on the channel; messages delivered in send order.
- [ ] Chosen per problem: actors for stateful distributed entities with dynamic topology; CSP/channels for pipelines and fan-out/fan-in; threads for fine-grained CPU-bound parallelism.
- [ ] Never mix models accidentally: shared mutable state between actors, or blocking channel ops inside an event loop, are both defects.

## Whiteboarding a design in an interview

- [ ] 45-minute split: ~5 min clarify, ~5 min estimate, ~20 min high-level + deep dive, ~10 min bottlenecks/trade-offs, ~5 min wrap-up.
- [ ] Think out loud the whole way: assumptions stated, numbers labeled as approximations, trade-offs narrated ("I pick X because…, the cost is…").
- [ ] Treat it as collaborative: confirm direction with the interviewer at each step rather than delivering a monologue.
- [ ] End with what you would change at 10× scale and what you deliberately left out.

## Sources

- https://github.com/selvaganesh19/lld-hld-full-course/blob/HEAD/C-hld-foundations/C01-back-of-envelope.md
- https://github.com/sai-krishna-kotha/personal-roadmap/blob/HEAD/infosys-prep/interview_preparation/12_hld_system_design_interview_notes.md
- https://github.com/shubhijain67/low-level-design-101/blob/HEAD/README.md
- https://github.com/sreen98/prephub/blob/HEAD/src/content/system-design/low-level-design-guide.md
- https://github.com/anilinfo2015/anilinfo2015.github.io/blob/HEAD/low-level-design/05-practical-design-pattern-selection.md
- https://github.com/karanpratapsingh/portfolio/blob/HEAD/data/blog/csp-actor-model-concurrency.mdx
- http://en.wikipedia.org/wiki/Actor_model
