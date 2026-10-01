# Hosting — servers, hosting models, and deployment operations

The request lifecycle from DNS to database, every hosting model with 2026 price bands, a workload-based chooser, deployment patterns, and GPU hosting economics. Prices approximate, checked 2026-09-30 — re-verify before deciding.

## The request lifecycle — what to check at each hop

- [ ] DNS: A/AAAA records point at current infra, TTL dropped to ≤300 s at least 48 h before any migration, CAA records restrict which CAs may issue certs.
- [ ] CDN: static assets and cacheable responses are served from the edge with correct `Cache-Control` headers; no session cookies ride on cached URLs; purge path tested before launch.
- [ ] TLS: TLS 1.3 preferred (1.2 minimum), HSTS enabled with preload for public sites, certificates auto-renewed via ACME with expiry alerting at 30/7 days, OCSP stapling enabled.
- [ ] Reverse proxy (Nginx/Caddy/Cloudflare): terminates TLS once (no double TLS to origin), timeouts set shorter than client-facing ones, trusted `X-Forwarded-*` headers only from known proxy IPs, rate limiting and WAF at the proxy — not in app code.
- [ ] App: stateless (sessions in Redis/DB, never local disk), graceful shutdown drains connections on SIGTERM, worker/thread count sized to the vCPUs actually rented, app request timeout < proxy timeout.
- [ ] Database: app reaches the DB through a connection pooler (never per-request connections), DB region co-located with compute, backups restored to a scratch target at least quarterly.
- [ ] Every hop is a measured latency budget in your traces: DNS (~20–100 ms uncached), TLS (~1 RTT), CDN/proxy (~1 ms), app + DB (the part you control) — a regression shows up at one specific hop, not "the app is slow".

## Shared hosting

- [ ] You rent space on a server shared with other sites — fully managed, no root access, vendor runs the OS and stack.
- [ ] Bill driver: flat monthly fee; typical band ~$3–15/mo (2026).
- [ ] Failure mode is the neighbor, not you: another site's spike or compromise can slow or endanger yours — no resource isolation to check or buy.
- [ ] Pick for: static sites, blogs, portfolios with low steady traffic. Leave when: you need SSH/root, traffic is spiky, or you want your own TLS/proxy config.

## VPS (virtual private server)

- [ ] A dedicated slice (vCPU/RAM/disk) of a physical host — your slice is yours, neighbors can't touch it; hypervisor overhead is typically <5%.
- [ ] Bill drivers: vCPU, RAM, disk, outbound bandwidth. 2026 bands (approx): entry ~$4–7/mo (1 vCPU, 512 MB–1 GB — DigitalOcean $4/$6, Hetzner ~€6 incl. IPv4); mid ~$6–24/mo (2–4 vCPU, 2–8 GB); performance ~$24–96/mo. Hetzner raised prices twice in 2026 (April and June); DigitalOcean bills per second with a monthly cap.
- [ ] Unmanaged = you are the sysadmin: OS patches, firewall, fail2ban, backups on you — budget 2–5 hrs/month or pay ~4–5× for managed; add snapshot/backup pricing (typically +20% of droplet cost) to the quote.
- [ ] Compare the *second-year* price: intro/renewal jumps of 40–80% are common, and hourly billing with a monthly cap makes short-lived experiments cheap.
- [ ] Pick for: side projects, small SaaS, anything outgrowing shared with predictable traffic. Port 25/SMTP is blocked by default on the big clouds — plan a relay (Postmark/SES) rather than fighting it.

## Dedicated servers and bare metal

- [ ] The whole physical machine — no hypervisor, no noisy neighbors, configurable hardware (RAID, NICs, GPU passthrough).
- [ ] Bill drivers: CPU model, RAM, NVMe, bandwidth tier; 2026 bands (approx): budget/older hardware ~$20–60/mo, modern Ryzen/Xeon with 64 GB RAM ~$60–180/mo. You pay for peak capacity 24/7 whether it's used or not.
- [ ] Pick for: databases and stateful workloads needing consistent disk I/O, single-tenancy compliance, sustained high load where per-hour cloud pricing hurts. Skip for: bursty traffic or anything that should scale to zero.

## PaaS (Render / Railway / Fly.io / Heroku)

