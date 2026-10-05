-- How each game started, for the admin page: in the home-screen app or the
-- website, on a device set to dark mode or light (Stached itself is light for
-- everyone), and whether from tapping its puzzle's push. Null for games from
-- before.
alter table plays
  add column home_screen boolean,
  add column dark boolean,
  add column from_push boolean;
