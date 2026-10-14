// The puzzles file and its rules, shared by the API and the puzzle CLI. The
// real file lives on the Studio (PUZZLES_FILE), outside this public repo;
// puzzles.example.json holds made-up ones. Postgres mirrors it.
import { sql } from "bun";
import type { Announced } from "./push";

export interface Group {
  title: string;
  words: string[];
  stache?: boolean;
}

/** A day's puzzle, as the file has it. */
export interface DayPuzzle {
  date: string;
  /**
   * The day it came out, when that's after its date: a missed day's puzzle,
   * published later to catch up. `confirm` sets it, so it's never staged.
   */
  out?: string;
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

/** The day a puzzle came out: its own date, or a later one for a catch-up. */
export const outOf = (puzzle: Pick<DayPuzzle, "date" | "out">) =>
  puzzle.out ?? puzzle.date;

/** Everything wrong with a list of puzzles, one line each; empty if nothing. */
export function puzzleProblems(puzzles: unknown): string[] {
  if (!Array.isArray(puzzles)) return ["Expected a list of puzzles"];
  const problems: string[] = [];
  const dates = new Set<string>();
  puzzles.forEach((puzzle, i) => {
    const { date, out, groups, push } = puzzle ?? {};
    const problem = (text: string) =>
      problems.push(`${isDate(date) ? date : `Puzzle ${i + 1}`}: ${text}`);
    if (!isDate(date)) problem("needs a date like 2026-10-02");
    else if (dates.has(date)) problem("two puzzles share this date");
    else dates.add(date);
    if (out !== undefined && !(isDate(out) && isDate(date) && out > date))
      problem("out needs to be a date after its own");
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

export const byDate = (a: { date: string }, b: { date: string }) =>
  a.date.localeCompare(b.date);

/** A puzzles file, checked, in date order. Throws everything wrong at once. */
export async function readPuzzles(file: string): Promise<DayPuzzle[]> {
  const puzzles = await Bun.file(file).json();
  const problems = puzzleProblems(puzzles);
  if (problems.length) throw new Error(problems.join("\n"));
  return (puzzles as DayPuzzle[]).sort(byDate);
}

export const LIST = new Intl.ListFormat("en-US", { type: "conjunction" });

/** "#12", "#17 and #18", "#17, #18, and #19": puzzles out together. */
export const numbered = (numbers: number[]) =>
  LIST.format(numbers.map((n) => `#${n}`));

/** When each puzzle's push went out, by its date. */
export type Pushes = Map<string, Date>;

/** Whether it's a missed day's puzzle, out on a later day to catch up. */
export const caughtUp = (puzzle: Pick<DayPuzzle, "date" | "out">) =>
  puzzle.date < outOf(puzzle);

/**
 * Puzzles in the order they're numbered (#1 first): the order they went out.
 * By the day each came out, then by push (one not pushed yet goes after
 * those that were), then the day's own before a missed day's, then by date.
 * So a number that went out in a push never moves, and a missed day's caught
 * up on a later day comes after that day's own, before its push or after:
 * Monday's is #14 after Tuesday's #13. `released()` numbers them the same way.
 */
export function inOrder<T extends Pick<DayPuzzle, "date" | "out">>(
  puzzles: T[],
  pushes: Pushes,
) {
  const pushed = (p: T) => pushes.get(p.date)?.getTime() ?? Infinity;
  return puzzles.toSorted(
    (a, b) =>
      outOf(a).localeCompare(outOf(b)) ||
      pushed(a) - pushed(b) ||
      Number(caughtUp(a)) - Number(caughtUp(b)) ||
      a.date.localeCompare(b.date),
  );
}

/**
 * Makes Postgres match the puzzles file. Editing or dropping a puzzle that
 * people have played wipes their games: scores from the old words wouldn't
 * mean anything against the new ones. Its push line can change freely. The
 * API runs this as it starts, and the CLI as it publishes, so the API serves
 * the change without a restart. It's one transaction, so the API never sees
 * half of a day's puzzles, and pushes them all together.
 */
export async function syncPuzzles(puzzles: DayPuzzle[]) {
  await sql.begin(async (tx) => {
    const dropped = await tx`
      delete from puzzles where date not in ${tx(puzzles.map((p) => p.date))}`;
    if (dropped.count) console.log(`Dropped ${dropped.count} puzzles`);
    for (const { date, out = null, groups, push = null } of puzzles) {
      const [changed] = await tx`
        insert into puzzles (date, out, groups, push)
        values (${date}, ${out}, ${groups}::jsonb, ${push})
        on conflict (date) do update set groups = excluded.groups
        where puzzles.groups is distinct from excluded.groups
        returning id`;
      await tx`
        update puzzles set out = ${out}, push = ${push}
        where date = ${date}
          and (out is distinct from ${out}::date
            or push is distinct from ${push})`;
      if (changed) {
        const cleared =
          await tx`delete from plays where puzzle_id = ${changed.id}`;
        if (cleared.count)
          console.log(`${date} changed: cleared ${cleared.count} plays`);
      }
    }
  });
}

/** How many games each puzzle has, by date, finished or not. */
export async function gamesByDate(): Promise<Map<string, number>> {
  const rows: { date: string; games: number }[] = await sql`
    select to_char(pz.date, 'YYYY-MM-DD') as date, count(*)::int as games
    from plays p join puzzles pz on pz.id = p.puzzle_id
    group by pz.date`;
  return new Map(rows.map(({ date, games }) => [date, games]));
}

/** When each puzzle's push went out, by its date (`announcements`). */
export async function pushes(): Promise<Pushes> {
  const rows: { date: string; sent_at: Date }[] = await sql`
    select to_char(date, 'YYYY-MM-DD') as date, sent_at from announcements`;
  return new Map(rows.map(({ date, sent_at }) => [date, sent_at]));
}

/**
 * The puzzles out so far (New York time), numbered from #1 in the order they
 * went out (`inOrder`). A puzzle comes out on its date, or, for a missed
 * day's published later to catch up, on the day it was published (`out`).
 * It counts while it's out on the newest day, and until 24 hours after its
 * own push (`until`), so one pushed late at night still has a full day once
 * the next one is out. Today's are the ones out on the newest day (`newest`:
 * a day without a puzzle of its own keeps the last ones), and any extra
 * (pushed after an earlier push on its day, like a missed day's caught up
 * that evening) until its 24 hours are up, so it stays on home the next
 * day. Games started or guessed once a puzzle stops counting are late.
 * `now` is for tests.
 */
export const released = (now = new Date()) => sql`(
  select id, to_char(date, 'YYYY-MM-DD') as date,
         to_char(out, 'YYYY-MM-DD') as out, groups, push, until, number,
         to_char(newest, 'YYYY-MM-DD') as newest,
         out = newest or coalesce(extra and until > ${now}, false) as today,
         out = newest or coalesce(until > ${now}, false) as counts
  from (
    select z.id, z.date, coalesce(z.out, z.date) as out, z.groups, z.push,
           a.sent_at + interval '24 hours' as until,
           row_number() over (order by coalesce(z.out, z.date),
                                       a.sent_at nulls last,
                                       z.out is not null, z.date)::int
             as number,
           max(coalesce(z.out, z.date)) over () as newest,
           a.sent_at > min(a.sent_at)
             over (partition by coalesce(z.out, z.date)) as extra
    from puzzles z left join announcements a on a.date = z.date
    where coalesce(z.out, z.date)
          <= (${now}::timestamptz at time zone 'America/New_York')::date
  ) numbered
) released`;

/**
 * The puzzles out on the newest day, by number, as their push and the card
 * know them: not an extra from the day before that's still one of today's.
 * The API's minute check and `confirm` both announce these (`announce`).
 */
export const todays = (now = new Date()): Promise<Announced[]> => sql`
  select number, date, out, push from ${released(now)}
  where out = newest order by number`;
