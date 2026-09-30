# Hosting — how servers and hosting really work

The request lifecycle from DNS to database, every hosting model, what you actually pay for, and how to choose. Prices checked 2026-09-30 — approximate bands, re-verify before buying.

## The request lifecycle

- [ ] DNS resolves the domain to an IP (A/AAAA record); TTL controls how fast changes propagate — low TTL before migrations.
- [ ] TLS handshake establishes encryption (1.3 preferred); certificate presented and validated; session resumption and OCSP stapling cut round trips.
- [ ] Reverse proxy / edge (Nginx, Caddy, Cloudflare) terminates TLS, serves static/cached content, and forwards dynamic requests to the app.
- [ ] App server runs business logic, queries the database (ideally through a connection pooler), and returns a response up the same chain.
- [ ] Every hop is a measurable latency budget: DNS (~20–100 ms uncached), TLS (~1 RTT), proxy (~1 ms), app + DB (the part you control).

## Shared hosting

- [ ] You rent space on a server shared with other sites — cheapest, fully managed, no root access.
- [ ] Bill driver: flat monthly fee; typical band ~$3–15/mo (2026).
- [ ] Failure mode is the neighbor, not you: another site's traffic spike or compromise can slow or endanger yours — no resource isolation.
- [ ] Pick for: static sites, blogs, portfolios with low steady traffic. Leave when: traffic is spiky, you need SSH/root, or a neighbor keeps ruining your day.

## VPS (virtual private server)

- [ ] A dedicated slice (vCPU/RAM/disk) of a physical host via a hypervisor — your slice is yours, neighbors can't touch it.
- [ ] Bill drivers: vCPU, RAM, disk, bandwidth; typical bands (2026): entry ~$2–6/mo (1 vCPU, 1–2 GB), mid ~$6–20/mo (2–4 vCPU, 2–8 GB), performance ~$20–60/mo.
- [ ] Unmanaged = you are the sysadmin: OS patches, firewall, backups are on you — budget 2–5 hrs/month or pay for managed (4–5× the price).
- [ ] Watch renewal pricing: intro rates commonly jump 40–80% on renewal; compare the *second-year* price.
- [ ] Pick for: side projects, small SaaS, anything outgrowing shared with predictable traffic.

## Dedicated and bare metal

- [ ] The whole physical machine — no hypervisor, no neighbors, configurable hardware (RAID, NICs).
- [ ] Bill drivers: CPU model, RAM, NVMe, bandwidth tier; typical band (2026): ~$60–180/mo for a modern Ryzen/Xeon box with 64 GB RAM.
- [ ] Pick for: databases and stateful workloads needing consistent disk I/O, compliance requiring single-tenancy, steady high load where per-hour cloud pricing hurts.
- [ ] Skip for: bursty or spiky traffic — you pay for peak capacity 24/7.

## PaaS (Heroku / Render / Railway / Fly.io)

- [ ] You push code; the platform builds, runs, scales, patches, and TLS-terminates it — zero server management.
- [ ] Bill drivers: service size (RAM/CPU), always-on hours, managed DB, seats, egress; typical bands (2026): starter web service ~$5–25/mo, managed Postgres ~$7–40/mo, a small web+worker+DB stack ~$25–75/mo total.
- [ ] Pricing model differs by vendor: fixed per-service (Render/Heroku) vs usage-based credits (Railway) — model *your* workload on each; usage-based wins for idle-leaning apps, fixed wins for steady load.
- [ ] Free tiers exist but with teeth: sleeping services, expiring databases, limited hours — never build customer-facing prod on a free tier.
- [ ] Pick for: solo devs and small teams shipping fast; leave when: the bill exceeds a VPS + your time, or you need infra the platform doesn't offer.

## Serverless functions (AWS Lambda and friends)

- [ ] No servers to manage: code runs in short-lived containers spun up per request, scaling from zero automatically.
- [ ] Bill drivers: requests ($0.20 per 1M on Lambda) + compute (GB-seconds: memory × duration) — a 1 GB function running 100 ms costs ~$0.0000017 per invocation.
- [ ] Cold starts are real: ~1–3 s p95 for Node on Lambda (SnapStart/JVM ~200 ms); keep functions warm or accept it for async workloads.
- [ ] Stateless by design: no local disk between invocations, 15-min max duration — long jobs go to queues/containers instead.
- [ ] Pick for: event-driven glue, webhooks, cron-like jobs, spiky unpredictable traffic. Skip for: sustained high-throughput (a $5 VPS beats per-request billing at constant load).

## Edge compute (Cloudflare Workers, Vercel Edge)

