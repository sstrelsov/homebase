import { expect, test } from "bun:test";
import examples from "./puzzles.example.json";
import { hasBonusLife, outcome } from "./rules";

// The made-up sample from the bonus life's first day, and the same puzzle a
// day earlier.
const PUZZLE = examples[1];
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
});
