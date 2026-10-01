# System Design Deep — HLD and LLD from scratch

How to run a design end-to-end: requirements, capacity math, component design (HLD), API sketch, then classes, patterns, and concurrency (LLD), plus the whiteboard flow. Companion to `system-design.md`, which owns the distributed-systems pattern *mechanics* (PACELC, quorum math, sharding strategies, caching internals, Raft, streaming platforms, mesh, cells, tail latency) — this file owns the *process*; pointers there replace re-teaching.

## Running the HLD process

- [ ] Follow a loop, not a brain-dump: clarify requirements → estimate scale → sketch the API → draw the simplest working architecture → find the bottleneck → scale the bottleneck → add reliability → state trade-offs.
- [ ] Never start drawing before asking questions: jumping straight into components is the most common way strong candidates fail.
- [ ] Scope the width and depth up front: which features are in, which are explicitly out (no feature creep mid-design).
- [ ] Confirm direction at each step — checkpoints with the interviewer beat a monologue that lands in the wrong place.
- [ ] Every design decision is narrated with its reason and its cost ("I pick X because…; the cost is…").

## Requirements: functional vs non-functional

- [ ] Functional requirements listed first: what the system does (shorten URL, book a seat, send a notification) — verbs from the user.
- [ ] Non-functional requirements listed with numbers: p95/p99 latency target, availability nines, peak QPS, consistency model per dataset, durability (RPO), scale (DAU, reads/writes), regions, data residency, cost ceiling.
- [ ] Nines converted to a downtime budget so the SLO means something concrete: 99.9% ≈ 43 min/month, 99.99% ≈ 4.3 min/month — a 99.99% SLO on 99.9% dependencies is an instant fail.
- [ ] A system that meets every functional requirement can still fail: NFRs drive every downstream choice (cache size, shard count, DB type).
- [ ] Conflicts surfaced explicitly: availability vs consistency, latency vs durability, cost vs reliability — each resolved with a stated reason (the consistency mechanics live in `system-design.md`; here you just record the choice and its justification).

## Capacity estimation with real numbers

