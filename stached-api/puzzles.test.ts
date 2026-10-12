import { describe, expect, test } from "bun:test";
import {
  announceDue,
  type DayPuzzle,
  kindOf,
  problemsOf,
  publish,
  puzzleProblems,
  timing,
  unpublish,
} from "./puzzles";
import examples from "./puzzles.example.json";

// The made-up sample, and one change to it at a time.
const SAMPLE = examples[0] as DayPuzzle;
const problems = (change: (puzzle: DayPuzzle) => void) => {
  const puzzle = structuredClone(SAMPLE);
  change(puzzle);
  return puzzleProblems([puzzle]);
};

describe("a puzzle's rules", () => {
  test("the sample puzzles pass", () => {
    expect(puzzleProblems(examples)).toEqual([]);
  });

  test("a puzzle needs a real date, and its own", () => {
    expect(problems((p) => (p.date = "2026-02-30"))).toEqual([
      "Puzzle 1: It needs a date like 2026-10-02",
    ]);
    expect(problems((p) => (p.date = "Oct 2"))).toHaveLength(1);
    expect(puzzleProblems([SAMPLE, SAMPLE])).toEqual([
      "2026-01-01: Another puzzle has its date",
    ]);
  });

  test("every group needs a title and four words", () => {
    expect(problems((p) => p.groups[0].words.pop())).toEqual([
      "2026-01-01: Group 1 needs four words",
    ]);
    expect(problems((p) => (p.groups[0].words[0] = " "))).toEqual([
      "2026-01-01: Group 1 needs four words",
    ]);
    expect(problems((p) => (p.groups[1].title = ""))).toEqual([
      "2026-01-01: Group 2 needs a title",
    ]);
  });

  test("no word twice, even in another case", () => {
    expect(problems((p) => (p.groups[1].words[0] = "waffle "))).toEqual([
      "2026-01-01: “Waffle” is in it twice",
    ]);
  });

  test("no two groups with one title", () => {
    expect(problems((p) => (p.groups[1].title = p.groups[0].title))).toEqual([
      `2026-01-01: Two groups are called “${SAMPLE.groups[0].title}”`,
    ]);
  });

  test("exactly one stache group", () => {
    expect(problems((p) => delete p.groups[3].stache)).toEqual([
      "2026-01-01: It needs exactly one stache group",
    ]);
    expect(problems((p) => (p.groups[0].stache = true))).toEqual([
      "2026-01-01: It needs exactly one stache group",
    ]);
  });

  test("at most a group per color, plus the stache", () => {
    const extra = (n: number) => ({
      title: `Extra ${n}`,
      words: [1, 2, 3, 4].map((w) => `Extra ${n}.${w}`),
    });
    expect(problems((p) => p.groups.push(extra(1)))).toEqual([]);
    expect(problems((p) => p.groups.push(extra(1), extra(2)))).toEqual([
      "2026-01-01: 5 groups at most, not 6",
    ]);
  });

  test("a push line, if any, is text", () => {
    expect(problems((p) => (p.push = "Read all about it"))).toEqual([]);
    expect(problems((p) => (p.push = " "))).toEqual([
      "2026-01-01: Its push line needs to be text",
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
    expect(puzzleProblems([null])).toEqual([
      "Puzzle 1: It needs a date like 2026-10-02",
      "Puzzle 1: It needs groups",
    ]);
  });

  test("each problem says where it is, for the admin page to mark", () => {
    const puzzle = structuredClone(SAMPLE);
    puzzle.groups[2].title = " ";
    puzzle.groups[0].words[3] = "";
    puzzle.groups[1].words[2] = puzzle.groups[3].words[0].toUpperCase();
    delete puzzle.groups[3].stache;
    expect(problemsOf(puzzle).map((p) => p.spots)).toEqual([
      ["w:0:3"],
      ["t:2"],
      ["w:1:2", "w:3:0"],
      ["stache"],
    ]);
  });
});

// The sample, published on two days.
const on = (date: string, puzzle = SAMPLE): DayPuzzle => ({ ...puzzle, date });
const PUBLISHED = [on("2026-10-01"), on("2026-10-02")];
const edited = (date: string) => {
  const puzzle = structuredClone(on(date));
  puzzle.groups[0].words[0] = "Crumpet";
  return puzzle;
};

describe("publishing a puzzle", () => {
  test("adds a new day in date order", () => {
    const { puzzles, kind } = publish(PUBLISHED, on("2026-09-30"), new Map());
    expect(kind).toBe("new");
    expect(puzzles.map((p) => p.date)).toEqual([
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  test("leaves a puzzle published word for word as it was", () => {
    // The same puzzle spelled differently: keys reordered, stache: false,
    // stray spaces.
    const respelled = {
      date: "2026-10-01",
      groups: SAMPLE.groups.map(({ title, words, stache }) => ({
        stache: stache ?? false,
        words: words.map((word) => `${word} `),
        title: ` ${title}`,
      })),
      push: " ",
    };
    expect(kindOf(respelled, PUBLISHED[0])).toBe("same");
    const games = new Map([["2026-10-01", 5]]);
    expect(publish(PUBLISHED, respelled, games).puzzles).toBe(PUBLISHED);
  });

  test("replaces a published puzzle nobody has played", () => {
    const { puzzles, kind } = publish(
      PUBLISHED,
      edited("2026-10-02"),
      new Map(),
    );
    expect(kind).toBe("edit");
    expect(puzzles[1].groups[0].words[0]).toBe("Crumpet");
  });

  test("changes only the push line of a puzzle people have played", () => {
    // Its groups stay spelled as the file has them (stray spaces, stache:
    // false), so Postgres sees no edit and keeps its games.
    const old = {
      ...on("2026-10-01"),
      groups: SAMPLE.groups.map((g) => ({
        ...g,
        title: `${g.title} `,
        stache: g.stache ?? false,
      })),
    };
    const games = new Map([["2026-10-01", 3]]);
    const pushed = { ...on("2026-10-01"), push: "Read all about it" };
    expect(kindOf(pushed, old)).toBe("push");
    const [now] = publish([old, PUBLISHED[1]], pushed, games).puzzles;
    expect(now).toEqual({ ...old, push: "Read all about it" });
  });

  test("refuses to change a puzzle people have played", () => {
    const games = new Map([["2026-10-01", 3]]);
    expect(() => publish(PUBLISHED, edited("2026-10-01"), games)).toThrow(
      /Refusing to change a published puzzle[\s\S]*Thu, Oct 1 \(2026-10-01\): 3 games/,
    );
  });

  test("changes it anyway, deleting games", () => {
    const games = new Map([["2026-10-01", 3]]);
    const { puzzles } = publish(PUBLISHED, edited("2026-10-01"), games, {
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
      /Refusing to remove it[\s\S]*1 game$/,
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

// 9:12am in New York on Friday, October 2 (daylight time), and on Monday,
// November 2 (standard time).
const FRI_912 = new Date("2026-10-02T13:12:00Z");
const MON_912 = new Date("2026-11-02T14:12:00Z");
const minutes = (date: Date, n: number) =>
  new Date(date.getTime() + n * 60_000);

describe("a puzzle's push", () => {
  test("is due from 9:12am New York time on its date", () => {
    const due = (date: string, now: Date) => announceDue(date, "09:12", now);
    expect(due("2026-10-02", minutes(FRI_912, -1))).toBe(false);
    expect(due("2026-10-02", FRI_912)).toBe(true);
    expect(due("2026-10-02", minutes(FRI_912, 14 * 60))).toBe(true);
    expect(due("2026-11-02", minutes(MON_912, -1))).toBe(false);
    expect(due("2026-11-02", MON_912)).toBe(true);
  });

  test("isn't due on any other day", () => {
    expect(announceDue("2026-10-03", "09:12", FRI_912)).toBe(false);
    expect(announceDue("2026-10-01", "09:12", FRI_912)).toBe(false);
  });
});

describe("timing", () => {
  // 11pm in New York on Thursday, October 1.
  const night = new Date("2026-10-02T03:00:00Z");
  const noon = new Date("2026-10-01T16:00:00Z");
  const at = "09:12";

  test("a puzzle published the night before goes live at midnight, its push at 9:12", () => {
    expect(timing("2026-10-02", "new", at, night)).toBe(
      "It goes live at midnight New York time on Fri, Oct 2, with its push at 9:12am.",
    );
  });

  test("a puzzle for today goes live now, and pushes at 9:12 or right away", () => {
    expect(
      timing("2026-10-01", "new", at, new Date("2026-10-01T12:00:00Z")),
    ).toBe("It goes live right away, with its push at 9:12am.");
    expect(timing("2026-10-01", "new", at, night)).toBe(
      "It goes live and pushes right away.",
    );
  });

  test("changing a puzzle that's out never pushes again", () => {
    expect(timing("2026-10-01", "edit", at, night)).toBe(
      "It's out already, so the change is live right away. A puzzle never pushes twice.",
    );
    expect(timing("2026-10-02", "edit", at, night)).toContain("push at 9:12am");
  });

  test("changing today's puzzle before its push still pushes at 9:12", () => {
    expect(
      timing("2026-10-01", "edit", at, new Date("2026-10-01T12:00:00Z")),
    ).toBe(
      "It's out already, so the change is live right away. Its push goes out at 9:12am.",
    );
  });

  test("a new push line for today goes out if its push hasn't", () => {
    expect(
      timing("2026-10-01", "push", at, new Date("2026-10-01T12:00:00Z")),
    ).toBe("The new line goes out with its push at 9:12am.");
    expect(timing("2026-10-01", "push", at, noon)).toContain(
      "A puzzle never pushes twice.",
    );
  });

  test("a puzzle dated before today gets no push", () => {
    expect(timing("2026-09-30", "new", at, night)).toBe(
      "It's dated before today, so it gets no push.",
    );
  });

  test("the push time follows the API's", () => {
    expect(timing("2026-10-02", "new", "00:00", night)).toContain(
      "with its push at 12:00am.",
    );
  });
});
