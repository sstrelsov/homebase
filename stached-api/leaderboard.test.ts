import { describe, expect, test } from "bun:test";
import { type Day, type Game, leaderboardOf } from "./leaderboard";

// Eight made-up puzzles out so far, #1 to #8; #8 is today's. The week is the
// last seven, #2 to #8. Every name here is made up.
const DATES = [
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
];
const DAYS: Day[] = DATES.map((date, i) => ({
  id: i + 1,
  number: i + 1,
  date,
}));
const TODAY = 8;

const game = (
  name: string,
  puzzleId: number,
  completed: boolean | null,
  seconds: number | null,
): Game => ({
  name,
  puzzleId,
  completed,
  stachedMs: seconds === null ? null : seconds * 1000,
  late: false,
});
/** Solved, with its stache time in seconds (a solve always finds the stache). */
const solved = (name: string, day: number, seconds: number) =>
  game(name, day, true, seconds);
/** Missed, with a stache time if it found the stache. */
const missed = (name: string, day: number, seconds: number | null = null) =>
  game(name, day, false, seconds);
/** Still playing, with a stache time if it has found the stache. */
const playing = (name: string, day: number, seconds: number | null = null) =>
  game(name, day, null, seconds);
const late = (played: Game): Game => ({ ...played, late: true });

const board = (...games: Game[]) => leaderboardOf(DAYS, games);
const player = (games: Game[], name: string) =>
  board(...games).players.find((p) => p.name === name);

describe("the ranking", () => {
  test("is a point per solve and per fastest stache; ties share a place, by name", () => {
    const { players } = board(
      solved("Bo", 2, 30), // #2's fastest
      solved("Bo", 3, 60),
      solved("Cy", 2, 40),
      missed("Cy", 4, 65), // #4's fastest, on a miss
      solved("Ada", 3, 50), // #3's fastest
      solved("Ada", 4, 70),
      missed("Di", 5),
    );
    expect(
      players.map(({ rank, name, solved, fastest, points }) => ({
        rank,
        name,
        solved,
        fastest,
        points,
      })),
    ).toEqual([
      { rank: 1, name: "Ada", solved: 2, fastest: 1, points: 3 },
      { rank: 1, name: "Bo", solved: 2, fastest: 1, points: 3 },
      { rank: 3, name: "Cy", solved: 1, fastest: 1, points: 2 },
      { rank: 4, name: "Di", solved: 0, fastest: 0, points: 0 },
    ]);
    expect(players[0].marks).toEqual([
      "none",
      "won",
      "solved",
      "none",
      "none",
      "none",
      "open",
    ]);
    expect(players[2].marks.slice(0, 3)).toEqual([
      "solved",
      "none",
      "won-missed",
    ]);
  });

  test("shares the day's fastest stache on a tie, solved or not", () => {
    const { fastestToday, players } = board(
      solved("Gus", TODAY, 50),
      missed("Flo", TODAY, 42),
      solved("Ev", TODAY, 42),
    );
    expect(fastestToday).toEqual([
      { name: "Ev", stachedMs: 42_000, solved: true },
      { name: "Flo", stachedMs: 42_000, solved: false },
    ]);
    expect(
      players.map(({ rank, name, marks }) => [rank, name, marks.at(-1)]),
    ).toEqual([
      [1, "Ev", "won"],
      [2, "Flo", "won-missed"],
      [2, "Gus", "solved"],
    ]);
  });

  test("lists a player with only losses, below a solve", () => {
    const { players } = board(
      missed("Ozzie", 7, 20), // #7's fastest stache, on a loss
      solved("Pat", 6, 40),
      solved("Pat", 7, 30),
      missed("Quin", 6),
    );
    expect(
      players.map(({ rank, name, points, marks }) => [
        rank,
        name,
        points,
        marks.slice(4, 6),
      ]),
    ).toEqual([
      [1, "Pat", 3, ["won", "solved"]],
      [2, "Ozzie", 1, ["none", "won-missed"]],
      [3, "Quin", 0, ["missed", "none"]],
    ]);
  });
});

