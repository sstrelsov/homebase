// The leaderboard's rules, kept apart from server.ts so tests can load them:
// a point for each solve and each fastest stache on every puzzle so far, and a
// square per player for each of the last WEEK puzzles out. Late games never
// count.

/** How many puzzles the leaderboard shows squares for, today's last. */
export const WEEK = 7;

/** Always #1, whatever her points. Matched without case. */
const PINNED = "cat";

/** A puzzle out so far (dated today or earlier). */
export interface Day {
  id: number;
  /** #1 is the first puzzle, by date. */
  number: number;
  date: string;
  /** Today's, or pushed in the last day: its games still count. */
  counts: boolean;
}

/** A player's game, as the database keeps it. */
export interface Game {
  name: string;
  puzzleId: number;
  /** True once solved, false once missed, null while still playing. */
  completed: boolean | null;
  stachedMs: number | null;
  /** Played once its puzzle stopped counting, so it doesn't count. */
  late: boolean;
}

/** A game finished with a stache time. */
type Finished = Game & { completed: boolean; stachedMs: number };

/**
 * A player's day: solved or missed, "won" or "won-missed" with the day's
 * fastest stache, "none" if they didn't finish it while it counted, and
 * "open" for one that still counts until they finish it.
 */
export type Mark = "won" | "won-missed" | "solved" | "missed" | "none" | "open";

export interface Standing {
  name: string;
  /**
   * Cat is always 1. Below her, ties share a place (1, 2, 2, 4), and a tie
   * with her for the most points shares 1.
   */
  rank: number;
  /** One per day of the week, oldest first; the last is today. */
  marks: Mark[];
  /** Puzzles solved, on any day so far. */
  solved: number;
  /** Puzzles with the fastest stache, on any day so far. */
  fastest: number;
  /** A point for each solve and each fastest stache, on any day so far. */
  points: number;
  /** Puzzles solved in a row, on any day so far, not just this week. */
  streak: number;
}

/** Today's fastest stache, on a finished game. */
export interface Fastest {
  name: string;
  stachedMs: number;
  solved: boolean;
}

export interface Leaderboard {
  /** The last WEEK puzzles out, oldest first; the last is today's. */
  days: Pick<Day, "number" | "date">[];
  /** Everyone tied for today's fastest stache, by name. */
  fastestToday: Fastest[];
  /** Everyone who has finished a game: Cat first, then most points first. */
  players: Standing[];
}

/**
 * Marks a game on its day. Each puzzle's fastest stache is the lowest stache
 * time on a game finished while it counted, solved or not; ties share it.
 */
function marker(counted: Game[]) {
  const finished = counted.filter(
    (game): game is Finished =>
      game.completed !== null && game.stachedMs !== null,
  );
  const fastestMs = new Map(
    [...Map.groupBy(finished, (game) => game.puzzleId)].map(([id, games]) => [
      id,
      Math.min(...games.map((game) => game.stachedMs)),
    ]),
  );
  const isFastest = (game: Game): game is Finished =>
    game.completed !== null && game.stachedMs === fastestMs.get(game.puzzleId);

  const mark = (day: Day, game: Game | undefined): Mark => {
    if (!game || game.completed === null) return day.counts ? "open" : "none";
    if (isFastest(game)) return game.completed ? "won" : "won-missed";
    return game.completed ? "solved" : "missed";
  };
  return { isFastest, mark };
}

/**
 * The leaderboard from the puzzles out so far (oldest first) and everyone's
 * games. Only players with a finished game are listed, so not playing never
 * ties a loss. Cat is listed first, at #1, whatever her points.
 */
export function leaderboardOf(days: Day[], games: Game[]): Leaderboard {
  const counted = games.filter((game) => !game.late);
  const week = days.slice(-WEEK);
  const today = days.at(-1);
  const { isFastest, mark } = marker(counted);

  const standings = [...Map.groupBy(counted, (game) => game.name)].flatMap(
    ([name, played]) => {
      const byDay = new Map(played.map((game) => [game.puzzleId, game]));
      const marks = days.map((day) => mark(day, byDay.get(day.id)));
      if (marks.every((m) => m === "none" || m === "open")) return [];
      const solved = marks.filter((m) => m === "won" || m === "solved").length;
      const fastest = marks.filter(
        (m) => m === "won" || m === "won-missed",
      ).length;
      return [
        {
          name,
          marks: marks.slice(-WEEK),
          solved,
          fastest,
          points: solved + fastest,
          streak: streak(days, byDay),
        },
      ];
    },
  );
  const isPinned = (standing: { name: string }) =>
    standing.name.toLowerCase() === PINNED;
  standings.sort(
    (a, b) =>
      Number(isPinned(b)) - Number(isPinned(a)) ||
      b.points - a.points ||
      a.name.localeCompare(b.name),
  );

  return {
    days: week.map(({ number, date }) => ({ number, date })),
    fastestToday: counted
      .filter((game) => game.puzzleId === today?.id)
      .filter(isFastest)
      .map(({ name, stachedMs, completed }) => ({
        name,
        stachedMs,
        solved: completed,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    players: ranked(standings),
  };
}

/** Places in the order given; a tie with the player above shares their place. */
function ranked<T extends { points: number }>(standings: T[]) {
  let rank = 0;
  return standings.map((standing, i) => {
    if (i === 0 || standing.points !== standings[i - 1].points) rank = i + 1;
    return { rank, ...standing };
  });
}

/**
 * One player's squares for the week, oldest first, marked against everyone's
 * games as on the leaderboard: home shows them under Play. Their own games
 * come apart, since the admin's aren't among everyone's.
 */
export function weekOf(days: Day[], games: Game[], mine: Game[]) {
  const week = days.slice(-WEEK);
  const { mark } = marker(games.filter((game) => !game.late));
  const byDay = new Map(
    mine.filter((game) => !game.late).map((game) => [game.puzzleId, game]),
  );
  return week.map((day) => ({
    date: day.date,
    mark: mark(day, byDay.get(day.id)),
  }));
}

/**
 * Puzzles solved in a row, newest first. One that still counts doesn't break
 * it until it's finished: there's still time to keep it going.
 */
function streak(days: Day[], byDay: Map<number, Game>) {
  let count = 0;
  for (const day of days.toReversed()) {
    const game = byDay.get(day.id);
    if (day.counts && (!game || game.completed === null)) continue;
    if (!game?.completed) break;
    count++;
  }
  return count;
}
