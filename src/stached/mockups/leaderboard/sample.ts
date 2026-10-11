// Made-up players and games for the leaderboard mockups: three weeks of
// puzzles, ending on a Thursday, so this week is half played. Never real
// names, times or results: this repo is public. Cat's is the one real name,
// since the leaderboard keeps her at #1; her games here are made up too.
import type { Day, Game } from "../../../../stached-api/leaderboard";
import { addDays } from "../rules";
import { seeded } from "../sample";

/** A game, with what the leaderboard reads and what the mockups add. */
export interface Play extends Game {
  mistakes: number;
  /** Board time when it finished: the whole board, not just the stache. */
  solveMs: number | null;
  /** Minutes after midnight in New York, on the puzzle's date. */
  startedAt: number;
  /** Minutes after midnight in New York; null while still playing. */
  finishedAt: number | null;
}

/** A time of day, as minutes after midnight in New York. */
const at = (hour: number, minute: number) => hour * 60 + minute;

/** How far today has got: nobody finished, midday, or everyone. */
export type TodayState = "none" | "some" | "all";

/** The clock in New York for each: just after the push, midday, and late. */
export const NOW: Record<TodayState, number> = {
  none: at(9, 18),
  some: at(13, 5),
  all: at(23, 40),
};

/** When each puzzle's push goes out: 9:12am. */
export const PUSH_AT = at(9, 12);

/** The mockups' today, a Thursday. */
const TODAY = "2026-10-08";

/** Today's puzzle, #21. */
const TODAY_ID = 21;

/** Twenty-one puzzles, #1 to #21; today's is the only one that counts. */
export const DAYS: Day[] = Array.from({ length: TODAY_ID }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  date: addDays(TODAY, i + 1 - TODAY_ID),
  counts: i + 1 === TODAY_ID,
}));

const ms = (seconds: number | null) =>
  seconds === null ? null : Math.round(seconds * 1000);

/** How someone plays, which the three weeks before today are drawn from. */
interface Habit {
  name: string;
  /** Chance of playing on a day. */
  plays: number;
  /** Chance of solving a game. */
  solves: number;
  /** A typical stache time, in seconds. */
  stache: number;
  /** Mistakes on a typical solve. */
  slips: number;
  /** When they usually finish, in hours after midnight. */
  hour: number;
  /** Solved this many days up to today, after a miss. */
  streak?: number;
  /** Days off, by puzzle number. */
  away?: [number, number];
  /** The first puzzle they played. */
  since?: number;
  /** Chance of catching up on a skipped day later: late, so it never counts. */
  catchUp?: number;
}

// Juniper never misses a day and is first in most mornings; Priya is fast and
// reckless; Theo skips days; Cat plays late at night and was away last
// week; Hazel started on #16; Ozzie hardly plays, and catches up late; Bea
// almost never makes a mistake; Captain Whiskers has a long name.
// biome-ignore format: a table, one player per row
const HABITS: Habit[] = [
  { name: "Juniper",          plays: 1,    solves: 0.85, stache: 66, slips: 0.7, hour: 9.6, streak: 11 },
  { name: "Priya",            plays: 0.9,  solves: 0.6,  stache: 45, slips: 2.2, hour: 12 },
  { name: "Theo",             plays: 0.55, solves: 0.85, stache: 60, slips: 1,   hour: 14.5, streak: 3 },
  { name: "Cat",              plays: 0.8,  solves: 0.8,  stache: 50, slips: 1.2, hour: 22.8, away: [11, 17] },
  { name: "Marisol",          plays: 0.85, solves: 0.8,  stache: 66, slips: 1.6, hour: 19.5 },
  { name: "Wendell",          plays: 0.9,  solves: 0.85, stache: 84, slips: 1,   hour: 18.6 },
  { name: "Hazel",            plays: 1,    solves: 0.85, stache: 46, slips: 1.2, hour: 12.6, since: 16 },
  { name: "Ozzie",            plays: 0.3,  solves: 0.4,  stache: 76, slips: 2.6, hour: 16, catchUp: 0.25 },
  { name: "Bea",              plays: 0.8,  solves: 0.9,  stache: 80, slips: 0.2, hour: 10.1 },
  { name: "Captain Whiskers", plays: 0.55, solves: 0.6,  stache: 70, slips: 2,   hour: 21 },
];

