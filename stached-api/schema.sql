create table if not exists users (
  id serial primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists users_name_key on users (lower(name));

-- Mirrors puzzles.json, upserted on every boot.
create table if not exists puzzles (
  id serial primary key,
  date date not null unique,
  groups jsonb not null
);

-- One play per player per puzzle. Guesses and solved groups are kept so a game
-- picks up where it left off; completed and stached_ms are the two scores.
create table if not exists plays (
  id serial primary key,
  user_id int not null references users (id),
  puzzle_id int not null references puzzles (id),
  started_at timestamptz not null,
  guesses jsonb not null default '[]',
  solved jsonb not null default '[]',
  mistakes int not null default 0,
  stached_ms int,
  finished_at timestamptz,
  completed boolean,
  unique (user_id, puzzle_id)
);
