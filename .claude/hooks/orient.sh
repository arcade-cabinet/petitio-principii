#!/usr/bin/env bash
# orient.sh — UserPromptSubmit hook. Prints a compact status block on every
# user-turn so I always have orientation: current branch, batch progress,
# CI state, open PRs. Stdout is appended to the user message context per
# Claude Code hook contract.
#
# Designed to be fast (~200ms cap) — no `gh pr view` per-PR, no `pnpm test`.
# Bash + git + jq + a single `gh pr list` call.
#
# `set -e` is OFF here on purpose: the orient hook should never crash the
# user's prompt context. Each external call is guarded with `|| echo ?`.

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STATE_DIR="$REPO_ROOT/.claude/state/task-batch"
# Pick the freshest batch state file (modification time) so the hook works
# whether it's batch-20260421-act3.json today or batch-20260801-act4.json
# next quarter.
STATE_FILE="$(ls -t "$STATE_DIR"/batch-*.json 2>/dev/null | head -n 1)"

echo "## Petitio Principii — autonomy status"
echo ""

# 1. Branch + sync. `|| echo "?"` keeps the hook from aborting on a fresh
# clone where the upstream tracking ref doesn't exist yet.
branch=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || echo "?")
ahead=$(git -C "$REPO_ROOT" rev-list --count "origin/${branch}..HEAD" 2>/dev/null || echo "?")
behind=$(git -C "$REPO_ROOT" rev-list --count "HEAD..origin/${branch}" 2>/dev/null || echo "?")
echo "- branch: \`$branch\` (ahead: $ahead, behind: $behind)"

# 2. Batch state. Use jq's `// 0` fallback so `done_count`/`pending_count`
# are always numeric — `((total = ...))` would crash on "?" with set -e.
if [ -n "$STATE_FILE" ] && [ -f "$STATE_FILE" ]; then
  done_count=$(jq '(.completed | length) // 0' "$STATE_FILE" 2>/dev/null || echo 0)
  pending_count=$(jq '(.pending | length) // 0' "$STATE_FILE" 2>/dev/null || echo 0)
  current=$(jq -r '.current_task_id // "none"' "$STATE_FILE" 2>/dev/null || echo "?")
  total=$((done_count + pending_count))
  echo "- batch: $done_count/$total done, current: $current ($(basename "$STATE_FILE" .json))"
fi

# 3. Local verify recency.
LAST_VERIFY="$REPO_ROOT/.claude/state/last-verify.txt"
if [ -f "$LAST_VERIFY" ]; then
  echo "- last verify: $(head -1 "$LAST_VERIFY" 2>/dev/null || echo "?")"
fi

# 4. CI on the active branch (skip on main / detached HEAD to keep this fast).
if [ -n "$branch" ] && [ "$branch" != "?" ] && [ "$branch" != "main" ]; then
  ci=$(gh run list --branch "$branch" --workflow ci.yml --limit 1 --json status,conclusion 2>/dev/null \
       | jq -r '.[0] | "\(.status) (\(.conclusion // "—"))"' 2>/dev/null \
       || echo "unknown")
  echo "- CI on $branch: $ci"
fi

# 5. Open PRs (count only — full list on demand).
open_prs=$(gh pr list --state open --json number 2>/dev/null | jq 'length // 0' 2>/dev/null || echo "?")
echo "- open PRs: $open_prs"

# 6. Working-tree drift (untracked + modified, after gitignore).
dirty=$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ -n "$dirty" ] && [ "$dirty" != "0" ]; then
  echo "- working tree: $dirty uncommitted changes"
fi

echo ""
exit 0
