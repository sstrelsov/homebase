-- Push notifications. One subscription per browser (its push service's
-- endpoint), tied to the player who turned notifications on there, and kept
-- until the push service says it's gone.
create table push_subscriptions (
  endpoint text primary key,
  user_id int not null references users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- A puzzle's date once its push has been claimed, so no puzzle is announced
-- twice, even after a restart or if it's edited or published again. Keyed by
-- date, not puzzle id, since editing a puzzle can replace its row.
create table announcements (
  date date primary key,
  sent_at timestamptz not null default now()
);
