# Stached

A daily Connections-style puzzle with a twist: one of the four groups is stache themed, and your **stache time** is how fast you find it. It lives at `https://spencerstrelsov.com/stached` (unlisted, password-gated) with a leaderboard at `/stached/leaderboard`.

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
| Game UI | `src/pages/Stached.tsx`, `src/stached/` (login, game, clock, leaderboard, dialogs, logo, styles) |
| API server | `stached-api/server.ts` (dependency-free Bun) |
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
- **The daily puzzle** is the newest one dated on or before today in New York.

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
```

Both run a throwaway Postgres (recreated every run), the API, and the site on this Mac, using the sample puzzle and the password `test` (override with `PUZZLES_FILE` and `STACHE_PASSWORD`). See the Testing on your phone section of `AGENTS.md` for details. For desktop-only work, run the API on port 3999 and `bun run dev`; Vite proxies `/stached-api` to it.

Checks: `bun run lint`, `bun run build`, and `cd stached-api && bunx tsc`.

## Deploying

- **The site:** merge to `main`. GitHub Actions builds and publishes to GitHub Pages.
- **The API:** `make deploy-stached` from the branch you want (normally `main`). It dumps the database first (`~/backups/stached/*-predeploy.sql.gz`), pulls that branch on the Studio, and restarts the API. The API applies any new migrations as it starts.

Deploy the API before merging a site change that needs a new endpoint. The old site keeps working against the new API.

## Database and migrations

Three tables: `users` (one per name, case-insensitive), `puzzles` (mirrors the puzzles file), and `plays` (one per player per puzzle: guesses, groups solved, mistakes, the clock, stache time, result). `schema_migrations` records which migrations ran.

To change the schema, add the next numbered file:

```sql
-- stached-api/migrations/0002_track_shuffles.sql
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
| Studio, `…-predeploy.sql.gz` | every `make deploy-stached` | until you delete it |
| This Mac, `~/Backups/stached/stached-YYYY-MM-DD.sql.gz` | daily at 10am, or on wake | 30 days |

The MacBook copy is the one that survives a dead Studio disk. `make stached-backup` pulls one on demand, and `make stached-backup-install` sets up the daily pull (a LaunchAgent that logs to `~/Backups/stached/pull.log`). Every pull is checked for a complete dump before it replaces anything. The dumps include the puzzle answers, so the backup folders are owner-only.

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
- These limits count per connection, so a crowd on one Wi-Fi shares them.

## Troubleshooting

| Symptom | Look at |
|---|---|
| "Lost the signal" in the game | `https://api.spencerstrelsov.com/health`; on the Studio, `launchctl print system/me.strelsov.stached.api` and `~/.config/stached/me.strelsov.stached.api.log` |
| API up, public URL down | the tunnel log, `…stached.tunnel.log` |
| API won't start | the API log: a failing migration, a broken `puzzles.json`, or Postgres down (`…stached.postgres.log`) |
| Everyone signed out | `SESSION_SECRET` changed, or the database was reset |
| Someone stuck at "Wrong password" | the password is exact and case-sensitive |
