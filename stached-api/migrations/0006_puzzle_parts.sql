-- More than one puzzle on a date, to catch up after a missed day: each is a
-- part of its date (1, 2, …), played in that order. Every puzzle before this
-- was its date's only one, part 1.
alter table puzzles add column part int not null default 1;
alter table puzzles drop constraint puzzles_date_key;
alter table puzzles add unique (date, part);
