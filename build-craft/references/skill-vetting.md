# Skill Vetting — before trusting a third-party skill

A `SKILL.md` runs with **your** permissions. Its markdown is ingested as instructions, and the model cannot reliably distinguish developer instructions from ingested content — this is the textbook definition of prompt injection. Snyk Labs' "ToxicSkills" scan (Feb 2026, 3,984 skills) found 36% with prompt-injection flaws and 76 confirmed credential-theft / backdoor / exfiltration payloads; a follow-up study put the numbers at 36.82% with ≥1 security issue and 13.4% critical. Treat every third-party skill as untrusted code until it passes this checklist.

## Why 2026 made this urgent

- [ ] You know the **Clinejection** chain (Feb 2026): prompt injection in an AI triage bot → CI cache poisoning → stolen npm/VSCE publishing tokens → malicious `cline@2.3.0` with a `postinstall` payload → ~4,000 developer machines compromised in 8 hours. Lesson: a skill adjacent to CI, publishing, or credentials is a supply-chain weapon, not a helper.
- [ ] You know the **dynamic-context** vector (Datadog, May 2026): Claude Code's `!` command feature executes shell *before* the skill content reaches the model, so model-side prompt-injection defenses never see it. The malicious `Clawsights` skill harvested `gh auth token` and exfiltrated it with `curl`. Lesson: pre-prompt execution is invisible to the model — only static inspection catches it.
- [ ] You know about **trojanized MCP servers** (GTIG, Sep 2026): `tiktoken_mcp` and `azure-functions-mcp-extension` impersonated real tooling; compromised packages arrived with *valid SLSA Build 3 provenance* via stolen OIDC tokens — "the provenance was real, the package was still malicious." Lesson: signatures prove origin, not intent.
- [ ] You know about **ClawHavoc** (2025): 1,184 malicious skills uploaded to the OpenClaw marketplace in two weeks and auto-approved under minimal vetting. Lesson: marketplace presence is not vetting — popularity and availability prove nothing.
- [ ] You know **LangGrinch** (CVE-2025-68664): a LangChain deserialization flaw let skills exfiltrate environment variables. Lesson: the frameworks a skill is built on are attack surface too — check the skill's stack, not just the skill.

## The vetting checklist

- [ ] **Read ALL files** — `SKILL.md` plus every script, every reference, every asset, line by line. No exceptions. Prose instructions get the same scrutiny as code.
- [ ] **Description matches behavior** — the `description` field controls auto-triggering; a "PDF reader" description can hide exfiltration instructions. If what it says and what it does diverge, reject it.
- [ ] **Map the data flows** — what does it read, what does it write, what does it transmit, and to where? Grep for `curl`, `wget`, `fetch(`, `XMLHttpRequest`, and any external URLs.
- [ ] **Inspect scripts** — look for `exec` / `eval` / `subprocess` / `os.system`, base64 blobs, `curl | sh` patterns, `postinstall` / install hooks, and reads of credential files (`.env`, `~/.ssh`, `~/.aws/credentials`, `~/.config/gh`, `gh auth token` invocations).
- [ ] **Inspect pre-prompt execution surfaces** — backtick/`!` shell-expansion features, templated commands that run before the model sees content, plugin manifests, and `--add-dir` auto-load paths. Anything that executes before model inspection is a first-class suspect.
- [ ] **Check persistence hooks** — writes to `.bashrc` / `.zshrc`, cron jobs, `authorized_keys`, launch agents, systemd units, or drops into `.claude/` / `.vscode/` / `.cursor/` hidden directories are backdoor behavior until proven otherwise.
- [ ] **Check the tool surface** — overly broad `allowed-tools` (e.g. `Bash(*)`) on a skill that shouldn't need it is a red flag; a triage bot with Bash access is how Clinejection happened.
- [ ] **Check dependencies** — the skill's own deps are your deps: audit `package.json` / `requirements.txt` install hooks and pinned versions; a clean skill with a poisoned dependency is still poisoned.
- [ ] **Pin to a tag or commit SHA**, never a floating branch. Re-verify on every update — 2.9% of marketplace skills fetch and execute remote content at runtime, so a skill that passed review can have its payload swapped server-side later.

## Red-flag grep patterns

Run these against the extracted skill directory before installing:

