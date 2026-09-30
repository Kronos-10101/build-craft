#!/usr/bin/env python3
"""check-skill.sh — validate a SKILL.md against the Agent Skills spec.

Usage: check-skill.sh <path-to-SKILL.md>

Checks (per https://agentskills.io/specification):
  - YAML frontmatter present, closed field allowlist
    (name, description, license, compatibility, metadata, allowed-tools)
  - name: 1-64 chars, lowercase alnum + hyphens, no leading/trailing/
    consecutive hyphens, matches parent directory name
  - description: 1-1024 chars, non-empty
  - compatibility: <=500 chars when present
  - body: warns if SKILL.md exceeds 500 lines (spec recommendation)

Self-contained: stdlib only.
"""
import os
import re
import sys

ALLOWED = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
NAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")


def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)


def main():
    if len(sys.argv) != 2:
        fail("usage: check-skill.sh <path-to-SKILL.md>")
    path = sys.argv[1]
    try:
        text = open(path, encoding="utf-8").read()
    except OSError as e:
        fail(f"cannot read {path}: {e}")

    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        fail("missing YAML frontmatter (--- ... ---) at top of file")
    fm, body = m.group(1), m.group(2)

    # Parse simple key: value frontmatter (one level, strings only)
    fields = {}
    for line in fm.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        kv = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not kv:
            fail(f"cannot parse frontmatter line: {line!r}")
        key, val = kv.group(1), kv.group(2).strip()
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        fields[key] = val

    unknown = set(fields) - ALLOWED
    if unknown:
        fail(f"unknown frontmatter field(s): {sorted(unknown)} (allowlist: {sorted(ALLOWED)})")
    for req in ("name", "description"):
        if req not in fields or not fields[req].strip():
            fail(f"required field '{req}' missing or empty")

    name = fields["name"].strip()
    if not (1 <= len(name) <= 64):
        fail("name must be 1-64 characters")
    if not NAME_RE.match(name) or "--" in name:
        fail("name must be lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens")
    parent = os.path.basename(os.path.dirname(os.path.abspath(path)))
    if name != parent:
        fail(f"name '{name}' must match parent directory name '{parent}'")

    desc = fields["description"].strip()
    if not (1 <= len(desc) <= 1024):
        fail("description must be 1-1024 characters")

    if "compatibility" in fields and len(fields["compatibility"]) > 500:
        fail("compatibility must be <= 500 characters")

    lines = text.count("\n") + 1
    if lines > 500:
        print(f"WARN: SKILL.md is {lines} lines; spec recommends < 500 (move detail to references/)")

    print(f"OK: '{name}' valid ({lines} lines, description {len(desc)} chars)")


if __name__ == "__main__":
    main()
