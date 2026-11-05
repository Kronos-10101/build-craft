# Writing Craft — prose anti-slop for everything you write while building

Scope: every piece of prose an agent produces during a build — README files,
docs, design notes, reports, PR descriptions, commit messages, code comments,
changelog entries. These texts are read by humans and by maintainers long
after the code lands; they are also where AI-authorship tells concentrate,
because generated prose defaults to a recognizable statistical median. This
chapter is the filter: what to cut, what to protect, and the order to work in.
Checked 2026-11-05.

## Throat-clearing openers — delete, then start

- [ ] No "Here's the thing:", "Here's the deal:", "Here's why" — the sentence after the opener is the opener; move it up and delete the warm-up.
- [ ] No "Let's dive in", "Let's unpack", "Let's explore", "Let's break this down" — technical prose is not a workshop; state the topic directly.
- [ ] No "It turns out" or "The real X is" — both imply a reveal the text has not earned; state the finding as a plain fact.
- [ ] No "In today's fast-paced landscape" or "In the ever-evolving world of" — date-stamped scene-setting that says nothing about the system at hand.
- [ ] No "It's no secret that" or "Let me be clear" — permission-seeking and defensive positioning are padding in documentation.
- [ ] Fix: if deletion loses no meaning, the phrase was filler by definition — delete it rather than swapping in a synonym.

## Significance inflation — replace with the measurable claim

- [ ] No "pivotal", "cornerstone", "stands as a testament to", "a rich tapestry", "a testament to the power of" — inflation words that assert importance instead of demonstrating it.
- [ ] No "game-changer", "revolutionary", "cutting-edge", "state-of-the-art" in docs for your own system — if the claim is true, the benchmark, the diff, or the migration note proves it.
- [ ] No legacy framing ("marks a significant milestone in the project's journey") in changelogs and release notes — record what changed, for whom, and what breaks.
- [ ] Fix: replace every inflated adjective with the concrete number, behavior change, or constraint it was standing in for; if none exists, cut the sentence.

## Negative parallelism — state the positive claim directly

- [ ] No "It's not X, it's Y" / "This isn't about X — it's about Y" as a rhetorical engine — the construction performs profundity while usually restating one idea twice.
- [ ] No "not just X, but Y" stacked more than once per document — a single contrast can be precise; repeated, it becomes rhythm filler.
- [ ] Fix: write Y as a standalone sentence with its evidence; keep the contrast only when X is a real misconception the reader plausibly holds (e.g. a documented migration pitfall).

## Vague attribution — name the source or drop the claim

- [ ] No "experts argue", "studies show", "it is widely believed", "research suggests" without a named paper, RFC, benchmark, or vendor doc attached.
- [ ] No "many developers find" or "users report" in design docs — cite the issue thread, the support ticket count, or mark it as your own observation.
- [ ] Fix: attribution is a pointer the reader can follow; if you cannot produce the pointer, demote the sentence to a stated assumption in the plan, not a fact in the docs.

## Chatbot residue — strip the conversation layer

- [ ] No "Certainly!", "Great question", "Happy to help" in any written artifact — these belong to chat turns, never to files.
- [ ] No "I hope this helps" or "Let me know if you need anything else" at the end of reports, PRs, or docs — the artifact ends when the information ends.
- [ ] No first-person assistant framing in committed files ("In this document, I will walk you through...") — docs describe the system, not the tour.
- [ ] No knowledge-cutoff apologies ("As of my last update...") in documentation — if a fact may be stale, date it; do not apologize for it.

## Filler intensifiers and dead modifiers

- [ ] No "very", "really", "just", "actually", "basically", "simply" as default seasoning — each occurrence must survive the test: does deleting it change the claim? ("Simply set the flag" in instructions is a lie whenever the step has prerequisites.)
- [ ] No "robust", "seamless", "effortless", "powerful" as free-floating praise for your own components — these words in a README are claims a benchmark or a design note must cash out.
- [ ] No "comprehensive", "complete", "full-featured" for coverage you have not enumerated — list what is covered; the reader totals it up.
- [ ] No abstract-noun fog: "utilize" for "use", "leverage" (verb) for "use", "functionality" for "features", "in order to" for "to" — the shorter word is almost always the accurate one in technical prose.
- [ ] No "note that" / "keep in mind" / "bear in mind" reader-management phrases — present the fact at the point where it matters and trust placement to do the work.

