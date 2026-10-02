import { describe, expect, test } from "bun:test";
import { changes, publish, timing, unpublish } from "./cli";
import type { DayPuzzle } from "./puzzles";
import examples from "./puzzles.example.json";

// The made-up sample, published on two days, and a third day staged.
const SAMPLE = examples[0] as DayPuzzle;
const on = (date: string, puzzle = SAMPLE): DayPuzzle => ({ ...puzzle, date });
const PUBLISHED = [on("2026-10-01"), on("2026-10-02")];
const edited = (date: string) => {
  const puzzle = structuredClone(on(date));
  puzzle.groups[0].words[0] = "Crumpet";
  return puzzle;
};

describe("confirming staged puzzles", () => {
  test("adds new days in date order", () => {
    const puzzles = publish(PUBLISHED, [on("2026-09-30")], new Map());
    expect(puzzles.map((p) => p.date)).toEqual([
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  test("leaves a puzzle published word for word as it was", () => {
    // The same puzzle spelled differently: keys reordered, stache: false.
    const respelled = {
      date: "2026-10-01",
      groups: SAMPLE.groups.map(({ title, words, stache }) => ({
        stache: stache ?? false,
        words,
        title,
      })),
    };
    expect(
      changes(PUBLISHED, [respelled], new Map([["2026-10-01", 5]])),
    ).toEqual([{ date: "2026-10-01", kind: "same", games: 0 }]);
    expect(publish(PUBLISHED, [respelled], new Map())[0]).toBe(PUBLISHED[0]);
  });

  test("replaces a published puzzle nobody has played", () => {
    const puzzles = publish(PUBLISHED, [edited("2026-10-02")], new Map());
    expect(puzzles[1].groups[0].words[0]).toBe("Crumpet");
  });

  test("refuses to change a puzzle people have played", () => {
    const games = new Map([["2026-10-01", 3]]);
    expect(() => publish(PUBLISHED, [edited("2026-10-01")], games)).toThrow(
      /Refusing to change a published puzzle[\s\S]*Thu, Oct 1 \(2026-10-01\): 3 games[\s\S]*--delete-games/,
    );
  });

  test("changes it anyway with --delete-games", () => {
    const games = new Map([["2026-10-01", 3]]);
    const puzzles = publish(PUBLISHED, [edited("2026-10-01")], games, {
      deleteGames: true,
    });
    expect(puzzles[0].groups[0].words[0]).toBe("Crumpet");
  });
});

describe("removing a puzzle", () => {
  test("takes down one nobody has played", () => {
    const puzzles = unpublish(PUBLISHED, "2026-10-02", new Map());
    expect(puzzles.map((p) => p.date)).toEqual(["2026-10-01"]);
  });

  test("refuses one people have played, unless told to", () => {
    const games = new Map([["2026-10-01", 1]]);
    expect(() => unpublish(PUBLISHED, "2026-10-01", games)).toThrow(
      /Refusing to remove it[\s\S]*1 game\n/,
    );
    expect(
      unpublish(PUBLISHED, "2026-10-01", games, { deleteGames: true }),
    ).toHaveLength(1);
  });

  test("says so when there's no such puzzle", () => {
    expect(() => unpublish(PUBLISHED, "2026-12-25", new Map())).toThrow(
      "No published puzzle on 2026-12-25.",
    );
  });

  test("never takes down the only puzzle", () => {
    expect(() => unpublish([SAMPLE], SAMPLE.date, new Map())).toThrow(
      /only puzzle/,
    );
  });
});

describe("timing", () => {
  // 11pm in New York on Thursday, October 1.
  const night = new Date("2026-10-02T03:00:00Z");

  test("a puzzle confirmed the night before goes live at midnight, its push at 9:12", () => {
    expect(timing("2026-10-02", "new", night)).toBe(
      "It goes live at midnight New York time on Fri, Oct 2, with its push at 9:12am.",
    );
  });

  test("a puzzle for today goes live now, and pushes at 9:12 or right away", () => {
    expect(timing("2026-10-01", "new", new Date("2026-10-01T12:00:00Z"))).toBe(
      "It goes live right away, with its push at 9:12am.",
    );
    expect(timing("2026-10-01", "new", night)).toBe(
      "It goes live right away, with its push within a minute.",
    );
  });

  test("changing a puzzle that's out never pushes again", () => {
    expect(timing("2026-10-01", "edit", night)).toBe(
      "It's out already, so the change is live right away. A puzzle never pushes twice.",
    );
    expect(timing("2026-10-02", "edit", night)).toContain("push at 9:12am");
  });

  test("a puzzle dated before today gets no push", () => {
    expect(timing("2026-09-30", "new", night)).toBe(
      "It's dated before today, so it gets no push.",
    );
  });
});
