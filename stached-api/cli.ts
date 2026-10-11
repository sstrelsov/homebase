// The puzzle CLI: stage a puzzle, play it on the tester before anyone else,
// then publish it, without editing puzzles.json by hand. It runs where the
// puzzles live (the Studio), with the API's settings, and stages and
// publishes the way the admin page does (schedule.ts), so a published puzzle
// is served without a restart. scripts/stached runs it there from anywhere.
// The stached-puzzles skill walks through it.
import { sql } from "bun";
import { ANNOUNCE_AT } from "./push";
import {
  announceDue,
  byDate,
  clockTime,
  type DayPuzzle,
  dayName,
  newYorkDate,
  Played,
  plain,
  plural,
  publish,
  Stop,
  timing,
} from "./puzzles";
import {
  announcedDates,
  confirm,
  gamesByDate,
  numbers,
  pushNow,
  puzzlesFile,
  readPuzzles,
  readStaged,
  remove,
  stage,
  syncPuzzles,
  toTester,
  unstage,
  writePrivate,
} from "./schedule";
import { generateVapidKeys } from "./webpush";

const USAGE = `Stage, play and publish Stached puzzles.

  stached list               every puzzle, published and staged
  stached stage <file>       check puzzles (one, or a list) and stage each,
                             in place of any staged on its date, and make
                             the first one today's on the tester; - reads
                             them from stdin
  stached preview [date]     make a staged puzzle (the first, or that date's)
                             today's on the tester
  stached confirm [date]     publish the staged puzzle on that date (or the
                             only one staged)
  stached unstage <date>     drop the staged puzzle on that date
  stached remove <date>      take a published puzzle down
  stached vapid-keys         make the API's push keys, for api.env
  stached push-again         send today's push again (the tester only)

Changing or removing a puzzle people have played deletes their games, so
confirm and remove refuse to unless you add --delete-games.`;

/**
 * The tester (scripts/tester.sh), an always-on copy where a staged puzzle is
 * played before anyone else: this CLI runs with its settings to put one there
 * (play), and can send its push again.
 */
const TESTER = Boolean(process.env.STACHED_TESTER);

/** "Fri, Oct 2 (2026-10-02)" */
const label = (date: string) => `${dayName(date)} (${date})`;

