-- A puzzle's own line for its push notification (DayPuzzle.push), in place of
-- a random one from the crawl. Null for the usual random line.
alter table puzzles add column push text;
