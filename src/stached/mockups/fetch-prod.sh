#!/usr/bin/env bash
# Copies the live leaderboard into prod.local.json, so the mockups can show
# real players: today's puzzle number, the last 7 puzzles' dates and each
# game's result, never the words. Read-only on the Studio. The file (and its
# .tmp, if a run dies) is gitignored and owner-only, because this repo is
# public.
set -euo pipefail
cd "$(dirname "$0")"
umask 077
ssh -o BatchMode=yes personal-studio \
  'PGOPTIONS="-c default_transaction_read_only=on" /opt/homebrew/opt/postgresql@17/bin/psql -X -At -v ON_ERROR_STOP=1 -d stached' \
  >prod.local.json.tmp <<'SQL'
with released as (
  select id, to_char(date, 'YYYY-MM-DD') as date,
         row_number() over (order by date)::int as number
  from puzzles
  where date <= (now() at time zone 'America/New_York')::date
  order by puzzles.date desc
  limit 7
)
select json_build_object(
  'dates', (select coalesce(json_agg(date order by date), '[]') from released),
  'number', (select max(number) from released),
  'plays', (
    select coalesce(json_agg(json_build_object(
      'name', u.name,
      'date', r.date,
      'completed', case when p.finished_at is null then null else p.completed end,
      'stachedMs', p.stached_ms
    )), '[]')
    from plays p
    join users u on u.id = p.user_id
    join released r on r.id = p.puzzle_id
    where not p.late
  )
);
SQL
mv prod.local.json.tmp prod.local.json
echo "Wrote $(pwd)/prod.local.json"
