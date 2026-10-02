import { expect, test } from "bun:test";
import { type DayPuzzle, puzzleProblems } from "./puzzles";
import examples from "./puzzles.example.json";

// The made-up sample, and one change to it at a time.
const SAMPLE = examples[0] as DayPuzzle;
const problems = (change: (puzzle: DayPuzzle) => void) => {
  const puzzle = structuredClone(SAMPLE);
  change(puzzle);
  return puzzleProblems([puzzle]);
};

test("the sample puzzles pass", () => {
  expect(puzzleProblems(examples)).toEqual([]);
});

test("a puzzle needs a real date, and its own", () => {
  expect(problems((p) => (p.date = "2026-02-30"))).toEqual([
    "Puzzle 1: needs a date like 2026-10-02",
  ]);
  expect(problems((p) => (p.date = "Oct 2"))).toHaveLength(1);
  expect(puzzleProblems([SAMPLE, SAMPLE])).toEqual([
    "2026-01-01: two puzzles share this date",
  ]);
});

test("every group needs a title and four words", () => {
  expect(problems((p) => p.groups[0].words.pop())).toEqual([
    "2026-01-01: every group needs four words",
  ]);
  expect(problems((p) => (p.groups[0].words[0] = " "))).toEqual([
    "2026-01-01: every group needs four words",
  ]);
  expect(problems((p) => (p.groups[1].title = ""))).toEqual([
    "2026-01-01: every group needs a title",
  ]);
});

test("no word twice, even in another case", () => {
  expect(problems((p) => (p.groups[1].words[0] = "waffle "))).toEqual([
    "2026-01-01: a word appears twice",
  ]);
});

test("no two groups with one title", () => {
  expect(problems((p) => (p.groups[1].title = p.groups[0].title))).toEqual([
    "2026-01-01: two groups share a title",
  ]);
});

test("exactly one stache group", () => {
  expect(problems((p) => delete p.groups[3].stache)).toEqual([
    "2026-01-01: needs exactly one stache group",
  ]);
  expect(problems((p) => (p.groups[0].stache = true))).toEqual([
    "2026-01-01: needs exactly one stache group",
  ]);
});

test("at most a group per color, plus the stache", () => {
  const extra = (n: number) => ({
    title: `Extra ${n}`,
    words: [1, 2, 3, 4].map((w) => `Extra ${n}.${w}`),
  });
  expect(problems((p) => p.groups.push(extra(1)))).toEqual([]);
  expect(problems((p) => p.groups.push(extra(1), extra(2)))).toEqual([
    "2026-01-01: too many groups",
  ]);
});

test("it reports everything wrong at once", () => {
  expect(
    problems((p) => {
      p.groups[0].title = "";
      p.groups[1].words[0] = "Waffle";
      delete p.groups[3].stache;
    }),
  ).toHaveLength(3);
  expect(puzzleProblems({})).toEqual(["Expected a list of puzzles"]);
});
