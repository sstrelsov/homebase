// The puzzle CLI: stage a puzzle, play it on the tester before anyone else,
// then publish it, without editing puzzles.json by hand. It runs where the
// puzzles live (the Studio), with the API's settings, and writes the puzzles
// file and Postgres the way the API does as it starts, so a published puzzle
// is served without a restart. scripts/stached runs it there from anywhere.
// The stached-puzzles skill walks through it.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { sql } from "bun";
import {
  ANNOUNCE_AT,
  announce,
  announceDue,
  newYorkTime,
  vapidKeys as pushKeys,
} from "./push";
import {
  type DayPuzzle,
  gamesByPuzzle,
  inOrder,
  missingParts,
  partOf,
  puzzlePath,
  puzzleProblems,
  readPuzzles,
  syncPuzzles,
} from "./puzzles";
import { generateVapidKeys } from "./webpush";

const USAGE = `Stage, play and publish Stached puzzles.

  stached list               every puzzle, published and staged
  stached stage <file>       check puzzles (one, or a list) and stage them,
                             replacing what's staged, and make the first
                             date's today's on the tester; - reads stdin
  stached preview [date]     make a staged date's puzzles (the first, or that
                             date's) today's on the tester
  stached confirm            publish what's staged
  stached remove <date>      take a published puzzle down (<date>/2 for the
                             date's part 2)
  stached vapid-keys         make the API's push keys, for api.env
  stached push-again         send today's push again (the tester only)

A date can have more than one puzzle: give the second "part": 2, and so on.
Changing or removing a puzzle people have played deletes their games, so
confirm and remove refuse to unless you add --delete-games.`;

/** A message for the person at the terminal, not a crash. */
class Stop extends Error {}

/**
 * The tester (scripts/tester.sh), an always-on copy where a staged puzzle is
 * played before anyone else: this CLI runs with its settings to put one there
 * (play), and can send its push again.
 */
const TESTER = Boolean(process.env.STACHED_TESTER);
const TESTER_ENV = join(homedir(), ".config/stached-tester/api.env");

function puzzlesFile() {
  const file = process.env.PUZZLES_FILE;
  if (!file) throw new Stop("PUZZLES_FILE is not set: run me with api.env");
  return file;
}

/** Staged puzzles wait next to the real ones (staged.json), private too. */
const stagedFile = () => join(dirname(puzzlesFile()), "staged.json");

async function readStaged(): Promise<DayPuzzle[]> {
  const file = Bun.file(stagedFile());
  return (await file.exists()) ? file.json() : [];
}

/** Writes JSON that only its owner can read, all at once. */
function writePrivate(file: string, data: unknown) {
  const temp = `${file}.tmp`;
  // Bun.write ignores mode, so node:fs writes it.
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, file);
}

/** "Fri, Oct 2" */
const day = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** "Fri, Oct 2 (2026-10-02)", or "Sun, Oct 11 (2026-10-11/2)" for a part 2. */
const label = (puzzle: Pick<DayPuzzle, "date" | "part">) =>
  `${day(puzzle.date)} (${puzzlePath(puzzle)})`;

/** "9:12am" */
const pushTime = (() => {
  const [hour, minute] = ANNOUNCE_AT.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
})();

const today = (now = new Date()) => newYorkTime(now).slice(0, 10);

/**
 * When a puzzle published now goes live, and when its push goes out: one per
 * date, so a puzzle added to a date whose push went out gets none.
 */
export function timing(
  date: string,
  kind: Change["kind"],
  announced: boolean,
  now = new Date(),
) {
  const current = today(now);
  if (kind === "push" && date === current && !announceDue(date, now))
    return `The new line goes out with its push at ${pushTime}.`;
  if (kind !== "new" && date <= current)
    return "It's out already, so the change is live right away. A puzzle never pushes twice.";
  if (date < current) return "It's dated before today, so it gets no push.";
  if (date > current)
    return `It goes live at midnight New York time on ${day(date)}, with its push at ${pushTime}.`;
  if (announced)
    return "It goes live right away, with no push: today's went out already.";
  return announceDue(date, now)
    ? "It goes live and pushes right away."
    : `It goes live right away, with its push at ${pushTime}.`;
}

/**
 * A puzzle kept plain: its date and part, each group's title, words and
 * stache flag, and its push line.
 */