```bash
grep -rEn 'curl[^|]*\|\s*sh\b|wget[^|]*\|\s*sh\b' .
grep -rEn 'base64\s+(-d|--decode)|eval\(|exec\(|os\.system|subprocess' .
grep -rEn '\.ssh|\.aws/credentials|\.env\b|authorized_keys|\.bashrc|cron' .
grep -rEn '169\.254\.169\.254|metadata\.google' .   # cloud metadata exfil
grep -rEn 'gh auth token|postinstall|preinstall' .  # credential harvest + install hooks
grep -rEn '`!|![a-z]' SKILL.md .                    # dynamic-context / pre-prompt shell exec
```

Any hit is not an automatic reject — read the context — but every hit must have an innocent explanation in the skill's own documentation.

## Threat classes to know

- **Prompt injection via skill content** — 91% of confirmed-malicious skills used it. Instructions hidden in examples, "tips", or reference docs.
- **Pre-prompt execution** — shell that runs before the model sees the content; invisible to model-side defenses. Static inspection is the only catch.
- **Instruction-only exfiltration** — natural-language steps that talk the agent into reading and transmitting secrets. No code, no syscalls, no scanner hits.
- **Description↔behavior mismatch** — the subtlest vector; the trigger text is benign, the body is not. Metadata poisoning (false author/description mimicking popular skills) is the same family.
- **Runtime-fetch evasion** — the published skill is clean; the payload arrives from a remote URL at execution time.
- **Dependency poisoning** — the skill is clean, its install hook or pinned dep is not.
- **Framework flaws as skill flaws** — LangGrinch-style: the libraries the skill bundles can exfiltrate env vars on their own; audit the stack, not just the skill.
- **Marketplace auto-approval** — ClawHavoc-style: bulk-uploaded malicious skills approved with minimal review; treat "listed" as "unreviewed."
- **ToxicSkills** — looks harmless statically, behaves maliciously only when executed by a capable agent. The agent itself is the gadget.

## The vetting procedure (in order)

Don't improvise the order — quarantine first, decide last:

- [ ] You downloaded to a quarantine directory and have NOT installed it anywhere an agent reads yet.
- [ ] You listed every file in the package and confirmed nothing is hidden (dotfiles, nested archives, unicode-homoglyph filenames).
- [ ] You read every file line by line, prose included, and can summarize what the skill does in two sentences.
- [ ] You ran the red-flag greps above and every hit has an innocent explanation documented in the skill itself.
- [ ] You enumerated every external URL the skill touches and classified each: documentation (safe to read), API endpoint (needs credentials — which?), or unknown (reject until identified).
- [ ] You checked the skills.sh audit badge (Gen Agent Trust Hub / Socket / Snyk) where available and recorded the verdict and date.
- [ ] You checked the publisher: real repo history, not a week-old account; no typosquat of a popular skill name; the skill's claimed vendor matches the repo owner.
- [ ] You pinned the exact tag or commit SHA you vetted — the install command references nothing else.
- [ ] You decided the install scope: project-local for single-project skills, global only for genuinely universal ones.
- [ ] You recorded the vetting verdict (pass / sandbox / reject) with the SHA and date, so the next update re-verifies instead of assuming.

## Update and removal hygiene

- [ ] You never run `skills update` blind: diff the new version against the vetted SHA before accepting it.
- [ ] You re-run the full checklist on every update — 2.9% of marketplace skills swap their runtime payload after passing review.
- [ ] You remove rather than disable rejected skills: delete the download directory and confirm no agent path still references it.
- [ ] You revoke any credentials the rejected skill could have seen during a sandboxed trial run.
- [ ] You keep a dated log of installed third-party skills (name, source, SHA, verdict) so a future compromise can be traced to what was installed when.
- [ ] You treat a skill that phones home on every load (not just during its task) as telemetry you didn't consent to — investigate or remove.
- [ ] You re-check the publisher's account standing periodically; hijacked maintainer accounts turn trusted skills hostile without a version bump.
- [ ] When in doubt you ask the user before installing — a skipped skill costs an afternoon, an installed backdoor costs the machine.

## Sandboxed first run (for "pass with sandboxing" verdicts)

- [ ] The first run happens in a throwaway project directory, never in a repo containing real credentials or customer data.
- [ ] Network egress is restricted or monitored for the trial; you can list every outbound connection the skill attempted.
- [ ] No real credentials are in scope during the trial — use dummy values; a skill that demands production secrets to demo itself is rejected.
- [ ] You watched what the skill actually did (files written, commands run, data transmitted) and it matches the documented behavior exactly.
- [ ] Any deviation between documented and observed behavior is a reject, not a question — investigate, don't rationalize.
- [ ] After the trial you can enumerate every persistent change the skill made (files, config, hooks) and remove each one cleanly.

## Verdict

- **Pass** — all files read, flows mapped, no unexplained red flags, pinned to SHA, source reputable. Install.
- **Pass with sandboxing** — useful but does chatty network things; install project-local, restrict network, re-review on update.
- **Reject** — any unexplained credential access, exfil endpoint, obfuscated payload, pre-prompt execution you didn't ask for, or description mismatch. Delete the download, do not install.

## Sources

- https://github.com/stacklok/toolhive-catalog/blob/HEAD/registries/toolhive/skills/ci-agent-hardening/skill/references/ATTACK-PATTERNS.md
- https://github.com/vectara/awesome-agent-failures/blob/HEAD/docs/case-studies/cline-supply-chain-attack.md
- https://github.com/zabuqasem/daily-security-feed/blob/HEAD/site/_posts/2026-05-11-malicious-coding-agent-skills-and-the-risk-of-dynamic-contex.md
- https://github.com/pranava0x0/vibe-coding-security/blob/HEAD/advisories/2026-09-gtig-adversarial-ai-agentic-pipelines.md
- https://github.com/nextlevelbuilder/skillx/blob/HEAD/plans/reports/researcher-260305-prompt-injection-defense-comprehensive-study.md
- https://github.com/dirtybits/agentvouch/blob/HEAD/web/content/blog/2026-04-02-skill-supply-chain-attack.md
