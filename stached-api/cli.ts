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
  pushTitle,
} from "./push";
import {
  byDate,
  type DayPuzzle,
  gamesByDate,
  outOf,
  puzzleProblems,
  readPuzzles,
  syncPuzzles,
} from "./puzzles";
import { generateVapidKeys } from "./webpush";

const USAGE = `Stage, play and publish Stached puzzles.

  stached list               every puzzle, published and staged
  stached stage <file>       check puzzles (one, or a list) and stage them,
                             replacing what's staged, and make the first
                             one's day today's on the tester; - reads stdin
  stached preview [date]     make a staged puzzle's day (the first, or that
                             date's) today's on the tester
  stached confirm            publish what's staged
  stached remove <date>      take a published puzzle down
  stached vapid-keys         make the API's push keys, for api.env
  stached push-again         send today's push again (the tester only)

To catch up on a missed day, stage its puzzle (dated that day) with today's:
it comes out today, with today's, in one push. That works until today's push
goes out.
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

/**
 * When a puzzle published now goes live, and when its push goes out: one for
 * every puzzle out on its day (out), so one that joins a day whose push went
 * out gets none.
 */
export function timing(
  out: string,
  kind: Change["kind"],
  pushed: boolean,
  now = new Date(),
) {
  const current = today(now);
  if (kind === "push" && out === current && !pushed)
    return announceDue(out, now)
      ? "Its push goes out right away."
      : `Its push goes out at ${pushTime}.`;
  if (kind !== "new" && out <= current)
    return "It's out already, so the change is live right away. A puzzle never pushes twice.";
  if (out > current)
    return `It goes live at midnight New York time on ${day(out)}, with its push at ${pushTime}.`;
  if (pushed)
    return "It goes live right away, with no push: today's went out already.";
  return announceDue(out, now)
    ? "It goes live and pushes right away."
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

/**
 * A puzzle as the file keeps it: plain, and the day it came out, if that's
 * after its date.
 */
const filed = (puzzle: DayPuzzle, out: string | undefined): DayPuzzle => {
  const { date, ...rest } = plain(puzzle);
  return { date, ...(out && out > date && { out }), ...rest };
};

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
 * Refuses to catch up on a missed day once a later day's push has gone out:
 * its puzzle would take the number people were sent, and that push can't
 * name it.
 */
function tooLate(date: string, pushed: Set<string>) {
  const since = [...pushed].filter((d) => d > date).sort();
  if (!since.length) return;
  throw new Stop(
    `Too late to catch up on ${day(date)} (${date}): ${day(since[0])}'s push has gone out, so it would change the numbers people were sent. A missed day can only come out with the next puzzles, before their push.`,
  );
}

/**
 * The puzzles file after publishing staged puzzles: new dates added, edited
 * ones replaced, identical ones left as they were. A new one dated before
 * today catches up on a missed day: it comes out today, with today's.
 * `pushed` holds the dates whose push has gone out.
 */
export function publish(
  published: DayPuzzle[],
  staged: DayPuzzle[],
  games: Map<string, number>,
  { deleteGames = false, pushed = new Set<string>(), now = new Date() } = {},
) {
  const planned = changes(published, staged, games);
  guard(planned, "change a published puzzle", deleteGames);
  const current = today(now);
  const puzzles = new Map(published.map((p) => [p.date, p]));
  staged.forEach((puzzle, i) => {
    if (planned[i].kind === "same") return;
    const old = puzzles.get(puzzle.date);
    if (!old && puzzle.date < current) tooLate(puzzle.date, pushed);
    // A published puzzle keeps the day it came out.
    puzzles.set(
      puzzle.date,
      filed(
        puzzle,
        old ? old.out : puzzle.date < current ? current : undefined,
      ),
    );
  });
  return [...puzzles.values()].sort(byDate);
}

/** The puzzles out on the same day as the one with this date, oldest first. */
const outWith = (puzzles: DayPuzzle[], date: string) => {
  const puzzle = puzzles.find((p) => p.date === date);
  return puzzle ? puzzles.filter((p) => outOf(p) === outOf(puzzle)) : [];
};

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

/** The dates whose push has gone out (a push claims each of its dates). */
const pushedDates = async () =>
  new Set<string>(
    (
      await sql`select to_char(date, 'YYYY-MM-DD') as date from announcements`
    ).map((row: { date: string }) => row.date),
  );