const plain = ({ date, part, groups, push }: DayPuzzle): DayPuzzle => ({
  date,
  ...(partOf({ part }) > 1 && { part }),
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

interface Change {
  date: string;
  part: number;
  /** "push" changes only the push line, which keeps the puzzle's games. */
  kind: "new" | "edit" | "push" | "same";
  /** Games that publishing deletes. */
  games: number;
}

/**
 * What publishing each staged puzzle does to the published ones: each takes
 * the place of the published puzzle with its date and part, if there is one.
 */
export function changes(
  published: DayPuzzle[],
  staged: DayPuzzle[],
  games: Map<string, number>,
): Change[] {
  return staged.map((puzzle) => {
    const path = puzzlePath(puzzle);
    const old = published.find((p) => puzzlePath(p) === path);
    const kind = !old
      ? "new"
      : !sameGroups(old, puzzle)
        ? "edit"
        : old.push !== puzzle.push
          ? "push"
          : "same";
    const lost = kind === "edit" ? (games.get(path) ?? 0) : 0;
    return { date: puzzle.date, part: partOf(puzzle), kind, games: lost };
  });
}

const gameCount = (n: number) => `${n} game${n === 1 ? "" : "s"}`;

/** Refuses to delete anyone's games without --delete-games. */
function guard(
  losses: { date: string; part: number; games: number }[],
  verb: string,
  deleteGames: boolean,
) {
  const played = losses.filter((loss) => loss.games > 0);
  if (!played.length || deleteGames) return;
  const lines = played.map(
    (loss) => `  ${label(loss)}: ${gameCount(loss.games)}`,
  );
  throw new Stop(
    [
      `Refusing to ${verb}: people have played it, and their games would be deleted.`,
      ...lines,
      "To delete them anyway, run it again with --delete-games.",
    ].join("\n"),
  );
}

/** A puzzles file in play order, once no date is missing a part. */
function checked(puzzles: DayPuzzle[]) {
  const missing = missingParts(puzzles);
  if (missing.length) throw new Stop(missing.join("\n"));
  return puzzles.sort(inOrder);
}

/**
 * The puzzles file after publishing staged puzzles: new ones added, edited
 * ones replaced, identical ones left as they were.
 */
export function publish(
  published: DayPuzzle[],
  staged: DayPuzzle[],
  games: Map<string, number>,
  { deleteGames = false } = {},
) {
  const planned = changes(published, staged, games);
  guard(planned, "change a published puzzle", deleteGames);
  const puzzles = new Map(published.map((p) => [puzzlePath(p), p]));
  staged.forEach((puzzle, i) => {
    if (planned[i].kind !== "same") puzzles.set(puzzlePath(puzzle), puzzle);
  });
  return checked([...puzzles.values()]);
}

/** The puzzles file without one puzzle, named by its path (date[/part]). */
export function unpublish(
  published: DayPuzzle[],
  path: string,
  games: Map<string, number>,
  { deleteGames = false } = {},
) {
  const puzzle = published.find((p) => puzzlePath(p) === path);
  if (!puzzle) throw new Stop(`No published puzzle at ${path}.`);
  if (published.length === 1)
    throw new Stop(
      "It's the only puzzle. Stage and confirm a replacement for it instead.",
    );
  const rest = checked(published.filter((p) => p !== puzzle));
  const { date, part } = puzzle;
  guard(
    [{ date, part: partOf({ part }), games: games.get(path) ?? 0 }],
    "remove it",
    deleteGames,
  );
  return rest;
}

/** The puzzles file, written with a copy of what it replaced, then Postgres. */
async function savePuzzles(puzzles: DayPuzzle[]) {
  const file = puzzlesFile();
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  copyFileSync(file, `${file}.bak-${stamp.slice(0, 8)}-${stamp.slice(8)}`);
  writePrivate(file, puzzles);
  await syncPuzzles(puzzles);
}

/**
 * Each puzzle's number (#1 is the first by date and part) once these are
 * published, by path.
 */
const numbers = (puzzles: DayPuzzle[]) =>
  new Map(puzzles.map((p, i) => [puzzlePath(p), i + 1]));

/** The dates whose push has gone out. */
const announcedDates = async () =>
  new Set(
    (
      await sql`select to_char(date, 'YYYY-MM-DD') as date from announcements`
    ).map((row: { date: string }) => row.date),
  );

async function list() {
  const [published, staged, games, announced] = await Promise.all([
    readPuzzles(puzzlesFile()),
    readStaged(),
    gamesByPuzzle(),
    announcedDates(),
  ]);
  const now = new Date();
  const current = today(now);
  const newest = published.findLast((p) => p.date <= current)?.date;
  const push = (date: string) =>
    announced.has(date)
      ? "sent"
      : date < current
        ? "none"
        : announceDue(date, now)
          ? "any minute"
          : pushTime;
  const rows = [
    ["", "DATE", "", "STATUS", "GAMES", "PUSH"],
    ...published.map((p, i) => [
      `#${i + 1}`,
      puzzlePath(p),
      day(p.date),
      p.date === newest ? "today" : p.date < current ? "out" : "upcoming",
      String(games.get(puzzlePath(p)) ?? 0),
      push(p.date),
    ]),
    ...staged.map((p) => [
      "",
      puzzlePath(p),
      day(p.date),
      published.some((q) => puzzlePath(q) === puzzlePath(p))
        ? "staged edit"
        : "staged",
      "",
      "",
    ]),
  ];
  const widths = rows[0].map((_, col) =>
    Math.max(...rows.map((row) => row[col].length)),
  );
  for (const row of rows)
    console.log(
      row
        .map((cell, col) =>
          col === 4 ? cell.padStart(widths[col]) : cell.padEnd(widths[col]),
        )
        .join("  ")
        .trimEnd(),
    );
}

async function stage(source: string | undefined) {
  if (!source)
    throw new Stop("Stage what? stached stage <file>, or - for stdin");
  const text =
    source === "-" ? await Bun.stdin.text() : await Bun.file(source).text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Stop(`That's not JSON: ${(error as Error).message}`);
  }
  const incoming = Array.isArray(parsed) ? parsed : [parsed];
  const problems = puzzleProblems(incoming);
  if (problems.length) throw new Stop(problems.join("\n"));

  const staged = (incoming as DayPuzzle[]).map(plain).sort(inOrder);
  const [published, games, announced] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByPuzzle(),
    announcedDates(),
  ]);
  // Checked before it's staged, so a part 2 needs its part 1.
  const merged = publish(published, staged, games, { deleteGames: true });
  writePrivate(stagedFile(), staged);

  const number = numbers(merged);
  for (const [i, change] of changes(published, staged, games).entries()) {
    const { date, groups, push } = staged[i];
    const titles = groups.map((g) => g.title + (g.stache ? " (stache)" : ""));
    console.log(`#${number.get(puzzlePath(staged[i]))} · ${label(staged[i])}`);
    console.log(`  ${titles.join(" · ")}`);
    console.log(`  Push line: ${push ?? "a random quote from home"}`);
    if (change.kind === "same") {
      console.log("  Already published, word for word.");
      continue;
    }
    if (change.kind === "edit")
      console.log(
        change.games
          ? `  Replaces the published puzzle, which has ${gameCount(change.games)}: confirm deletes them only with --delete-games.`
          : "  Replaces the published puzzle (no games on it yet).",
      );
    if (change.kind === "push")
      console.log("  Changes only its push line, so its games stay.");
    console.log(`  ${timing(date, change.kind, announced.has(date))}`);
  }
  if (!TESTER) toTester(merged.filter((p) => p.date === staged[0].date));
  console.log("\nStaged, not live. Publish it with `stached confirm`.");
}

