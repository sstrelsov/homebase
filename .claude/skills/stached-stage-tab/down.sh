#!/usr/bin/env bash
# Stops what up.sh started.
STATE=${STATE:-${TMPDIR:-/tmp}/stached-stage-tab}
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
for f in "$STATE"/live/*.pid "$STATE"/tester/*.pid; do
  [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null
  rm -f "$f"
done
for name in live tester; do pg_ctl -D "$STATE/$name/pg" stop -m fast >/dev/null 2>&1; done
echo "Stopped the throwaway stacks"
