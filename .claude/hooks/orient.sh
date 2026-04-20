#!/usr/bin/env bash
# orient.sh — UserPromptSubmit hook. Prints a compact status block on every
# user-turn so I always have orientation: current branch, batch progress,
# CI state, open PRs. Stdout is appended to the user message context per
# Claude Code hook contract.
#
# Designed to be fast (~200ms cap) — no `gh pr view` per-PR, no `pnpm test`.
# Bash + git + jq + a single `gh pr list` call.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STATE_FILE="$REPO_ROOT/.claude/state/task-batch/batch-20260421-act3.json"

echo "## Petitio Principii — Act III status"
echo ""

# 1. Branch + sync
branch=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || echo "?")
ahead=$(git -C "$REPO_ROOT" rev-list --count origin/"$branch"..HEAD 2>/dev/null || echo "?")
behind=$(git -C "$REPO_ROOT" rev-list --count HEAD..origin/"$branch" 2>/dev/null || echo "?")
echo "- branch: \`$branch\` (ahead: $ahead, behind: $behind)"

# 2. Batch state
if [ -f "$STATE_FILE" ]; then
  done_count=$(jq '.completed | length' "$STATE_FILE" 2>/dev/null || echo "?")
  pending_count=$(jq '.pending | length' "$STATE_FILE" 2>/dev/null || echo "?")
  current=$(jq -r '.current_task_id // "none"' "$STATE_FILE" 2>/dev/null || echo "?")
  total=$((done_count + pending_count))
  echo "- batch: $done_count/$total done, current: $current"
fi

# 3. Local verify recency — was last verify run successful?
LAST_VERIFY="$REPO_ROOT/.claude/state/last-verify.txt"
if [ -f "$LAST_VERIFY" ]; then
  echo "- last verify: $(cat "$LAST_VERIFY" 2>/dev/null | head -1)"
fi

# 4. CI on the active branch (if it's act3/v1 — else skip to keep this fast)
if [ "$branch" = "act3/v1" ]; then
  ci=$(gh run list --branch act3/v1 --workflow ci.yml --limit 1 --json status,conclusion 2>/dev/null | jq -r '.[0] | "\(.status) (\(.conclusion // "—"))"' 2>/dev/null || echo "unknown")
  echo "- CI on act3/v1: $ci"
fi

# 5. Open PRs (count only — full list on demand)
open_prs=$(gh pr list --state open --json number 2>/dev/null | jq 'length' 2>/dev/null || echo "?")
echo "- open PRs: $open_prs (PR #8 is the unified Act III PR)"

# 6. Untracked drift in the working tree (excluding gitignored)
dirty=$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$dirty" != "0" ]; then
  echo "- working tree: $dirty uncommitted changes"
fi

echo ""
exit 0
