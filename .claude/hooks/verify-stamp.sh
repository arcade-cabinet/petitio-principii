#!/usr/bin/env bash
# verify-stamp.sh — PostToolUse hook on Bash. Whenever `pnpm verify` runs,
# capture exit code + test count + timestamp into .claude/state/last-verify.txt
# so the orient hook can surface "last verify: PASS 112 tests at HH:MM:SS".
#
# Reads tool input + response from stdin. Doesn't block anything; just records.

set -euo pipefail

input=$(cat)

tool_name=$(printf '%s' "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")
if [ "$tool_name" != "Bash" ]; then exit 0; fi

cmd=$(printf '%s' "$input" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Only stamp on `pnpm verify` (or pnpm run verify) — not on test:watch, not
# on other pnpm scripts.
case "$cmd" in
  *"pnpm verify"*|*"pnpm run verify"*) ;;
  *) exit 0 ;;
esac

response=$(printf '%s' "$input" | python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('tool_response',{}); print(r if isinstance(r,str) else r.get('output',''))" 2>/dev/null || echo "")

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STAMP="$REPO_ROOT/.claude/state/last-verify.txt"
mkdir -p "$(dirname "$STAMP")"

ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
status="UNKNOWN"
test_line=$(printf '%s' "$response" | grep -oE 'Tests +[0-9]+ +passed' | tail -1 || echo "")
if echo "$response" | grep -q "ELIFECYCLE\|Command failed\|Error:"; then
  status="FAIL"
elif [ -n "$test_line" ]; then
  status="PASS"
fi

echo "$status $test_line @ $ts" > "$STAMP"
exit 0
