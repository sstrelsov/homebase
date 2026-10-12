// The schedule: published puzzles (the puzzles file, mirrored in Postgres)
// and staged ones (staged.json, next to it), and the steps between them. The
// puzzle CLI and the admin page's endpoints both run these, so staging and
// publishing a puzzle work the same from either. The real files live on the
// Studio (PUZZLES_FILE), outside this public repo; puzzles.example.json holds
// made-up ones.
import { copyFileSync, existsSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { sql } from "bun";
import { announce, vapidKeys } from "./push";
import {
  byDate,
  type DayPuzzle,
  plain,
  publish,
  puzzleProblems,
  Stop,
  unpublish,
} from "./puzzles";

export function puzzlesFile() {
  const file = process.env.PUZZLES_FILE;
  if (!file) throw new Stop("PUZZLES_FILE is not set: run me with api.env");
  return file;
}

/** Staged puzzles wait next to the real ones, private too. */
const stagedFile = () => join(dirname(puzzlesFile()), "staged.json");

/** A puzzles file, checked, in date order. Throws everything wrong at once. */
export async function readPuzzles(file = puzzlesFile()): Promise<DayPuzzle[]> {
  const puzzles = await Bun.file(file).json();
  const problems = puzzleProblems(puzzles);
  if (problems.length) throw new Error(problems.join("\n"));
  return (puzzles as DayPuzzle[]).sort(byDate);
}

export async function readStaged(): Promise<DayPuzzle[]> {
  const file = Bun.file(stagedFile());
  return (await file.exists()) ? file.json() : [];
}

/** Writes JSON that only its owner can read, all at once. */
export function writePrivate(file: string, data: unknown) {
  const temp = `${file}.tmp`;
  // Bun.write ignores mode, so node:fs writes it.
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, file);
}

/**
 * Makes Postgres match the puzzles file. Editing or dropping a puzzle that
 * people have played wipes their games: scores from the old words wouldn't
 * mean anything against the new ones. Its push line can change freely. The
 * API runs this as it starts, and again as it publishes, as the CLI does, so
 * the API serves the change without a restart.
 */
