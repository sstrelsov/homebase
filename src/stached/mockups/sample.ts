// Made-up players and games for the leaderboard mockups. Never put real names,
// times or results here: this repo is public.
import type { Leaderboard, Standing } from "../api";

/** A game as the database keeps it, or null if the player didn't play. */
interface Game {
  /** True once solved, false once missed, null while still playing. */
  completed: boolean | null;
  stachedMs: number | null;
}

const ms = (seconds: number | null) =>
  seconds === null ? null : Math.round(seconds * 1000);

// The games in the table below, with stache times in seconds: solved, missed
// (with a time if the stache was found), still playing, and didn't play.
const S = (seconds: number): Game => ({
  completed: true,
  stachedMs: ms(seconds),
});
const M = (seconds: number | null = null): Game => ({
  completed: false,
  stachedMs: ms(seconds),
});
const P = (seconds: number | null = null): Game => ({
  completed: null,
  stachedMs: ms(seconds),
});
const __ = null;

/** How far today has got: nobody finished, some, or everyone. */
export type TodayState = "none" | "some" | "all";

// A week of puzzles, oldest first; the last is today. The game has only the
// last three so far, unless the mockup asks for the full week.
const DATES = [
  "2026-09-26",
  "2026-09-27",
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
];

interface Sample {
  name: string;
  /** One per date, with today as of midday. */
  games: (Game | null)[];
  /** How today ends, for anyone not finished by midday. */
  later?: Game;
}

// Most streaks are 0. Ozzie's only game is a loss with a fast stache; Hazel
// has a fast stache on a game still going; Lupe and Archie signed in and
// never played. Priya, Marisol and Wendell tie on solved this week; Ozzie,
// Captain Whiskers and Hazel tie on nothing.
// biome-ignore format: a table, one column per date
const PLAYERS: Sample[] = [
  //                                  9/26      9/27      9/28      9/29      9/30      10/1      10/2, today
  { name: "Juniper",          games: [S(66),    S(81.3),  __,       S(59.9),  S(72.4),  S(49),    S(47.9)] },
  { name: "Priya",            games: [S(58.2),  M(70.1),  S(64),    S(61.7),  S(55),    S(63.5),  M(51.2)] },
  { name: "Theo",             games: [__,       __,       S(45.5),  M(),      M(),      S(40.2),  __],       later: S(44) },
  { name: "Ozzie",            games: [__,       __,       __,       __,       __,       M(31.4),  __],       later: M(29.8) },
  { name: "Marisol",          games: [M(),      S(90.2),  S(77.7),  __,       M(105),   S(80.6),  S(58)] },
  { name: "Hazel",            games: [S(39.9),  __,       __,       __,       __,       __,       P(36)],    later: S(36) },
  { name: "Wendell",          games: [__,       S(70),    S(66.6),  S(88.8),  S(62.4),  __,       S(61)] },
  { name: "Captain Whiskers", games: [__,       __,       M(),      __,       M(130),   __,       M()] },
  { name: "Bea",              games: [S(95),    S(101.4), __,       __,       S(65.3),  __,       __],       later: S(100) },
  { name: "Lupe",             games: [__,       __,       __,       __,       __,       __,       __] },
  { name: "Archie",           games: [__,       __,       __,       __,       __,       __,       __] },
];

/** The signed-in player in the mockups. */
export const ME = "Marisol";

const finished = (game: Game | null): game is Game =>
  game !== null && game.completed !== null;

/**
 * A win: the day's fastest stache among the players who solved it. A miss
 * with a faster stache doesn't count.
 */
export type Mark = "won" | "solved" | "missed" | "open" | "none";

export interface Player {
  name: string;
  /** One per date, oldest first; the last is today. */
  games: (Game | null)[];
  marks: Mark[];
  /** Solve 2, find the stache 1, the day's win 1; null if not played. */
  points: (number | null)[];
  solved: number;
  /** Games finished, solved or missed. */
  played: number;
  wins: number;
  /** Fastest stache on a solved game. */
  fastestMs: number | null;
  streak: number;
  total: number;
}

export interface Week {
  /** Oldest first; the last is today. */
  dates: string[];
  /** Today's number: #1 is the first puzzle. */
  number: number;
  /** Everyone who has played. */
  players: Player[];
}

/** Today's game as of `today`: as written, before anyone finished, or after. */
function todayGame({ games, later }: Sample, today: TodayState) {
  const midday = games.at(-1) ?? null;
  if (today === "none") return finished(midday) ? null : midday;
  if (today === "all" && !finished(midday)) return later ?? midday;
  return midday;
}

/** The sample as of `today`, over the last 3 puzzles or a full week. */
export function sample(today: TodayState, days: 3 | 7): Week {
  return weekOf(
    DATES.slice(-days),
    PLAYERS.map((player) => ({
      name: player.name,
      games: [...player.games.slice(-days, -1), todayGame(player, today)],
    })).filter(({ games }) => games.some((game) => game !== null)),
  );
}

/** Rows from the live database, as fetch-prod.sh writes them. */
export interface ProdRows {
  /** The last 7 puzzles out, oldest first. */
  dates: string[];
  /** Every game on them, late ones left out. */
  plays: ({ name: string; date: string } & Game)[];
}

