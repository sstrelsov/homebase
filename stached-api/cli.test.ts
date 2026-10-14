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

  test("changes only the push line of a puzzle people have played", () => {
    const games = new Map([["2026-10-01", 3]]);
    const pushed = { ...on("2026-10-01"), push: "Read all about it" };
    expect(changes(PUBLISHED, [pushed], games)).toEqual([
      { date: "2026-10-01", kind: "push", games: 0 },
    ]);
    expect(publish(PUBLISHED, [pushed], games)[0].push).toBe(
      "Read all about it",
    );
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

/** Pushes that went out at 9:12am New York time on these dates. */
const pushedOn = (...dates: string[]) =>
  new Map(dates.map((date) => [date, new Date(`${date}T13:12:00Z`)]));

describe("catching up on a missed day", () => {
  // Sunday, October 11, 8am in New York. Friday's push went out; Sunday's
  // puzzle was confirmed the night before, and Saturday's was missed.
  const now = new Date("2026-10-11T12:00:00Z");
  const published = [on("2026-10-09"), on("2026-10-11")];
  const pushed = pushedOn("2026-10-09");
  const outs = (puzzles: DayPuzzle[]) => puzzles.map((p) => [p.date, p.out]);

  test("brings a missed day's puzzle out today", () => {
    expect(
      outs(publish(published, [on("2026-10-10")], new Map(), { pushed, now })),
    ).toEqual([
      ["2026-10-09", undefined],
      ["2026-10-10", "2026-10-11"],
      ["2026-10-11", undefined],
    ]);
  });

  test("catches up on several days at once, with today's", () => {
    const staged = ["2026-10-07", "2026-10-08", "2026-10-11"].map((d) => on(d));
    const pushedTuesday = pushedOn("2026-10-06");
    expect(
      outs(
        publish([on("2026-10-06")], staged, new Map(), {
          pushed: pushedTuesday,
          now,
        }),
      ),
    ).toEqual([
      ["2026-10-06", undefined],
      ["2026-10-07", "2026-10-11"],
      ["2026-10-08", "2026-10-11"],
      ["2026-10-11", undefined],
    ]);
  });

  test("leaves today's and upcoming days out on their own dates", () => {
    const staged = [on("2026-10-12"), on("2026-10-13")];
    expect(
      outs(publish(published, staged, new Map(), { pushed, now })).slice(-2),
    ).toEqual([
      ["2026-10-12", undefined],
      ["2026-10-13", undefined],
    ]);
  });

  test("keeps the day a published puzzle came out when it's edited", () => {
    const caughtUp = [...published, { ...on("2026-10-10"), out: "2026-10-11" }];
    const puzzles = publish(caughtUp, [edited("2026-10-10")], new Map(), {
      pushed,
      now,
    });
    expect(puzzles[1]).toMatchObject({ date: "2026-10-10", out: "2026-10-11" });
    expect(
      publish(published, [edited("2026-10-09")], new Map(), { pushed, now })[0]
        .out,
    ).toBeUndefined();
  });

  test("puts one back on a day that was pushed and taken down, not caught up", () => {
    expect(
      outs(
        publish([on("2026-10-11")], [on("2026-10-09")], new Map(), {
          pushed,
          now,
        }),
      ),
    ).toEqual([
      ["2026-10-09", undefined],
      ["2026-10-11", undefined],
    ]);
  });

  test("still brings it out today after today's push, and leaves the days pushed alone", () => {
    const sundayPushed = pushedOn("2026-10-09", "2026-10-11");
    expect(
      outs(
        publish(published, [on("2026-10-10")], new Map(), {
          pushed: sundayPushed,
          now,
        }),
      ),
    ).toEqual([
      ["2026-10-09", undefined],
      ["2026-10-10", "2026-10-11"],
      ["2026-10-11", undefined],
    ]);
    // Even a missed day from before Friday's push comes out today.
    expect(
      outs(
        publish(published, [on("2026-10-08")], new Map(), {
          pushed: sundayPushed,
          now,
        }),
      )[0],
    ).toEqual(["2026-10-08", "2026-10-11"]);
  });

  test("puts a pushed missed day's back on the day it came out, so no number moves", () => {
    // Saturday's was caught up Sunday evening, pushed at 8pm, then taken
    // down; it comes back out on Sunday, after Sunday's.
    const sundayEvening = new Date("2026-10-12T00:00:00Z");
    const pushedBoth = new Map([
      ...pushedOn("2026-10-09", "2026-10-11"),
      ["2026-10-10", sundayEvening],
    ]);
    expect(
      outs(
        publish(published, [on("2026-10-10")], new Map(), {
          pushed: pushedBoth,
          now: new Date("2026-10-12T02:00:00Z"),
        }),
      ),
    ).toEqual([
      ["2026-10-09", undefined],
      ["2026-10-10", "2026-10-11"],
      ["2026-10-11", undefined],
    ]);
  });

  test("never catches up on a published day, when it's edited or its push line changes", () => {
    const fridayLine = { ...on("2026-10-09"), push: "New line" };
    for (const staged of [edited("2026-10-09"), fridayLine])
      expect(
        outs(publish(published, [staged], new Map(), { pushed, now }))[0],
      ).toEqual(["2026-10-09", undefined]);
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
    expect(timing("2026-10-02", "new", {}, night)).toBe(
      "It goes live at midnight New York time on Fri, Oct 2, with its push at 9:12am.",
    );
  });

  test("a puzzle for today goes live now, and pushes at 9:12 or right away", () => {
    expect(
      timing("2026-10-01", "new", {}, new Date("2026-10-01T12:00:00Z")),
    ).toBe("It goes live right away, with its push at 9:12am.");
    expect(timing("2026-10-01", "new", {}, night)).toBe(
      "It goes live and pushes right away.",
    );
  });

  test("changing a puzzle that's out never pushes again", () => {
    expect(timing("2026-10-01", "edit", { pushed: true }, night)).toBe(
      "It's out already, so the change is live right away. A puzzle never pushes twice.",
    );
    expect(timing("2026-10-02", "edit", {}, night)).toContain("push at 9:12am");
  });

  test("a new push line for today goes out if its push hasn't", () => {
    expect(
      timing("2026-10-01", "push", {}, new Date("2026-10-01T12:00:00Z")),
    ).toBe("Its push goes out at 9:12am.");
    expect(timing("2026-10-01", "push", {}, night)).toBe(
      "Its push goes out right away.",
    );
    expect(timing("2026-10-01", "push", { pushed: true }, night)).toContain(
      "A puzzle never pushes twice.",
    );
  });

  test("a missed day's that joins today's after their push gets its own, as an extra puzzle", () => {
    expect(timing("2026-10-01", "new", { extra: true }, night)).toBe(
      "It goes live and pushes right away, as an extra puzzle: today's push went out already. It counts for a day from its own push.",
    );
  });

  test("a puzzle put back after its push gets none", () => {
    expect(timing("2026-10-01", "new", { pushed: true }, night)).toBe(
      "It's back as it was, with no new push: its push went out already.",
    );
  });
});