/**
 * Makes a date's puzzles, as they'll be once what's staged is published,
 * today's on the tester, to play in its home-screen app before anyone else.
 * This CLI runs again with the tester's settings, since one process talks to
 * one database.
 */
function toTester(puzzles: DayPuzzle[]) {
  if (!existsSync(TESTER_ENV)) {
    console.log("\nNo tester here to play it on: `make tester` sets one up.");
    return;
  }
  const played = spawnSync(
    "bun",
    [`--env-file=${TESTER_ENV}`, import.meta.path, "play"],
    {
      input: JSON.stringify(puzzles),
      // Only the tester's settings: never the live game's.
      env: { HOME: process.env.HOME, PATH: process.env.PATH },
      encoding: "utf8",
    },
  );
  console.log(
    played.status === 0
      ? `\n${played.stdout.trim()}`
      : `\nCouldn't put it on the tester (is it up? \`make tester\`):\n${(played.stderr || played.stdout).trim()}`,
  );
}

/**
 * Puts a staged date's puzzles (the first date's, or that one's) on the
 * tester, as today's.
 */
async function preview(date: string | undefined) {
  if (TESTER)
    throw new Stop("On the tester, stage and confirm puzzles directly.");
  const [staged, published, games] = await Promise.all([
    readStaged(),
    readPuzzles(puzzlesFile()),
    gamesByPuzzle(),
  ]);
  const wanted = date ?? staged[0]?.date;
  if (!staged.some((p) => p.date === wanted))
    throw new Stop(
      staged.length
        ? `Nothing staged for ${date}.`
        : "Nothing staged. Stage a puzzle first: stached stage <file>",
    );
  const merged = publish(published, staged, games, { deleteGames: true });
  toTester(merged.filter((p) => p.date === wanted));
}

