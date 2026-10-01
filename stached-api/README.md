# Stached

A daily Connections-style puzzle with a twist: one of the four groups is stache themed, and your **stache time** is how fast you find it. It lives at `https://spencerstrelsov.com/stached` (unlisted, password-gated).

| Page | Route |
|---|---|
| Home (logo, Rules, Play) | `/stached` |
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
| Link-preview card | `stached-api/card.ts` (draws it), `stached-api/card/` (its art, from `art.html`) |
| Home-screen app | `public/stached/manifest.json`, `public/images/stached-icon-v2-*.png` (from `art.html?icon`) |
| Database schema | `stached-api/migrations/*.sql`, applied by `stached-api/migrate.ts` |
| Studio services | `stached-api/ops/install-daemons.sh` |
| Backups to this Mac | `stached-api/ops/pull-backup.sh` |
| Real puzzles and password | on the Studio only, in `~/.config/stached/` (never in this public repo) |
| Sample puzzle for local testing | `stached-api/puzzles.example.json` |

## How the game works

- **Sign in** with a name and the shared password. A name is a player: signing in as "Cat" again is the same player with the same history, and a typo makes a new one. Sign-ins last until the browser clears its storage (Safari does that after about a week of not opening the site).
- **One try per puzzle.** The server holds the answers, checks every guess, and saves the game, so reloading or switching phones picks up where you left off.
- **Four mistakes** end the game. Three right words out of four gets a "one away" hint.
- **Stache time** counts only while the board is on screen and the tab is in front. The game checks in every 5 seconds and sends a beacon when it hides; if a phone sleeps before it can say so, the gap counts for at most 15 seconds. The server keeps the real clock.
- **The leaderboard** ranks everyone by streak, then best stache time. A streak is puzzles solved in a row; today's puzzle doesn't break it until you finish (or miss) it. Each player also shows their best and average stache time, games solved, and a bar per day for the last seven puzzles.
- **The daily puzzle** is the newest one dated on or before today in New York; a day without a puzzle of its own keeps the last one. Puzzles are numbered by date (#1 is the first).
- **Past games** shows a tile per day so far. A finished day opens your board, the answers, and that day's scoreboard. A missed day can be played any time after, and an unfinished one finished, but that game is marked **late** (started or guessed after its day): it shows in your history and on that day's scoreboard (tagged late), and it never counts toward streaks or leaderboard times.

## The look

A 1984 TV-station ident: heavy italic caps, the four broadcast colors, Gerald, and an old TV's phosphor columns over everything. It comes two ways, sharing every rule:

- **Light** (the default): dark ink on cream paper. Glows give way to print: Gerald's red and blue fringes look like misregistered ink, and bars get a darker bottom edge like the buttons. The phosphor columns stay, two-tone (a dark line, then a faint light one), so the pixels show on the page, the bars and the black selected tiles alike. Bright gold can't be read on cream, so gold type, outlines and thin marks like the leaderboard's day bars (`--accent`) are a deep amber; gold fills stay gold.
- **Dark**: warm phosphor cream on black, glowing.

`THEME` in `src/pages/Stached.tsx` picks one for everyone; there's no switch on screen yet. Each look is a set of color tokens at the top of `src/stached/stached.module.css`, so style new things with the tokens, never a literal color, and check both. The home-screen app's launch and status-bar colors can't follow `THEME` (they're static), so switching it also means switching `background_color` and `theme_color` in `public/stached/manifest.json`, and the `theme-color` and `apple-mobile-web-app-status-bar-style` that `vite.config.mts` writes into the Stached pages (`default` for light, `black` for dark). The link-preview card and the home-screen icon stay dark either way.

## Link previews

Pasting `https://spencerstrelsov.com/stached` shows a card: Gerald, the title, today's puzzle number and date (`#12 · WED, SEP 30`), and a glowing border in one of the logo's four colors (gold, orange, red, blue), the next one on every fetch.