## Emphasis crutches and business jargon

- [ ] No "Full stop.", "Period.", "Let that sink in", "Read that again" — punctuation-as-drama; if the fact matters, its placement and evidence carry it.
- [ ] No "at the end of the day", "when all is said and done", "the bottom line is" as section closers — write the conclusion itself.
- [ ] No business collocations doing no work: "leverage synergies", "move the needle", "circle back", "deep dive" (as a noun for reading code), "low-hanging fruit", "best-in-class" — each either names something specific or gets deleted.
- [ ] No intensifier stacking ("very unique", "extremely critical", "incredibly powerful") — one precise adjective or a number beats three adverbs.
- [ ] Watch the gated-word cluster in your own drafts: "delve", "tapestry", "landscape" (metaphorical), "realm", "furthermore" as a paragraph engine — individually legal, collectively a fingerprint.

## Punctuation tells

- [ ] Em-dash overuse is the single most reliable punctuation tell in generated prose: default to near-zero em-dashes in technical writing — use commas, colons, parentheses, or a new sentence instead.
- [ ] No bolding of random mid-sentence phrases for emphasis in prose paragraphs — bold is for labels, headings, and UI element names, not for volume.
- [ ] No emoji as section markers or bullet decoration in READMEs, reports, or commit messages — they read as generated garnish and age badly in git history.
- [ ] No excessive exclamation marks — one per document is already generous in technical prose; zero is the default.

## Hedge stacking and false caution

- [ ] No stacked hedges ("may potentially", "could possibly", "might sometimes") — pick the one qualifier that matches the actual uncertainty, or state what would resolve it.
- [ ] No "it is important to note that" or "it should be noted" before a fact — noting is what the sentence itself does; delete the frame and keep the fact.
- [ ] No weasel passives hiding the actor in findings and post-mortems ("mistakes were made", "the config was changed") — name who or what changed it; the log knows.
- [ ] No blanket disclaimers stapled to precise statements ("results may vary", "use at your own risk" outside license text) — a caveat earns its place only when it marks a real, specific boundary.
- [ ] Fix: uncertainty in technical prose is quantified ("fails on ~2% of imports", "untested above 10k rows") or owned ("we have not measured this") — never performed with adverb piles.

## Headings and titles — name the actor and the result

- [ ] No vague transformation verbs in headings ("Elevating the Developer Experience", "Transforming How We Test") — a heading names the mechanism, the component, or the outcome: "Retries now back off exponentially".
- [ ] No inanimate agency in headings ("The Pipeline That Catches Bugs") when a team or a tool did the catching — headings are claims, and claims need subjects that exist.
- [ ] No question headings in reference docs ("Why is X fast?") unless the doc genuinely answers that exact question — reference readers scan for nouns, not hooks.
- [ ] No title-case marketing register in internal docs — sentence case, the component name first, the change second.

## Structural tells — vary the machine rhythm

- [ ] No uniform sentence rhythm: if every sentence in a paragraph is the same length and shape, merge two or split one — monotone cadence is a stronger tell than any single phrase.
- [ ] No signpost scaffolding: consecutive paragraphs opening with "However,", "Moreover,", "Furthermore,", "Additionally," — connectives should mark real logical turns, not decorate paragraph starts.
- [ ] No moralizing codas ("Ultimately, this reminds us that good engineering is about...") at the end of docs and reports — end on the last fact, decision, or next action.
- [ ] No summary sandwiches: introduction that previews the body, body, then a conclusion that restates the introduction — in technical docs, write the content once; a TL;DR is fine, a restatement is not.
- [ ] No bold-label listicles standing in for prose where prose is due — a design rationale written as "**Performance:** ... **Scalability:** ... **Maintainability:** ..." has usually not made an actual argument; lists enumerate, prose reasons.
- [ ] No rule-of-three padding: triads ("fast, reliable, and scalable") added to complete a rhythm rather than because exactly three things are true.
- [ ] No synonym cycling for the same referent within a paragraph (the function / the routine / the handler / the method) — elegant variation confuses readers who track terms literally; pick one term and repeat it.

## Protected content — do no harm (read before cutting)

