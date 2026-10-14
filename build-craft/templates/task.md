# Task

<!-- EXAMPLE entry — delete and replace with your own. Keep all ## headers;
     the gate checks for exactly these headers. -->

## Goal

One sentence: what done looks like.

## Non-goals

- Things explicitly out of scope (also what you will NOT do).

## Decisions

- Key design choices. Full rationale lives in `decisions.md`.

## File changes

- `path/to/file` — what changes and why.

## Risks

- What could go wrong during the build; how likely, how bad.

## Failure modes

(pre-mortem — at least 3: where will this fail?)

- EXAMPLE: the external API rate-limits us mid-migration and retries pile up
- EXAMPLE: the schema change breaks the existing read path in production
- EXAMPLE: tests pass locally but the CI environment lacks the secret we rely on

<!-- add your own failure modes here (delete this comment; the gate requires 3+ real bullets) -->

## Rollback

How to undo this work safely if it ships broken.
