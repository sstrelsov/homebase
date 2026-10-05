-- How each game started, for the admin page: in the home-screen app or the
-- website, and on a device set to dark mode or light (its own setting, not
-- Stached's look). Null for games from before.
alter table plays
  add column home_screen boolean,
  add column dark boolean;
