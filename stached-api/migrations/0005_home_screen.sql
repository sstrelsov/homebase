-- When the player first opened Stached as a home-screen app (POST /home-screen),
-- so the admin page can say who has it. Only the first time is kept, never
-- each visit. Null until then.
alter table users add column home_screen_at timestamptz;