async function list() {
  const [published, staged, games, announced] = await Promise.all([
    readPuzzles(),
    readStaged(),
    gamesByDate(),
    announcedDates(),
  ]);
  const now = new Date();
  const today = newYorkDate(now);
  const newest = published.findLast((p) => p.date <= today)?.date;
  const push = (date: string) =>
    announced.has(date)
      ? "sent"
      : date < today
        ? "none"
        : announceDue(date, ANNOUNCE_AT, now)
          ? "any minute"
          : clockTime(ANNOUNCE_AT);
  const rows = [
    ["", "DATE", "", "STATUS", "GAMES", "PUSH"],
    ...published.map((p, i) => [
      `#${i + 1}`,
      p.date,
      dayName(p.date),
      p.date === newest ? "today" : p.date < today ? "out" : "upcoming",
      String(games.get(p.date) ?? 0),
      push(p.date),
    ]),
    ...staged.map((p) => [
      "",
      p.date,
      dayName(p.date),
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

async function stageFile(source: string | undefined) {
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
  const staged = await stage(Array.isArray(parsed) ? parsed : [parsed]);
  const [published, games] = await Promise.all([readPuzzles(), gamesByDate()]);
  for (const puzzle of staged) {
    const { date, groups, push } = puzzle;
    const { puzzles, kind } = publish(published, puzzle, games, {
      deleteGames: true,
    });
    const number = numbers(puzzles).get(date);
    const titles = groups.map((g) => g.title + (g.stache ? " (stache)" : ""));
    console.log(`#${number} · ${label(date)}`);
    console.log(`  ${titles.join(" · ")}`);
    console.log(`  Push line: ${push ?? "a random quote from home"}`);
    if (kind === "same") {
      console.log("  Already published, word for word.");
      continue;
    }
    const lost = games.get(date) ?? 0;
    if (kind === "edit")
      console.log(
        lost
          ? `  Replaces the published puzzle, which has ${plural(lost, "game")}: confirm deletes them only with --delete-games.`
          : "  Replaces the published puzzle (no games on it yet).",
      );
    if (kind === "push")
      console.log("  Changes only its push line, so its games stay.");
    console.log(`  ${timing(date, kind, ANNOUNCE_AT)}`);
  }
  await tester(staged[0]);
  console.log(
    `\nStaged, not live. Publish it with \`stached confirm ${staged[0].date}\`.`,
  );
}

/** Puts a staged puzzle on the tester, as today's, and says how it went. */
async function tester(puzzle: DayPuzzle) {
  console.log(`\n${(await toTester(puzzle)).text}`);
}

/** Puts a staged puzzle (the first, or that date's) on the tester, as today's. */
async function preview(date: string | undefined) {
  const staged = await readStaged();
  const puzzle = date ? staged.find((p) => p.date === date) : staged[0];
  if (!puzzle)
    throw new Stop(
      staged.length
        ? `Nothing staged for ${date}.`
        : "Nothing staged. Stage a puzzle first: stached stage <file>",
    );
  await tester(puzzle);
}

/**
 * The tester only: makes a puzzle from stdin today's, in place of the
 * tester's own. Its games go with it if the words changed, as on any edit:
 * they're all made up. It pushes right away, even if today's push went out
 * already, so each staging shows its notification too.
 */
async function play() {
  if (!TESTER) throw new Stop("play is for the tester: stage sends it there.");
  const date = newYorkDate();
  const puzzle = { ...plain(JSON.parse(await Bun.stdin.text())), date };
  const puzzles = [
    ...(await readPuzzles()).filter((p) => p.date !== date),
    puzzle,
  ].sort(byDate);
  writePrivate(puzzlesFile(), puzzles);
  await syncPuzzles(puzzles);
  const site = process.env.ALLOWED_ORIGINS?.split(",")[0];
  console.log(`It's today's puzzle on the tester: ${site}/stached/`);
  await pushAgain();
}

/** Publishes the staged puzzle on a date, or the only one staged. */
async function confirmStaged(date: string | undefined, deleteGames: boolean) {
  const staged = await readStaged();
  if (!staged.length) throw new Stop("Nothing staged.");
  if (!date && staged.length > 1)
    throw new Stop(
      [
        "More than one puzzle is staged. Confirm one by its date:",
        ...staged.map((p) => `  stached confirm ${p.date}`),
      ].join("\n"),
    );
  const { puzzle, kind, number } = await confirm(date ?? staged[0].date, {
    deleteGames,
  });
  console.log(
    kind === "same"
      ? `#${number} · ${dayName(puzzle.date)} was already published.`
      : `Published #${number} · ${dayName(puzzle.date)}. ${timing(puzzle.date, kind, ANNOUNCE_AT)}`,
  );
}

async function unstageDate(date: string | undefined) {
  if (!date) throw new Stop("Unstage which date? stached unstage 2026-10-02");
  await unstage(date);
  console.log(`Unstaged ${label(date)}.`);
}

async function removeDate(date: string | undefined, deleteGames: boolean) {
  if (!date) throw new Stop("Remove which date? stached remove 2026-10-02");
  await remove(date, { deleteGames });
  console.log(`Removed ${label(date)}.`);
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
  const date = newYorkDate();
  const puzzles = await readPuzzles();
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
    else if (command === "stage") await stageFile(arg);
    else if (command === "preview") await preview(arg);
    else if (command === "confirm") await confirmStaged(arg, deleteGames);
    else if (command === "unstage") await unstageDate(arg);
    else if (command === "remove") await removeDate(arg, deleteGames);
    else if (command === "vapid-keys") await vapidKeys();
    else if (command === "push-again") await pushAgain();
    else if (command === "play") await play();
    else console.log(USAGE);
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    console.error(error.message);
    if (error instanceof Played)
      console.error("To delete them anyway, run it again with --delete-games.");
    process.exitCode = 1;
  } finally {
    await sql.close();
  }
}
