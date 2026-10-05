#!/bin/bash
# Stops WebDriverAgent and shuts the iPhone down; `down.sh delete` deletes it.
cd /tmp/stached-sim 2>/dev/null || exit 0
tmux kill-session -t stached-sim-wda 2>/dev/null
U=$(cat udid 2>/dev/null) || exit 0
xcrun simctl shutdown "$U" 2>/dev/null
[ "${1:-}" = delete ] && xcrun simctl delete "$U" && echo "deleted the iPhone"
echo "down"