- [ ] Memorized constants: 1 day = 86,400 s (≈10⁵ for mental math), 2^10 ≈ 1K … 2^50 ≈ 1 PB, 1M req/day ≈ 12 req/s, 1B req/day ≈ 12K req/s.
- [ ] Latency orders of magnitude known (Jeff Dean's table): L1 ~0.5 ns, branch mispredict ~5 ns, L2 ~7 ns, RAM ~100 ns, 1 KB over 1 Gbps ~10 µs, 4 KB random SSD read ~150 µs, 1 MB sequential from memory ~250 µs, same-datacenter RTT ~0.5 ms, HDD seek ~10 ms, cross-continent RTT ~150 ms.
- [ ] QPS derived from DAU × actions/user/day ÷ 86,400, then peak = 2–5× average — stated out loud with assumptions, not computed silently.
- [ ] Storage, bandwidth, and cache memory all estimated: storage = actions/day × bytes × retention; bandwidth = bytes × QPS; cache = working set of hot data.
- [ ] Worked end to end once, e.g. Twitter-scale: 300M DAU × 100 reads/day ÷ 86,400 ≈ 350K read QPS (massively read-heavy → aggressive caching); 30M writes/day ≈ 350 write QPS; reads:write ratio ≈ 1000:1.
- [ ] Per-node throughput sanity-checked: a commodity app server handles ~1K QPS depending on work per request; a Redis node handles ~100K+ ops/sec — so server count falls out of QPS ÷ per-node capacity with headroom.
- [ ] Each estimate connected to a decision: high QPS → load balancer + horizontal scaling; high storage → sharding; high reads → cache/CDN; high writes → queues + partitioning; round aggressively — the method and the order of magnitude are what's graded, not exact arithmetic.

## HLD: components and data flow

- [ ] Architecture drawn as a request path: client → DNS/CDN → load balancer → API servers → cache → DB → queue → workers, with arrows showing data flow.
- [ ] Per-hop latency budgets are allocated from the end-to-end p99 target: 10 serial intra-DC RPCs cost ~5 ms of pure network before any work happens — independent fan-out must be parallel.
- [ ] Every box earns its place: each component named with the NFR or estimate that justifies it ("cache because reads are 1000× writes").
- [ ] Shard key is named with its distribution + access-pattern rationale; the strategy mechanics (hash vs range vs directory, consistent hashing) are applied from `system-design.md`, not re-derived.
- [ ] Cache strategy follows the read/write ratio; per-write-pattern mechanics (cache-aside, write-through, invalidation rules) are applied from `system-design.md`.
- [ ] Consistency choice recorded per dataset with a staleness budget; the PACELC/quorum reasoning behind it lives in `system-design.md`.
- [ ] Single points of failure identified and removed or mitigated (no single LB, no single DB without a replica).
- [ ] Diagrams follow **C4** in **Mermaid** so they live in docs and diff like code: L1 Context (system + users/external systems), L2 Container (runnable units — API, workers, DB, cache, CDN; the HLD sketch stops here), L3 Component (modules inside one container, drawn only for the deep-dived component), L4 Code (classes/UML, LLD rounds only).
- [ ] One diagram per level, each fitting on one whiteboard/frame; every arrow labeled with protocol and payload (`HTTPS/JSON`, `gRPC`, `events/Kafka`) — an unlabeled line is a defect.
- [ ] Depth goes where the bottleneck is: L2 containers first from the request path, L3 for at most one or two hot components — never all four levels for everything.
  ```mermaid
  C4Container
    Person(user, "User")
    Container(api, "API", "Node", "REST")
    Rel(user, api, "Uses", "HTTPS/JSON")
  ```
- [ ] Data model sketched: SQL vs NoSQL choice tied to access patterns (transactions/relationships → SQL; massive throughput/flexible schema → NoSQL), key tables/collections and relationships named.
- [ ] One or two components deep-dived on demand (sharding scheme, cache strategy, a consensus decision) rather than going shallow everywhere.

## API sketch

- [ ] Key endpoints listed with method, path, request/response shape, status codes, and a standard error envelope (`POST /shorten {longUrl} → 201 {shortUrl}`), derived from the functional requirements.
- [ ] REST vs gRPC chosen deliberately: REST for public/third-party APIs, gRPC for internal low-latency service-to-service.
- [ ] Pagination decided up front (cursor-based at scale — offset breaks under concurrent writes), idempotency keys on mutating endpoints, rate-limit headers documented.
- [ ] Versioning strategy named (URL path vs headers) and consistent across the sketch; pagination, idempotency, and error conventions noted on the sketch (not deferred to "later").

## LLD: SOLID in practice

- [ ] Single Responsibility: every class has one reason to change — a class doing pricing *and* persistence *and* notifications is split. Test: describe the class in one sentence without using "and."
- [ ] Open/Closed: new behavior added by adding classes, not editing existing ones — proven when the interviewer adds a requirement mid-round.
- [ ] Liskov Substitution: subtypes honored everywhere a base type is expected — no subclass that throws on an inherited method.
- [ ] Interface Segregation: small focused interfaces (`MovieSearch`, `BookingOperations`) instead of one fat interface everything implements.
- [ ] Dependency Inversion: high-level modules depend on abstractions — services take a `DatabaseManager` interface via constructor injection, not `new MySQLDatabase()` inside the constructor (enables in-memory fakes in tests); the service never news its own strategies internally.

## Design patterns worth knowing (and which to avoid)

- [ ] Strategy: one behavior with interchangeable variants (pricing rules, eviction policies, rate-limit algorithms, fee calculation).
- [ ] State: behavior depends on a mode with legal transitions (order lifecycle, elevator, vending machine) — or a plain enum + transition table when the hierarchy would be overkill.
- [ ] Observer: one change must notify N parties (notifications, event systems) — reach for it only with ≥2 real listeners.
- [ ] Factory: creation logic depends on input and deserves one home (`NotificationFactory`) — not when there is a single concrete type.
- [ ] Command: actions must be queued, logged, retried, or undone (job queues, undo stacks).
- [ ] Builder: objects with many optional construction parameters; Decorator: layering optional runtime behavior (middleware, pricing add-ons).
- [ ] Adapter: a seam between your domain and a third-party SDK/API so vendor lock-in and version churn live in one place.
- [ ] Proxy: lazy initialization, access control, or caching in front of an expensive object — name the latency/cost it hides.
- [ ] Singleton used sparingly and justified: it is global mutable state that hurts testing and concurrency — an injected single instance almost always wins.
- [ ] Inheritance kept shallow: prefer composition — deep hierarchies (Bike→Car→Truck spot types aside) rot when a new dimension appears.
- [ ] Pattern smell avoided: a pattern introduced only when you can name the variation it solves *in this problem*; start concrete and refactor when the second case appears; never stack patterns to show off.

## Class and object modeling

- [ ] Nouns from the requirements become candidate classes (Vehicle, Spot, Ticket) before any pattern is chosen; verbs that don't belong to any noun reveal a missing class ("calculate the fee" belongs to neither Ticket nor Vehicle → `FeeStrategy`).
- [ ] Class diagram shows relationships: has-a (composition) vs is-a (inheritance), interfaces vs concrete classes, who depends on whom — clarity over UML formality.
- [ ] Interfaces placed at variation points: the test is "will there be more than one way to do this, and might it change?" — `FareStrategy`, `SpotAllocator`, `PaymentMethod` yes; speculative abstraction no.
- [ ] Interfaces kept narrow — ideally one method (`calculate(ticket)`, `allow(key)`, `evict()`): trivial to implement, trivial for the interviewer to extend in a follow-up.
- [ ] Responsibilities and seams explicit even without classes: plain objects, closures, and discriminated unions are fine if the boundaries are clear.
- [ ] Only the 2–3 core classes coded in the round — the core flow, not the entire system; nobody needs your getters.
- [ ] A scenario walked end to end, then the design attacked: "what if two cars arrive for the last spot?" — the expected-requirement change (weekend pricing, EV spots, monthly passes) is volunteered as already-cheap ("add a class, inject it; nothing inside the service changes").
- [ ] Thread-safety addressed where shared state exists (concurrent bookings, singleton init): locks, immutability, or confinement named explicitly.

## Concurrency models: threads vs actors vs CSP

- [ ] Threads + shared memory: maximum control, maximum foot-guns — shared state needs locks/atomics; deadlocks and data races are the failure modes.
- [ ] Actor model (Erlang, Akka): everything is an actor with a mailbox; communication is asynchronous message passing, no shared state, topology can change at runtime — designed for distributed systems.
- [ ] CSP (Go goroutines + channels): anonymous processes communicating over channels; sender and receiver rendezvous on the channel; messages delivered in send order.
- [ ] Chosen per problem: actors for stateful distributed entities with dynamic topology; CSP/channels for pipelines and fan-out/fan-in; threads for fine-grained CPU-bound parallelism.
- [ ] Never mix models accidentally: shared mutable state between actors, or blocking channel ops inside an event loop, are both defects.

## Whiteboarding a design in an interview

- [ ] 45-minute split: ~5 min clarify, ~5 min estimate, ~5 min API sketch, ~20 min high-level + deep dive, ~10 min bottlenecks/trade-offs, ~5 min wrap-up.
- [ ] Think out loud the whole way: assumptions stated, numbers labeled as approximations, trade-offs narrated ("I pick X because…, the cost is…").
- [ ] The round is substantially a communication exercise: an unexplained diagram scores far worse than a narrated trade-off.
- [ ] Silence is a defect: every decision gets a reason; every estimate gets its assumptions; every exclusion gets named.
- [ ] Treat it as collaborative: confirm direction with the interviewer at each step rather than delivering a monologue.
- [ ] End with what you would change at 10× scale and what you deliberately left out.

## Sources

- https://github.com/kartikth40/tech-interview-master/blob/HEAD/SystemDesign/SystemDesignGuide.md
- https://github.com/venxik/interview-docs/blob/HEAD/docs/interview/13-system-design-fundamentals.md
- https://github.com/aujisti-ador/interview_prep/blob/HEAD/phase-5-system-design/01-system-design-fundamentals.md
- https://github.com/axioncpp/maang-interview-preparation/blob/HEAD/12_System_Design/README.md
- https://github.com/blakelassiter/data-engineering-interview-patterns/blob/HEAD/system_design/foundations/capacity_estimation.md
- https://github.com/caeser1996/systemdesign/blob/HEAD/interview-questions/estimation-techniques.md
- https://github.com/sandesh682/tech-interview-prep/blob/HEAD/System%20Design/Phase%202.5%20-%20LLD%20&%20SOLID%20Principles.md
- https://github.com/slade9333/learn_guides/blob/HEAD/lld-and-design-patterns/lld-interview-guide.md
- https://github.com/shubhijain67/low-level-design-101/blob/HEAD/README.md
- https://github.com/sreen98/prephub/blob/HEAD/src/content/system-design/low-level-design-guide.md
- https://github.com/anilinfo2015/anilinfo2015.github.io/blob/HEAD/low-level-design/04-designing-clean-interfaces-and-apis.md
