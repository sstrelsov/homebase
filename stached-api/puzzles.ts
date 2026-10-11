// Puzzles and their rules: what makes a puzzle, what publishing one changes,
// and when it goes live and pushes. Plain TypeScript with no Bun, so the API,
// the puzzle CLI and the admin page (src/stached/stage/) share one set of
// rules. The puzzles file and Postgres are schedule.ts.

export interface Group {
  title: string;
  words: string[];
  stache?: boolean;
}

/** A day's puzzle, as the file has it. */
export interface DayPuzzle {
  date: string;
  groups: Group[];
  /** Its push notification's line, in place of a random quote from home. */
  push?: string | null;
}

// Color slots for the non-stache groups, easiest first, like Connections.
// Each theme paints them its own way.
export const COLORS = ["1", "2", "3", "4"];

const isDate = (date: unknown): date is string =>
  typeof date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  !Number.isNaN(Date.parse(date)) &&
  new Date(date).toISOString().startsWith(date);

const isText = (text: unknown): text is string =>
  typeof text === "string" && text.trim() !== "";

// "Snow" and " snow" are the same word on the board.
const fold = (text: string) => text.trim().toLowerCase();

/**
 * Where a problem is, for the admin page to mark: the date, the push line,
 * the stache group, the groups as a whole, a group's title (t:1) or one of
 * its words (w:1:3), by place in the file.
 */
export type Spot =
  | "date"
  | "push"
  | "stache"
  | "groups"
  | `t:${number}`
  | `w:${number}:${number}`;

export interface Problem {
  text: string;
  spots: Spot[];
}

/** Each text that appears more than once (ignoring case), and where. */
function repeats(items: { text: unknown; spot: Spot }[]) {
  const seen = new Map<string, { text: string; spots: Spot[] }>();
  for (const { text, spot } of items) {
    if (!isText(text)) continue;
    const found = seen.get(fold(text)) ?? { text: text.trim(), spots: [] };
    seen.set(fold(text), { ...found, spots: [...found.spots, spot] });
  }
  return [...seen.values()].filter(({ spots }) => spots.length > 1);
}

/** Everything wrong with one puzzle, and where; empty if nothing. */
export function problemsOf(puzzle: unknown): Problem[] {
  const { date, groups, push } = (puzzle ?? {}) as Record<string, unknown>;
  const problems: Problem[] = [];
  const problem = (text: string, ...spots: Spot[]) =>
    problems.push({ text, spots });
  if (!isDate(date)) problem("It needs a date like 2026-10-02", "date");
  if (push != null && !isText(push))
    problem("Its push line needs to be text", "push");
  if (!Array.isArray(groups) || groups.length === 0) {
    problem("It needs groups", "groups");
    return problems;
  }
  const words: unknown[][] = groups.map((g) =>
    Array.isArray(g?.words) ? g.words : [],
  );
  groups.forEach((g, i) => {
    if (!isText(g?.title)) problem(`Group ${i + 1} needs a title`, `t:${i}`);
    const holes = [0, 1, 2, 3].filter((j) => !isText(words[i][j]));
    if (holes.length || words[i].length !== 4)
      problem(
        `Group ${i + 1} needs four words`,
        ...holes.map((j): Spot => `w:${i}:${j}`),
      );
  });
  const allWords = words.flatMap((row, i) =>
    row.map((text, j) => ({ text, spot: `w:${i}:${j}` as Spot })),
  );
  for (const { text, spots } of repeats(allWords))
    problem(`“${text}” is in it twice`, ...spots);
  const titles = groups.map((g, i) => ({
    text: g?.title,
    spot: `t:${i}` as Spot,
  }));
  for (const { text, spots } of repeats(titles))
    problem(`Two groups are called “${text}”`, ...spots);
  if (groups.filter((g) => g?.stache === true).length !== 1)
    problem("It needs exactly one stache group", "stache");
  if (groups.length > COLORS.length + 1)
    problem(`Five groups at most, not ${groups.length}`, "groups");
  return problems;
}

/** Everything wrong with a list of puzzles, one line each; empty if nothing. */
export function puzzleProblems(puzzles: unknown): string[] {
  if (!Array.isArray(puzzles)) return ["Expected a list of puzzles"];
  const dates = new Set<string>();
  return puzzles.flatMap((puzzle, i) => {
    const date = puzzle?.date;
    const texts = problemsOf(puzzle).map((p) => p.text);
    if (isDate(date) && dates.has(date))
      texts.push("Another puzzle has its date");
    if (isDate(date)) dates.add(date);
    return texts.map(
      (text) => `${isDate(date) ? date : `Puzzle ${i + 1}`}: ${text}`,
    );
  });
}

