// The puzzles file and its rules, shared by the API and the puzzle CLI. The
// real file lives on the Studio (PUZZLES_FILE), outside this public repo;
// puzzles.example.json holds made-up ones. Postgres mirrors it.
import { sql } from "bun";

export interface Group {
  title: string;
  words: string[];
  stache?: boolean;
}

/** A day's puzzle, as the file has it. */
export interface DayPuzzle {
  date: string;
  /**
   * Which of its date's puzzles it is, played in that order: 1 (the default),
   * or 2 and up on a date with more than one, to catch up after a missed day.
   */
  part?: number;
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

const isPart = (part: unknown): part is number =>
  Number.isInteger(part) && (part as number) >= 1;

export const partOf = (puzzle: Pick<DayPuzzle, "part">) => puzzle.part ?? 1;

/**
 * A puzzle's place, as in its address (/stached/2026-10-11, or
 * /stached/2026-10-11/2 for a date's second puzzle) and the puzzle CLI.
 */
export const puzzlePath = (puzzle: Pick<DayPuzzle, "date" | "part">) =>
  partOf(puzzle) > 1 ? `${puzzle.date}/${partOf(puzzle)}` : puzzle.date;

/** Everything wrong with a list of puzzles, one line each; empty if nothing. */
export function puzzleProblems(puzzles: unknown): string[] {
  if (!Array.isArray(puzzles)) return ["Expected a list of puzzles"];
  const problems: string[] = [];
  const places = new Set<string>();
  puzzles.forEach((puzzle, i) => {
    const { date, part, groups, push } = puzzle ?? {};
    const place =
      isDate(date) && (part === undefined || isPart(part))
        ? puzzlePath({ date, part })
        : null;
    const problem = (text: string) =>
      problems.push(`${place ?? `Puzzle ${i + 1}`}: ${text}`);
    if (!isDate(date)) problem("needs a date like 2026-10-02");
    if (part !== undefined && !isPart(part))
      problem("part needs to be a whole number from 1");
    if (place && places.has(place))
      problem(`two puzzles are part ${partOf({ part })} of this date`);
    if (place) places.add(place);
    if (push != null && !isText(push))
      problem("push needs to be a line of text");
    if (!Array.isArray(groups) || groups.length === 0) {
      problem("needs groups");
      return;
    }
    if (groups.some((g) => !isText(g?.title)))
      problem("every group needs a title");
    if (
      groups.some(
        (g) =>
          !Array.isArray(g?.words) ||
          g.words.length !== 4 ||
          !g.words.every(isText),
      )
    ) {
      problem("every group needs four words");
      return;
    }
    const words = groups.flatMap((g) => g.words.map(fold));
    if (new Set(words).size !== words.length) problem("a word appears twice");
    const titles = groups.map((g) => fold(String(g.title)));
    if (new Set(titles).size !== titles.length)
      problem("two groups share a title");
    if (groups.filter((g) => g.stache).length !== 1)
      problem("needs exactly one stache group");
    if (groups.length > COLORS.length + 1) problem("too many groups");
  });
  return problems;
}

// "Snow" and " snow" are the same word on the board.
const fold = (text: string) => text.trim().toLowerCase();

/** Each date's parts run 1, 2, …: a part 2 needs a part 1 on its date. */
export function missingParts(puzzles: DayPuzzle[]): string[] {
  return [...Map.groupBy(puzzles, (p) => p.date)].flatMap(([date, day]) => {
    const parts = day.map(partOf).sort((a, b) => a - b);
    const gap = parts.findIndex((part, i) => part !== i + 1);
    return gap < 0
      ? []
      : [`${date}: has a part ${parts[gap]} but no part ${gap + 1}`];
  });
}

/** Play order: by date, then each date's parts in turn. */
export const inOrder = (a: DayPuzzle, b: DayPuzzle) =>
  a.date.localeCompare(b.date) || partOf(a) - partOf(b);

/** A puzzles file, checked, in play order. Throws everything wrong at once. */
export async function readPuzzles(file: string): Promise<DayPuzzle[]> {
  const puzzles = await Bun.file(file).json();
  const problems = puzzleProblems(puzzles);
  if (!problems.length) problems.push(...missingParts(puzzles));
  if (problems.length) throw new Error(problems.join("\n"));
  return (puzzles as DayPuzzle[]).sort(inOrder);
}

const LIST = new Intl.ListFormat("en-US", { type: "conjunction" });

/** "#12", "#17 and #18", "#17, #18, and #19": a date's puzzles, by number. */
export const numbered = (numbers: number[]) =>
  LIST.format(numbers.map((n) => `#${n}`));

/**
 * Makes Postgres match the puzzles file. Editing or dropping a puzzle that
 * people have played wipes their games: scores from the old words wouldn't
 * mean anything against the new ones. Its push line can change freely. The
 * API runs this as it starts, and the CLI as it publishes, so the API serves
 * the change without a restart. It's one transaction, so the API's push never
 * goes out with half a date's puzzles.
 */
export async function syncPuzzles(puzzles: DayPuzzle[]) {
  await sql.begin(async (tx) => {
    const dropped = await tx`
      delete from puzzles
      where to_char(date, 'YYYY-MM-DD') || '/' || part
        not in ${tx(puzzles.map((p) => `${p.date}/${partOf(p)}`))}`;
    if (dropped.count) console.log(`Dropped ${dropped.count} puzzles`);
    for (const puzzle of puzzles) {
      const { date, groups, push = null } = puzzle;
      const part = partOf(puzzle);
      const [changed] = await tx`
        insert into puzzles (date, part, groups, push)
        values (${date}, ${part}, ${groups}::jsonb, ${push})
        on conflict (date, part) do update set groups = excluded.groups
        where puzzles.groups is distinct from excluded.groups
        returning id`;
      await tx`
        update puzzles set push = ${push}
        where date = ${date} and part = ${part} and push is distinct from ${push}`;
      if (changed) {
        const cleared =
          await tx`delete from plays where puzzle_id = ${changed.id}`;
        if (cleared.count)
          console.log(
            `${puzzlePath(puzzle)} changed: cleared ${cleared.count} plays`,
          );
      }
    }
  });
}

/** How many games each puzzle has, by its path, finished or not. */
export async function gamesByPuzzle(): Promise<Map<string, number>> {
  const rows: { date: string; part: number; games: number }[] = await sql`
    select to_char(pz.date, 'YYYY-MM-DD') as date, pz.part,
           count(*)::int as games
    from plays p join puzzles pz on pz.id = p.puzzle_id
    group by pz.date, pz.part`;
  return new Map(rows.map((row) => [puzzlePath(row), row.games]));
}