async function list() {
  const [published, staged, games, pushed] = await Promise.all([
    readPuzzles(puzzlesFile()),
    readStaged(),
    gamesByDate(),
    pushedDates(),
  ]);
  const now = new Date();
  const current = today(now);
  const newest = published
    .map(outOf)
    .filter((out) => out <= current)
    .sort()
    .at(-1);
  const status = (p: DayPuzzle) => {
    const out = outOf(p);
    const when = out === newest ? "today" : out < current ? "out" : "upcoming";
    return p.out ? `${when}, caught up` : when;
  };
  const push = (p: DayPuzzle) =>
    pushed.has(p.date)
      ? "sent"
      : outOf(p) < current
        ? "none"
        : announceDue(outOf(p), now)
          ? "any minute"
          : pushTime;
  const rows = [
    ["", "DATE", "", "STATUS", "GAMES", "PUSH"],
    ...published.map((p, i) => [
      `#${i + 1}`,
      p.date,
      day(p.date),
      status(p),
      String(games.get(p.date) ?? 0),
      push(p),
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
  const [published, games, pushed] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByDate(),
    pushedDates(),
  ]);
  // Before it's staged, so a missed day too late to catch up never is.
  const merged = publish(published, staged, games, {
    deleteGames: true,
    pushed,
  });
  writePrivate(stagedFile(), staged);

  const number = numbers(merged);
  for (const [i, change] of changes(published, staged, games).entries()) {
    const { date, groups, push } = staged[i];
    const titles = groups.map((g) => g.title + (g.stache ? " (stache)" : ""));
    // The push it comes out with: the oldest puzzle's line, or a quote.
    const together = outWith(merged, date);
    const title = pushTitle(together.map((p) => number.get(p.date) ?? 0));
    const line = together[0].push ?? "a random quote from home";
    console.log(`#${number.get(date)} · ${day(date)} (${date})`);
    console.log(`  ${titles.join(" · ")}`);
    console.log(`  Push: ${title} · ${line}`);
    if (push && together[0].date !== date)
      console.log("  Its own push line goes unused: the oldest puzzle's wins.");
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
    const out = outOf(together[0]);
    const sent = together.some((p) => pushed.has(p.date));
    console.log(`  ${timing(out, change.kind, sent)}`);
  }
  if (!TESTER) toTester(outWith(merged, staged[0].date));
  console.log("\nStaged, not live. Publish it with `stached confirm`.");
}

/**
 * Makes the puzzles out on a day, as they'll be once what's staged is
 * published, today's on the tester, to play in its home-screen app before
 * anyone else. This CLI runs again with the tester's settings, since one
 * process talks to one database.
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
 * Puts a staged puzzle's day (the first's, or that date's) on the tester, as
 * today's: every puzzle out with it, as they'll be once published.
 */
async function preview(date: string | undefined) {
  if (TESTER)
    throw new Stop("On the tester, stage and confirm puzzles directly.");
  const [staged, published] = await Promise.all([
    readStaged(),
    readPuzzles(puzzlesFile()),
  ]);
  const wanted = date ?? staged[0]?.date;
  if (!staged.some((p) => p.date === wanted))
    throw new Stop(
      staged.length
        ? `Nothing staged for ${date}.`
        : "Nothing staged. Stage a puzzle first: stached stage <file>",
    );
  // A preview publishes nothing, so no games are at stake.
  const merged = publish(published, staged, new Map(), { deleteGames: true });
  toTester(outWith(merged, wanted as string));
}

const addDays = (date: string, days: number) => {
  const moved = new Date(`${date}T12:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
};

/**
 * The tester only: makes the puzzles from stdin (out on one day) today's, in
 * place of the tester's own: moved so they come out today, the newest dated
 * today and any missed day's the days before, caught up. Their games go with
 * them if the words changed, as on any edit: they're all made up. It pushes
 * right away, even if today's push went out already, so each staging shows
 * its notification too.
 */
async function play() {
  if (!TESTER) throw new Stop("play is for the tester: stage sends it there.");
  const date = today();
  const incoming: DayPuzzle[] = JSON.parse(await Bun.stdin.text());
  const shift =
    (Date.parse(date) - Date.parse(outOf(incoming[0]))) / 86_400_000;
  const moved = incoming.map((puzzle) =>
    filed({ ...puzzle, date: addDays(puzzle.date, shift) }, date),
  );
  const dates = new Set(moved.map((p) => p.date));
  // The tester's own come out on their dates, so today's are just these.
  const puzzles = [
    ...(await readPuzzles(puzzlesFile()))
      .filter((p) => !dates.has(p.date))
      .map((p) => filed(p, undefined)),
    ...moved,
  ].sort(byDate);
  writePrivate(puzzlesFile(), puzzles);
  await syncPuzzles(puzzles);
  const site = process.env.ALLOWED_ORIGINS?.split(",")[0];
  console.log(
    moved.length === 1
      ? `It's today's puzzle on the tester: ${site}/stached/`
      : `They're today's ${moved.length} puzzles on the tester: ${site}/stached/`,
  );
  await pushAgain();
}

async function confirm(deleteGames: boolean) {
  const staged = await readStaged();
  if (!staged.length) throw new Stop("Nothing staged.");
  const [published, games, pushed] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByDate(),
    pushedDates(),
  ]);
  const planned = changes(published, staged, games);
  const puzzles = publish(published, staged, games, { deleteGames, pushed });
  await savePuzzles(puzzles);
  rmSync(stagedFile());
  const number = numbers(puzzles);
  const outDay = new Map(puzzles.map((p) => [p.date, outOf(p)]));
  for (const { date, kind } of planned) {
    const out = outDay.get(date) as string;
    const sent = puzzles.some((p) => outOf(p) === out && pushed.has(p.date));
    console.log(
      kind === "same"
        ? `#${number.get(date)} · ${day(date)} was already published.`
        : `Published #${number.get(date)} · ${day(date)}. ${timing(out, kind, sent)}`,
    );
  }
  for (const out of new Set(planned.map(({ date }) => outDay.get(date))))
    await pushNow(puzzles, out as string);
}

/**
 * Sends the push for the puzzles out on a day now if it's due, instead of at
 * the API's check a minute later, and prints how it went. The API claims a
 * push the same way (announce), so it still goes out once. Without push keys,
 * push is off.
 */
async function pushNow(puzzles: DayPuzzle[], out: string) {
  const keys = pushKeys();
  if (!keys) return;
  const number = numbers(puzzles);
  await announce(
    puzzles
      .filter((p) => outOf(p) === out)
      .map((p) => ({ ...p, out, number: number.get(p.date) ?? 0 })),
    keys,
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
  const dates = puzzles.filter((p) => outOf(p) === date).map((p) => p.date);
  if (!dates.length)
    throw new Stop(
      `No puzzle out today (${date}) on the tester: stage one first.`,
    );
  await sql`delete from announcements where date in ${sql(dates)}`;
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
