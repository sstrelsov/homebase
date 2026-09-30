#!/bin/bash
# Installs Stached's LaunchDaemons on the Studio so Postgres, the API, the
# Cloudflare tunnel and the nightly backup start at boot with nobody logged in
# (a FileVault reboot leaves the Studio at the login window). Safe to re-run
# after changing this file:
#   ssh -t personal-studio 'sudo ~/dev/homebase/stached-api/ops/install-daemons.sh'
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run with sudo." >&2; exit 1; }

U=sstrelsov-personal
H=/Users/$U
C=$H/.config/stached
PG=/opt/homebrew/opt/postgresql@17/bin
DATA=/opt/homebrew/var/postgresql@17

plist() { # label, program arguments (<string> lines), extra keys
  cat >"/Library/LaunchDaemons/$1.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$1</string>
  <key>UserName</key><string>$U</string>
  <key>ProgramArguments</key>
  <array>
$2
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$PG:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>LC_ALL</key><string>en_US.UTF-8</string>
  </dict>
  <key>StandardOutPath</key><string>$C/$1.log</string>
  <key>StandardErrorPath</key><string>$C/$1.log</string>
$3
</dict>
</plist>
PLIST
  chown root:wheel "/Library/LaunchDaemons/$1.plist"
  chmod 644 "/Library/LaunchDaemons/$1.plist"
}

KEEP='  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>'

LABELS="postgres api tunnel backup"
for name in $LABELS; do launchctl bootout "system/me.strelsov.stached.$name" 2>/dev/null || true; done
# Stopgap tmux sessions, and any Postgres that launchd didn't start (closing
# tmux doesn't stop Postgres), give way to the daemons.
for s in stached-api stached-pg stached-tunnel; do
  sudo -u $U /opt/homebrew/bin/tmux kill-session -t $s 2>/dev/null || true
done
sudo -u $U $PG/pg_ctl -D $DATA stop -m fast 2>/dev/null || true
sleep 2

plist me.strelsov.stached.postgres \
"    <string>$PG/postgres</string>
    <string>-D</string><string>$DATA</string>" "$KEEP"

plist me.strelsov.stached.api \
"    <string>/opt/homebrew/bin/bun</string>
    <string>--env-file=$C/api.env</string>
    <string>server.ts</string>" "$KEEP
  <key>WorkingDirectory</key><string>$H/dev/homebase/stached-api</string>"

plist me.strelsov.stached.tunnel \
"    <string>/opt/homebrew/bin/cloudflared</string>
    <string>tunnel</string><string>--no-autoupdate</string><string>run</string>
    <string>--token-file</string><string>$C/tunnel-token</string>" "$KEEP"

# Nightly at 4am: dump the database (it holds the puzzle answers, so owner-only)
# and keep two weeks.
plist me.strelsov.stached.backup \
"    <string>/bin/bash</string><string>-c</string>
    <string>umask 077; set -o pipefail; pg_dump -d stached | gzip &gt; $H/backups/stached/stached-\$(date +%F).sql.gz &amp;&amp; find $H/backups/stached -name 'stached-*.sql.gz' -mtime +14 -delete</string>" \
'  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>0</integer></dict>'

for name in $LABELS; do
  if [ "$name" = tunnel ] && [ ! -s "$C/tunnel-token" ]; then
    echo "skipped me.strelsov.stached.tunnel (no $C/tunnel-token yet)"
    continue
  fi
  launchctl bootstrap system "/Library/LaunchDaemons/me.strelsov.stached.$name.plist"
  echo "started me.strelsov.stached.$name"
done