describe("a game in progress", () => {
  const games = [
    playing("Hal", TODAY, 10), // found the stache first, still playing
    solved("Ivy", TODAY, 30),
    solved("Jo", 7, 40),
    playing("Jo", TODAY, 5),
  ];

  test("is open today, and its stache time doesn't count yet", () => {
    const { fastestToday, players } = board(...games);
    expect(fastestToday).toEqual([
      { name: "Ivy", stachedMs: 30_000, solved: true },
    ]);
    expect(players.find((p) => p.name === "Jo")?.marks.slice(-2)).toEqual([
      "won",
      "open",
    ]);
  });

  test("doesn't list a player with nothing else finished this week", () => {
    expect(player(games, "Hal")).toBeUndefined();
  });

  test("doesn't break a streak until it's finished", () => {
    const streaks = (...games: Game[]) =>
      board(...games).players.map(({ name, streak }) => [name, streak]);
    const before = [solved("Rae", 6, 50), solved("Rae", 7, 50)];
    expect(streaks(...before)).toEqual([["Rae", 2]]);
    expect(streaks(...before, playing("Rae", TODAY, 9))).toEqual([["Rae", 2]]);
    expect(streaks(...before, solved("Rae", TODAY, 9))).toEqual([["Rae", 3]]);
    expect(streaks(...before, missed("Rae", TODAY, 9))).toEqual([["Rae", 0]]);
  });
});

test("players who skip days get a dot, and their streak restarts", () => {
  const kit = player(
    [
      solved("Kit", 2, 60),
      solved("Kit", 3, 60),
      solved("Kit", 5, 60),
      solved("Kit", 6, 60),
      solved("Kit", TODAY, 60),
      solved("Lu", 2, 70),
    ],
    "Kit",
  );
  expect(kit?.marks).toEqual([
    "won",
    "won",
    "none",
    "won",
    "won",
    "none",
    "won",
  ]);
  expect(kit?.points).toBe(10);
  expect(kit?.streak).toBe(1);
});

test("late games never count", () => {
  const games = [
    late(solved("Max", 7, 5)), // the fastest, but played late
    solved("Ned", 7, 30),
    late(solved("Ned", 6, 20)),
  ];
  expect(player(games, "Max")).toBeUndefined();
  const ned = player(games, "Ned");
  expect(ned?.marks.slice(-3)).toEqual(["none", "won", "open"]);
  expect(ned?.points).toBe(2);
  expect(ned?.streak).toBe(1);
  expect(board(late(solved("Max", TODAY, 5))).fastestToday).toEqual([]);
});

test("a puzzle not out yet never shows, nor do its games or words", () => {
  // As if a query brought every column, the words too.
  const days = DAYS.map((day) => ({
    ...day,
    groups: [{ title: "Secret", words: ["FUTURE"] }],
  }));
  const result = leaderboardOf(days, [
    solved("Oli", 9, 1), // #9 isn't out
    solved("Uma", TODAY, 50),
  ]);
  expect(result.days).toEqual(
    DAYS.slice(1).map(({ number, date }) => ({ number, date })),
  );
  expect(result.players.map((p) => p.name)).toEqual(["Uma"]);
  expect(result.fastestToday.map((f) => f.name)).toEqual(["Uma"]);
  expect(JSON.stringify(result)).not.toContain("FUTURE");
});

test("the week is the last 7 puzzles, but a streak runs back further", () => {
  const pia = player(
    DAYS.map((day) => solved("Pia", day.id, 45)),
    "Pia",
  );
  expect(pia?.marks).toEqual(Array(7).fill("won"));
  expect(pia?.solved).toBe(7);
  expect(pia?.points).toBe(14);
  expect(pia?.streak).toBe(8);
});

test("is empty before anyone finishes, or any puzzle is out", () => {
  expect(board(playing("Vi", TODAY, 12))).toEqual({
    days: DAYS.slice(1).map(({ number, date }) => ({ number, date })),
    fastestToday: [],
    players: [],
  });
  expect(leaderboardOf([], [solved("Vi", 1, 12)])).toEqual({
    days: [],
    fastestToday: [],
    players: [],
  });
});
