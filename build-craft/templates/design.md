# Design direction

## Constraints

- Budget, platform, latency, and non-negotiable limits go here.

### Direction 1: EXAMPLE — server-rendered monolith

- One deployable; HTMX for interactivity; sqlite storage.
- Simplest to reason about; fits the team size of one.

### Direction 2: EXAMPLE — static frontend + API backend

- React build artifact; FastAPI backend; separate deploys.
- More moving parts; better if the UI needs rich state later.

## Decision: EXAMPLE — Direction 1 — because the constraint list punishes
operational complexity and the UI is mostly forms, so a monolith is enough.

## Decision: <pick> — because ...
