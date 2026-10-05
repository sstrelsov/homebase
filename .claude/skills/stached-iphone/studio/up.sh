#!/bin/bash
# The iPhone and its WebDriverAgent, on the Studio. Idempotent: it makes the
# iPhone once, boots it if it's off, and starts WebDriverAgent only if it
# isn't answering. `up.sh erase` wipes the iPhone first.
set -u
cd /tmp/stached-sim
NAME="stached-sim (iPhone 17)"
PORT=8187

U=$(xcrun simctl list devices | grep -F "$NAME (" | grep -oE '[0-9A-F-]{36}' | head -1)
if [ -z "$U" ]; then
  U=$(xcrun simctl create "$NAME" com.apple.CoreSimulator.SimDeviceType.iPhone-17 \
    "$(xcrun simctl list runtimes | grep -oE 'com\.apple\.CoreSimulator\.SimRuntime\.iOS-[0-9-]+' | tail -1)")
  echo "made $NAME ($U)"
fi
echo "$U" > udid
[ "${1:-}" = erase ] && { xcrun simctl shutdown "$U" 2>/dev/null; xcrun simctl erase "$U" && echo "erased"; }
if ! xcrun simctl list devices | grep -F "$U" | grep -q Booted; then
  xcrun simctl boot "$U" && xcrun simctl bootstatus "$U" >/dev/null && echo "booted"
  # First-run keyboard tips would swallow typing.
  xcrun simctl spawn "$U" defaults write com.apple.keyboard.preferences DidShowContinuousPathIntroduction -bool true
fi

curl -sf --max-time 2 "http://127.0.0.1:$PORT/status" >/dev/null && { echo "WebDriverAgent up"; exit 0; }
if [ ! -d wda ]; then
  mkdir -p wda && (cd wda && PATH=/opt/homebrew/bin:$PATH npm pack appium-webdriveragent --silent >/dev/null && tar xzf ./*.tgz)
fi
rm -f sid; : > wda.log
tmux kill-session -t stached-sim-wda 2>/dev/null
# `test` builds once (cached in wda/dd), installs the runner and serves.
tmux new-session -d -s stached-sim-wda "cd /tmp/stached-sim/wda/package && xcodebuild -project WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner -destination id=$U -derivedDataPath /tmp/stached-sim/wda/dd CODE_SIGNING_ALLOWED=NO USE_PORT=$PORT test > /tmp/stached-sim/wda.log 2>&1"
for _ in $(seq 300); do
  grep -q ServerURLHere wda.log && { echo "WebDriverAgent up"; exit 0; }
  grep -qE 'BUILD FAILED|TEST FAILED|Testing failed' wda.log && break
  sleep 1
done
echo "WebDriverAgent didn't start:"; grep -E 'error|FAILED' wda.log | tail -10
