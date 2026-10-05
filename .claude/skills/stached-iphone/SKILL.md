---
name: stached-iphone
description: >-
  Test Stached on a real iPhone without a phone: an iPhone 17 in the iOS
  Simulator on the Mac Studio, driven from this Mac with WebDriverAgent, with a
  screenshot of every step. Use to check anything iOS-only before it reaches
  Spencer: Safari, Add to Home Screen, the home-screen app, the sign-in handoff,
  the notifications dialog and iOS's permission prompt, or to get real iPhone
  screenshots for a PR. Trigger on "simulate an iPhone", "test it on iOS",
  "on the simulator", "does it work in Safari", "add to home screen", "real
  iPhone screenshots", or any change to HomeScreen.tsx, NotificationsDialog.tsx,
  push.ts, the manifest or the handoff.
---

# Stached on a simulated iPhone

`sim`, next to this file, runs everything from this Mac. It copies `studio/`
to `/tmp/stached-sim` on the Studio and drives an iPhone 17 there (iOS 26.5,
Xcode's newest runtime) through WebDriverAgent, the XCUITest server Appium
uses, on port 8187. It never touches the live game; point it at the tester.

```bash
S=.claude/skills/stached-iphone/sim
$S flow           # the whole flow on the tester, screenshots to ./sim-shots
$S erase          # a fresh iPhone, before running the flow again
$S w labels       # what's on screen: type, label, center in points
$S w click "Not Now"; $S w tap 344 816; $S w type Sim; $S w shot name
$S down           # when you're done: stop WebDriverAgent, shut the iPhone down
```

`sim up` makes the iPhone once, boots it, and builds and starts WebDriverAgent:
about 2 minutes the first time, seconds after. `flow` runs `up` itself.

## The flow (`studio/flow.sh`)

Each step waits for what it expects on screen, or stops with
`shots/fail.png` and the labels it found. It does this:

1. Opens the tester in Safari and signs in as Sim (password `test`).
2. Waits for the home-screen dialog.
3. Goes ⋯ → Share → View More → Add to Home Screen → Add.
4. Prints the address iOS saved the app with, which should carry `?handoff=<code>`.
5. Opens the app, which should be signed in.
6. Waits for the notifications dialog, taps its button, and reads iOS's permission prompt.

It needs a fresh iPhone (`sim erase`), because a site's app can be added only once.

The Simulator can't subscribe to Apple's push service. Allowing leaves the
dialog up, and no subscription reaches the tester. Check pushes on Spencer's
phone (`make tester`, then `scripts/stached --tester push-again`).

## What bit, so it doesn't again

- **Restarting WebDriverAgent:** use `up.sh`. It waits for the
  `ServerURLHere` line in `wda.log`; don't poll in a loop. `test-without-building`
  needs an `.xctestrun`, and only `build-for-testing` writes one. `test`
  rebuilds from the cache in seconds, so `up.sh` uses that.
- **A fresh iPhone's first-run prompts** ("Enable Dictation?", the
  slide-to-type tip, Save Password?) swallow typing. `up.sh` turns the keyboard
  tip off, and the flow dismisses the rest (`Continue`, `Not Now`,
  `Never for This Website`).
- **Clicking "the first text field" types into Safari's address bar.** Target
  the page's fields by label: `type == 'XCUIElementTypeTextField' AND label == 'NAME'`.
- **Share sheets and system sheets report coordinates in their own window,**
  so a tap on an element's reported center misses and dismisses them. Tap
  screen points read off a screenshot: pixels ÷ 3 (1206×2622 is 402×874).
- **iOS keeps one home-screen app per site** and updates it in place. A second
  Add on the same origin changes nothing, so erase first, or use a new origin
  (port) for experiments.
- **The saved app's address** is in the Studio's
  `~/Library/Developer/CoreSimulator/Devices/<udid>/data/Library/WebClips/*.webclip/Info.plist`
  (`URL`). That's the ground truth for the handoff.
- **iOS 26 saves the app with** the `start_url` of the first manifest the page
  links, or else the address the page loaded with. A `replaceState` or a
  swapped manifest afterwards is ignored. A manifest inserted after a load that
  had none is honored. That's why Stached's pages ship no manifest
  (`linkManifest` in `src/stached/HomeScreen.tsx`).
- **Safari's own UI on iOS 26:** ⋯ holds Share, and the share sheet hides Add
  to Home Screen under View More. Adding goes straight to the home screen.
- **Share the Studio:** `ssh nxb-studio` always exits 0, so read the output.
  Leave other simulators (Houston's app-perf, the stock devices) and other
  tmux sessions alone. This skill owns only `stached-sim (iPhone 17)`, the
  tmux session `stached-sim-wda`, port 8187 and `/tmp/stached-sim`.
- **The console belongs to the `houston` account,** so there's no Simulator
  window to click. Everything is headless: `simctl` for boot and screenshots,
  and WebDriverAgent for taps and typing.

## Screenshots for a PR

Shrink them (`sips -s format jpeg --resampleWidth 603`) and commit them to
`pr-assets/<branch>` with `git hash-object`, `mktree`, `commit-tree` and
`push`, so the worktree isn't touched. Then embed them by commit SHA:
`<img src="https://raw.githubusercontent.com/sstrelsov/homebase/<sha>/<file>" width="200">`.

## Done

`sim down` stops WebDriverAgent and shuts the iPhone down, keeping it and the
build for next time. `sim delete` removes both and `/tmp/stached-sim`.
