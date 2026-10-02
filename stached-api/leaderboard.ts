// The leaderboard's rules, kept apart from server.ts so tests can load them:
// the last WEEK puzzles out, a square per player per day, and a point for each
// solve and each fastest stache. Late games never count.

/** How many puzzles the leaderboard covers, today's last. */
export const WEEK = 7;

/** A puzzle out so far (dated today or earlier). */
export interface Day {
  id: number;
  /** #1 is the first puzzle, by date. */
  number: number;
  date: string;
}

/** A player's game, as the database keeps it. */
export interface Game {
  name: string;
  puzzleId: number;
  /** True once solved, false once missed, null while still playing. */
  completed: boolean | null;
  stachedMs: number | null;
  /** Played after its day, so it doesn't count. */
  late: boolean;
}

/** A game finished with a stache time. */
type Finished = Game & { completed: boolean; stachedMs: number };

/**
 * A player's day: solved or missed, "won" or "won-missed" with the day's
 * fastest stache, "none" if they didn't finish it on its day, and "open" for
 * today's until they finish it.
 */
export type Mark = "won" | "won-missed" | "solved" | "missed" | "none" | "open";

export interface Standing {
  name: string;
  /** Ties share a place: 1, 2, 2, 4. */
  rank: number;
  /** One per day, oldest first; the last is today. */
  marks: Mark[];
  solved: number;
  /** Days with the fastest stache. */
  fastest: number;
  /** A point for each solve and each fastest stache. */
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
  /** Everyone who finished a game this week, most points first. */
  players: Standing[];
}

/**
 * The leaderboard from the puzzles out so far (oldest first) and everyone's
 * games. Each day's fastest stache is the lowest stache time on a game
 * finished on its day, solved or not; ties share it. Only players with a
 * finished game this week are listed, so not playing never ties a loss.
 */
export function leaderboardOf(days: Day[], games: Game[]): Leaderboard {
  const counted = games.filter((game) => !game.late);
  const week = days.slice(-WEEK);
  const today = days.at(-1);

  const fastestMs = new Map(
    week.map((day) => [
      day.id,
      Math.min(
        ...counted.flatMap((game) =>
          game.puzzleId === day.id &&
          game.completed !== null &&
          game.stachedMs !== null
            ? [game.stachedMs]
            : [],
        ),
      ),
    ]),
  );
  const isFastest = (game: Game): game is Finished =>
    game.completed !== null && game.stachedMs === fastestMs.get(game.puzzleId);

  const mark = (day: Day, game: Game | undefined): Mark => {
    if (!game || game.completed === null)
      return day === today ? "open" : "none";
    if (isFastest(game)) return game.completed ? "won" : "won-missed";
    return game.completed ? "solved" : "missed";
  };

  const standings = [...Map.groupBy(counted, (game) => game.name)].flatMap(
    ([name, played]) => {
      const byDay = new Map(played.map((game) => [game.puzzleId, game]));
      const marks = week.map((day) => mark(day, byDay.get(day.id)));
      if (marks.every((m) => m === "none" || m === "open")) return [];
      const solved = marks.filter((m) => m === "won" || m === "solved").length;
      const fastest = marks.filter(
        (m) => m === "won" || m === "won-missed",
      ).length;
      return [
        {
          name,
          marks,
          solved,
          fastest,
          points: solved + fastest,
          streak: streak(days, byDay),
        },
      ];
    },
  );
  standings.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

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
    players: standings.map((standing) => ({
      rank: standings.findIndex((s) => s.points === standing.points) + 1,
      ...standing,
    })),
  };
}

/**
 * Puzzles solved in a row, newest first. Today's doesn't break it until it's
 * finished: there's still today to keep it going.
 */
function streak(days: Day[], byDay: Map<number, Game>) {
  let count = 0;
  for (const [i, day] of days.toReversed().entries()) {
    const game = byDay.get(day.id);
    if (i === 0 && (!game || game.completed === null)) continue;
    if (!game?.completed) break;
    count++;
  }
  return count;
}
