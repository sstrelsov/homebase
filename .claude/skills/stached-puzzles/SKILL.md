---
name: stached-puzzles
description: >-
  Stage, play-test, publish, list and take down Stached puzzles with the puzzle
  CLI (scripts/stached), and handle the push notification each puzzle sends.
  Use whenever Spencer wants to add, write, check, schedule, preview, play-test,
  confirm, publish, fix, move, replace or remove a Stached puzzle, or asks what's
  coming up, which day is next, whether today's push went out, or why a push
  didn't arrive. Trigger on "stage this puzzle", "new stached puzzle",
  "tomorrow's puzzle", "today's puzzle", "preview it on my phone", "confirm it",
  "publish it", "is it live", "did the notification go out", "VAPID keys", or a
  pasted set of four groups of four words.
---

# Stached puzzles

A puzzle goes live in three steps: **stage** it (checked, not live), **preview**
it (Spencer plays it on his phone before anyone else), and **confirm** it
(published, with one push notification). The CLI does all of it; never edit
`puzzles.json` by hand.

## Where the data lives

- **The real puzzles live only on the Studio**, in `~/.config/stached/`:
  `puzzles.json` (published), `staged.json` (staged), and `api.env` (the
  password, the VAPID push keys, and the API's other settings). All mode 600.
- **This repo is public.** Real puzzles, the password and the keys never go in
  a commit, a PR, a test, an issue, or the repo's files, not even briefly. A
  puzzle you're drafting goes in a temp file outside the repo, or straight to
  stdin. For examples and tests, make up puzzles like
  `stached-api/puzzles.example.json`.

## Running the CLI

`scripts/stached <command>` from this repo. On the Studio it runs right there;
anywhere else it runs on the Studio over SSH (`personal-studio`) and sends a
puzzle file along. With no command it prints its help.

| Command | What it does |
|---|---|
| `list` | Every puzzle: number, date, status (out, today, upcoming, staged), games played, and its push (sent, none, or when) |
| `stage <file>` | Checks the puzzles in the file (one, or a list) and stages them, replacing what was staged. `-` reads stdin |
| `preview [date]` | Plays a staged puzzle (the first, or that date's) on Spencer's phone: `make phone` on the Studio with just that puzzle, as today's. Prints a link and a QR code |
| `preview stop` | Stops the preview |
| `confirm` | Publishes everything staged and stops the preview. The API picks it up without a restart |
| `remove <date>` | Takes a published puzzle down |
| `vapid-keys` | Prints a new pair of push keys for `api.env` |
| `push-again` | The tester only: sends today's push again within a minute |

Put `--tester` first (`scripts/stached --tester list`) to drive the tester, the always-on test copy on the Studio (`make tester`), instead of the live game: its own made-up puzzles, database and push, to try a change on a phone. It has no `preview`: confirm a puzzle and play it there. Nothing done there reaches real players.

## The puzzle format

```json
{
  "date": "2026-10-02",
  "groups": [
    { "title": "Easiest group", "words": ["A", "B", "C", "D"] },
    { "title": "Next", "words": ["E", "F", "G", "H"] },
    { "title": "Harder", "words": ["I", "J", "K", "L"] },
    { "title": "The stache group", "words": ["M", "N", "O", "P"], "stache": true }
  ],
  "push": "Optional: the line under the title in its push"
}
```

The server's rules, which `stage` checks: a real date, one puzzle per date,
every group titled with four words, no word twice (ignoring case), no title
twice, exactly one `"stache": true` group, and at most five groups. Non-stache
groups are colored in order, so list them easiest first. `push`, if given, is
a line of text.

## Helping Spencer publish a puzzle

1. Get the date and the groups. Ask which group is the stache group if it's not
   clear. Confirm the date: puzzles go live at midnight New York time on it.
2. Stage it from stdin, so nothing lands on disk on this Mac:
   ```bash
   scripts/stached stage - <<'EOF'
   { "date": "2026-10-02", "groups": [ … ] }
   EOF
   ```
   Fix whatever it reports and stage again. It prints each puzzle's number,
   titles, push line, and when it goes live and pushes.
3. Offer a preview: `scripts/stached preview`. Give Spencer the link it prints
   (Tailscale on, password `test`, any name). It runs in tmux on the Studio
   until `preview stop` or `confirm`. Nothing played there reaches the live game.
4. **Confirm only when Spencer says to:** `scripts/stached confirm`. It publishes
   to real players and sends a real push. Read him the line it prints.
5. `scripts/stached list` to show where things stand.

## When the push goes out

Each puzzle sends one push, on its date, at **9:12am New York time**:

- Confirmed the night before (or any day before): its push goes out at 9:12am
  on its date.
- Confirmed on its date after 9:12am (Spencer often finishes the day's puzzle
  during the day): it goes live right away, with its push within a minute.
- Dated before today: no push.

A puzzle counts on the leaderboard for 24 hours after its push, even once the
next day's is out. So a puzzle pushed at 11pm still gives everyone a full day,
and publishing the next one on time doesn't cut it short.

The API checks every minute and records each date in `announcements` before
sending, so a puzzle never pushes twice, even across restarts or if it's edited
or published again. The notification says "Puzzle #12 is up", then the
puzzle's `push` line if it has one, or else a random line from the crawl on
home. When Spencer wants custom copy, put it in `push` and stage again: a
change to the line alone keeps everyone's games. It only counts before the
push goes out. iOS adds "from Stached" (the home-screen app's name),
which can't be turned off. Tapping it opens home, not the game, so the stache
clock waits for Play. To see who came from it, the admin page counts the games
started within 15 minutes of each puzzle's push by players who had
notifications on then. iOS doesn't tell the app a notification was tapped, so that's the measure.

## Never delete games without asking

Changing or removing a puzzle that people have played deletes their games for
it. `confirm` and `remove` refuse, and say how many games are at stake, unless
you add `--delete-games`. Never add it on your own: tell Spencer the number and
let him decide. Changing a puzzle nobody has played yet is fine.

To move a puzzle to another date: stage it on the new date, confirm, then
`remove` the old date (which refuses if anyone has played it).

## Trying it without touching the live game

`make phone` writes its own settings to `.phone/api.env`, so the CLI can drive
the throwaway copy: `STACHED_ENV=.phone/api.env scripts/stached list`. There,
a puzzle's push goes out as soon as it's live (no waiting for 9:12). To see one
on a phone, run `make phone-preview` (only a build serves the home-screen app),
add its `/stached/` to the home screen, open it, tap the bell, then stage and
confirm a made-up puzzle dated today.

## Troubleshooting

| Symptom | Look at |
|---|---|
| `list` says `any minute` for long | Is the API up (`https://api.spencerstrelsov.com/health`)? Without VAPID keys in `api.env` it logs "Push notifications are off" at start |
| `sent`, but a phone got nothing | The API log's `Announced #N: … sent, … gone, … failed` line. "gone" means that subscription was dropped (the app was deleted, say); its owner taps the bell again. Notifications only reach the home-screen app, and only after its bell was tapped and allowed |
| `preview` didn't start | It prints the end of its log (`stached-preview.log` in the Studio's temp folder). Usually port 8443 or 3998 is taken, or `tailscale serve` was refused |
| `stage` complains | It lists every problem at once; fix them all and stage again |
