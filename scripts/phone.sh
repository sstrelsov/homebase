#!/usr/bin/env bash
# `make phone`: play the site on your phone. Runs a throwaway Postgres, the
# Stached API, and the dev server, puts them behind Tailscale Serve (HTTPS,
# your tailnet only), and prints a QR code. Ctrl-C stops everything.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_PORT=5499
API_PORT=3999 # vite.config.mts proxies /stached-api here
WEB_PORT=5190
HTTPS_PORT=8443
DATA=.phone
PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

for tool in bun node tailscale initdb pg_ctl createdb; do
  command -v "$tool" >/dev/null || { echo "phone: needs $tool" >&2; exit 1; }
done
if tailscale serve status --json 2>/dev/null | grep -q "\"$HTTPS_PORT\""; then
  echo "phone: Tailscale already serves :$HTTPS_PORT." >&2
  echo "       Free it with: tailscale serve --https=$HTTPS_PORT off" >&2
  exit 1
fi

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
  tailscale serve --https="$HTTPS_PORT" off >/dev/null 2>&1 || true
  pg_ctl -D "$DATA/pg" stop -m fast >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# A fresh database every run, so everyone gets a new try at the puzzle.
rm -rf "$DATA" && mkdir -p "$DATA"
initdb -D "$DATA/pg" -U postgres --auth=trust >/dev/null
pg_ctl -D "$DATA/pg" -l "$DATA/postgres.log" -w \
  -o "-p $PG_PORT -k '' -c listen_addresses=localhost" start >/dev/null
createdb -h localhost -p "$PG_PORT" -U postgres stached

(
  cd stached-api
  DATABASE_URL="postgres://postgres@localhost:$PG_PORT/stached" \
    STACHE_PASSWORD=stache SESSION_SECRET=phone \
    ALLOWED_ORIGINS="http://localhost:$WEB_PORT" PORT="$API_PORT" \
    exec bun server.ts
) &
node_modules/.bin/vite --host 127.0.0.1 --port "$WEB_PORT" --strictPort --logLevel warn &

tailscale serve --bg --https="$HTTPS_PORT" "http://127.0.0.1:$WEB_PORT" >/dev/null 2>&1
host=$(tailscale status --self --json 2>/dev/null |
  bun -e 'console.log(JSON.parse(await Bun.stdin.text()).Self.DNSName.replace(/\.$/, ""))')
url="https://$host:$HTTPS_PORT/stached"

sleep 2
echo
bunx qrcode --small "$url"
echo "  $url"
echo "  Tailscale on, password stache. Ctrl-C to stop."
wait