- [ ] You push code; the platform builds, runs, scales, patches, and TLS-terminates it — zero server management, but the platform boundary is also your ceiling.
- [ ] Bill drivers: service size (RAM/CPU), always-on hours, managed DB, seats, egress. Sep-2026 same-workload ledger (web + worker + managed Postgres + 3 previews + 5 seats + 100 GB egress): Render ~$74/mo, Heroku ~$69/mo, Fly.io ~$72/mo, Railway ~$122/mo, owned-box ~$45–55/mo — all approx, re-verify.
- [ ] Billing shape differs and it decides the winner: Render charges fixed per-instance (~$7 Starter, ~$25 Standard 1 CPU/2 GB) — predictable; Railway is per-second usage (~$20/vCPU/mo, ~$10/GB RAM/mo) plus a workspace fee — cheapest for idle-leaning apps with a hard spending cap set; Fly.io is pure per-second with no plan fee (~$2/mo for the smallest machine) and true scale-to-zero — stopped machines bill disk only.
- [ ] Egress is the surprise line at scale: Railway ~$0.05/GB flat; Fly.io ~$0.02/GB in NA/EU but ~$0.04 APAC/SA and ~$0.12 Africa/India (1 TB out of Mumbai ≈ $120); Render ~$0.15/GB past its allowance — re-run the math for your own traffic map, not someone else's.
- [ ] Free tiers have teeth: sleeping services, expiring DBs, no permanent free tier on Fly.io/Railway — never build customer-facing prod on a free tier.
- [ ] Pick for: solo devs and small teams shipping fast. Leave when: the bill exceeds a VPS + your time, or you need infra the platform doesn't offer.

## Serverless functions (AWS Lambda and friends)

- [ ] No servers to manage: code runs in short-lived containers spun up per request, scaling from zero automatically; stateless by design, 15-min max duration, up to 10 GB memory.
- [ ] Bill drivers: requests ($0.20 per 1M) + compute (GB-seconds: $0.0000166667/GB-s x86, ~20% less on ARM) after a permanent free tier of 1M requests + 400K GB-s/mo — a 1 GB function running 100 ms costs ~$0.0000017 per invocation.
- [ ] The real bill is rarely just Lambda: API Gateway HTTP API adds ~$1.00/1M requests, CloudWatch Logs ingestion (~$0.50/GB) can exceed compute cost at scale, and VPC-attached functions may need a NAT gateway (~$0.045/hr + $0.045/GB).
- [ ] Cold starts are real: ~1–3 s p95 for Node/Java without SnapStart; keep functions warm with provisioned concurrency or accept it for async workloads.
- [ ] Cold-start mitigation beyond warming: keep packages small (tree-shake, minify, strip dev deps — cold start grows with code size); prefer lightweight runtimes (Node/Python/Go over JVM/large .NET) where starts matter; lazy-init heavy clients on first use inside a warm container rather than at import when import cost is high.
- [ ] Serverless backends never open per-invocation database connections — a cold-start storm exhausts the DB connection limit: route Postgres through a pooler (PgBouncer/Supavisor in transaction mode), or a managed edge pooler (Cloudflare Hyperdrive for existing Postgres/MySQL from Workers, Prisma Accelerate for Prisma Postgres over HTTP), or use an HTTP-native driver (Neon) instead of a TCP client; keep transactions short — long ones block transaction-mode pooling.
- [ ] Pick for: event-driven glue, webhooks, cron-like jobs, spiky unpredictable traffic. Skip for: sustained high-throughput — a $5 VPS beats per-request billing at constant load. Set billing alerts: per-request pricing has no ceiling.

## Edge compute (Cloudflare Workers and friends)