/** The real players' week, from the live database's rows. */
export function prod({ dates, plays }: ProdRows): Week {
  const names = [...new Set(plays.map((play) => play.name))];
  return weekOf(
    dates,
    names.map((name) => ({
      name,
      games: dates.map((date) => {
        const play = plays.find((p) => p.name === name && p.date === date);
        return play
          ? { completed: play.completed, stachedMs: play.stachedMs }
          : null;
      }),
    })),
  );
}

/** Ranks, marks and points for everyone's games, a game per date or null. */
function weekOf(
  dates: string[],
  games: { name: string; games: (Game | null)[] }[],
): Week {
  // The winning time on each day, or Infinity if nobody has solved it.
  const winning = dates.map((_, day) =>
    Math.min(
      ...games.flatMap(({ games }) => {
        const game = games[day];
        return game?.completed && game.stachedMs !== null
          ? [game.stachedMs]
          : [];
      }),
    ),
  );

  const players = games.map(({ name, games }): Player => {
    const won = (game: Game | null, day: number) =>
      Boolean(game?.completed) && game?.stachedMs === winning[day];
    const marks = games.map((game, day): Mark => {
      if (!finished(game)) return day === dates.length - 1 ? "open" : "none";
      if (won(game, day)) return "won";
      return game.completed ? "solved" : "missed";
    });
    const points = games.map((game, day) => {
      if (!finished(game)) return null;
      if (!game.completed) return game.stachedMs === null ? 0 : 1;
      return 3 + (won(game, day) ? 1 : 0);
    });
    const times = games.flatMap((game) =>
      game?.completed && game.stachedMs !== null ? [game.stachedMs] : [],
    );
    return {
      name,
      games,
      marks,
      points,
      solved: times.length,
      played: games.filter(finished).length,
      wins: marks.filter((mark) => mark === "won").length,
      fastestMs: times.length ? Math.min(...times) : null,
      streak: streak(games),
      total: points.reduce<number>((sum, p) => sum + (p ?? 0), 0),
    };
  });

  return { dates, number: dates.length, players };
}

/**
 * Puzzles solved in a row, newest first, as the server counts them: today's
 * doesn't break it until it's finished.
 */
function streak(games: (Game | null)[]) {
  let count = 0;
  for (const [i, game] of [...games].reverse().entries()) {
    if (i === 0 && !finished(game)) continue;
    if (!game?.completed) break;
    count++;
  }
  return count;
}

/** Ranks in order, sharing a rank on a tie (1, 2, 2, 4), then by name. */
function ranked<T extends { name: string }>(
  rows: T[],
  compare: (a: T, b: T) => number,
) {
  const sorted = [...rows]
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort(compare);
  return sorted.map((row) => ({
    ...row,
    rank: sorted.findIndex((other) => compare(other, row) === 0) + 1,
  }));
}

/** Faster first, and no time last. */
const byTime = (a: number | null, b: number | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a - b;

/**
 * Designs A, C and D: most solved, then most wins, then fastest solved stache,
 * then most played, so a loss ranks above not playing.
 */
export const byWeek = (players: Player[]) =>
  ranked(
    players,
    (a, b) =>
      b.solved - a.solved ||
      b.wins - a.wins ||
      byTime(a.fastestMs, b.fastestMs) ||
      b.played - a.played,
  );

/** Design B: most points. */
export const byPoints = (players: Player[]) =>
  ranked(players, (a, b) => b.total - a.total);

/**
 * Today's games, solvers first by stache time, then the misses, and who has
 * played this week but not finished today (playing: started, not finished).
 */
export function today({ players }: Week) {
  const scores = players.flatMap(({ name, games, marks }) => {
    const game = games.at(-1) ?? null;
    if (!finished(game)) return [];
    const { completed, stachedMs } = game;
    return [{ name, completed, stachedMs, won: marks.at(-1) === "won" }];
  });
  const byStache = (a: { stachedMs: number | null }, b: typeof a) =>
    byTime(a.stachedMs, b.stachedMs);
  const toPlay = players
    .filter(({ games }) => !finished(games.at(-1) ?? null))
    .map(({ name, games }) => ({ name, playing: games.at(-1) !== null }))
    .sort(
      (a, b) =>
        Number(a.playing) - Number(b.playing) || a.name.localeCompare(b.name),
    );
  const solvers = scores.filter((s) => s.completed);
  const misses = scores.filter((s) => !s.completed);
  return {
    scores: [...ranked(solvers, byStache), ...ranked(misses, byStache)],
    toPlay,
  };
}

/**
 * The leaderboard as the server builds it today (leaderboard() in
 * stached-api/server.ts): every stache time counts, lost games and games
 * still going included, and rows sort by streak, then best stache time.
 */
export function currentBoard({ dates, players }: Week): Leaderboard {
  const standings = players.map(({ name, games, streak }): Standing => {
    const done = games.filter(finished);
    const times = games.flatMap((game) =>
      game?.stachedMs != null ? [game.stachedMs] : [],
    );
    return {
      name,
      games: done.length,
      solved: done.filter((game) => game.completed).length,
      streak,
      bestStacheMs: times.length ? Math.min(...times) : null,
      avgStacheMs: times.length
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : null,
      recent: games.map((game) => game?.stachedMs ?? null),
    };
  });
  standings.sort(
    (a, b) =>
      b.streak - a.streak ||
      byTime(a.bestStacheMs, b.bestStacheMs) ||
      a.name.localeCompare(b.name),
  );
  return { recentDates: dates, players: standings };
}
