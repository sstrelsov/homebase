# Stached

A daily Connections-style puzzle with a twist: one of the four groups is stache themed, and your **stache time** is how fast you find it. It lives at `https://spencerstrelsov.com/stached` (unlisted, password-gated).

| Page | Route |
|---|---|
| Home (logo, Leaderboard, Play, your week) | `/stached` |
| A day's game | `/stached/2026-09-30` (Play opens today's) |
| Past games | `/stached/past` |
| Leaderboard | `/stached/leaderboard` |

```
phone ──► spencerstrelsov.com/stached      GitHub Pages (this repo's src/)
   │
   └────► api.spencerstrelsov.com          Cloudflare (DNS, TLS, rate limit)
              │  Cloudflare Tunnel, outbound from the Studio
              ▼
          Mac Studio: Bun API on 127.0.0.1:3999 ──► Postgres 17 on 127.0.0.1:5432
```

## Where things live

| What | Where |
|---|---|
| Game UI | `src/pages/Stached.tsx` (the page and session), `src/stached/` (login, home, game, past games, clock, leaderboard, dialogs, logo, styles) |
| API server | `stached-api/server.ts` (dependency-free Bun) |
| Puzzle rules | `stached-api/puzzles.ts` (shared by the API and the puzzle CLI) |
| Leaderboard rules | `stached-api/leaderboard.ts` (the points so far and the week's squares, with tests) |
| Puzzle CLI | `stached-api/cli.ts`, run with `scripts/stached`; the `stached-puzzles` skill walks through it |
| Push notifications | `stached-api/push.ts` (who gets them, and when), `stached-api/webpush.ts` (encryption and signing), `public/stached/sw.js` (shows them), `src/stached/push.ts` and `src/stached/NotificationsDialog.tsx` (turning them on) |
| Link-preview card | `stached-api/card.ts` (draws it), `stached-api/card/` (its art, from `art.html`) |
| Home-screen app | `public/stached/manifest.json`, `public/images/stached-icon-v2-*.png` (from `art.html?icon`), `src/stached/HomeScreen.tsx` (the dialog that asks for it), `src/stached/IPhone.tsx` (the dialogs' drawings of an iPhone) |
| Database schema | `stached-api/migrations/*.sql`, applied by `stached-api/migrate.ts` |
| Studio services | `stached-api/ops/install-daemons.sh` |
| Backups to this Mac | `stached-api/ops/pull-backup.sh` |
| Real puzzles, password and push keys | on the Studio only, in `~/.config/stached/` (never in this public repo) |
| Sample puzzles for local testing | `stached-api/puzzles.example.json` (made up: one from before the bonus life, one from its first day) |

## How the game works

- **Sign in** with a name and the shared password. A name is a player: signing in as "Cat" again is the same player with the same history, and a typo makes a new one. Sign-ins last until the browser clears its storage (Safari does that after about a week of not opening the site).
- **One try per puzzle.** The server holds the answers, checks every guess, and saves the game, so reloading or switching phones picks up where you left off.
- **Four mistakes** end the game. Solving the stache group earns a **bonus life**, a fifth mustache in the lives row. Puzzles before 2026-10-02 have none, even played late (`BONUS_LIFE_FROM` in `stached-api/rules.ts`). Three right words out of four gets a "one away" hint.
- **Stache time** counts only while the board is on screen and the tab is in front. The game checks in every 5 seconds and sends a beacon when it hides; if a phone sleeps before it can say so, the gap counts for at most 15 seconds. The server keeps the real clock.
- **The leaderboard** counts every puzzle so far. On top, in a gold box, is **today's fastest stache**: the lowest stache time on a game finished today, solved or not, shared by everyone tied for it. Below it, **standings** give each player a square for each of the last seven puzzles: green for solved, red for missed, Gerald on that day's fastest stache, a dot for a day not finished while it counted, and a dashed square for a puzzle that still counts until it's finished. Players rank by points, one for each solve and one for each fastest stache, on every puzzle so far (the key beside "Standings" reads "green square +1, Gerald +1"), and ties share a place. So the points can be more than a row's squares show. Cat is always listed first, at #1, whatever her points. Everyone else ranks below her by points, and anyone tied with her for the most points shares #1. Only players with a finished game are listed, so not playing never ties a loss. Two or more puzzles solved in a row show under a name as a streak, which a puzzle that still counts doesn't break until you finish (or miss) it. The rules are `leaderboard.ts`, with tests; it reads only the puzzles out so far, by number and date, never their words.
- **Your week** sits under Play on home: your last seven puzzles in the leaderboard's squares, each under its weekday, in a strip that ends at today's and opens there. A dashed one still counts, so while yesterday's does, it's dashed beside today's. Swipe left for the days before, and past them "View all" opens Past games and the sliders open settings; once today's is out of view, a "Today →" chip slides back. Tap a day to open it.
- **Quotes** fill the rest of home, one at a time, rolling up on their own every 4 seconds (none with reduced motion on). A swipe either way moves them sooner, and the wait starts over. Each visit starts on a random one, and a push without its own line borrows one (`src/stached/quotes.json`).
- **Settings**: the sliders at the start of your week, left of "View all" (and Rules in a game), open how to play, a **Dark mode** switch (The look, below) and "Not Cat? Switch player".
- **The daily puzzle** is the newest one dated on or before today in New York; a day without a puzzle of its own keeps the last one. Puzzles are numbered by date (#1 is the first). A puzzle **counts** while it's the daily puzzle and for 24 hours after its push, even once the next one is out: one pushed at 11pm counts until 11pm the next day, so a late push still gives everyone a full day (`released()` in `server.ts`).
- **Notifications:** in the home-screen app, home asks to turn on a push for each new puzzle (Push notifications, below). In a browser tab, it asks you to add Stached to the home screen first (Home screen, below).
- **Past games** shows a tile per day so far. A finished day opens your board, the answers, and that day's scoreboard: solvers first, then misses, each by stache time. A missed day can be played any time after, and an unfinished one finished, but that game is marked **late** (started or guessed once its puzzle stops counting): it shows in your history and on that day's scoreboard (tagged late), and it never counts on the leaderboard (solves, fastest staches or streaks).

## The look

A 1984 TV-station ident: heavy italic caps, the four broadcast colors, Gerald, and an old TV's phosphor columns over everything. A puzzle word with a capital after a lowercase letter, like "BigX" or "iPhone", keeps its own case, since caps would make it read as "BIGX" (`Cased` in `src/stached/Game.tsx`). It comes two ways, sharing every rule:

- **Light** (the default): dark ink on cream paper. Glows give way to print: Gerald's red and blue fringes look like misregistered ink, and bars get a darker bottom edge like the buttons. The phosphor columns stay, two-tone (a dark line, then a faint light one), so the pixels show on the page, the bars and the black selected tiles alike. Bright gold can't be read on cream, so gold type, outlines and thin marks like today's weekday on the leaderboard (`--accent`) are a deep amber; gold fills stay gold. The leaderboard's green (`--green`) is deeper on paper too.
- **Dark**: warm phosphor cream on black, glowing.

`THEME` in `src/pages/Stached.tsx` is the look until a device picks its own with the Dark mode switch in settings, which that browser keeps (`stached.look` in local storage). Each look is a set of color tokens at the top of `src/stached/stached.module.css`, so style new things with the tokens, never a literal color, and check both. The home-screen app's launch and status-bar colors can't follow `THEME` or the switch (they're static, so in the app a dark device still gets a light strip behind the clock), and changing `THEME` also means switching `background_color` and `theme_color` in `public/stached/manifest.json`, and the `theme-color` and `apple-mobile-web-app-status-bar-style` that `vite.config.mts` writes into the Stached pages (`default` for light, `black` for dark). The link-preview card and the home-screen icon stay dark either way.

## Link previews

Pasting `https://spencerstrelsov.com/stached` shows a card: Gerald, the title, today's puzzle number and date (`#12 · WED, SEP 30`), and a glowing border in one of the logo's four colors (gold, orange, red, blue), the next one on every fetch.

- The site's static preview tags (written at build time, in `vite.config.mts`) point `og:image` at the API's `GET /card.png`. GitHub Pages can't vary a page by day, so the API draws the card, once a day in each color.
- `/card.png` is public, because chat apps fetch it signed out, and never cached, so every fetch is today's and takes the next color (a HEAD, which gets no picture, doesn't). It reads only today's puzzle number and date: never the words, and never a puzzle still to come.
- The score Share button stays text only, with no link, so a shared score doesn't unfurl into a card.
- Apps cache previews by link: pasting the same link again can bring back the card they fetched before (Slack keeps one for about 30 minutes). Change the link (`?1`, `?2`) for a fresh one.
- The art is `card/art.html`, drawn by a browser: Gerald, the bands, the title, and a sheet of letters for the date. `card.ts` sets the date, draws the border and lays an old TV's phosphor columns over it all (no fonts or image libraries on the server). Open `art.html` in Chrome to see the whole card. To change the art, edit it, start a Chrome with `--remote-debugging-port=9222`, and redraw `base.png`, `glyphs.png` and `glyphs.json` (and the home-screen icons, below) with `cd stached-api && bun card/make-art.ts http://127.0.0.1:9222`.

## Home screen

Stached saves to a phone's home screen as its own app: in Safari, Share (under ⋯ on iOS 26) → Add to Home Screen (under View More on iOS 26) → Add. It gets Gerald's icon and the name Stached, and opens full screen on the game, never the rest of the site.

- The Stached pages (written by `vite.config.mts`) swap the site's icon for `public/images/stached-icon-v2-180.png`, drop the site's manifest, and add the iOS home-screen tags. Then the page links Stached's own, `public/stached/manifest.json`, scoped to `/stached` (below, for why it waits). The rest of the site keeps its own.
- The icon is the logo's four bands on a slant, Gerald big across them, under the game's old-TV finish (glow, phosphor columns, dim corners). The slant keeps it reading as a TV ident, not a striped flag. The PNGs (180, 192 and 512 px) come from `card/art.html?icon`, drawn by `make-art.ts` with the card. iOS keeps the icon it saved, so a new one needs a new file name to reach anyone (bump the `v2` in `make-art.ts` and everything that names the files), and even then only on a fresh Add to Home Screen.
- In a browser tab, home asks in a dialog, "Get Stached on your home screen" (`src/stached/HomeScreen.tsx`), since on an iPhone only the home-screen app gets notifications. Safari can't tell whether it's been added, so once closed, it asks again 3 days later. The day it last asked is kept on the device only. On Android (and desktop Chrome) its Add button is one tap: Chrome's own install prompt, and the installed app shares Chrome's storage, so you stay signed in. Chrome stops offering it once it's installed.
- iOS lets no page add itself, so on an iPhone or iPad the dialog draws the steps, in simplified drawings of Safari (`src/stached/IPhone.tsx`), not Apple's screenshots: on iOS 26, tap ⋯ then Share, then View More and Add to Home Screen; before iOS 26, tap Share, then Add to Home Screen. It picks by Safari's version in the user agent (`Version/26`), since iOS 26 freezes the iOS version there at 18. Adding it opens the home screen, so that's where the steps end. iOS also keeps a home-screen app's storage apart from Safari's, so while the dialog is up it carries the sign-in over: it asks the API for a one-time code (`POST /handoff`) and puts it in the start address of the manifest (`/stached/?handoff=…`), which iOS 26 saves the app with, and in the page's address, which older iOS saves instead. On the app's first launch, `src/pages/Stached.tsx` trades it for a session (`POST /handoff/redeem`, limited like sign-in) and clears it from the address. Closing the dialog takes the code back out of the address. Codes last 15 minutes, work once, and live in the API's memory. Only the home-screen app trades one, so a link shared by mistake signs no one in.
- Why the manifest waits: iOS 26 saves the app with the start address of the first manifest a page links, or, without one, the address the page loaded with (checked in the iOS Simulator). A manifest or address changed later is ignored. So a Stached page loads with no manifest and links one once (`linkManifest` in `HomeScreen.tsx`): when the dialog gets its code on iOS, a `data:` copy of `manifest.json` whose `start_url` carries it, and otherwise the file as it is, as the page opens.
- Without a code (expired, or added another way), the app's sign-in says to use the same name; streaks and games are kept by name, so nothing is lost.
- In the home-screen app, home asks for notifications instead (Push notifications, below), so the two dialogs never meet.

## Push notifications

Each puzzle sends one push to the home-screen apps that asked for it: "Puzzle #12 is up" as the title, then the puzzle's own `push` line (Puzzles, below) or, without one, a random one of the quotes on home. Tapping it opens home, not the game, so the stache clock waits for Play.

- **Turning them on:** in the home-screen app, home asks in a dialog, "Notifications: please turn on notifications for new games!", over a drawing of the push on a lock screen (`src/stached/NotificationsDialog.tsx`). On an iPhone only the home-screen app can get pushes (iOS 16.4 and later), and iOS asks permission only right after a tap, so its Turn on notifications button is that tap. Not now (or closing it) waits until the next day to ask again, kept on the device only; the app has no bell, so that's the next chance. Once they're on, or after a "Don't Allow", it never shows again, since only Settings can undo that. In a browser tab, home shows a bell to the left of Leaderboard instead, until notifications are on in that browser: desktop Chrome and Android can get pushes there, and iPhone Safari can't, so it never shows the bell. Stached has no off switch; iOS Settings → Notifications has one.
- **When:** at 9:12am New York time on the puzzle's date (`ANNOUNCE_AT`). A puzzle published on its date after that pushes within a minute, and one dated before today never does. The API checks every minute. A puzzle counts for 24 hours after its push, so a late one isn't cut short by the next day's (The daily puzzle, above).
- **Never twice:** the API records the date in `announcements` before sending, and only the first claim sends. A restart, a second API, or editing and republishing a puzzle can't repeat it.
- **Subscriptions** (`push_subscriptions`): one per browser, tied to the player who turned them on there. Home sends it again on every visit, so it survives a database reset and renews itself if the keys change. When a push service answers 404 or 410 (the app was deleted, say), it's dropped. The API only takes subscriptions from Apple's, Google's, Mozilla's and Microsoft's push services, so nobody can point it at another address.
- **Who it brings in:** the admin page counts a game as after the push when it started within 15 minutes of its puzzle's push (`announcements.sent_at`), by a player who had notifications on when it went out (a subscription from before `sent_at`). It's worked out from data the API already keeps, so it covers every game, past ones too. It can't tell a tap: iOS doesn't tell a home-screen app that its notification was tapped (on an iPhone, the service worker's `notificationclick` never ran, whether the app was open, in the background or closed), so someone who'd have played then anyway counts too.
- **The protocol** is standard Web Push with no dependencies: `webpush.ts` encrypts each message for its browser (RFC 8291) and signs a VAPID token (RFC 8292) with WebCrypto. Its test checks the encryption against RFC 8291's published example. The service worker is scoped to `/stached/` and has no fetch handler, so it changes nothing about how pages load.
- iOS adds "from Stached" (the home-screen app's name) under the title, and fills an empty title with "Stached" (an invisible one leaves a blank line). A web app can't turn either off, so the title is the puzzle.

### Push keys

The API signs pushes with a VAPID key pair from its environment. Without the keys, push is off: home never asks for them, and nothing is sent. To make them, on the Studio:

```bash
~/dev/homebase/scripts/stached vapid-keys >> ~/.config/stached/api.env
```

Then restart the API (`make deploy-stached`). The private key never leaves the Studio. New keys are fine later: each browser renews its subscription the next time it opens home. `make phone` makes throwaway keys for each run.

## Admin page

`/stached/admin` is for one player, the admin (`ADMIN_NAME`; Spencer on the live game). Only the admin's home links to it, and the API answers anyone else's `GET /admin` with a 404.

- **Signing in:** the admin's name takes `ADMIN_PASSWORD`, not the shared password, so no friend can sign in as them. The admin stays off the leaderboard and the day's scoreboard, but plays and gets pushes like anyone. The admin's sessions also depend on `ADMIN_PASSWORD`, so setting up the admin or changing that password signs the admin out everywhere, along with anyone who took the name with the shared password before.
- **What it shows:** how many players there are, how many played one of the last seven puzzles while it counted, how many have notifications on, and how many have started a game in the home-screen app. Then each puzzle: how many played and solved it while it counted, and how many played it late. Open a puzzle to see every finished game's share grid for it, to judge how hard it was, or open a player to see their grids across puzzles. Each game says how it started: in the home-screen app or the website, on a device in dark or light mode (the device's own setting, not Stached's look), and whether it started within 15 minutes of the push (Who it brings in, above), which each puzzle counts too. A player who has started a game in the app says "Home screen". It all comes from the games, push subscriptions and announcements: besides the game itself, each play keeps only those two facts (`plays.home_screen`, `plays.dark`), sent with `POST /start` and kept from its first start. Games from before don't have them. Nothing records visits.

## Puzzles

Puzzles live in `~/.config/stached/puzzles.json` on the Studio (mode 600), because this repo is public. Publish them with the puzzle CLI (below), not by hand. The format matches `puzzles.example.json`:

```json
[
  {
    "date": "2026-10-01",
    "groups": [
      { "title": "Easiest group", "words": ["A", "B", "C", "D"] },
      { "title": "…", "words": ["…", "…", "…", "…"] },
      { "title": "…", "words": ["…", "…", "…", "…"] },
      { "title": "Stached", "words": ["…", "…", "…", "…"], "stache": true }
    ],
    "push": "Optional: the line under the title in its push"
  }
]
```

- One puzzle per date, a title and four words per group, no word twice (ignoring case), no title twice, exactly one `"stache": true` group, at most five groups. The server refuses to start otherwise, and the CLI won't stage it.
- Non-stache groups are colored in file order (yellow, orange, red, blue), so list them easiest first.
- `push` is optional: the line under "Puzzle #12 is up" in its notification. Without it, the line is a random quote from home. It only matters until the push goes out, and changing it never touches anyone's games.
- Add upcoming days ahead of time; each goes live on its date.
- **Editing or removing a puzzle that people have played deletes their games for it.** Scores against old words wouldn't mean anything. The CLI refuses to unless you add `--delete-games`.

### The puzzle CLI

`scripts/stached` stages, previews and publishes puzzles (the code is `stached-api/cli.ts`, and the [`stached-puzzles`](../.claude/skills/stached-puzzles/SKILL.md) skill walks through it). It runs on the Studio with the API's settings. From this Mac it runs there over SSH, sending a puzzle file along. Publishing needs no deploy.

```bash
scripts/stached stage oct-2.json   # check it and stage it, not live (- reads stdin)
scripts/stached preview            # play it on your phone first
scripts/stached confirm            # publish it
scripts/stached list               # every puzzle: status, games, push
```

| Command | What it does |
|---|---|
| `stage <file>` | Checks one puzzle, or a list, with the server's rules, and stages it in `staged.json` next to `puzzles.json`, replacing what was staged. Says each puzzle's number, its push line, and when it goes live and pushes |
| `preview [date]` | Runs `make phone` on the Studio (ports 3998 and 8443) with just that staged puzzle, as today's, in a tmux session (`stached-preview`) that outlives your terminal. Prints the link and a QR code: Tailscale on, password `test`. Nothing played there reaches the live game. The first one installs the site's packages in the Studio's clone |
| `preview stop` | Stops it, as Ctrl-C would |
| `confirm` | Publishes what's staged: writes `puzzles.json` (keeping the old one as `puzzles.json.bak-…`), syncs Postgres as the API does when it starts, and stops the preview. The API serves it without a restart |
| `remove <date>` | Takes a published puzzle down |
| `list` | Every puzzle with its number, status (out, today, upcoming, staged), games, and push (sent, none, or when) |
| `vapid-keys` | Prints a new push key pair (Push keys, above) |

`confirm` and `remove` won't change or remove a puzzle anyone has played: they name it and its games, and stop. Add `--delete-games` to go ahead. A puzzle nobody has played can change freely. With `STACHED_ENV=.phone/api.env`, the CLI drives a `make phone` run instead of the live game, and with `--tester` first (`scripts/stached --tester list`), the tester (The tester, below).

## Local development

```bash
make phone          # play it on your phone over Tailscale (HTTPS), with a QR code
make phone-preview  # the same, with a production build, to test the link-preview card
make phone-live-data  # the same, starting from a copy of the live database and puzzles
```

All three run a throwaway Postgres (recreated every run), the API, and the site on this Mac, with the password `test` (override with `STACHE_PASSWORD`). The first two use the sample puzzles (override with `PUZZLES_FILE`). `phone-live-data` copies the live database and puzzles from the Studio into the owner-only `.phone` folder, so the leaderboard and past games look real. It's still a copy, so nothing you do there reaches the live game. Each run writes its settings, with throwaway push keys, to `.phone/api.env` for the puzzle CLI, and pushes as soon as a puzzle is live (`ANNOUNCE_AT=00:00`). See the Testing on your phone section of `AGENTS.md` for details. For desktop-only work, run the API on port 3999 and `bun run dev`; Vite proxies `/stached-api` to it. On the Studio the live API already has 3999, so pick another port there with `STACHED_API_PORT` (`STACHED_API_PORT=3998 make phone-preview`), which Vite's proxy follows; `make phone` refuses to start on a port that's taken.

The API reads its settings from the environment (on the Studio, `~/.config/stached/api.env`) and won't start without the first five:

| Variable | What |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `STACHE_PASSWORD` | the shared sign-in password |
| `SESSION_SECRET` | signs sign-in tokens; changing it signs everyone out |
| `PUZZLES_FILE` | path to the puzzles JSON |
| `ALLOWED_ORIGINS` | comma-separated site origins allowed to call the API |
| `HOST` | bind address, default `0.0.0.0`. `127.0.0.1` means behind the tunnel, so `CF-Connecting-IP` is trusted |
| `PORT` | default `3000` (`3999` on the Studio) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | the push key pair (Push keys, above). Without them, push is off |
| `ANNOUNCE_AT` | when a puzzle's push goes out on its date, New York time: default `09:12` |
| `ADMIN_NAME`, `ADMIN_PASSWORD` | the admin's name and their own password (Admin page, above). Set both or neither |
| `STACHED_TESTER` | set on the tester only (The tester, below), where the puzzle CLI's `push-again` sends today's push again and `preview` is off |

The site calls `https://api.spencerstrelsov.com` in production and `/stached-api` in dev; `VITE_STACHED_API` overrides either.

Checks: `bun run lint` (Biome, for the site and the API), `bun run build`, and `cd stached-api && bunx tsc && bun test`.

## The tester

`make tester` deploys the branch you're on, as it is on GitHub (`BRANCH=…` for another), to the tester: an always-on copy of Stached on the Studio, at `https://studio.<tailnet>.ts.net:8444/stached/` on your tailnet (it prints the address). Unlike `make phone`, it keeps its database, push keys and puzzles between deploys, so the home-screen app you add from it once stays signed in, keeps notifications on, and keeps its games. Try a change on your phone there before it ships.

- **Once:** open it on your phone (Tailscale on, password `test`), add it to the home screen as its dialog shows, open the app and turn on notifications when it asks. It's a separate app from the real one. Play as any name but `admin`, since the admin's own games stay off the admin page, and open the admin page (name `admin`, password `admin`) somewhere else, like this Mac.
- **Each change:** push the branch, `make tester`, and try it. The API applies the branch's new migrations as it starts. The tester's database keeps every migration it has run, even from a branch that never merges; reset it (below) if one gets in the way.
- **Pushes:** the tester pushes as soon as today's puzzle is live (`ANNOUNCE_AT=00:00`). Stage and confirm one with `scripts/stached --tester` (the same commands, on the tester's own puzzles and checkout, but no `preview`: confirm it and play it there, so the live game's preview keeps running), and `scripts/stached --tester push-again` sends today's push again within a minute, to try a tap as often as you like.
- **Where it lives:** its own clone at `~/dev/homebase-tester`, detached at the branch; its settings, puzzles, Postgres and logs in `~/.config/stached-tester/`; its API and site in the tmux sessions `stached-tester-api` and `stached-tester-web`, on ports 3997 and 5197 behind Tailscale Serve's `:8444`, with Postgres on 5497. None of it touches the live game.
- **After the Studio restarts,** run `make tester` again: tmux and the tester's Postgres don't start at boot.
- **To stop or reset it:** `ssh personal-studio 'tmux kill-session -t stached-tester-api; tmux kill-session -t stached-tester-web; /opt/homebrew/opt/postgresql@17/bin/pg_ctl -D ~/.config/stached-tester/pg stop; /opt/homebrew/bin/tailscale serve --https=8444 off'` stops it. To start over, then delete `~/.config/stached-tester` there and run `make tester`. That signs the home-screen app out, so sign in again; it renews its notifications on its own, as after any change of push keys.

## Deploying

- **The site:** merge to `main`. GitHub Actions builds and publishes to GitHub Pages.
- **The API:** `make deploy-stached` from the branch you want (normally `main`). It dumps the database first (`~/backups/stached/predeploy-*.sql.gz`), pulls that branch on the Studio, and restarts the API. The API applies any new migrations as it starts.

Deploy the API before merging a site change that needs a new endpoint. The old site keeps working against the new API.

Publishing a puzzle is not a deploy: the CLI writes the file and Postgres, and the running API serves it.

## Database and migrations

Five tables: `users` (one per name, case-insensitive), `puzzles` (mirrors the puzzles file, push lines too), `plays` (one per player per puzzle: guesses, groups solved, mistakes, the clock, stache time, result, whether it was played late, and how it started: home-screen app or website, dark or light mode, from the push or not), `push_subscriptions` (one per browser that turned them on), and `announcements` (each date whose push has gone out).

| Migration | What it did |
|---|---|
| `0001_initial.sql` | The schema as of 2026-09-30 |
| `0002_plays_late.sql` | `plays.late`, for games played after their day |
| `0003_push.sql` | `push_subscriptions` and `announcements`, for push notifications |
| `0004_puzzle_push.sql` | `puzzles.push`, a puzzle's own line for its push |
| `0005_plays_started.sql` | `plays.home_screen` and `plays.dark`, how each game started |

`schema_migrations` records which migrations ran. To change the schema, add the next numbered file:

```sql
-- stached-api/migrations/0004_track_shuffles.sql
alter table plays add column shuffles int not null default 0;
```

- Files apply in order, once each, each in its own transaction. A failing migration rolls back, and the API doesn't start until it's fixed.
- **Never edit a migration that has shipped.** Add a new one instead.
- Prefer additive changes (new columns with defaults, new tables). The deploy's backup is the undo button for anything else.
- Try a migration against a scratch copy first: restore a backup locally (below) and run `DATABASE_URL=… bun migrate.ts`.

## Backups and restore

| Copy | When | Kept |
|---|---|---|
| Studio, `~/backups/stached/stached-YYYY-MM-DD.sql.gz` | nightly at 4am | 14 days |
| Studio, `~/backups/stached/predeploy-YYYY-MM-DD-HHMM.sql.gz` | every `make deploy-stached` | until you delete it |
| This Mac, `~/Backups/stached/stached-YYYY-MM-DD.sql.gz` | daily at 10am, or on wake | 30 days |

The MacBook copy is the one that survives a dead Studio disk. `make stached-backup` pulls one on demand, and `make stached-backup-install` sets up the daily pull: a LaunchAgent that runs the main checkout's copy of the script (so update that checkout first, and a worktree can be deleted safely) and logs to `~/Backups/stached/pull.log`. Every pull is checked for a complete dump before it replaces anything. The dumps include the puzzle answers, so the backup folders are owner-only.

To restore on the Studio, stop the API so nobody plays mid-restore, then start it again:

```bash
ssh -t personal-studio
sudo launchctl bootout system/me.strelsov.stached.api
export PATH=/opt/homebrew/opt/postgresql@17/bin:$PATH
dropdb stached && createdb -O stached stached
gunzip -c ~/backups/stached/stached-2026-09-30.sql.gz | psql -d stached
sudo launchctl bootstrap system /Library/LaunchDaemons/me.strelsov.stached.api.plist
```

Restoring a dump from earlier the same day forgets that day's push, so the API sends it again. Restore after 9:12am only if that's all right.

To try a backup without touching production, restore it into a throwaway Postgres on any Mac (create a `stached` role first, since the dump assigns ownership to it).

## The Studio

Everything runs as `sstrelsov-personal` (`ssh personal-studio`), from a clone at `~/dev/homebase`, and listens only on 127.0.0.1.

- **Services:** LaunchDaemons `me.strelsov.stached.{postgres,api,tunnel,backup}` start at boot with nobody logged in. Install them, or re-install after changing `ops/install-daemons.sh`, with `ssh -t personal-studio 'sudo ~/dev/homebase/stached-api/ops/install-daemons.sh'`. FileVault is on, so after a reboot nothing starts until the disk is unlocked.
- **Files in `~/.config/stached/`** (all mode 600): `api.env` (the password, a generated session secret, the push keys, and settings), `puzzles.json`, `staged.json` (puzzles staged with the CLI) and its backups of `puzzles.json`, `tunnel-token`, and a log per service.
- **Postgres** is Homebrew's `postgresql@17`, with data in `/opt/homebrew/var/postgresql@17`. Local connections authenticate as the macOS user; the API uses its own password-protected `stached` role over TCP.
- **Health:** `curl -s http://127.0.0.1:3999/health` on the Studio, or `https://api.spencerstrelsov.com/health` from anywhere.

## Cloudflare

`spencerstrelsov.com` uses Cloudflare DNS (Porkbun is still the registrar). The GitHub Pages and Porkbun email-forwarding records are DNS-only, so Cloudflare doesn't touch the site or mail. The `stached` tunnel carries `api.spencerstrelsov.com` to `127.0.0.1:3999`. The tunnel is outbound only, so nothing on the Studio is exposed. A rate-limiting rule blocks more than 5 `/login` requests per 10 seconds from one IP.

## Security

- The password, the admin password, the real puzzles and the VAPID private key exist only on the Studio. Changing the password (edit `STACHE_PASSWORD` in `api.env`, then `make deploy-stached`) doesn't sign anyone out.
- Changing `SESSION_SECRET` signs everyone out, and changing `ADMIN_PASSWORD` signs the admin out. Deleting a player signs that player out.
- The API allows browsers only from the site's origins. It limits each client to 10 sign-ins and 180 other requests a minute, and caps request bodies at 16 KB. Behind the tunnel it identifies clients by Cloudflare's `CF-Connecting-IP`, which only the tunnel can set, because the API listens on loopback.
- These limits count per IP address, so a crowd on one Wi-Fi shares them.

## Troubleshooting

| Symptom | Look at |
|---|---|
| "Lost the signal" in the game | `https://api.spencerstrelsov.com/health`; on the Studio, `launchctl print system/me.strelsov.stached.api` and `~/.config/stached/me.strelsov.stached.api.log` |
| API up, public URL down | the tunnel log, `…stached.tunnel.log` |
| API won't start | the API log: a failing migration, a broken `puzzles.json`, or Postgres down (`…stached.postgres.log`) |
| Everyone signed out | `SESSION_SECRET` changed, or the database was reset |
| Someone stuck at "Wrong password" | the password is exact and case-sensitive |
| No push for today's puzzle | `scripts/stached list` (sent, none, or when); the API log's `Announced #N: … sent, … gone, … failed` line, or "Push notifications are off" at start (no keys) |
| Home doesn't ask for notifications | push only works in the home-screen app on iPhone. The app asks at most once a day, and never once they're on or after "Don't Allow" (iOS Settings → Notifications to undo). To see it again, delete the app and add it again from Safari. A browser tab shows a bell instead, where it can get pushes (desktop Chrome, Android) |
