---
name: stached-stage-tab
description: >-
  Check the Stage tab on /stached/admin end to end, headless, on throwaway
  live and tester stacks with Claude Haiku faked: paste, Organize and Cancel,
  editing, moving rows and the stache group, Stage (onto the tester, live
  untouched), Publish, and a push-line change that keeps a played puzzle's
  games. Use after any change to src/stached/stage/, the /admin endpoints,
  stached-api/puzzles.ts, schedule.ts or haiku.ts, or when asked to "test the
  Stage tab", "run the admin end to end", or "check staging and publishing".
---

# The Stage tab, end to end

```sh
.claude/skills/stached-stage-tab/check
```

It runs from this checkout (after `bun install`), takes about a minute, and
prints `ok` or `FAIL` for each check. It stops at the first failure with a
screenshot and always stops the stacks after. Screenshots go to
`$TMPDIR/stached-stage-tab/shots`.

- **Stacks:** `up.sh` starts a throwaway "live" game (Postgres 5515, API 3915,
  Vite 5215) and a "tester" (Postgres 5516, API 3916) from
  `puzzles.example.json`. The live API's `TESTER_ENV` points at the throwaway
  tester, so Stage never reaches the real one. It refuses to start if a port
  is taken. On the Studio these stay clear of the live game, `make phone` and
  the tester.
- **Claude:** `fake-anthropic.ts` is preloaded into the throwaway live API
  only. No key, no real call. Each answer comes back after 900ms, and each
  Organize answer's first title carries its call number ("Cookies 3"). That
  lets the flow tell which answer landed, and
  `grep "fake-anthropic call" $TMPDIR/stached-stage-tab/live/api.log` counts
  the calls. The dev server runs React's StrictMode, so a call made from an
  effect shows up twice.
- **Browser:** `flow.ts` drives headless Chromium at 390px through
  `playwright-core`, and `check` installs the matching headless shell. It
  never opens a window.

## What it checks

1. Coming up starts at today, even with an old staged puzzle.
2. Cancel mid-Organize drops the late answer. Organize, Cancel and Organize
   again lands only the last answer, with one call per tap.
3. A word Haiku invented comes back as an empty tile. Filling it clears the
   problems.
4. Moving a row and picking another stache group reorder the board, and
   Stage writes that order.
5. Stage puts the puzzle on the tester ("Staged, and on the tester"). The live
   file and live players' puzzle stay the same.
6. Publish writes it to the live file and unstages it.
7. Today's puzzle has its stache group second and a played game. Opening it is
   "Published, no changes". Changing only its push line publishes with no
   "Delete N games" tick, keeps the group order and the game, and updates
   Postgres.
8. No console errors.

## Comparing with older code

`KEEP_GOING=1` logs every failure instead of stopping. To see what a fix
changed, check out the old commit in a temporary worktree, symlink its
`node_modules` and `stached-api/node_modules` from this checkout, and run that
worktree's `check` with `KEEP_GOING=1`. Remove the worktree after.

## Traps

- The live API's `ANNOUNCE_AT` is 23:59, so today's push hasn't gone out and
  its line can still be edited. The page hides the push field once it has.
- If a run is killed, `down.sh` stops what's left.
