#!/usr/bin/env bash
# The tester: an always-on copy of Stached on the Studio, on your tailnet, for
# trying a branch on your phone before it ships. `make tester` runs this there
# (over SSH) to deploy a branch: it sets up whatever's missing, checks the
# branch out, builds the site, and restarts the tester's API and site.
#
# Unlike `make phone`, it keeps everything between deploys: its database, its
# push keys and its puzzles, so the home-screen app you add once stays signed
# in, keeps notifications on, and keeps its games. It has its own checkout,
# settings, Postgres, ports and address, and never touches the live game.
#
# Settings and data live in ~/.config/stached-tester; the code it runs in
# ~/dev/homebase-tester. After the Studio restarts, run `make tester` again.
set -euo pipefail

main() {
  local branch="${1:?which branch?}"
  local repo=https://github.com/sstrelsov/homebase.git
  local tree="$HOME/dev/homebase-tester"
  local data="$HOME/.config/stached-tester"
  # Clear of the live API (3999) and Postgres (5432), and of a puzzle
  # preview (`make phone`: 3998, 5499, 5190 and 8443).
  local pg_port=5497 api_port=3997 web_port=5197 https_port=8444
  export PATH="/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/bin:$PATH"

  local host site
  host=$(tailscale status --self --json |
    bun -e 'console.log(JSON.parse(await Bun.stdin.text()).Self.DNSName.replace(/\.$/, ""))')
  site="https://$host:$https_port"

  # Its own checkout, at what the branch is on GitHub.
  [ -d "$tree" ] || git clone -q "$repo" "$tree"
  git -C "$tree" fetch -q origin "$branch"
  git -C "$tree" checkout -q --detach FETCH_HEAD
  echo "tester: $branch at $(git -C "$tree" log --oneline -1)"

  # First deploy: its settings, push keys, database and puzzles. Made-up
  # puzzles to start; stage more with `scripts/stached --tester`.
  if [ ! -f "$data/api.env" ]; then
    echo "tester: setting up $data"
    mkdir -p "$data" && chmod 700 "$data"
    initdb -D "$data/pg" -U postgres --auth=trust >/dev/null
    cp "$tree/stached-api/puzzles.example.json" "$data/puzzles.json"
    (umask 077 && cat >"$data/api.env") <<ENV
DATABASE_URL=postgres://postgres@localhost:$pg_port/stached
STACHE_PASSWORD=test
ADMIN_NAME=admin
ADMIN_PASSWORD=admin
SESSION_SECRET=$(openssl rand -hex 32)
PUZZLES_FILE=$data/puzzles.json
ALLOWED_ORIGINS=$site
HOST=127.0.0.1
PORT=$api_port
ANNOUNCE_AT=00:00
STACHED_TESTER=1
$(cd "$tree" && bun stached-api/cli.ts vapid-keys)
ENV
  fi

  pg_ctl -D "$data/pg" status >/dev/null ||
    pg_ctl -D "$data/pg" -l "$data/postgres.log" -w \
      -o "-p $pg_port -k '' -c listen_addresses=localhost" start >/dev/null
  createdb -h localhost -p "$pg_port" -U postgres stached 2>/dev/null || true

  echo "tester: building the site"
  (cd "$tree" && bun install --frozen-lockfile &&
    STACHED_SITE="$site" VITE_STACHED_API=/stached-api bun run build) \
    >"$data/build.log" 2>&1 || { tail -20 "$data/build.log" >&2; exit 1; }

  # The API applies any new migrations as it starts. Sourced, not
  # --env-file, so the file's settings win over the shell's.
  tmux kill-session -t stached-tester-api 2>/dev/null || true
  tmux kill-session -t stached-tester-web 2>/dev/null || true
  tmux new-session -d -s stached-tester-api -c "$tree/stached-api" \
    "set -a && . '$data/api.env' && exec bun server.ts >>'$data/api.log' 2>&1"
  tmux new-session -d -s stached-tester-web -c "$tree" \
    "STACHED_API_PORT=$api_port exec node_modules/.bin/vite preview --host 127.0.0.1 --port $web_port --strictPort >>'$data/web.log' 2>&1"
  tailscale serve --bg --https="$https_port" "http://127.0.0.1:$web_port" >/dev/null

  local i
  for i in $(seq 1 30); do
    curl -sf "http://127.0.0.1:$web_port/stached-api/health" >/dev/null && break
    [ "$i" = 30 ] && { echo "tester: didn't come up; see $data/api.log and web.log" >&2; exit 1; }
    sleep 1
  done
  echo "tester: up at $site/stached/"
  echo "  Tailscale on, password test (admin page: name admin, password admin)."
  echo "  Puzzles: scripts/stached --tester list"
}

main "$@"