- [ ] Code runs in V8 isolates at 300+ PoPs, milliseconds from the user, with effectively zero cold start (<5 ms).
- [ ] Bill drivers: requests + CPU time, no egress fees. Workers Paid ($5/mo) includes 10M requests + 30M CPU-ms; overage ~$0.30/1M requests + ~$0.02/1M CPU-ms. Free tier is 100K requests/day with a hard stop, not graceful overage.
- [ ] Constraints are the price of speed: 128 MB memory, CPU-time limits per invocation, 50 subrequests/invocation on free (10K paid), Web APIs only — no `fs`, no native modules, no persistent TCP to classic databases (use HTTP/WebSocket drivers or a pooler like Hyperdrive).
- [ ] Keep bundles within script size limits (checked 2026-10-01: 3 MB gzip on Free, 10 MB on Paid, 64 MB uncompressed ceiling — the old 1 MB free limit is gone; verify against the current limits page before shipping); heavy deps (Prisma query engine, sharp, puppeteer) go to regional compute, not the edge.
- [ ] CPU time (not request count) is the bill driver for compute-heavy workers — an I/O-bound gateway at 200M requests costs pocket change; a JSON-transforming worker at the same volume costs an order of magnitude more.
- [ ] Pick for: auth, A/B tests, personalization, API gateways, anything latency-sensitive and stateless. Pair with regional compute (Lambda/containers) and an edge-native store (KV/D1/R2) for heavy lifting.

## Kubernetes

- [ ] Container orchestration: declarative deployments, autoscaling, service discovery, rolling updates — the standard for multi-service production.
- [ ] Bill drivers: the nodes underneath (you still pay for the VMs/Fargate) + control-plane fee (EKS ~$73/mo, $0.10/hr) + your ops time. Ingress/load balancer and persistent storage are separate line items.
- [ ] Complexity is the real cost: networking, storage, ingress, monitoring, and upgrades are all yours — don't adopt it for one web app; a Compose file on a VPS or a PaaS is the honest alternative below ~5 services.
- [ ] Pick for: teams running 5+ services needing uniform deploys and autoscaling; use managed (GKE/EKS/AKS) unless you have dedicated platform engineers.

## Object storage and CDN

- [ ] Serve user files from object storage behind a CDN, never through your app servers — app-served files pay app egress and app CPU for bytes.
- [ ] 2026 bands (approx): Cloudflare R2 ~$0.015/GB-mo with zero egress; S3 ~$0.023/GB-mo with egress ~$0.09/GB; CloudFront ~$0.085/GB US/EU. Zero-egress storage changes the architecture: put large-file delivery behind R2/CloudFront, not behind the origin.
- [ ] Check before committing: operation pricing (Class A vs B), minimum billable object sizes, and that the bucket region matches your users — cross-region fetches pay latency and sometimes fees.
- [ ] Pick R2 when egress dominates your cost model; pick S3 when you're already inside the AWS ecosystem and value the native integrations.

## Workload chooser

- [ ] Static site/blog → object storage + CDN (pennies) or shared hosting.
- [ ] Side project / MVP → PaaS (Railway/Fly.io for spiky, Render for predictable) or a $5–10 VPS; optimize for shipping speed, not $3/mo.
- [ ] Small SaaS, predictable traffic → VPS or PaaS; compare managed-VPS price against PaaS *with* egress before assuming VPS is cheaper.
- [ ] Spiky/event-driven → serverless functions (+ edge for latency); set billing alerts and a hard cap — per-request pricing has no ceiling.
- [ ] Global low-latency API → edge compute at the front, regional services behind.
- [ ] Database / stateful / compliance → dedicated or a managed database service; never run prod data on an ephemeral free tier. (DB platform choice lives in `managed-data-platforms.md`.)
- [ ] File-heavy product (video, images, datasets) → object storage + CDN from day one; egress is the bill, not storage.
- [ ] Always: price the *second year* (renewals), add backups/monitoring/egress to the quote, and set a billing alert at 50% of budget.

## Deployment basics

- [ ] Choose the strategy by risk profile, not habit: **rolling** (gradual instance replacement, default for stateless web/API), **blue-green** (two full stacks, instant rollback — costs ~2× during deploy, mandatory for anything where rollback must take <30 s), **canary** (5% → 25% → 50% → 100% traffic with metric gates — cheapest risk reduction, but needs real observability).
- [ ] Pair every strategy with the expand–migrate–contract DB pattern: old and new app versions must run against the same schema during rollout, or the deploy strategy is fiction. (Schema workflows live in `databases.md`.)
- [ ] Health checks are two separate endpoints: liveness (`/healthz` — process is up) vs readiness (`/readyz` — can serve traffic, DB/Redis reachable); load balancers route only to ready instances; deployments roll back automatically when readiness fails N consecutive checks.
- [ ] Automated rollback triggers set before the first deploy: error rate > threshold (e.g. >1% 5xx for 2 min) or p95 latency breaching budget → abort and revert; rollback = redeploy the previous immutable image digest, never a rebuild.
- [ ] Smoke tests run against the new version before traffic shifts: critical user path works, writes actually persist, external services reachable, metrics dashboard updating.
- [ ] Deploy ≠ release: feature flags decouple shipping code from exposing it, so a bad flag flips off in seconds without a redeploy; drain instances before terminating (stop new traffic, let in-flight requests finish).

