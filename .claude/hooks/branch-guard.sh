#!/usr/bin/env bash
# branch-guard.sh — PostToolUse hook on Bash. Blocks any direct push to main
# or to any non-act3/v1 branch the agent might accidentally create.
#
# Receives the tool input on stdin as JSON; we extract the command and
# inspect it. Exit non-zero with a stderr message to fail the tool call
# and surface the reason to the agent.

set -euo pipefail

# Read JSON from stdin (PostToolUse passes {tool_name, tool_input, tool_response}).
input=$(cat)

# Parse out the command. Bail silently on non-Bash tools.
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

# Allow pushes to act3/v1 explicitly. Block pushes to main, any release/* or
# hotfix/* branches. Any other branch is suspicious during Act III autonomy
# (we should be on act3/v1 only) — warn but don't block.
if echo "$cmd" | grep -qE "(push.*\bmain\b|push origin main|push.*HEAD:main|push.*HEAD:refs/heads/main)"; then
  echo "[branch-guard] BLOCKED: direct push to main detected. Per Act III discipline, all work goes through PR #8 on act3/v1." >&2
  exit 2
fi

exit 0