- [ ] Code runs in V8 isolates at 300+ points of presence, milliseconds from the user — zero cold starts (<5 ms).
- [ ] Bill drivers: requests (~$0.30–0.50 per 1M over the included allowance) + CPU time; no egress fees on Cloudflare.
- [ ] Constraints are the price of speed: 128 MB memory, CPU time limits (10 ms free / minutes paid), Web APIs only — no `fs`, no native modules.
- [ ] Pick for: auth, A/B tests, personalization, API gateways, anything latency-sensitive and stateless. Pair with regional compute (Lambda/containers) for heavy lifting.

## Kubernetes

- [ ] Container orchestration: declarative deployments, autoscaling, service discovery, rolling updates — the standard for multi-service production.
- [ ] Bill drivers: the nodes underneath (you still pay for VMs) + control-plane fee (~$70/mo on managed offerings) + your ops time.
- [ ] Complexity is the real cost: a cluster needs networking, storage, ingress, monitoring, and upgrades — don't adopt it for one web app.
- [ ] Pick for: teams running 5+ services needing uniform deploys and autoscaling; managed (GKE/EKS/AKS) unless you have dedicated platform engineers.

## How to choose per workload

- [ ] Static site/blog → object storage + CDN (pennies) or shared hosting.
- [ ] Side project / MVP → PaaS (Render/Railway) or a $5 VPS; optimize for shipping speed, not $3/mo.
- [ ] Small SaaS, predictable traffic → VPS or PaaS; compare managed-VPS price against PaaS before assuming VPS is cheaper.
- [ ] Spiky/event-driven → serverless functions (+ edge for latency); set billing alerts — per-request pricing has no ceiling.
- [ ] Global low-latency API → edge compute at the front, regional services behind.
- [ ] Database / stateful / compliance → dedicated or a managed database service; never run prod data on an ephemeral free tier.
- [ ] Always: price the *second year* (renewals), add backups/monitoring/egress to the quote, and set a billing alert at 50% of budget.

## AI/GPU hosting

- [ ] Why GPUs cost what they do: you rent scarce datacenter hardware with high power/cooling costs — an H100 draws ~700 W; the bill is hardware scarcity plus electricity, not just compute.
- [ ] On-demand vs spot vs reserved: on-demand is the sticker price; spot/interruptible is ~40–60% cheaper but can be reclaimed with seconds of notice (fine for batch training with checkpoints, fatal for live serving); reserved/committed is ~30–50% off for steady 1–3 yr use.
- [ ] 2026 approximate bands (on-demand, per GPU-hour, re-verify): RTX 4090 ~$0.35–0.75, A100 80GB ~$1.35–2.00, H100 80GB ~$2.40–3.50, H200 ~$4–5.50, B200 ~$6–8.
- [ ] Serverless GPU inference (per-second billing, scale-to-zero) wins when: traffic is bursty with long idle gaps — you pay only for inference seconds, not 24/7 allocation.
- [ ] VRAM sizing basics: weights ≈ parameters × bytes-per-parameter (70B at FP16 ≈ 140 GB); add ~20–30% for KV cache at your target concurrency; quantization (INT8/INT4) roughly halves/quarters the footprint at some quality cost.
- [ ] Rule of thumb: models ≤ 13B fit one consumer GPU; 70B-class needs 2× H100 or 4× A100-80GB; beyond that is multi-node territory — or just use an API.
- [ ] Hidden costs: model-weight storage ($0.05–0.10/GB-month), egress, and engineer time (the dominant cost of self-hosting) — a managed inference API at ~$1–5/M tokens often beats self-hosting below high sustained utilization.

## Sources

- https://github.com/wpyvmpwi/cloud-vps-comparison/blob/HEAD/README.md
- https://dev.to/tanit365/cloud-vps-vs-dedicated-server-in-2026-the-renewal-price-is-the-real-decision-2egl
- https://github.com/mattbutlerengineering/mattbutlerengineering/blob/HEAD/docs/evaluations/2026-02-26-hosting-providers.md
- https://bex.co/blog/2026/09/19/paas-pricing-shakeup-ledger-render-heroku-hetzner
- https://www.pkgpulse.com/guides/cloudflare-workers-vs-vercel-edge-vs-aws-lambda-2026
- https://essamamdani.com/blog/top-gpu-servers-cloud-providers-ai-2026-b200-h200-rtx-5090
- https://github.com/optimnow/cloud-finops-skills/blob/HEAD/skills/cloud-finops/references/finops-ai-self-hosted-vs-managed.md
- https://github.com/sinhoneyy/master-skills/blob/HEAD/skills/chief-ai-officer-advisor/references/ai_cost_economics.md