/**
 * A day against a habit's streak: solved if it's in the streak, missed if
 * it's the day before, which started it, and null otherwise.
 */
function streakDay({ streak }: Habit, day: Day) {
  if (streak === undefined) return null;
  const into = day.id - (TODAY_ID - 1 - streak);
  return into > 0 ? "solved" : into === 0 ? "missed" : null;
}

/** One game on a past day, drawn from a habit. */
function drawn(habit: Habit, day: Day, random: () => number): Play {
  const forced = streakDay(habit, day);
  const completed = forced ? forced === "solved" : random() < habit.solves;
  const found = completed || random() < 0.5;
  // In tenths, as the game shows them, so a tie can happen.
  const stache = Math.round(habit.stache * (0.6 + random() * 0.9) * 10) / 10;
  const mistakes = completed
    ? Math.min(4, Math.floor(random() * (habit.slips * 2 + 1)))
    : found
      ? 5
      : 4;
  const solve = Math.max(stache, habit.stache * (1.6 + random() * 1.4));
  const finishedAt = Math.round(
    Math.min(
      Math.max(habit.hour * 60 + (random() - 0.5) * 150, PUSH_AT + 4),
      at(23, 58),
    ),
  );
  return {
    name: habit.name,
    puzzleId: day.id,
    completed,
    stachedMs: found ? ms(stache) : null,
    late: false,
    mistakes,
    solveMs: completed ? ms(solve) : null,
    startedAt: finishedAt - Math.ceil(solve / 60) - 1,
    finishedAt,
  };
}

/** Everyone's games before today, the same every load. */
function history(): Play[] {
  return HABITS.flatMap((habit, h) => {
    const random = seeded(h * 31 + 5);
    return DAYS.slice(0, -1).flatMap((day) => {
      const [from, to] = habit.away ?? [0, 0];
      if (day.id < (habit.since ?? 0) || (day.id >= from && day.id <= to))
        return [];
      if (streakDay(habit, day) || random() < habit.plays)
        return [drawn(habit, day, random)];
      // Skipped it, and maybe played it after, late.
      return habit.catchUp && random() < habit.catchUp
        ? [{ ...drawn(habit, day, random), late: true }]
        : [];
    });
  });
}

/** Today's game as everyone ends up playing it. */
const today = (
  name: string,
  [startedAt, finishedAt]: [number, number],
  completed: boolean,
  stache: number | null,
  mistakes: number,
  solve: number | null = null,
): Play => ({
  name,
  puzzleId: TODAY_ID,
  completed,
  stachedMs: ms(stache),
  late: false,
  mistakes,
  solveMs: ms(solve),
  startedAt,
  finishedAt,
});

// Today, a race: Juniper is first in, Priya and Hazel tie on the fastest
// stache at midday (Priya on a miss), Theo pauses mid-game, Marisol solves on
// her last life, and Cat takes the fastest stache just before midnight.
// biome-ignore format: a table, one game per row
const TODAY_GAMES: Play[] = [
  today("Juniper",          [at(9, 15), at(9, 21)],   true,  52.3, 1, 245),
  today("Bea",              [at(9, 58), at(10, 5)],   true,  72.9, 0, 301),
  today("Priya",            [at(11, 40), at(11, 48)], false, 41.2, 5),
  today("Hazel",            [at(12, 21), at(12, 30)], true,  41.2, 2, 198),
  today("Theo",             [at(12, 52), at(14, 10)], true,  64,   1, 288),
  today("Wendell",          [at(18, 36), at(18, 45)], true,  85,   1, 342),
  today("Marisol",          [at(19, 22), at(19, 30)], true,  58.8, 4, 377),
  today("Captain Whiskers", [at(21, 40), at(21, 52)], false, null, 4),
  today("Cat",              [at(23, 5), at(23, 12)],  true,  38.5, 2, 233),
];

const HISTORY = history();

/** Everyone's games as of `now`: today's unstarted ones left out. */
export function playsAt(now: number): Play[] {
  return [
    ...HISTORY,
    ...TODAY_GAMES.flatMap((play) => {
      if (play.startedAt > now) return [];
      if (play.finishedAt !== null && play.finishedAt <= now) return [play];
      return [
        {
          ...play,
          completed: null,
          stachedMs: null,
          mistakes: 0,
          solveMs: null,
          finishedAt: null,
        },
      ];
    }),
  ];
}
