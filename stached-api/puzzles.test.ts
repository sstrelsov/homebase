import { describe, expect, test } from "bun:test";
import {
  type DayPuzzle,
  inOrder,
  numbered,
  outOf,
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
    "2026-01-01: two puzzles share this date",
  ]);
});

test("a missed day's puzzle comes out on a later day, if it says so", () => {
  const caughtUp = { ...SAMPLE, out: "2026-01-02" };
  expect(puzzleProblems([caughtUp])).toEqual([]);
  expect(outOf(caughtUp)).toBe("2026-01-02");
  expect(outOf(SAMPLE)).toBe(SAMPLE.date);
  for (const out of [SAMPLE.date, "2025-12-31", "Jan 2", null])
    expect(problems((p) => Object.assign(p, { out }))).toEqual([
      "2026-01-01: out needs to be a date after its own",
    ]);
});

test("names puzzles out together, by number", () => {
  expect(numbered([12])).toBe("#12");
  expect(numbered([17, 18])).toBe("#17 and #18");
  expect(numbered([17, 18, 19])).toBe("#17, #18, and #19");
});

describe("numbering, in the order puzzles go out", () => {
  // Made-up days: Sunday, October 11, out and pushed; Tuesday the 13th's
  // pushed at 9:12; Monday the 12th missed.
  const day = (date: string, out?: string) => ({ date, ...(out && { out }) });
  const at = (hour: number) => new Date(Date.UTC(2026, 9, 13, hour));
  const numbers = (puzzles: { date: string }[], pushes: Map<string, Date>) =>
    inOrder(puzzles, pushes).map((p, i) => `#${i + 1} ${p.date}`);
  const sunday = day("2026-10-11");
  const tuesday = day("2026-10-13");
  const monday = day("2026-10-12", "2026-10-13");

  test("is by date, day by day", () => {
    expect(numbers([tuesday, sunday], new Map())).toEqual([
      "#1 2026-10-11",
      "#2 2026-10-13",
    ]);
  });

  test("never moves a number sent in a push: a missed day added after it comes next", () => {
    const pushed = new Map([
      ["2026-10-11", at(-24)],
      ["2026-10-13", at(13)],
    ]);
    expect(numbers([sunday, tuesday], pushed)).toEqual([
      "#1 2026-10-11",
      "#2 2026-10-13",
    ]);
    // Monday's, caught up Tuesday evening: before its own push, and after.
    expect(numbers([sunday, monday, tuesday], pushed)).toEqual([
      "#1 2026-10-11",
      "#2 2026-10-13",
      "#3 2026-10-12",
    ]);
    pushed.set("2026-10-12", at(23));
    expect(numbers([sunday, monday, tuesday], pushed)).toEqual([
      "#1 2026-10-11",
      "#2 2026-10-13",
      "#3 2026-10-12",
    ]);
  });

  test("puts a missed day caught up before the push by its date, in that push", () => {
    const pushed = new Map([["2026-10-11", at(-24)]]);
    expect(numbers([sunday, monday, tuesday], pushed)).toEqual([
      "#1 2026-10-11",
      "#2 2026-10-12",
      "#3 2026-10-13",
    ]);
    // The push claims both at once, and nothing moves.
    pushed.set("2026-10-12", at(13));
    pushed.set("2026-10-13", at(13));
    expect(numbers([sunday, monday, tuesday], pushed)).toEqual([
      "#1 2026-10-11",
      "#2 2026-10-12",
      "#3 2026-10-13",
    ]);
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
