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
  groups: Group[];
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

/** Everything wrong with a list of puzzles, one line each; empty if nothing. */
export function puzzleProblems(puzzles: unknown): string[] {
  if (!Array.isArray(puzzles)) return ["Expected a list of puzzles"];
  const problems: string[] = [];
  const dates = new Set<string>();
  puzzles.forEach((puzzle, i) => {
    const { date, groups } = puzzle ?? {};
    const problem = (text: string) =>
      problems.push(`${isDate(date) ? date : `Puzzle ${i + 1}`}: ${text}`);
    if (!isDate(date)) problem("needs a date like 2026-10-02");
    else if (dates.has(date)) problem("two puzzles share this date");
    else dates.add(date);
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

export const byDate = (a: DayPuzzle, b: DayPuzzle) =>
  a.date.localeCompare(b.date);

/** A puzzles file, checked, in date order. Throws everything wrong at once. */
export async function readPuzzles(file: string): Promise<DayPuzzle[]> {
  const puzzles = await Bun.file(file).json();
  const problems = puzzleProblems(puzzles);
  if (problems.length) throw new Error(problems.join("\n"));
  return (puzzles as DayPuzzle[]).sort(byDate);
}

/**
 * Makes Postgres match the puzzles file. Editing or dropping a puzzle that
 * people have played wipes their games: scores from the old words wouldn't
 * mean anything against the new ones. The API runs this as it starts, and the
 * CLI as it publishes, so the API serves the change without a restart.
 */
export async function syncPuzzles(puzzles: DayPuzzle[]) {
  const dropped = await sql`
    delete from puzzles where date not in ${sql(puzzles.map((p) => p.date))}`;
  if (dropped.count) console.log(`Dropped ${dropped.count} puzzles`);
  for (const { date, groups } of puzzles) {
    const [changed] = await sql`
      insert into puzzles (date, groups)
      values (${date}, ${groups}::jsonb)
      on conflict (date) do update set groups = excluded.groups
      where puzzles.groups is distinct from excluded.groups
      returning id`;
    if (changed) {
      const cleared =
        await sql`delete from plays where puzzle_id = ${changed.id}`;
      if (cleared.count)
        console.log(`${date} changed: cleared ${cleared.count} plays`);
    }
  }
}

/** How many games each puzzle has, by date, finished or not. */
export async function gamesByDate(): Promise<Map<string, number>> {
  const rows: { date: string; games: number }[] = await sql`
    select to_char(pz.date, 'YYYY-MM-DD') as date, count(*)::int as games
    from plays p join puzzles pz on pz.id = p.puzzle_id
    group by pz.date`;
  return new Map(rows.map(({ date, games }) => [date, games]));
}
