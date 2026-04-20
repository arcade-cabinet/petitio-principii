#!/usr/bin/env bash
# verify-stamp.sh — PostToolUse hook on Bash. Whenever `pnpm verify` runs,
# capture status + test count + timestamp into .claude/state/last-verify.txt
# so the orient hook can surface "last verify: PASS Tests 132 passed @ ts".
#
# Reads tool input + response from stdin. Doesn't block anything; records.
#
# tool_response shape per Claude Code docs is loose — it can be a string
# (early SDK), or an object with `stdout`/`stderr`/`output` fields. We
# handle all three by stringifying whatever we get and grep-ing the joined
# blob.

set -euo pipefail

input=$(cat)

tool_name=$(printf '%s' "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")
if [ "$tool_name" != "Bash" ]; then exit 0; fi

cmd=$(printf '%s' "$input" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

case "$cmd" in
  *"pnpm verify"*|*"pnpm run verify"*) ;;
  *) exit 0 ;;
esac

# Coalesce every plausible field of tool_response into one string blob.
response=$(printf '%s' "$input" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
r = d.get('tool_response')
if r is None:
    print('')
elif isinstance(r, str):
    print(r)
elif isinstance(r, dict):
    parts = []
    for k in ('output', 'stdout', 'stderr', 'message'):
        v = r.get(k)
        if isinstance(v, str):
            parts.append(v)
    print('\n'.join(parts))
else:
    print(str(r))
" 2>/dev/null || echo "")

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STAMP="$REPO_ROOT/.claude/state/last-verify.txt"
mkdir -p "$(dirname "$STAMP")"

ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
status="UNKNOWN"
test_line=$(printf '%s' "$response" | grep -oE 'Tests +[0-9]+ +passed' | tail -1 || echo "")
if echo "$response" | grep -qE "ELIFECYCLE|Command failed|Error:|✘|FAIL"; then
  status="FAIL"
elif [ -n "$test_line" ]; then
  status="PASS"
fi

echo "$status $test_line @ $ts" > "$STAMP"
exit 0