export const byDate = (a: DayPuzzle, b: DayPuzzle) =>
  a.date.localeCompare(b.date);

/**
 * A puzzle kept plain: its date, each group's title, words and stache flag,
 * and its push line.
 */
export const plain = ({ date, groups, push }: DayPuzzle): DayPuzzle => ({
  date,
  groups: groups.map(({ title, words, stache }) => ({
    title,
    words,
    ...(stache && { stache: true }),
  })),
  ...(push && { push }),
});

/** The same groups, give or take how their JSON is spelled. */
const sameGroups = (a: DayPuzzle, b: DayPuzzle) =>
  JSON.stringify(plain(a).groups) === JSON.stringify(plain(b).groups);

/**
 * What publishing a puzzle does to the published one in its place: adds a
 * new one, edits its words, changes only its push line (which keeps its
 * games), or nothing.
 */
export type Kind = "new" | "edit" | "push" | "same";

export function kindOf(puzzle: DayPuzzle, old: DayPuzzle | undefined): Kind {
  if (!old) return "new";
  if (!sameGroups(old, puzzle)) return "edit";
  return (old.push ?? null) !== (puzzle.push ?? null) ? "push" : "same";
}

/** A message for whoever asked (the CLI's user, the admin page), not a crash. */
export class Stop extends Error {}

/** Publishing or removing a puzzle would delete people's games. */
export class Played extends Stop {}

/** "Fri, Oct 2" */
export const dayName = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Refuses to delete anyone's games unless told to. */
function guard(
  date: string,
  games: number,
  verb: string,
  deleteGames: boolean,
) {
  if (!games || deleteGames) return;
  throw new Played(
    `Refusing to ${verb}: people have played it, and their games would be deleted.\n  ${dayName(date)} (${date}): ${plural(games, "game")}`,
  );
}

/**
 * The puzzles file once a puzzle is published: added, or in place of the
 * one in its place. Games on an edited puzzle are deleted, so it refuses
 * without deleteGames.
 */
export function publish(
  published: DayPuzzle[],
  puzzle: DayPuzzle,
  games: Map<string, number>,
  { deleteGames = false } = {},
) {
  const old = published.find((p) => p.date === puzzle.date);
  const kind = kindOf(puzzle, old);
  guard(
    puzzle.date,
    kind === "edit" ? (games.get(puzzle.date) ?? 0) : 0,
    "change a published puzzle",
    deleteGames,
  );
  if (kind === "same") return published;
  return [...published.filter((p) => p !== old), plain(puzzle)].sort(byDate);
}

/** The puzzles file without one puzzle. */
export function unpublish(
  published: DayPuzzle[],
  date: string,
  games: Map<string, number>,
  { deleteGames = false } = {},
) {
  const puzzle = published.find((p) => p.date === date);
  if (!puzzle) throw new Stop(`No published puzzle on ${date}.`);
  if (published.length === 1)
    throw new Stop(
      "It's the only puzzle. Stage and confirm a replacement for it instead.",
    );
  guard(date, games.get(date) ?? 0, "remove it", deleteGames);
  return published.filter((p) => p !== puzzle);
}

const NEW_YORK = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The time in New York as "2026-10-02 09:12", which sorts as text. */
export function newYorkTime(now = new Date()) {
  const part = Object.fromEntries(
    NEW_YORK.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}`;
}

/** Today's date in New York, where every puzzle's day starts and ends. */
export const newYorkDate = (now = new Date()) => newYorkTime(now).slice(0, 10);

/**
 * Whether a puzzle's push is due: on its date, from `at` New York time
 * (ANNOUNCE_AT, 9:12am on the live game).
 */
export function announceDue(date: string, at: string, now = new Date()) {
  const time = newYorkTime(now);
  return time.startsWith(date) && time >= `${date} ${at}`;
}

/** "09:12" → "9:12am" */
export function clockTime(at: string) {
  const [hour, minute] = at.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
}

/**
 * When a puzzle published now goes live, and when its push goes out (at
 * `at`, New York time, on its date).
 */
export function timing(date: string, kind: Kind, at: string, now = new Date()) {
  const today = newYorkDate(now);
  const due = announceDue(date, at, now);
  if (kind === "push" && date === today && !due)
    return `The new line goes out with its push at ${clockTime(at)}.`;
  if (kind !== "new" && date <= today)
    return "It's out already, so the change is live right away. A puzzle never pushes twice.";
  if (date < today) return "It's dated before today, so it gets no push.";
  if (date > today)
    return `It goes live at midnight New York time on ${dayName(date)}, with its push at ${clockTime(at)}.`;
  return due
    ? "It goes live and pushes right away."
    : `It goes live right away, with its push at ${clockTime(at)}.`;
}
