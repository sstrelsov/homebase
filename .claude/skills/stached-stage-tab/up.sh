#!/usr/bin/env bash
# Throwaway "live" (Postgres 5515, API 3915, Vite 5215) and "tester"
# (Postgres 5516, API 3916) stacks for this checkout, in $STATE. Claude is
# faked in the live API only. down.sh stops them.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(git -C "$HERE" rev-parse --show-toplevel)
STATE=${STATE:-${TMPDIR:-/tmp}/stached-stage-tab}
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
for port in 5515 3915 5215 5516 3916; do
  if lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is taken: is a check already running? ($HERE/down.sh)" >&2
    exit 1
  fi
done
rm -rf "$STATE/live" "$STATE/tester" && mkdir -p "$STATE/live" "$STATE/tester"
today=$(TZ=America/New_York date +%F)
day() { TZ=America/New_York date -v"$1"d +%F; }
for side in live:5515 tester:5516; do
  name=${side%%:*}; port=${side##*:}
  initdb -D "$STATE/$name/pg" -U postgres --auth=trust >/dev/null
  pg_ctl -D "$STATE/$name/pg" -l "$STATE/$name/postgres.log" -w -o "-p $port -k '' -c listen_addresses=localhost" start >/dev/null
  createdb -h localhost -p "$port" -U postgres stached
done
# Made-up puzzles: the live game has yesterday's, today's (its stache group
# second, not last) and tomorrow's, and a puzzle staged five days ago that
# was never confirmed. The tester has today's.
bun -e '
const [a, b] = await Bun.file(process.argv[1]).json();
const [y, t, n, old] = process.argv.slice(2);
const [g0, g1, g2, stache] = b.groups;
const today = { ...b, date: t, groups: [g0, stache, g1, g2] };
await Bun.write(process.argv[6], JSON.stringify([{ ...a, date: y }, today, { ...a, date: n }], null, 2));
await Bun.write(process.argv[7], JSON.stringify([{ ...a, date: old }], null, 2));
await Bun.write(process.argv[8], JSON.stringify([{ ...a, date: t }], null, 2));
' "$REPO/stached-api/puzzles.example.json" "$(day -1)" "$today" "$(day +1)" "$(day -5)" \
  "$STATE/live/puzzles.json" "$STATE/live/staged.json" "$STATE/tester/puzzles.json"
cat >"$STATE/tester/api.env" <<ENV
DATABASE_URL=postgres://postgres@localhost:5516/stached
STACHE_PASSWORD=test
ADMIN_NAME=admin
ADMIN_PASSWORD=admin
SESSION_SECRET=tester
PUZZLES_FILE=$STATE/tester/puzzles.json
ALLOWED_ORIGINS=http://localhost:5216
HOST=127.0.0.1
PORT=3916
ANNOUNCE_AT=00:00
STACHED_TESTER=1
ENV
cat >"$STATE/live/api.env" <<ENV
DATABASE_URL=postgres://postgres@localhost:5515/stached
STACHE_PASSWORD=test
ADMIN_NAME=admin
ADMIN_PASSWORD=admin
SESSION_SECRET=live
PUZZLES_FILE=$STATE/live/puzzles.json
ALLOWED_ORIGINS=http://localhost:5215
HOST=127.0.0.1
PORT=3915
TESTER_ENV=$STATE/tester/api.env
ANTHROPIC_API_KEY=fake-not-a-key
# Today's push isn't due yet, so its line can still be changed on the page.
ANNOUNCE_AT=23:59
$(cd "$REPO" && bun stached-api/cli.ts vapid-keys)
ENV
cd "$REPO/stached-api"
(set -a && . "$STATE/tester/api.env" && exec bun server.ts) >"$STATE/tester/api.log" 2>&1 &
echo $! >"$STATE/tester/api.pid"
(set -a && . "$STATE/live/api.env" && exec bun --preload "$HERE/fake-anthropic.ts" server.ts) >"$STATE/live/api.log" 2>&1 &
echo $! >"$STATE/live/api.pid"
cd "$REPO"
(STACHED_API_PORT=3915 exec node_modules/.bin/vite --host 127.0.0.1 --port 5215 --strictPort) >"$STATE/live/web.log" 2>&1 &
echo $! >"$STATE/live/web.pid"
for url in http://127.0.0.1:3915/health http://127.0.0.1:3916/health http://127.0.0.1:5215/stached-api/health; do
  curl -sf --retry 30 --retry-delay 1 --retry-all-errors "$url" >/dev/null
done
echo "Throwaway stacks up in $STATE"
