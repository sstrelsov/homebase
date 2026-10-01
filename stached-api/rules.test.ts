import { expect, test } from "bun:test";
import examples from "./puzzles.example.json";
import { hasBonusLife, MAX_MISTAKES, outcome } from "./rules";

// The made-up sample puzzle, dated the first day with a bonus life and the
// day before it.
const PUZZLE = { ...examples[0], date: "2026-10-02" };
const BEFORE = { ...PUZZLE, date: "2026-10-01" };
const STACHE = PUZZLE.groups.findIndex((g) => g.stache);
const ALL = PUZZLE.groups.map((_, i) => i);
const OTHERS = ALL.filter((i) => i !== STACHE);

test("only the stache group earns the bonus life", () => {
  expect(hasBonusLife(PUZZLE, [])).toBe(false);
  expect(hasBonusLife(PUZZLE, OTHERS)).toBe(false);
  expect(hasBonusLife(PUZZLE, [STACHE])).toBe(true);
});

test("puzzles before 2026-10-02 have no bonus life", () => {
  expect(hasBonusLife(BEFORE, [STACHE])).toBe(false);
  expect(outcome(BEFORE, [STACHE], 4)).toBe(false);
});

test("four mistakes end a game without the stache group", () => {
  expect(MAX_MISTAKES).toBe(4);
  expect(outcome(PUZZLE, OTHERS, 3)).toBeNull();
  expect(outcome(PUZZLE, OTHERS, 4)).toBe(false);
});

test("the stache group's bonus life takes a fifth mistake to lose", () => {
  expect(outcome(PUZZLE, [STACHE], 4)).toBeNull();
  expect(outcome(PUZZLE, [STACHE], 5)).toBe(false);
});

test("solving every group wins, even on the bonus life", () => {
  expect(outcome(PUZZLE, ALL, 0)).toBe(true);
  expect(outcome(PUZZLE, ALL, 4)).toBe(true);
  // The stache group last: it completes the board.
  expect(outcome(PUZZLE, [...OTHERS, STACHE], 3)).toBe(true);
});
