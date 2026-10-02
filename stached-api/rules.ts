// How a game is won and lost, kept apart from server.ts so tests can load it.
import type { DayPuzzle } from "./puzzles";

/** Mistakes that end a game, before any bonus life. */
export const MAX_MISTAKES = 4;

/**
 * The first puzzle with a bonus life. Earlier puzzles keep the rules they were
 * played under, even when played late.
 */
const BONUS_LIFE_FROM = "2026-10-02";

/** Solving the stache group earns a bonus life: one more mistake. */
export function hasBonusLife({ date, groups }: DayPuzzle, solved: number[]) {
  return (
    date >= BONUS_LIFE_FROM && solved.some((index) => groups[index].stache)
  );
}

/**
 * True once every group is solved, false once the mistakes run out, and null
 * while the game is still going.
 */
export function outcome(puzzle: DayPuzzle, solved: number[], mistakes: number) {
  if (solved.length === puzzle.groups.length) return true;
  const limit = MAX_MISTAKES + (hasBonusLife(puzzle, solved) ? 1 : 0);
  return mistakes >= limit ? false : null;
}