/**
 * The tester only: makes a date's puzzles from stdin today's, in place of the
 * tester's own. Their games go with them if the words changed, as on any
 * edit: they're all made up. It pushes right away, even if today's push went
 * out already, so each staging shows its notification too.
 */
async function play() {
  if (!TESTER) throw new Stop("play is for the tester: stage sends it there.");
  const date = today();
  const incoming: DayPuzzle[] = JSON.parse(await Bun.stdin.text());
  const puzzles = checked([
    ...(await readPuzzles(puzzlesFile())).filter((p) => p.date !== date),
    ...incoming.map((puzzle) => ({ ...plain(puzzle), date })),
  ]);
  writePrivate(puzzlesFile(), puzzles);
  await syncPuzzles(puzzles);
  const site = process.env.ALLOWED_ORIGINS?.split(",")[0];
  console.log(
    incoming.length === 1
      ? `It's today's puzzle on the tester: ${site}/stached/`
      : `They're today's ${incoming.length} puzzles on the tester: ${site}/stached/`,
  );
  await pushAgain();
}

async function confirm(deleteGames: boolean) {
  const staged = await readStaged();
  if (!staged.length) throw new Stop("Nothing staged.");
  const [published, games, announced] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByPuzzle(),
    announcedDates(),
  ]);
  const planned = changes(published, staged, games);
  const puzzles = publish(published, staged, games, { deleteGames });
  await savePuzzles(puzzles);
  rmSync(stagedFile());
  const number = numbers(puzzles);
  for (const change of planned) {
    const named = `#${number.get(puzzlePath(change))} · ${label(change)}`;
    console.log(
      change.kind === "same"
        ? `${named} was already published.`
        : `Published ${named}. ${timing(change.date, change.kind, announced.has(change.date))}`,
    );
  }
  for (const date of new Set(planned.map((c) => c.date)))
    await pushNow(puzzles, date);
}

/**
 * Sends a date's push now if it's due, instead of at the API's check a
 * minute later, and prints how it went. The API claims a push the same way
 * (announce), so it still goes out once. Without push keys, push is off.
 */
async function pushNow(puzzles: DayPuzzle[], date: string) {
  const keys = pushKeys();
  if (!keys) return;
  const number = numbers(puzzles);
  await announce(
    puzzles
      .filter((p) => p.date === date)
      .map((p) => ({ ...p, number: number.get(puzzlePath(p)) ?? 0 })),
    keys,
  );
}

async function remove(path: string | undefined, deleteGames: boolean) {
  if (!path) throw new Stop("Remove which date? stached remove 2026-10-02");
  const [published, games] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByPuzzle(),
  ]);
  await savePuzzles(unpublish(published, path, games, { deleteGames }));
  console.log(`Removed ${day(path.slice(0, 10))} (${path}).`);
}

/**
 * The tester only: sends today's push again, right away, to try a tap as
 * often as you like. Never on the live game.
 */
async function pushAgain() {
  if (!TESTER)
    throw new Stop(
      "push-again is for the tester only: scripts/stached --tester push-again",
    );
  const date = today();
  const puzzles = await readPuzzles(puzzlesFile());
  if (!puzzles.some((p) => p.date === date))
    throw new Stop(
      `No puzzle for today (${date}) on the tester: stage one first.`,
    );
  await sql`delete from announcements where date = ${date}`;
  await pushNow(puzzles, date);
}

async function vapidKeys() {
  const { publicKey, privateKey } = await generateVapidKeys();
  console.log(`VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}`);
}

if (import.meta.main) {
  const [command, ...rest] = Bun.argv.slice(2);
  const deleteGames = rest.includes("--delete-games");
  const [arg] = rest.filter((a) => a !== "--delete-games");
  try {
    if (command === "list") await list();
    else if (command === "stage") await stage(arg);
    else if (command === "preview") await preview(arg);
    else if (command === "confirm") await confirm(deleteGames);
    else if (command === "remove") await remove(arg, deleteGames);
    else if (command === "vapid-keys") await vapidKeys();
    else if (command === "push-again") await pushAgain();
    else if (command === "play") await play();
    else console.log(USAGE);
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sql.close();
  }
}
