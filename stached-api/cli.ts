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
import { ANNOUNCE_AT, announceDue, newYorkTime } from "./push";
import {
  byDate,
  type DayPuzzle,
  gamesByDate,
  puzzleProblems,
  readPuzzles,
  syncPuzzles,
} from "./puzzles";
import { generateVapidKeys } from "./webpush";

const USAGE = `Stage, play and publish Stached puzzles.

  stached list               every puzzle, published and staged
  stached stage <file>       check puzzles (one, or a list) and stage them,
                             replacing what's staged, and make the first one
                             today's on the tester; - reads them from stdin
  stached preview <date>     make another staged puzzle today's on the tester
  stached confirm            publish what's staged
  stached remove <date>      take a published puzzle down
  stached vapid-keys         make the API's push keys, for api.env
  stached push-again         send today's push again (the tester only)

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

/** "9:12am" */
const pushTime = (() => {
  const [hour, minute] = ANNOUNCE_AT.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
})();

const today = (now = new Date()) => newYorkTime(now).slice(0, 10);

/** When a puzzle published now goes live, and when its push goes out. */
export function timing(date: string, kind: Change["kind"], now = new Date()) {
  const current = today(now);
  if (kind === "push" && date === current && !announceDue(date, now))
    return `The new line goes out with its push at ${pushTime}.`;
  if (kind !== "new" && date <= current)
    return "It's out already, so the change is live right away. A puzzle never pushes twice.";
  if (date < current) return "It's dated before today, so it gets no push.";
  if (date > current)
    return `It goes live at midnight New York time on ${day(date)}, with its push at ${pushTime}.`;
  return announceDue(date, now)
    ? "It goes live right away, with its push within a minute."
    : `It goes live right away, with its push at ${pushTime}.`;
}

/**
 * A puzzle kept plain: its date, each group's title, words and stache flag,
 * and its push line.
 */
const plain = ({ date, groups, push }: DayPuzzle): DayPuzzle => ({
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

interface Change {
  date: string;
  /** "push" changes only the push line, which keeps the puzzle's games. */
  kind: "new" | "edit" | "push" | "same";
  /** Games that publishing deletes. */
  games: number;
}

/** What publishing each staged puzzle does to the published ones. */
export function changes(
  published: DayPuzzle[],
  staged: DayPuzzle[],
  games: Map<string, number>,
): Change[] {
  return staged.map((puzzle) => {
    const old = published.find((p) => p.date === puzzle.date);
    const kind = !old
      ? "new"
      : !sameGroups(old, puzzle)
        ? "edit"
        : old.push !== puzzle.push
          ? "push"
          : "same";
    const lost = kind === "edit" ? (games.get(puzzle.date) ?? 0) : 0;
    return { date: puzzle.date, kind, games: lost };
  });
}

const gameCount = (n: number) => `${n} game${n === 1 ? "" : "s"}`;

/** Refuses to delete anyone's games without --delete-games. */
function guard(
  losses: { date: string; games: number }[],
  verb: string,
  deleteGames: boolean,
) {
  const played = losses.filter((loss) => loss.games > 0);
  if (!played.length || deleteGames) return;
  const lines = played.map(
    ({ date, games }) => `  ${day(date)} (${date}): ${gameCount(games)}`,
  );
  throw new Stop(
    [
      `Refusing to ${verb}: people have played it, and their games would be deleted.`,
      ...lines,
      "To delete them anyway, run it again with --delete-games.",
    ].join("\n"),
  );
}

/**
 * The puzzles file after publishing staged puzzles: new dates added, edited
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
  const puzzles = new Map(published.map((p) => [p.date, p]));
  for (const puzzle of staged)
    if (planned.find((c) => c.date === puzzle.date)?.kind !== "same")
      puzzles.set(puzzle.date, puzzle);
  return [...puzzles.values()].sort(byDate);
}

/** The puzzles file without one puzzle. */
export function unpublish(
  published: DayPuzzle[],
  date: string,
  games: Map<string, number>,
  { deleteGames = false } = {},
) {
  if (!published.some((p) => p.date === date))
    throw new Stop(`No published puzzle on ${date}.`);
  if (published.length === 1)
    throw new Stop(
      "It's the only puzzle. Stage and confirm a replacement for it instead.",
    );
  guard([{ date, games: games.get(date) ?? 0 }], "remove it", deleteGames);
  return published.filter((p) => p.date !== date);
}

/** The puzzles file, written with a copy of what it replaced, then Postgres. */
async function savePuzzles(puzzles: DayPuzzle[]) {
  const file = puzzlesFile();
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  copyFileSync(file, `${file}.bak-${stamp.slice(0, 8)}-${stamp.slice(8)}`);
  writePrivate(file, puzzles);
  await syncPuzzles(puzzles);
}

/** Each puzzle's number (#1 is the first by date) once these are published. */
const numbers = (puzzles: DayPuzzle[]) =>
  new Map(puzzles.map((p, i) => [p.date, i + 1]));

async function list() {
  const [published, staged, games, announced] = await Promise.all([
    readPuzzles(puzzlesFile()),
    readStaged(),
    gamesByDate(),
    sql`select to_char(date, 'YYYY-MM-DD') as date from announcements`.then(
      (rows: { date: string }[]) => new Set(rows.map((r) => r.date)),
    ),
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
      p.date,
      day(p.date),
      p.date === newest ? "today" : p.date < current ? "out" : "upcoming",
      String(games.get(p.date) ?? 0),
      push(p.date),
    ]),
    ...staged.map((p) => [
      "",
      p.date,
      day(p.date),
      published.some((q) => q.date === p.date) ? "staged edit" : "staged",
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

  const staged = (incoming as DayPuzzle[]).map(plain).sort(byDate);
  const [published, games] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByDate(),
  ]);
  writePrivate(stagedFile(), staged);

  const number = numbers(
    publish(published, staged, games, { deleteGames: true }),
  );
  for (const [i, change] of changes(published, staged, games).entries()) {
    const { date, groups, push } = staged[i];
    const titles = groups.map((g) => g.title + (g.stache ? " (stache)" : ""));
    console.log(`#${number.get(date)} · ${day(date)} (${date})`);
    console.log(`  ${titles.join(" · ")}`);
    console.log(`  Push line: ${push ?? "a random one from the crawl"}`);
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
    console.log(`  ${timing(date, change.kind)}`);
  }
  if (!TESTER) toTester(staged[0]);
  console.log("\nStaged, not live. Publish it with `stached confirm`.");
}

