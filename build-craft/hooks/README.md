# Optional hooks for build-craft (Claude Code)

The phase gates in `scripts/craft-gate.mjs` only run when the agent chooses
to run them. Prose instructions to "always run the gate" get skipped some of
the time, even when they are pointed and emphatic. Harness hooks are the
near-total enforcement layer: the harness, not the model, decides to invoke
them. These two hooks wire the craft gate into Claude Code's hook points.

They are **optional add-ons**. The skill works without them; they just make
skipping a gate much harder while you work inside Claude Code.

> **Safety property, first:** both hooks are complete no-ops when the
> `BUILD_CRAFT_RUN_DIR` environment variable is unset or empty — they exit 0
> immediately, allow the edit, and never block a stop. Installing them
> globally is safe: they only act in sessions where you have explicitly
> pointed them at a build-craft run directory.

## The contract: `BUILD_CRAFT_RUN_DIR`

Set `BUILD_CRAFT_RUN_DIR` to the run directory of the build you are working
on (the same directory you pass to `craft-gate.mjs --dir`, the one holding
`task.md`, `grill.md`, `progress.md`, `report.md`, and `gate-log.md`):

```bash
export BUILD_CRAFT_RUN_DIR=/path/to/your/run-dir
```

Unset it (or start a session without it) and both hooks go back to being
no-ops.

## `pre-edit-gate.sh` — no code edits before the plan survives the grill

A `PreToolUse` hook matched on `Edit|Write`. On every edit or write it
checks `<run-dir>/gate-log.md` for a `p2 PASS` line, which
`craft-gate.mjs` appends on each successful phase run.

- `p2 PASS` line present → the edit is allowed.
- Absent (or no gate log yet) → the edit is **denied**, with a reason that
  states the fix: run the craft gate through p2 for the run dir first
  (`node scripts/craft-gate.mjs --phase p2 --dir <run-dir>`), then retry.

This enforces the workflow's load-bearing order (plan, grill, *then*
build) at the exact moment a skip would happen.

## `stop-gate.sh` — no stopping on an ungated run

A `Stop` hook. When the session tries to stop, it works out the highest
phase the run has reached from the artifacts present (`report.md` → p4,
else `progress.md` → p3, else `grill.md`/`design.md` → p2, else p1) and
runs the craft gate for that phase.

- Gate passes → the stop proceeds.
- Gate fails → the stop is **blocked** (exit 2) and the gate's output is
  fed back to the model, prefixed with the failing phase and the fix, so
  the session continues and addresses the failures.

It honours the payload's `stop_hook_active` flag: if Claude Code says a
Stop hook has already blocked once, this hook lets the stop through rather
than looping forever.

## Install

Add both hooks to your Claude Code `settings.json` (user or project level),
adjusting the paths to where the skill is installed:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/build-craft/hooks/pre-edit-gate.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/build-craft/hooks/stop-gate.sh"
          }
        ]
      }
    ]
  }
}
```

Make sure both scripts are executable (`chmod +x hooks/*.sh`), and export
`BUILD_CRAFT_RUN_DIR` in the shell or session environment where Claude Code
runs.

## Honest limits

- **Claude Code only.** These hooks use Claude Code's hook protocol
  (`PreToolUse` / `Stop`, the `hookSpecificOutput` deny JSON, exit 2 to
  block a stop). Other harnesses have different hook systems or none; on
  them, build-craft relies on the phase gates alone, invoked by the agent
  as the skill instructs.
- **The hooks check the gate log, not the work.** `pre-edit-gate.sh` trusts
  `gate-log.md`. Anyone (or any agent) who writes a forged
  `p2 PASS 2026-01-01T00:00:00Z` line into that file defeats it, and
  `stop-gate.sh` re-running the gate is only as strong as the gate's own
  artifact checks. The hooks raise the cost of skipping: a skip now
  requires deliberate forgery instead of quiet omission. But they are
  **not proof of work**. Treat a passed gate the same way you would without
  hooks: as evidence the artifacts exist and cross-check, not as evidence
  the thinking was good.
- **Phase detection in the stop hook is a heuristic.** It infers the
  furthest phase from which artifact files exist. It can over- or
  under-shoot for unusual runs; the gate command it prints is the one to
  re-run by hand when in doubt.
