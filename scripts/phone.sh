#!/usr/bin/env bash
# `make phone`: play the site on your phone. Runs a throwaway Postgres, the
# Stached API, and the dev server, puts them behind Tailscale Serve (HTTPS,
# your tailnet only), and prints a QR code. Ctrl-C stops everything.
#
# `make phone-preview` (--preview) serves a production build instead, with its
# link-preview tags pointing at this Mac, so pasting the link into iMessage on
# the phone shows the real preview card.
#
# `make phone-live-data` (--live-data) starts from a copy of the live database
# and puzzles, pulled from the Studio, so the leaderboard and past games look
# real. It's still a throwaway copy: nothing you do reaches the live game.
set -euo pipefail
cd "$(dirname "$0")/.."
PREVIEW=""
LIVE=""
for arg in "$@"; do
  case "$arg" in
    --preview) PREVIEW=1 ;;
    --live-data) LIVE=1 ;;
    *) echo "phone: unknown option $arg" >&2; exit 2 ;;
  esac
done

PG_PORT=5499
API_PORT=3999 # vite.config.mts proxies /stached-api here
WEB_PORT=5190
HTTPS_PORT=8443
DATA=.phone
# A local-only password and puzzle; the real ones live on the Studio. Point
# PUZZLES_FILE at a private copy to test a real puzzle.
PASSWORD="${STACHE_PASSWORD:-test}"
PUZZLES="$PWD/${PUZZLES_FILE:-stached-api/puzzles.example.json}"
PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

for tool in bun node tailscale initdb pg_ctl createdb; do
  command -v "$tool" >/dev/null || { echo "phone: needs $tool" >&2; exit 1; }
done
if tailscale serve status --json 2>/dev/null | grep -q "\"$HTTPS_PORT\""; then
  echo "phone: Tailscale already serves :$HTTPS_PORT." >&2
  echo "       Free it with: tailscale serve --https=$HTTPS_PORT off" >&2
  exit 1
fi

host=$(tailscale status --self --json 2>/dev/null |
  bun -e 'console.log(JSON.parse(await Bun.stdin.text()).Self.DNSName.replace(/\.$/, ""))')
site="https://$host:$HTTPS_PORT"

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
  tailscale serve --https="$HTTPS_PORT" off >/dev/null 2>&1 || true
  pg_ctl -D "$DATA/pg" stop -m fast >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# A fresh database every run, so everyone gets a new try at the puzzle.
rm -rf "$DATA" && mkdir -p "$DATA" && chmod 700 "$DATA"
initdb -D "$DATA/pg" -U postgres --auth=trust >/dev/null
pg_ctl -D "$DATA/pg" -l "$DATA/postgres.log" -w \
  -o "-p $PG_PORT -k '' -c listen_addresses=localhost" start >/dev/null
createdb -h localhost -p "$PG_PORT" -U postgres stached

if [ -n "$LIVE" ]; then
  # The copy includes the puzzle answers, so it stays in the owner-only .phone
  # folder, which the next run deletes.
  echo "phone: copying the live database and puzzles from the Studio"
  ssh -o BatchMode=yes personal-studio \
    'set -o pipefail; /opt/homebrew/opt/postgresql@17/bin/pg_dump -d stached | gzip' >"$DATA/live.sql.gz"
  ssh -o BatchMode=yes personal-studio 'cat ~/.config/stached/puzzles.json' >"$DATA/puzzles.json"
  psql -q -h localhost -p "$PG_PORT" -U postgres -c "create role stached login"
  gunzip -c "$DATA/live.sql.gz" |
    psql -q -h localhost -p "$PG_PORT" -U postgres -v ON_ERROR_STOP=1 -d stached >/dev/null
  PUZZLES="$PWD/$DATA/puzzles.json"
fi

(
  cd stached-api
  DATABASE_URL="postgres://postgres@localhost:$PG_PORT/stached" \
    STACHE_PASSWORD="$PASSWORD" SESSION_SECRET=phone PUZZLES_FILE="$PUZZLES" \
    ALLOWED_ORIGINS="http://localhost:$WEB_PORT" PORT="$API_PORT" \
    exec bun server.ts
) &
if [ -n "$PREVIEW" ]; then
  echo "phone: building with link previews pointing at $site"
  STACHED_SITE="$site" VITE_STACHED_API=/stached-api bun run build >/dev/null
  node_modules/.bin/vite preview --host 127.0.0.1 --port "$WEB_PORT" --strictPort &
else
  node_modules/.bin/vite --host 127.0.0.1 --port "$WEB_PORT" --strictPort --logLevel warn &
fi

tailscale serve --bg --https="$HTTPS_PORT" "http://127.0.0.1:$WEB_PORT" >/dev/null 2>&1
# GitHub Pages serves the copy with link-preview tags at /stached/.
url="$site/stached${PREVIEW:+/}"

sleep 2
echo
bunx qrcode --small "$url"
echo "  $url"
echo "  Tailscale on, password $PASSWORD. Ctrl-C to stop."
wait
