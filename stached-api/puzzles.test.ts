import { describe, expect, test } from "bun:test";
import {
  type DayPuzzle,
  inOrder,
  missingParts,
  numbered,
  puzzlePath,
  puzzleProblems,
} from "./puzzles";
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
    "2026-01-01: two puzzles are part 1 of this date",
  ]);
});

describe("a date with more than one puzzle", () => {
  const part = (n: number): DayPuzzle => ({ ...SAMPLE, part: n });

  test("numbers the next ones part 2 and up", () => {
    expect(puzzleProblems([SAMPLE, part(2), part(3)])).toEqual([]);
    expect(puzzleProblems([part(1), part(2)])).toEqual([]);
    expect(puzzleProblems([part(2), part(2)])).toEqual([
      "2026-01-01/2: two puzzles are part 2 of this date",
    ]);
  });

  test("takes only a whole number from 1 as a part", () => {
    for (const bad of [0, 1.5, "2", null])
      expect(problems((p) => Object.assign(p, { part: bad }))).toEqual([
        "Puzzle 1: part needs to be a whole number from 1",
      ]);
  });

  test("needs every part before the last", () => {
    expect(missingParts([SAMPLE, part(2)])).toEqual([]);
    expect(missingParts([part(2)])).toEqual([
      "2026-01-01: has a part 2 but no part 1",
    ]);
    expect(
      missingParts([part(3), SAMPLE, { ...part(2), date: "2026-01-02" }]),
    ).toEqual([
      "2026-01-01: has a part 3 but no part 2",
      "2026-01-02: has a part 2 but no part 1",
    ]);
  });

  test("plays them in order, by date and then part", () => {
    const later = { ...SAMPLE, date: "2026-01-02" };
    expect([later, part(2), SAMPLE].sort(inOrder)).toEqual([
      SAMPLE,
      part(2),
      later,
    ]);
  });

  test("gives each its own address", () => {
    expect(puzzlePath(SAMPLE)).toBe("2026-01-01");
    expect(puzzlePath(part(1))).toBe("2026-01-01");
    expect(puzzlePath(part(2))).toBe("2026-01-01/2");
  });

  test("names them together", () => {
    expect(numbered([12])).toBe("#12");
    expect(numbered([17, 18])).toBe("#17 and #18");
    expect(numbered([17, 18, 19])).toBe("#17, #18, and #19");
  });
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

test("a push line, if any, is text", () => {
  expect(problems((p) => (p.push = "Read all about it"))).toEqual([]);
  expect(problems((p) => (p.push = " "))).toEqual([
    "2026-01-01: push needs to be a line of text",
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