/**
 * Makes a staged puzzle today's on the tester, to play in its home-screen app
 * before anyone else. This CLI runs again with the tester's settings, since
 * one process talks to one database.
 */
function toTester(puzzle: DayPuzzle) {
  if (!existsSync(TESTER_ENV)) {
    console.log("\nNo tester here to play it on: `make tester` sets one up.");
    return;
  }
  const played = spawnSync(
    "bun",
    [`--env-file=${TESTER_ENV}`, import.meta.path, "play"],
    {
      input: JSON.stringify(puzzle),
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

/** Puts another staged puzzle on the tester, as today's. */
async function preview(date: string | undefined) {
  if (TESTER)
    throw new Stop("On the tester, stage and confirm puzzles directly.");
  const staged = await readStaged();
  const puzzle = staged.find((p) => p.date === date);
  if (!puzzle)
    throw new Stop(
      staged.length
        ? `Stage has ${staged.map((p) => p.date).join(", ")}: preview which?`
        : "Nothing staged. Stage a puzzle first: stached stage <file>",
    );
  toTester(puzzle);
}

/**
 * The tester only: makes a puzzle from stdin today's, in place of the
 * tester's own. Its games go with it if the words changed, as on any edit:
 * they're all made up. If the tester hasn't pushed today, it does within a
 * minute, so the notification shows too.
 */
async function play() {
  if (!TESTER) throw new Stop("play is for the tester: stage sends it there.");
  const date = today();
  const puzzle = { ...plain(JSON.parse(await Bun.stdin.text())), date };
  const puzzles = [
    ...(await readPuzzles(puzzlesFile())).filter((p) => p.date !== date),
    puzzle,
  ].sort(byDate);
  writePrivate(puzzlesFile(), puzzles);
  await syncPuzzles(puzzles);
  const [pushed] = await sql`select 1 from announcements where date = ${date}`;
  const site = process.env.ALLOWED_ORIGINS?.split(",")[0];
  console.log(`It's today's puzzle on the tester: ${site}/stached/`);
  console.log(
    pushed
      ? "Its push went out earlier today; `stached --tester push-again` sends it again."
      : "Its push goes out within a minute.",
  );
}

async function confirm(deleteGames: boolean) {
  const staged = await readStaged();
  if (!staged.length) throw new Stop("Nothing staged.");
  const [published, games] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByDate(),
  ]);
  const planned = changes(published, staged, games);
  const puzzles = publish(published, staged, games, { deleteGames });
  await savePuzzles(puzzles);
  rmSync(stagedFile());
  const number = numbers(puzzles);
  for (const { date, kind } of planned)
    console.log(
      kind === "same"
        ? `#${number.get(date)} · ${day(date)} was already published.`
        : `Published #${number.get(date)} · ${day(date)}. ${timing(date, kind)}`,
    );
}

async function remove(date: string | undefined, deleteGames: boolean) {
  if (!date) throw new Stop("Remove which date? stached remove 2026-10-02");
  const [published, games] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByDate(),
  ]);
  await savePuzzles(unpublish(published, date, games, { deleteGames }));
  console.log(`Removed ${day(date)} (${date}).`);
}

/**
 * The tester only: forgets that today's push went out, so the tester's API
 * sends it again within a minute, to try a tap as often as you like. Never on
 * the live game.
 */
async function pushAgain() {
  if (!TESTER)
    throw new Stop(
      "push-again is for the tester only: scripts/stached --tester push-again",
    );
  const date = today();
  if (!(await readPuzzles(puzzlesFile())).some((p) => p.date === date))
    throw new Stop(
      `No puzzle for today (${date}) on the tester: stage and confirm one first.`,
    );
  await sql`delete from announcements where date = ${date}`;
  console.log("Today's push goes out again within a minute.");
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
