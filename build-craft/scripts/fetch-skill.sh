#!/usr/bin/env bash
# fetch-skill.sh — safely download an Agent Skill from a GitHub repo.
#
# Usage:
#   fetch-skill.sh <owner/repo> <skill-name> [--ref <tag|sha>] [--dest <dir>]
#
# What it does:
#   1. Resolves --ref (or the repo's default branch) to a commit SHA via the GitHub API.
#   2. Downloads the tarball for that SHA (never a floating branch).
#   3. Locates the skill directory (contains SKILL.md) and verifies frontmatter.
#   4. Scans for red-flag patterns (see references/skill-vetting.md).
#   5. Copies the skill to --dest (default: ~/.claude/skills/<skill-name>).
#
# It does NOT auto-approve the skill: red-flag hits are printed and you must
# review them before the copy happens with --force.

set -euo pipefail

die() { echo "error: $*" >&2; exit 1; }

REPO="${1:-}"; SKILL="${2:-}"
REF=""; DEST=""; FORCE=0
shift 2 2>/dev/null || die "usage: fetch-skill.sh <owner/repo> <skill-name> [--ref <tag|sha>] [--dest <dir>] [--force]"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)  REF="$2"; shift 2 ;;
    --dest) DEST="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    *) die "unknown flag: $1" ;;
  esac
done
[[ -n "$REPO" && -n "$SKILL" ]] || die "usage: fetch-skill.sh <owner/repo> <skill-name> [--ref <tag|sha>] [--dest <dir>] [--force]"
[[ "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || die "repo must look like owner/repo"
[[ "$SKILL" =~ ^[a-z0-9-]+$ ]] || die "skill name must be lowercase alphanumeric + hyphens"

command -v curl >/dev/null || die "curl is required"
command -v tar >/dev/null || die "tar is required"

# 1. Resolve ref -> SHA (pin everything; floating branches are findings)
if [[ -z "$REF" ]]; then
  REF=$(curl -fsSL "https://api.github.com/repos/$REPO" | grep -o '"default_branch": *"[^"]*"' | cut -d'"' -f4)
  [[ -n "$REF" ]] || die "could not determine default branch for $REPO"
  echo "no --ref given; using default branch '$REF' (will pin to its SHA)"
fi
SHA=$(curl -fsSL "https://api.github.com/repos/$REPO/commits/$REF" | grep -o '"sha": *"[^"]*"' | head -1 | cut -d'"' -f4)
[[ -n "$SHA" ]] || die "could not resolve ref '$REF' to a commit SHA"
echo "pinned: $REPO @ $SHA"

# 2. Download tarball for the pinned SHA
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$SHA" -o "$TMP/repo.tar.gz" \
  || die "tarball download failed"
tar -xzf "$TMP/repo.tar.gz" -C "$TMP"
ROOT=$(find "$TMP" -maxdepth 1 -mindepth 1 -type d | head -1)

# 3. Locate the skill dir (SKILL.md at depth <= 3, dir name == skill name)
SKILLDIR=$(find "$ROOT" -maxdepth 3 -type f -name SKILL.md -path "*/$SKILL/SKILL.md" | head -1 | xargs -r dirname)
[[ -n "$SKILLDIR" ]] || die "no directory named '$SKILL' containing SKILL.md found in $REPO@$SHA"

# 4. Verify frontmatter: name present, matches dir, description present
python3 - "$SKILLDIR/SKILL.md" "$SKILL" <<'EOF'
import re, sys
path, expected = sys.argv[1], sys.argv[2]
text = open(path).read()
m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
if not m: sys.exit("SKILL.md has no YAML frontmatter")
fm = m.group(1)
name = re.search(r'^name:\s*["\']?([^"\'\n]+)["\']?', fm, re.M)
desc = re.search(r'^description:\s*["\']?(.+?)["\']?\s*$', fm, re.M)
if not name or not desc: sys.exit("frontmatter missing name or description")
if name.group(1).strip() != expected:
    sys.exit(f"frontmatter name '{name.group(1).strip()}' != directory '{expected}'")
if not (1 <= len(desc.group(1).strip()) <= 1024):
    sys.exit("description must be 1-1024 chars")
print(f"frontmatter OK: name='{expected}'")
EOF

# 5. Red-flag scan (context required — hits are warnings, not verdicts)
echo "--- red-flag scan ---"
FLAGS=0
scan() { grep -rEn "$1" "$SKILLDIR" 2>/dev/null || true; }
HITS=$( { scan 'curl[^|]*\|\s*sh\b|wget[^|]*\|\s*sh\b';
          scan 'base64\s+(-d|--decode)|eval\(|exec\(|os\.system|subprocess\.(call|run|Popen)';
          scan '\.ssh|\.aws/credentials|authorized_keys|\.bashrc|\.zshrc|crontab';
          scan '169\.254\.169\.254|metadata\.google\.internal'; } )
if [[ -n "$HITS" ]]; then
  echo "$HITS"; FLAGS=1
  echo "---"
  echo "red-flag pattern(s) found above. Review them per references/skill-vetting.md."
  [[ $FORCE -eq 1 ]] || die "aborting install; re-run with --force after manual review"
else
  echo "no red-flag patterns found"
fi

# 6. Install
DEST="${DEST:-$HOME/.claude/skills/$SKILL}"
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -r "$SKILLDIR" "$DEST"
echo "installed $SKILL ($REPO @ $SHA) -> $DEST"
echo "reminder: re-verify on every update; the payload can change server-side."
