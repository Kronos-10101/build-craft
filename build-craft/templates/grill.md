# Grill log

Round headers must be `## Round N`; every question starts with `Q:` on its own line.
Grill until a full round changes nothing, then stop.

## Rubric — score every answer against these before writing the verdict

1. Evidence: does the answer cite a test, doc, or measurement — not just reasoning?
2. Adversarial coverage: was the hardest case addressed, not the easy one?
3. Decision clarity: did anything change in task.md/decisions.md as a result?
4. Stop discipline: are open questions named with owners instead of hand-waved?

## Round 1

Q: EXAMPLE — what happens if the input payload is 10x the size we assumed?
A: EXAMPLE — streaming parse; hard cap at 50 MB; task.md "Failure modes" updated.

Q: EXAMPLE — how do we know the cache is fresh?
A: EXAMPLE — TTL + version key on write; stale reads degrade to a miss.

Q: EXAMPLE — who owns the rollback if this deploys on a Friday?
A: EXAMPLE — on-call owns it; rollback steps are in task.md "Rollback".

(plan updated: yes)

## Round 2

Q:
A:

(plan updated: no)

## Judge pass

A second pass as the judge, not the author. Re-read the rounds above and deliver
verdicts against the rubric — at least 2 Verdict: lines, each >= 20 chars.

Verdict: EXAMPLE — the plan survives Round 1's answers; the payload-cap decision is now explicit in task.md.
Verdict: EXAMPLE — Round 2 surfaced no new holes; stop condition met honestly, not by exhaustion.
