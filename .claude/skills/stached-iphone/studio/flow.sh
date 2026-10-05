#!/bin/bash
# The whole Stached flow on the iPhone, checked at every step, with a
# screenshot per step in shots/. Stops at the first step that doesn't land.
# Needs a fresh iPhone (`sim erase`): iOS keeps one home-screen app per site.
#   flow.sh [url]   default: the tester
set -u
cd /tmp/stached-sim
# The tester, at this Mac's name on the tailnet.
URL=${1:-https://$(/opt/homebrew/bin/tailscale status --self --json |
  python3 -c 'import json, sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))'):8444/stached/}
U=$(cat udid)
w() { python3 w.py "$@"; }
shot() { w shot "$1" >/dev/null; echo "ok $1"; }
# Waits for a label on screen, or stops with a screenshot of what's there.
need() {
  for _ in $(seq "${2:-10}"); do w labels | grep -qE "$1" && return 0; sleep 1; done
  w shot fail >/dev/null; echo "FAILED: no /$1/ on screen (shots/fail.png)"; w labels | head -15; exit 1
}
# First-run system prompts: dictation, keyboard tips, saving the password.
dismiss() { for l in Continue "Not Now" "Never for This Website"; do w click "$l" >/dev/null; done; }
# The page's fields by label: a bare text field is Safari's address bar.
field() { w click "type == 'XCUIElementTypeTextField' AND label == 'NAME'" 0 "predicate string" >/dev/null; }
secret() { w click "type == 'XCUIElementTypeSecureTextField' AND label == 'PASSWORD'" 0 "predicate string" >/dev/null; }

rm -f shots/*.png
xcrun simctl openurl "$U" "$URL"
need "LOG IN" 15; w click Cancel >/dev/null; w click Close >/dev/null; shot 01-signin
field; sleep 1; dismiss; field; sleep 1; w type Sim >/dev/null
need "TextField 'NAME' .*'Sim'"
secret; sleep 1; dismiss; secret; w type test >/dev/null
w click Done >/dev/null; sleep 1; w click "LOG IN" >/dev/null; sleep 3; dismiss
need "GET STACHED" 8; sleep 1; shot 02-dialog
# Safari's ⋯, its menu's Share, the sheet's View More, Add to Home Screen and
# Add. The sheets report their own coordinates, so these are screen points.
w tap 344 816 >/dev/null; need "Add to Bookmarks" 5; shot 03-menu
w tap 246 542 >/dev/null; sleep 3; shot 04-share
w tap 333 778 >/dev/null; sleep 3; shot 05-view-more
w tap 151 641 >/dev/null; sleep 3; shot 06-add
w tap 354 110 >/dev/null; need "Stached" 8; sleep 1; shot 07-home
W=~/Library/Developer/CoreSimulator/Devices/$U/data/Library/WebClips
echo "saved as: $(for c in $(ls "$W"); do plutil -extract URL raw "$W/$c/Info.plist"; done | sed -E 's/handoff=[A-Za-z0-9_-]+/handoff=<code>/')"
w click Stached >/dev/null; sleep 3; shot 08-app
need "Please turn on notifications" 12; sleep 1; shot 09-notify
w click "TURN ON NOTIFICATIONS" >/dev/null
for _ in $(seq 8); do t=$(w alert text); [ "$t" = "no such alert" ] || break; sleep 1; done
echo "iOS asks: $t" | head -1; shot 10-permission
# The Simulator can't subscribe to Apple's push service, so it ends here.
w alert accept >/dev/null; sleep 3; shot 11-allowed
