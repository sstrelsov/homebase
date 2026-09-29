create table if not exists users (
  id serial primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists users_name_key on users (lower(name));

-- Mirrors puzzles.json, synced on every boot.
create table if not exists puzzles (
  id serial primary key,
  date date not null unique,
  groups jsonb not null
);

-- One play per player per puzzle. Guesses and solved groups are kept so a game
-- picks up where it left off; completed and stached_ms are the two scores.
-- active_ms is clock time while the board was on screen; active_since is when
-- the game last checked in, or null while the clock is paused. clock_at is the
-- device time of the last check-in, so a late pause can't undo a newer resume.
create table if not exists plays (
  id serial primary key,
  user_id int not null references users (id),
  puzzle_id int not null references puzzles (id) on delete cascade,
  started_at timestamptz not null default now(),
  guesses jsonb not null default '[]',
  solved jsonb not null default '[]',
  mistakes int not null default 0,
  stached_ms int,
  active_ms int not null default 0,
  active_since timestamptz,
  clock_at bigint,
  finished_at timestamptz,
  completed boolean,
  unique (user_id, puzzle_id)
);