- The site's static preview tags (written at build time, in `vite.config.mts`) point `og:image` at the API's `GET /card.png`. GitHub Pages can't vary a page by day, so the API draws the card, once a day in each color.
- `/card.png` is public, because chat apps fetch it signed out, and never cached, so every fetch is today's and takes the next color (a HEAD, which gets no picture, doesn't). It reads only today's puzzle number and date: never the words, and never a puzzle still to come.
- The score Share button stays text only, with no link, so a shared score doesn't unfurl into a card.
- Apps cache previews by link: pasting the same link again can bring back the card they fetched before (Slack keeps one for about 30 minutes). Change the link (`?1`, `?2`) for a fresh one.
- The art is `card/art.html`, drawn by a browser: Gerald, the bands, the title, and a sheet of letters for the date. `card.ts` sets the date, draws the border and lays an old TV's phosphor columns over it all (no fonts or image libraries on the server). Open `art.html` in Chrome to see the whole card. To change the art, edit it, start a Chrome with `--remote-debugging-port=9222`, and redraw `base.png`, `glyphs.png` and `glyphs.json` (and the home-screen icons, below) with `cd stached-api && bun card/make-art.ts http://127.0.0.1:9222`.

## Home screen

Stached saves to a phone's home screen as its own app: in Safari, Share → Add to Home Screen. It gets Gerald's icon and the name Stached, and opens full screen on the game, never the rest of the site.

- The Stached pages (written by `vite.config.mts`) swap the site's icon and manifest for `public/images/stached-icon-v2-180.png` and `public/stached/manifest.json`, which is scoped to `/stached`, and add the iOS home-screen tags. The rest of the site keeps its own.
- The icon is the logo's four bands on a slant, Gerald big across them, under the game's old-TV finish (glow, phosphor columns, dim corners). The slant keeps it reading as a TV ident, not a striped flag. The PNGs (180, 192 and 512 px) come from `card/art.html?icon`, drawn by `make-art.ts` with the card. iOS keeps the icon it saved, so a new one needs a new file name to reach anyone (bump the `v2` in `make-art.ts` and everything that names the files), and even then only on a fresh Add to Home Screen.
- In a browser tab, home offers it once, ever: "Get Stached on your home screen" slides up from the bottom (`src/stached/HomeScreen.tsx`). On Android its Add button is one tap: Chrome's own install prompt, and the installed app shares Chrome's storage, so you stay signed in.
- iOS lets no page add itself, so a small tip points at Safari's Share button. iOS also keeps a home-screen app's storage apart from Safari's, so while the tip is up it carries the sign-in over: it asks the API for a one-time code (`POST /handoff`) and puts it in the address (`?handoff=…`), which the app is saved with. On the app's first launch, `src/pages/Stached.tsx` trades it for a session (`POST /handoff/redeem`, limited like sign-in) and clears it from the address. Codes last 15 minutes, work once, and live in the API's memory. Only the home-screen app trades one, so a link shared by mistake signs no one in. The manifest has no `start_url`, so the app keeps the address it was saved from.
- Without a code (expired, or added another way), the app's sign-in says to use the same name; streaks and games are kept by name, so nothing is lost.

## Puzzles

Puzzles live in `~/.config/stached/puzzles.json` on the Studio (mode 600), because this repo is public. The format matches `puzzles.example.json`:

```json
[
  {
    "date": "2026-10-01",
    "groups": [
      { "title": "Easiest group", "words": ["A", "B", "C", "D"] },
      { "title": "…", "words": ["…", "…", "…", "…"] },
      { "title": "…", "words": ["…", "…", "…", "…"] },
      { "title": "Stached", "words": ["…", "…", "…", "…"], "stache": true }
    ]
  }
]
```

- One puzzle per date, four words per group, no word twice, exactly one `"stache": true` group. The server refuses to start otherwise.
- Non-stache groups are colored in file order (yellow, orange, red, blue), so list them easiest first.
- Add upcoming days ahead of time; each goes live on its date.
- **Editing or removing a puzzle that people have played deletes their games for it.** Scores against old words wouldn't mean anything.

To change puzzles: `ssh personal-studio`, edit the file, then run `make deploy-stached` from this repo (it restarts the API, which re-reads the file).

## Local development

