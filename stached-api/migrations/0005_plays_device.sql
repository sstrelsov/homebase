-- Where each game started: in the home-screen app or the website, and on a
-- device set to dark mode or light (Stached itself is light for everyone).
-- The admin page shows them. Null for games from before.
alter table plays add column home_screen boolean, add column dark boolean;
