---
name: stached-puzzles
description: >-
  Stage, play-test, publish, list and take down Stached puzzles with the puzzle
  CLI (scripts/stached), and handle the push notification each puzzle sends. Use
  whenever Spencer wants to add, write, check, schedule, preview, play-test,
  confirm, publish, fix, move, replace or remove a Stached puzzle, catch up on a
  missed day, or asks what's coming up, which day is next, whether today's push
  went out, or why a push didn't arrive. Trigger on "stage this puzzle", "new
  stached puzzle", "tomorrow's puzzle", "today's puzzle", "preview it on my
  phone", "confirm it", "publish it", "is it live", "did the notification go
  out", "VAPID keys", or a pasted set of four groups of four words.
---

# Stached puzzles

A puzzle goes live in two steps: **stage** it (checked, not live, and made
today's puzzle on the tester, so Spencer plays it in the tester's home-screen
app before anyone else), then **confirm** it (published, with one push
notification). The CLI does all of it; never edit `puzzles.json` by hand.
Puzzles are numbered in the order they go out, so a number sent in a push
never changes, unless a puzzle is taken down (`remove` moves every number
after it; putting it back puts them back).

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
| `list` | Every puzzle, in number order: number, date, status (today while it counts, out, upcoming, staged; "caught up" and its day out for a missed day's), games played, and its push (when it went out, none, or when it goes), then what's staged would do, push and all |
| `stage <file>` | Checks the puzzles in the file (one, or a list), stages them, replacing what was staged, and makes the first one's day today's on the tester, with every puzzle that comes out with it. `-` reads stdin |
| `preview [date]` | Makes a staged puzzle's day (the first's, or that date's) today's on the tester |
| `confirm` | Publishes everything staged, and sends a push that's due right away. The API picks it up without a restart |
| `remove <date>` | Takes a published puzzle down. Every puzzle after it moves down a number |
| `out <date> <day>` | Says a published missed day's puzzle came out on another day, to pair it with that day's. A dry run until you add `--apply`. It keeps every number that's out, every push and every game |
| `vapid-keys` | Prints a new pair of push keys for `api.env` |
| `push-again` | The tester only: sends today's push again, right away |

Put `--tester` first (`scripts/stached --tester list`) to drive the tester, the always-on test copy on the Studio (`make tester`), instead of the live game: its own puzzles, database and push, to try a change on a phone. Nothing done there reaches real players.

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
a line of text. Never write `out`: `confirm` sets it on a caught-up puzzle.

## Catching up on a missed day

When Spencer misses a day, he publishes it later, dated its own day: it comes
out the day it's confirmed, as one of that day's puzzles, and counts on the
leaderboard for 24 hours after its push, so it isn't late. Home says "2
puzzles today", with a row for each, and Next takes players from one to the
other, whichever they play first. What happens to the push depends on whether
that day's push has gone out:

- **Before it** (Saturday's, confirmed Sunday morning before 9:12): it shares
  Sunday's push, numbered after the day's own: Sunday's #17 keeps its number,
  and Saturday's is #18 ("Puzzles #17 and #18 are up", with Sunday's own
  line).
- **After it** (Monday's, confirmed Tuesday evening, once "Puzzle #13 is up"
  went out): `confirm` pushes it right away, on its own, as an extra: "Extra
  puzzle: #14 is up", with "Monday's missed puzzle. Tuesday's is still up
  too." (or its own `push` line). Tuesday's stays #13; Monday's is #14 and
  counts for 24 hours from its own push, on home all that time.
- **Just after midnight** (Wednesday's, confirmed at 12:21am Friday, while
  Thursday's, pushed at 11:31pm, still counts, and before Friday's is out): it
  comes out with Thursday's, a double header, and `confirm` pushes it right
  away: "Extra puzzle: #16 is up", "Wednesday's missed puzzle. Thursday's is
  still up too." Friday's own is then Friday's alone: "Puzzle #17 is up".

Only a missed day's push is an "Extra puzzle". A day's own is always "Puzzle
#17 is up", even after a missed day's push went out that day, and without its
own line it says "Friday's puzzle. Wednesday's is still up too." Every push
names puzzles by their own days, never "today's".

To file a missed day's published before the just-after-midnight rule with
the day it was meant for, `scripts/stached out <date> <day>` shows what
changes (a dry run), and `--apply` writes it. Only with Spencer's OK.

Stage it like any puzzle (with today's too, if that isn't published yet):

```bash
scripts/stached stage - <<'EOF'
{ "date": "2026-10-12", "groups": [ … ] }
EOF
```

`stage` says "A missed day: it comes out today, after #13.", its number, and
the push it goes out in, title and line. Read Spencer the push line before he
confirms. The tester gets the whole day, and its push is the one players will
get (an extra one, after today's push). Several missed days work the same way:
stage each, dated its own day. A missed day that's never filled in stays a
gap, an empty slot in the week.

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
   titles, push line, and when it goes live and pushes, then puts the first
   one on the tester as today's puzzle, sends its push there, and prints the
   tester's address and `Announced #N: 1 sent`.
3. Tell Spencer it's on the tester: he opens the tester's home-screen app and
   plays it (Tailscale on). Its notification, push line and all, has already
   gone out, on every staging. No need to poll `list`. Nothing played there
   reaches the live game. Restaging replaces it there and pushes again.
4. **Confirm only when Spencer says to:** `scripts/stached confirm`. It publishes
   to real players and sends a real push. If the push is due, it sends it on
   the spot and prints `Announced #N: … sent`. Read him those lines.
5. `scripts/stached list` to show where things stand.

## When the push goes out

Each puzzle is announced once, on the day it comes out, at **9:12am New York
time**, together with the others out that day:

- Confirmed the night before (or any day before): its push goes out at 9:12am
  on its date.
- Confirmed on its date after 9:12am (Spencer often finishes the day's puzzle
  during the day): it goes live and pushes right away, as `confirm` sends it.
  That includes just before midnight.
- A missed day's, caught up (above): with that day's 9:12 push if it's
  confirmed before it, or right away, on its own, as an "Extra puzzle", if
  it's confirmed after, or just after midnight with yesterday's.

A puzzle counts on the leaderboard for 24 hours after its own push, even once
the next day's is out, and stays on home all that time. So a puzzle pushed at
11pm still gives everyone a full day, and publishing the next one on time
doesn't cut it short.

The API checks every minute, `confirm` sends a due push itself, and both
record each puzzle in `announcements` before sending, so a puzzle never pushes
twice, even across restarts or if it's edited or published again.
The notification says "Puzzle #12 is up" ("Puzzles #17 and #18 are up" for
two out together, "Extra puzzle: #14 is up" for a missed day's after that
day's push), then the first puzzle's `push` line if it has one, or else a
random one of the quotes on home (any push but a day's own alone names the
days instead: "Monday's missed puzzle. Tuesday's is still up too."). When Spencer wants custom copy, put it in
`push` and stage again: a change to the line alone keeps everyone's games. It
only counts before the push goes out. iOS adds "from Stached" (the home-screen
app's name), which can't be turned off. Tapping it opens home, not the game,
so the stache clock waits for Play. To see who came from it, the admin page
counts the games started within 15 minutes of each puzzle's push by players
who had notifications on then. iOS doesn't tell the app a notification was
tapped, so that's the measure.

## Never delete games without asking

Changing or removing a puzzle that people have played deletes their games for
it. `confirm` and `remove` refuse, and say how many games are at stake, unless
you add `--delete-games`. Never add it on your own: tell Spencer the number and
let him decide. Changing a puzzle nobody has played yet is fine.

To move a puzzle to another date: stage it on the new date, confirm, then
`remove` the old date (which refuses if anyone has played it). Moving it
changes the numbers between the two dates, so only move one that hasn't
been pushed yet.

## Trying it without touching the live game

`make phone` writes its own settings to `.phone/api.env`, so the CLI can drive
the throwaway copy: `STACHED_ENV=.phone/api.env scripts/stached list`. There,
a puzzle's push goes out as soon as it's live (no waiting for 9:12). To see one
on a phone, run `make phone-preview` (only a build serves the home-screen app),
add its `/stached/` to the home screen, open it, turn on notifications when it
asks, then stage and confirm a made-up puzzle dated today.

## Troubleshooting

| Symptom | Look at |
|---|---|
| `list` says `any minute` for long | Is the API up (`https://api.spencerstrelsov.com/health`)? Without VAPID keys in `api.env` it logs "Push notifications are off" at start |
| `sent`, but a phone got nothing | The API log's `Announced #N: … sent, … gone, … failed` line. "gone" means that subscription was dropped (the app was deleted, say); its owner turns them on again. Notifications only reach the home-screen app, and only once they're turned on there and allowed |
| `stage` couldn't put it on the tester | It's staged anyway. The tester is down, usually after the Studio restarted: `make tester` brings it back, then `scripts/stached preview` |
| `stage` complains | It lists every problem at once; fix them all and stage again |
