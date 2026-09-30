# Skill Vetting — before trusting a third-party skill

A `SKILL.md` runs with **your** permissions. Its markdown is ingested as instructions, and the model cannot reliably distinguish developer instructions from ingested content — this is the textbook definition of prompt injection. Snyk Labs' "ToxicSkills" scan (Feb 2026, 3,984 skills) found 36% with prompt-injection flaws and 76 confirmed credential-theft / backdoor / exfiltration payloads. Treat every third-party skill as untrusted code until it passes this checklist.

## The vetting checklist

- [ ] **Read ALL files** — `SKILL.md` plus every script, every reference, every asset, line by line. No exceptions.
- [ ] **Description matches behavior** — the `description` field controls auto-triggering; a "PDF reader" description can hide exfiltration instructions. If what it says and what it does diverge, reject it.
- [ ] **Map the data flows** — what does it read, what does it write, what does it transmit, and to where? Grep for `curl`, `wget`, `fetch(`, `XMLHttpRequest`, and any external URLs.
- [ ] **Inspect scripts** — look for `exec` / `eval` / `subprocess` / `os.system`, base64 blobs, `curl | sh` patterns, and reads of credential files (`.env`, `~/.ssh`, `~/.aws/credentials`, `~/.config/gh`).
- [ ] **Check persistence hooks** — writes to `.bashrc` / `.zshrc`, cron jobs, `authorized_keys`, launch agents, or systemd units are backdoor behavior until proven otherwise.
- [ ] **Check the tool surface** — overly broad `allowed-tools` (e.g. `Bash(*)`) on a skill that shouldn't need it is a red flag.
- [ ] **Pin to a tag or commit SHA**, never a floating branch. Re-verify on every update — 2.9% of marketplace skills fetch and execute remote content at runtime, so a skill that passed review can have its payload swapped server-side later.

## Red-flag grep patterns

Run these against the extracted skill directory before installing:

```bash
grep -rEn 'curl[^|]*\|\s*sh\b|wget[^|]*\|\s*sh\b' .
grep -rEn 'base64\s+(-d|--decode)|eval\(|exec\(|os\.system|subprocess' .
grep -rEn '\.ssh|\.aws/credentials|\.env\b|authorized_keys|\.bashrc|cron' .
grep -rEn '169\.254\.169\.254|metadata\.google' .   # cloud metadata exfil
```

Any hit is not an automatic reject — read the context — but every hit must have an innocent explanation in the skill's own documentation.

## Threat classes to know

- **Prompt injection via skill content** — 91% of confirmed-malicious skills used it. Instructions hidden in examples, "tips", or reference docs.
- **Description↔behavior mismatch** — the subtlest vector; the trigger text is benign, the body is not.
- **Runtime-fetch evasion** — the published skill is clean; the payload arrives from a remote URL at execution time.
- **ToxicSkills** — looks harmless statically, behaves maliciously only when executed by a capable agent. The agent itself is the gadget.

## Verdict

- **Pass** — all files read, flows mapped, no unexplained red flags, pinned to SHA, source reputable. Install.
- **Pass with sandboxing** — useful but does chatty network things; install project-local, restrict network, re-review on update.
- **Reject** — any unexplained credential access, exfil endpoint, obfuscated payload, or description mismatch. Delete the download, do not install.

## Sources

- https://en.wikipedia.org/wiki/Prompt_injection
- https://github.com/agentskills/agentskills
- https://github.com/tano73/agent-skills/blob/HEAD/skills/skill-security-auditor/SKILL.md
- Snyk Labs "ToxicSkills" findings via https://github.com/pranava0x0/vibe-coding-security/blob/HEAD/advisories/2026-02-clawhavoc-clawhub-skills.md
