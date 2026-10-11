-- The day a puzzle came out, when that's after its date: a missed day's
-- puzzle, published with a later day's to catch up. Null for every other
-- puzzle, which comes out on its own date.
alter table puzzles add column out date;