## AI/GPU hosting

- [ ] Why GPUs cost what they do: scarce datacenter hardware plus power and cooling — an H100 draws ~700 W — plus NVLink/InfiniBand interconnect at multi-node scale. The premium over raw FLOPS is hardware scarcity + electricity + networking, not just compute. (Model choice lives in `ml-landscape.md`; this section is about paying for the metal.)
- [ ] On-demand vs spot vs reserved: on-demand is the sticker price; spot/interruptible is ~40–60% cheaper but can be reclaimed with seconds of notice (fine for checkpointed batch training, fatal for live serving); reserved/committed is ~30–50% off for steady 1–3 yr use.
- [ ] 2026 on-demand bands per GPU-hour (approx, re-verify): RTX 4090 ~$0.34–0.74 (Vast.ai spot low end, RunPod high end); A100 80GB ~$1.00–2.79 (RunPod → Lambda); H100 80GB ~$2.59–3.99 (RunPod → Lambda; hyperscaler equivalent ~$6.88); H200 ~$4.5–6.3; B200 ~$5.9–6.7 (hyperscaler equivalent ~$14.24). Specialist clouds charge zero egress; hyperscalers add ~$0.09/GB.
- [ ] Serverless GPU inference (per-second, scale-to-zero) wins when traffic is bursty with long idle gaps: Modal ~$0.59/hr T4, ~$1.95/hr L40S, ~$2.50/hr A100-80GB, ~$3.95/hr H100, ~$6.25/hr B200 (CPU/RAM metered separately); RunPod serverless flex H100 ~$4.55/hr vs pods ~$2.99/hr; Baseten and Replicate charge a premium (H100 ~$6.50/~$5.49) for managed autoscaling and weight caching.
- [ ] Serverless cold starts (seconds to minutes for large models) rule it out for sub-second SLOs unless you keep a warm instance; batching + quantization can cut cost ~90× vs a naive always-on dedicated GPU.
- [ ] VRAM sizing math: weights ≈ parameters × bytes-per-parameter (70B at FP16 ≈ 140 GB); add ~20–30% for KV cache at target concurrency; INT8 roughly halves, INT4 roughly quarters the footprint at some quality cost.
- [ ] Rule of thumb: ≤3B fits a T4 (~8 GB); 7–8B needs ~22 GB (L4/A10); 13B ~30 GB (L40S); 30B ~65 GB (A100-80/H100); 70B-class needs 2× H100 or 1× H200 (141 GB); beyond that is multi-node territory — or an API.
- [ ] Inference is memory-bandwidth bound, not compute bound: a faster GPU can be *cheaper per unit of work* (H100 ~11× the tokens/s of an L4 at ~5× the price) — size on measured tok/s per dollar, not $/hr.
- [ ] API-vs-self-host rule of thumb: below sustained high utilization, a managed inference API (~$0.8–5/M tokens for 70B-class) wins; a single on-demand H100 running 24/7 is ~$2,400–2,900/mo before engineer time. Self-host when: utilization is predictably high, data can't leave your network, or you need a fine-tuned custom model the APIs don't offer.

## Sources

