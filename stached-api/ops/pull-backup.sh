#!/bin/bash
# Pulls a fresh dump of the Stached database from the Studio to this Mac, so a
# copy survives if the Studio's disk doesn't. Keeps 30 days. Run by the
# LaunchAgent `make stached-backup-install` sets up, or by `make stached-backup`.
set -euo pipefail

DEST="$HOME/Backups/stached"
mkdir -p "$DEST"
chmod 700 "$DEST" # the dump includes the puzzle answers

file="$DEST/stached-$(date +%F).sql.gz"
partial="$file.partial"
trap 'rm -f "$partial"' EXIT

ssh -o BatchMode=yes -o ConnectTimeout=20 personal-studio \
  'set -o pipefail; /opt/homebrew/opt/postgresql@17/bin/pg_dump -d stached | gzip' >"$partial"

# Keep it only if it's a whole dump: a dropped connection or a failed pg_dump
# leaves yesterday's copy in place instead.
gzip -dc "$partial" | tail -c 300 | grep -q "PostgreSQL database dump complete"
mv "$partial" "$file"
find "$DEST" -name 'stached-*.sql.gz' -mtime +30 -delete

echo "$(date '+%F %T') saved $file ($(du -h "$file" | cut -f1 | tr -d ' '))"
