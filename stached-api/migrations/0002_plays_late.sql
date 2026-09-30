-- A game started after its puzzle's day, from Past games. Late games show in
-- the player's own history but don't count toward streaks or leaderboard times.
alter table plays add column if not exists late boolean not null default false;