```bash
make phone          # play it on your phone over Tailscale (HTTPS), with a QR code
make phone-preview  # the same, with a production build, to test the link-preview card
make phone-live-data  # the same, starting from a copy of the live database and puzzles
```

All three run a throwaway Postgres (recreated every run), the API, and the site on this Mac, with the password `test` (override with `STACHE_PASSWORD`). The first two use the sample puzzle (override with `PUZZLES_FILE`). `phone-live-data` copies the live database and puzzles from the Studio into the owner-only `.phone` folder, so the leaderboard and past games look real. It's still a copy, so nothing you do there reaches the live game. See the Testing on your phone section of `AGENTS.md` for details. For desktop-only work, run the API on port 3999 and `bun run dev`; Vite proxies `/stached-api` to it. On the Studio the live API already has 3999, so pick another port there with `STACHED_API_PORT` (`STACHED_API_PORT=3998 make phone-preview`), which Vite's proxy follows; `make phone` refuses to start on a port that's taken.

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

The site calls `https://api.spencerstrelsov.com` in production and `/stached-api` in dev; `VITE_STACHED_API` overrides either.

Checks: `bun run lint` (Biome, for the site and the API), `bun run build`, and `cd stached-api && bunx tsc && bun test`.

## Deploying

- **The site:** merge to `main`. GitHub Actions builds and publishes to GitHub Pages.
- **The API:** `make deploy-stached` from the branch you want (normally `main`). It dumps the database first (`~/backups/stached/predeploy-*.sql.gz`), pulls that branch on the Studio, and restarts the API. The API applies any new migrations as it starts.

Deploy the API before merging a site change that needs a new endpoint. The old site keeps working against the new API.

## Database and migrations

Three tables: `users` (one per name, case-insensitive), `puzzles` (mirrors the puzzles file), and `plays` (one per player per puzzle: guesses, groups solved, mistakes, the clock, stache time, result, and whether it was played late).

| Migration | What it did |
|---|---|
| `0001_initial.sql` | The schema as of 2026-09-30 |
| `0002_plays_late.sql` | `plays.late`, for games played after their day |

`schema_migrations` records which migrations ran. To change the schema, add the next numbered file:

```sql
-- stached-api/migrations/0003_track_shuffles.sql
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

To try a backup without touching production, restore it into a throwaway Postgres on any Mac (create a `stached` role first, since the dump assigns ownership to it).

## The Studio

Everything runs as `sstrelsov-personal` (`ssh personal-studio`), from a clone at `~/dev/homebase`, and listens only on 127.0.0.1.

- **Services:** LaunchDaemons `me.strelsov.stached.{postgres,api,tunnel,backup}` start at boot with nobody logged in. Install them, or re-install after changing `ops/install-daemons.sh`, with `ssh -t personal-studio 'sudo ~/dev/homebase/stached-api/ops/install-daemons.sh'`. FileVault is on, so after a reboot nothing starts until the disk is unlocked.
- **Files in `~/.config/stached/`** (all mode 600): `api.env` (the password, a generated session secret, and settings), `puzzles.json`, `tunnel-token`, and a log per service.
- **Postgres** is Homebrew's `postgresql@17`, with data in `/opt/homebrew/var/postgresql@17`. Local connections authenticate as the macOS user; the API uses its own password-protected `stached` role over TCP.
- **Health:** `curl -s http://127.0.0.1:3999/health` on the Studio, or `https://api.spencerstrelsov.com/health` from anywhere.

## Cloudflare

`spencerstrelsov.com` uses Cloudflare DNS (Porkbun is still the registrar). The GitHub Pages and Porkbun email-forwarding records are DNS-only, so Cloudflare doesn't touch the site or mail. The `stached` tunnel carries `api.spencerstrelsov.com` to `127.0.0.1:3999`. The tunnel is outbound only, so nothing on the Studio is exposed. A rate-limiting rule blocks more than 5 `/login` requests per 10 seconds from one IP.

## Security

- The password and the real puzzles exist only on the Studio. Changing the password (edit `STACHE_PASSWORD` in `api.env`, then `make deploy-stached`) doesn't sign anyone out.
- Changing `SESSION_SECRET` signs everyone out. Deleting a player signs that player out.
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
