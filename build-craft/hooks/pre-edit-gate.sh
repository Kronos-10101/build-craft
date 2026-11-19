#!/usr/bin/env bash
# pre-edit-gate.sh — OPTIONAL Claude Code PreToolUse hook for build-craft.
#
# Purpose: block Edit|Write tool calls until the build-craft craft gate has
# passed phase p2 (the plan-grill phase) for the current run. Editing code
# before the plan has survived the grill is exactly the skip this prevents.
#
# Contract:
#   - The run directory comes from the BUILD_CRAFT_RUN_DIR environment
#     variable (see hooks/README.md).
#   - If BUILD_CRAFT_RUN_DIR is unset or empty, this hook is a no-op and
#     exits 0 immediately, so installing it never breaks unrelated work.
#   - If <run-dir>/gate-log.md contains a "p2 PASS" line (appended by
#     scripts/craft-gate.mjs on each successful p2 run), the edit is allowed.
#   - Otherwise the edit is denied the Claude Code way: a JSON object on
#     stdout with hookSpecificOutput.permissionDecision "deny", exit 0.
#
# Note on stdin: Claude Code delivers the hook payload on stdin as JSON.
# This script ignores that payload entirely — the allow/deny decision depends
# only on the gate log, never on which file is being edited.

# No `set -e`: every outcome below is an explicit, deliberate exit, and a
# failing grep is an expected branch (no PASS line found), not an error.

run_dir="${BUILD_CRAFT_RUN_DIR:-}"

# Safety property: no run dir configured means build-craft is not in play
# for this session, so allow everything and stay silent.
if [ -z "$run_dir" ]; then
    exit 0
fi

gate_log="$run_dir/gate-log.md"

# craft-gate.mjs appends lines of the form:
#   p2 PASS <ISO-8601 timestamp>
# Anchoring to the start of the line avoids matching prose that merely
# mentions "p2 PASS" in passing.
if [ -f "$gate_log" ] && grep -q '^p2 PASS ' "$gate_log"; then
    exit 0
fi

# Deny. The reason names the fix verbatim so the model (or the user) can run
# it and retry: gate the run dir through p2 first, which appends the
# "p2 PASS" line this hook looks for.
reason="build-craft: edits are blocked until the craft gate has passed phase p2 for this run. Fix: run the craft gate through p2 for the run dir first: node scripts/craft-gate.mjs --phase p2 --dir $run_dir — a successful run appends a 'p2 PASS' line to $gate_log, after which edits are allowed."

# The reason is embedded in a JSON string, so escape the two characters that
# could break out of it: backslash first, then double quote.
json_reason="${reason//\\/\\\\}"
json_reason="${json_reason//\"/\\\"}"

printf '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "%s"}}\n' "$json_reason"

# Claude Code expresses a PreToolUse deny via the JSON above with exit 0;
# a non-zero exit would be treated as a hook error, not a decision.
exit 0
