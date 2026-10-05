// Made-up puzzles, players and games for the admin mockups. Never real ones:
// this repo is public. Dates count from today in New York, so the schedule
// always looks current.
import type { AdminGame, AdminStats, Color } from "../api";
import { addDays, type Draft, type Entry, group, TODAY } from "./rules";

/** What Spencer pastes: rough, in any shape. */
export const PASTE = `cookies: chocolate chip, oatmeal, sugar, snickerdoodle / martinis: dirty, dry, vesper, espresso
things w keys - piano, map, keyboard, florida
stache ones: pencil, imperial, toothbrush, english
notif: Shaken, stirred, or dunked?`;

/** Haiku's answer to PASTE: four rows, the stache group last, and the push. */
export const organized = (date: string): Draft => ({
  date,
  groups: [
    group("Cookies", ["Chocolate chip", "Oatmeal", "Sugar", "Snickerdoodle"]),
    group("Martinis", ["Dirty", "Dry", "Vesper", "Espresso"]),
    group("Things with keys", ["Piano", "Map", "Keyboard", "Florida"]),
    group(
      "Mustache styles",
      ["Pencil", "Imperial", "Toothbrush", "English"],
      true,
    ),
  ],
  push: "Shaken, stirred, or dunked?",
});

/** A messier answer, with problems the server would refuse. */
export const withProblems = (date: string): Draft => ({
  date,
  groups: [
    group("Cookies", ["Chocolate chip", "Oatmeal", "Sugar", "Snickerdoodle"]),
    group("Martinis", ["Dirty", "Dry", "Vesper", "Espresso"]),
    group("Coffee drinks", ["Latte", "Mocha", "Espresso", ""]),
    // Haiku couldn't tell which group is the stache one.
    group("Mustache styles", ["Pencil", "Imperial", "Toothbrush", "English"]),
  ],
  push: "",
});

/** Six groups, two of them Cookies. */
export const tooMany = (date: string): Draft => ({
  date,
  groups: [
    group("Cookies", ["Chocolate chip", "Oatmeal", "Sugar", "Snickerdoodle"]),
    group("Martinis", ["Dirty", "Dry", "Vesper", "Espresso"]),
    group("Things with keys", ["Piano", "Map", "Keyboard", "Florida"]),
    group("Coffee drinks", ["Latte", "Mocha", "Cortado", "Flat white"]),
    group("Cookies", ["Fortune", "Ginger", "Butter", "Shortbread"]),
    group(
      "Mustache styles",
      ["Pencil", "Imperial", "Toothbrush", "English"],
      true,
    ),
  ],
  push: "",
});

/** A board to type into, for when there's nothing to paste. */
export const blank = (date: string): Draft => ({
  date,
  groups: [group(), group(), group(), group("", undefined, true)],
  push: "",
});

const LIVE: Draft = {
  date: TODAY,
  groups: [
    group("Pizza toppings", ["Pepperoni", "Olive", "Onion", "Basil"]),
    group("Dances", ["Tango", "Salsa", "Polka", "Waltz"]),
    group("___fish", ["Sword", "Cat", "Star", "Jelly"]),
    group(
      "Cartoon mustaches",
      ["Mario", "Yosemite Sam", "Monopoly", "Flanders"],
      true,
    ),
  ],
  push: "Grab a slice and dance it off",
};

// The past runs: made-up players and their share grids, the same every load.
const NAMES = [
  "Bea",
  "Cat",
  "Dev",
  "Juno",
  "Kit",
  "Marco",
  "Nadia",
  "Ollie",
  "Priya",
  "Rosa",
  "Sam",
  "Theo",
  "Vic",
  "Wren",
];

/** A seeded coin, so the grids don't change between loads. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const COLORS: Color[] = ["1", "2", "3", "stache"];

/** Who plays in the home-screen app. */
const HOME_SCREEN = ["Bea", "Juno", "Kit", "Priya", "Sam", "Wren"];

/** One finished game: wrong guesses mixed in, until it's solved or lost. */
function game(name: string, random: () => number, late: boolean): AdminGame {
  const order = [...COLORS].sort(() => random() - 0.5);
  const grid: Color[][] = [];
  let mistakes = 0;
  let bonus = false;
  for (const color of order) {
    while (random() < 0.32 && mistakes < 4 + Number(bonus)) {
      const other = COLORS.find((c) => c !== color && random() < 0.5) ?? "1";
      grid.push([color, color, color, other].sort(() => random() - 0.5));
      mistakes++;
    }
    if (mistakes === 4 + Number(bonus)) break;
    grid.push([color, color, color, color]);
    if (color === "stache") bonus = true;
  }
  const completed = grid.filter((row) => new Set(row).size === 1).length === 4;
  return {
    name,
    completed,
    mistakes,
    stachedMs: bonus ? Math.round(18_000 + random() * 200_000) : null,
    late,
    homeScreen: HOME_SCREEN.includes(name),
    dark: random() < 0.3,
    afterPush: !late && HOME_SCREEN.includes(name) && random() < 0.5,
    grid,
  };
}

/** Fifteen puzzles out so far, today's the newest. */
const OUT = Array.from({ length: 15 }, (_, i) => addDays(TODAY, i - 14));

export const STATS: AdminStats = {
  players: NAMES.length,
  playedThisWeek: 9,
  notifications: 6,
  homeScreen: HOME_SCREEN,
  puzzles: OUT.map((date, i) => {
    const random = seeded(i + 7);
    const games = NAMES.filter(() => random() < 0.7).map((name) =>
      game(name, random, date < TODAY && random() < 0.12),
    );
    const onDay = games.filter((g) => !g.late);
    return {
      number: i + 1,
      date,
      played: onDay.length,
      solved: onDay.filter((g) => g.completed).length,
      late: games.length - onDay.length,
      afterPush: games.filter((g) => g.afterPush).length,
      games,
    };
  }).reverse(),
};

const gamesOn = (date: string) =>
  STATS.puzzles.find((p) => p.date === date)?.games.length ?? 0;

/**
 * Every puzzle, published and drafted: those out so far (only today's needs
 * its words), tomorrow's waiting, and a draft for the day after next.
 */
export const SCHEDULE: Entry[] = [
  ...OUT.map((date) => ({
    ...(date === TODAY ? LIVE : { date, groups: [], push: "" }),
    status: "published" as const,
    games: gamesOn(date),
  })),
  {
    date: addDays(TODAY, 1),
    groups: [
      group("Poker terms", ["Flop", "River", "Turn", "Blind"]),
      group("Things with shells", ["Taco", "Turtle", "Egg", "Snail"]),
      group("Rainbow", ["Red", "Indigo", "Violet", "Orange"]),
      group("Handlebar ___", ["Mustache", "Grips", "Tape", "Bag"], true),
    ],
    push: "",
    status: "published",
    games: 0,
  },
  {
    date: addDays(TODAY, 3),
    groups: [
      group("Board games", ["Risk", "Clue", "Sorry", "Life"]),
      group("Pasta shapes", ["Penne", "Fusilli", "Orzo", "Farfalle"]),
      group("Greek letters", ["Delta", "Sigma", "Omega", "Gamma"]),
      group("In a mustache wax", ["Beeswax", "Lanolin", "Shea", "Rosin"], true),
    ],
    push: "Roll the dice, then wax on",
    status: "draft",
    games: 0,
  },
];