- https://learnwithhasan.com/vps-providers/hetzner/ — Hetzner plan tables and trust review (verified against Hetzner's pricing pages; post-2026-hike plans)
- https://agent.mue.app/articles/hetzner-vs-digitalocean-vs-vultr-cloud-vps-pricing — Hetzner vs DigitalOcean vs Vultr price comparison (checked July 2026; 2026 Hetzner rises, DO droplet bands, bandwidth overages)
- https://github.com/fmphw761/vps-cloud-benchmarks — $5 VPS landscape mid-2026 (DigitalOcean $4/$6 entry, Vultr/Linode/Hetzner comparisons)
- https://blog.blazingcdn.com/en-us/cloudflares-pricing-for-developers-a-closer-look-at-workers-pages — Cloudflare Workers 2026 rate card (request vs CPU-time billing, worked cost models)
- https://github.com/james2256/omnidrive/blob/HEAD/docs/cloudflare-free-tier.md — Workers verified limits (Free vs Paid, subrequests, memory, cron triggers; sourced from Cloudflare's own docs, July 2026)
- https://bex.co/blog/2026/09/19/paas-pricing-shakeup-ledger-render-heroku-hetzner — Sep-2026 PaaS ledger: same workload priced on Render/Heroku/Railway/Fly.io/Hetzner
- https://techsy.io/en/blog/railway-vs-render-vs-fly-io — PaaS benchmarks and tiered pricing (hobby/startup/growth/scale, 2026)
- https://bex.co/blog/2026/09/20/railway-vs-render-vs-flyio-pricing-2026 — egress economics and regional flip (Fly.io $0.02/GB NA/EU, Africa/India $0.12/GB)
- https://dev.to/pavel-hostim/render-vs-railway-vs-flyio-pricing-compared-2026-2e5p — PaaS billing-model comparison (fixed vs per-second, free-tier changes 2026)
- https://www.cloudzero.com/blog/lambda-pricing/ — AWS Lambda 2026 pricing (requests, GB-seconds, ARM discount, free tier)
- https://github.com/njain006/costly-oss/blob/HEAD/backend/app/knowledge/aws.md — AWS unit prices incl. EKS $73/mo, NAT gateway, CloudWatch Logs, IPv4 charges
- https://getdeploying.com/lambda-labs-vs-runpod — Lambda Labs vs RunPod GPU price comparison (H100/B200/A100 per-GPU-hr, 2026)
- https://gpuadvisor.com/cheapest-h100-cloud — cheapest H100 providers 2026 (RunPod community spot, Lambda on-demand, CoreWeave, AWS premium)
- https://www.runpod.io/articles/alternatives/lambda-labs — Lambda Labs published instance pricing (B200/H100/A100, Aug 2026; serverless gap, cluster terms)
- https://github.com/hxm2023/auto-research-system/blob/HEAD/skills/serverless-modal/SKILL.md — Modal per-second GPU pricing table (T4→B200) and VRAM rules of thumb (sourced from modal.com/pricing)
- https://aitechconnect.in/tips/serverless-gpu-modal-runpod-baseten-replicate-2026 — serverless GPU platforms compared (Modal/RunPod/Baseten/Replicate billing, cold starts, scale-to-zero)
- https://dev.to/heckno/i-tested-9-serverless-gpu-providers-for-ai-inference-in-2026-heres-what-id-actually-use-4cf4 — 9 serverless GPU providers tested 2026 (per-second vs per-token, Together AI, cold-start guidance)
- https://github.com/devstarsj/devstarsj.github.io/blob/HEAD/_posts/2026-02-20-serverless-gpu-ai-inference-guide.md — serverless GPU cost scenario (reserved vs serverless vs batching+quantization; ~90× reduction claim)
- https://github.com/sunchit/systemdesigninterviewpreparationseries/blob/HEAD/Day59_Deployment_Strategies_Decision_Tree.md — blue-green vs canary vs rolling decision tree (costs, rollback, DB gotcha)
- https://github.com/mochrzlf/aegis-forge/blob/HEAD/docs/deployment.md — deployment strategy table, /healthz vs /readyz, automated rollback triggers, immutable digests
- https://github.com/sandeepk24/learn-devops-playbook/blob/HEAD/sre/canary-vs-blue-green-vs-rolling-deployments.md — blue-green 2× cost example, canary phase structure, when-not-to-use guidance
- https://github.com/0xdarkmatter/claude-mods/blob/HEAD/skills/cloudflare-ops/SKILL.md — Workers script size limits 3 MB (free) / 10 MB (paid) gzipped (checked 2026-10-01)
- https://github.com/workersphp/core/blob/HEAD/docs/research/02-workers-platform-limits.md — Workers platform limits, verified Aug 2026 (64 MB uncompressed ceiling)
- https://developers.cloudflare.com/hyperdrive/ — Hyperdrive edge connection pooling for Postgres/MySQL from Workers
