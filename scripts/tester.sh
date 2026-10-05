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

# All of it runs from main, on the last line: `make tester` sends this on
# stdin, so bash has read every line before any runs, and nothing it runs can
# read the rest as input.
main() {
  local branch="${1:?which branch?}"
  local repo=https://github.com/sstrelsov/homebase.git
  local tree="$HOME/dev/homebase-tester"
  local data="$HOME/.config/stached-tester"
  # Clear of the live API (3999) and Postgres (5432), and of
  # `scripts/stached preview` (3998, 5499, 5190 and 8443).
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

  # Each runs in its own tmux session, restarted in place (respawn-pane) once
  # the old one lets go of its port: killing a tmux server's last sessions and
  # starting new ones right away can catch the server shutting down ("server
  # exited unexpectedly"). The API applies any new migrations as it starts;
  # its settings are sourced, not --env-file, so they win over the shell's.
  run() { # run <session> <dir> <port> <command>
    local command="while nc -z 127.0.0.1 $3; do sleep 0.2; done; $4"
    if tmux has-session -t "=$1" 2>/dev/null; then
      tmux respawn-pane -k -t "=$1:" -c "$2" "$command"
    else
      tmux new-session -d -s "$1" -c "$2" "$command"
    fi
  }
  run stached-tester-api "$tree/stached-api" "$api_port" \
    "set -a && . '$data/api.env' && exec bun server.ts >>'$data/api.log' 2>&1"
  run stached-tester-web "$tree" "$web_port" \
    "STACHED_API_PORT=$api_port exec node_modules/.bin/vite preview --host 127.0.0.1 --port $web_port --strictPort >>'$data/web.log' 2>&1"
  tailscale serve --bg --https="$https_port" "http://127.0.0.1:$web_port" >/dev/null

  curl -sf --retry 30 --retry-delay 1 --retry-all-errors \
    "http://127.0.0.1:$web_port/stached-api/health" >/dev/null ||
    { echo "tester: didn't come up; see $data/api.log and web.log" >&2; exit 1; }
  echo "tester: up at $site/stached/"
  echo "  Tailscale on, password test (admin page: name admin, password admin)."
  echo "  Puzzles: scripts/stached --tester list"
}

main "$@"
