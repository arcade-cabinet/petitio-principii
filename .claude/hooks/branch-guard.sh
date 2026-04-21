#!/usr/bin/env bash
# branch-guard.sh — PostToolUse hook on Bash. Blocks any push that would
# land on `main`, whether via explicit refspec (`git push origin main`,
# `git push origin HEAD:main`) or implicitly (`git push` while currently
# checked out on `main` / a tracking branch that pushes to `main`).
#
# Receives the tool input on stdin as JSON; extracts the command and
# inspects it. Exit non-zero with a stderr message to fail the tool call
# and surface the reason to the agent.

set -euo pipefail

input=$(cat)

tool_name=$(printf '%s' "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")
if [ "$tool_name" != "Bash" ]; then
  exit 0
fi

cmd=$(printf '%s' "$input" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Only check git push commands.
case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

# 1. Explicit "main" refspec in the push command.
if echo "$cmd" | grep -qE "(push[[:space:]]+([^|;&]*[[:space:]])?(origin[[:space:]]+)?main\b|push.*HEAD:main\b|push.*HEAD:refs/heads/main\b|push.*:main\b|push.*:refs/heads/main\b)"; then
  echo "[branch-guard] BLOCKED: explicit push to main detected. Per Act III discipline, all work goes through PR #8 on act3/v1." >&2
  exit 2
fi

# 2. Implicit push (no refspec). With Git's default `push.default = simple`,
# `git push` from branch X pushes X to its upstream. If the current branch
# is `main` OR its upstream resolves to `refs/heads/main` on origin, block.
# Skip refspec-style commands like `git push origin foo:bar`.
has_refspec=$(echo "$cmd" | grep -cE "push[[:space:]]+([^|;&]*[[:space:]])(\S+:\S+|\S+[[:space:]]+\S+)" || true)
if [ "$has_refspec" = "0" ]; then
  current_branch=$(git -C "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" branch --show-current 2>/dev/null || echo "")
  if [ "$current_branch" = "main" ]; then
    echo "[branch-guard] BLOCKED: implicit push from main detected (current branch). Switch to act3/v1 first." >&2
    exit 2
  fi
  upstream=$(git -C "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "")
  if [ "$upstream" = "origin/main" ]; then
    echo "[branch-guard] BLOCKED: branch '${current_branch}' tracks origin/main; implicit push would land on main." >&2
    exit 2
  fi
fi

exit 0