- [ ] Precision language in security, legal, and safety text is content, not filler: "never store secrets in the repository", "this endpoint must reject unsigned tokens", "does not establish causation" — force-bearing words ("never", "must", "all", "only") survive edits exactly.
- [ ] Caveats and scope limits are load-bearing: "tested on Node 20 only", "does not cover the legacy importer" — never soften, generalize, or delete a hedge that marks a real boundary.
- [ ] Literal domain usage of gated words is exempt: "landscape" in a GIS tool, "delve" quoted from a source, "leverage" as the financial term in a trading system — judge the word in its sentence, not against the list.
- [ ] Quoted material, code blocks, error messages, log excerpts, and command output are exempt by default — never "fix" the prose inside an example, a stack trace, or a cited passage.
- [ ] Facts survive every edit with magnitude intact: `$47.3M` must not become `$47.3 billion`, `100ms` must not become "fast", `3 retries` must not become "a few retries" — numbers, dates, versions, paths, identifiers, and units are copied, never paraphrased.
- [ ] Attribution already present stays present: if the source named the study, the benchmark, or the person, the edit keeps the name attached to the claim.
- [ ] A flagged phrase in context may be legitimate — the scan proposes, the agent disposes; when the defect is not clearer than the case for preservation, make no edit.

## The working method — scan, edit surgically, re-scan

- [ ] Run the scanner first: `node scripts/prose-scan.mjs <file>` before editing prose of any length; work from its findings list, not from a vibe.
- [ ] Read every sentence yourself, including headings and the final paragraph — scanners miss paraphrased scaffolding and always miss the coda; phrase lists are a starting set, not the definition of the problem.
- [ ] Prefer targeted edits over rewrites: change the smallest span that removes the defect, and copy every untouched sentence through exactly — a rewrite pass is where facts and voice get lost.
- [ ] Preserve meaning, voice, and register: the goal is the same author without the tells, not a different, blander author; do not sand technical prose down into staccato fragments in the name of de-slopping.
- [ ] Re-scan after editing and diff the result against the original: check that no fact, number, caveat, or attribution moved, and that the edit introduced no new tells.
- [ ] Make the scan a habit at the artifact boundary, not a cleanup project: run it on the README before the release commit, on the PR description before opening the PR, on the report before it is delivered — prose written under deadline is where the tells breed.
- [ ] When the user or a maintainer has a house style (a voice, a house style guide, prior documents), match that sample over this chapter's defaults — de-slopping means sounding like the project's author, not like a generic style guide.
- [ ] Know the limits of the instrument: a clean scan does not prove human authorship, and a flagged phrase does not prove machine authorship — the scan is evidence for judgment, never a verdict.

## Genre notes — the rules bend where the genre is real

- [ ] Reference docs and API references legitimately use bold-label lists, tables, and terse fragments — that is the genre working, not a listicle tell; apply the prose rules to prose sections.
- [ ] Commit messages: subject line states the change in imperative mood, no throat-clearing, no significance inflation ("refactor" is a claim — name what moved); the body explains why, briefly, and links the issue.
- [ ] PR descriptions: what changed, why, how it was verified — in that order, in plain sentences; no "This PR aims to leverage..." preamble and no chatbot sign-off.
- [ ] Code comments: state the constraint, the invariant, or the reason the non-obvious code exists — never narrate what the next line does, and never leave generated-sounding filler ("// This function handles the logic for...") in the tree.
- [ ] Changelogs and release notes are records, not marketing: past tense, specific, user-visible changes only; internal refactors get one plain line, not a paragraph.
- [ ] Reports (audits, post-mortems, gate reports): findings with file:line evidence outrank narrative polish; a dry, exact report beats a flowing one with the numbers rounded into adjectives.
- [ ] READMEs: the first screen is what it is, how to install it, how to run it — not a pitch; feature lists state capabilities plainly ("Parses CSV, JSON, and Parquet"), never benefits copy ("Unlock the power of your data").
- [ ] Error messages and CLI help are prose too: state what failed, why, and what to do next, in that order — no "Oops!", no "Something went wrong" without the cause, no exclamation marks.
- [ ] API reference descriptions: one sentence on what the endpoint does and one on its constraints (auth, limits, idempotency) beats a paragraph of framing; generated descriptions are the highest-slop surface in most doc sets — scan them first.

## Sources

- unslop (MIT), https://github.com/theclaymethod/unslop : pattern families (throat-clearing, significance inflation, vague attribution, negative parallelism, structural scaffolding) and the scan-first, preserve-facts working contract adapted from its references; all wording in this chapter is original.
- Wikipedia, "Signs of AI writing": the public catalog of AI-prose tells that the unslop phrase families draw on.