export async function syncPuzzles(puzzles: DayPuzzle[]) {
  const dropped = await sql`
    delete from puzzles where date not in ${sql(puzzles.map((p) => p.date))}`;
  if (dropped.count) console.log(`Dropped ${dropped.count} puzzles`);
  for (const { date, groups, push = null } of puzzles) {
    const [changed] = await sql`
      insert into puzzles (date, groups, push)
      values (${date}, ${groups}::jsonb, ${push})
      on conflict (date) do update set groups = excluded.groups
      where puzzles.groups is distinct from excluded.groups
      returning id`;
    await sql`
      update puzzles set push = ${push}
      where date = ${date} and push is distinct from ${push}`;
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

/** The dates whose push has gone out. */
export const announcedDates = async () =>
  new Set(
    (
      await sql`select to_char(date, 'YYYY-MM-DD') as date from announcements`
    ).map((row: { date: string }) => row.date),
  );

/** A puzzle's number: #1 is the first by date. */
export const numberOf = (puzzles: DayPuzzle[], date: string) =>
  puzzles.findIndex((p) => p.date === date) + 1;

/** The puzzles file, written with a copy of what it replaced, then Postgres. */
async function savePuzzles(puzzles: DayPuzzle[]) {
  const file = puzzlesFile();
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  copyFileSync(file, `${file}.bak-${stamp.slice(0, 8)}-${stamp.slice(8)}`);
  writePrivate(file, puzzles);
  await syncPuzzles(puzzles);
}

/**
 * Stages puzzles, each in place of the one staged on its date, if any.
 * Nothing is staged unless every one passes the server's rules; it throws
 * everything wrong at once. Staging never touches what players see.
 */
export async function stage(incoming: unknown[]) {
  const problems = puzzleProblems(incoming);
  if (problems.length) throw new Stop(problems.join("\n"));
  const puzzles = (incoming as DayPuzzle[]).map(plain).sort(byDate);
  const dates = new Set(puzzles.map((p) => p.date));
  const staged = await readStaged();
  writePrivate(
    stagedFile(),
    [...staged.filter((p) => !dates.has(p.date)), ...puzzles].sort(byDate),
  );
  return puzzles;
}

/** The puzzle staged on a date, or a Stop that says so. */
async function stagedOn(date: string) {
  const staged = await readStaged();
  const puzzle = staged.find((p) => p.date === date);
  if (!puzzle) throw new Stop(`Nothing staged on ${date}.`);
  return { staged, puzzle };
}

export async function unstage(date: string) {
  const { staged, puzzle } = await stagedOn(date);
  writePrivate(
    stagedFile(),
    staged.filter((p) => p !== puzzle),
  );
}

/**
 * Publishes one staged puzzle: writes the puzzles file (keeping the old one
 * as puzzles.json.bak-…) and Postgres, unstages it, and sends its push right
 * away if it's due, rather than at the API's next check. It refuses to
 * delete anyone's games without deleteGames.
 */
export async function confirm(date: string, { deleteGames = false } = {}) {
  const { puzzle } = await stagedOn(date);
  const [published, games] = await Promise.all([readPuzzles(), gamesByDate()]);
  const { puzzles, kind } = publish(published, puzzle, games, { deleteGames });
  // Even unchanged, so a confirm tried again mends a sync that failed.
  await savePuzzles(puzzles);
  await unstage(date);
  await pushNow(puzzles, date);
  return { puzzle, kind, number: numberOf(puzzles, date) };
}

/** Takes a published puzzle down. */
export async function remove(date: string, { deleteGames = false } = {}) {
  const [published, games] = await Promise.all([readPuzzles(), gamesByDate()]);
  await savePuzzles(unpublish(published, date, games, { deleteGames }));
}

/**
 * Sends a puzzle's push now if it's due, and logs how it went. The API's
 * minutely check claims a push the same way (announce), so it still goes out
 * once. Without push keys, push is off.
 */
export async function pushNow(puzzles: DayPuzzle[], date: string) {
  const keys = vapidKeys();
  const puzzle = puzzles.find((p) => p.date === date);
  if (!keys || !puzzle) return;
  await announce({ ...puzzle, number: numberOf(puzzles, date) }, keys);
}

/**
 * The tester's settings (scripts/tester.sh): an always-on copy of Stached on
 * the Studio, where a staged puzzle is played before anyone else. It runs as
 * the same user as the live API, so either can reach it. TESTER_ENV points
 * at another one, for a test.
 */
const TESTER_ENV =
  process.env.TESTER_ENV ?? join(homedir(), ".config/stached-tester/api.env");

/**
 * Makes a staged puzzle today's on the tester, to play in its home-screen app
 * before anyone else. The CLI's `play` does it, run with the tester's
 * settings alone (one process talks to one database), so neither game's
 * settings reach the other's. Says how it went.
 */
export async function toTester(
  puzzle: DayPuzzle,
): Promise<{ ok: boolean; text: string }> {
  if (!existsSync(TESTER_ENV))
    return {
      ok: false,
      text: "No tester here to play it on: `make tester` sets one up.",
    };
  const play = Bun.spawn(
    [
      process.execPath,
      `--env-file=${TESTER_ENV}`,
      join(import.meta.dir, "cli.ts"),
      "play",
    ],
    {
      stdin: new Blob([JSON.stringify(puzzle)]),
      // Only the tester's settings: never the live game's.
      env: { HOME: homedir(), PATH: process.env.PATH ?? "" },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [out, err, code] = await Promise.all([
    new Response(play.stdout).text(),
    new Response(play.stderr).text(),
    play.exited,
  ]);
  return code === 0
    ? { ok: true, text: out.trim() }
    : {
        ok: false,
        text: `Couldn't put it on the tester (is it up? \`make tester\`):\n${(err || out).trim()}`,
      };
}
