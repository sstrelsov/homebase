// The puzzle CLI: stage a puzzle, play it on your phone before anyone else,
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
import { tmpdir } from "node:os";
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
                             replacing what's staged; - reads them from stdin
  stached preview [date]     play a staged puzzle on your phone, first
  stached preview stop       stop the preview
  stached confirm            publish what's staged
  stached remove <date>      take a published puzzle down
  stached vapid-keys         make the API's push keys, for api.env

Changing or removing a puzzle people have played deletes their games, so
confirm and remove refuse to unless you add --delete-games.`;

/** A message for the person at the terminal, not a crash. */
class Stop extends Error {}

const ROOT = join(import.meta.dir, "..");
const PREVIEW = {
  session: "stached-preview",
  // Its own API port, since the live API has 3999 on the Studio.
  port: "3998",
  puzzles: join(tmpdir(), "stached-preview.json"),
  log: join(tmpdir(), "stached-preview.log"),
  url: join(ROOT, ".phone/url"),
};

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
  if (kind !== "new" && date <= current)
    return "It's out already, so the change is live right away. A puzzle never pushes twice.";
  if (date < current) return "It's dated before today, so it gets no push.";
  if (date > current)
    return `It goes live at midnight New York time on ${day(date)}, with its push at ${pushTime}.`;
  return announceDue(date, now)
    ? "It goes live right away, with its push within a minute."
    : `It goes live right away, with its push at ${pushTime}.`;
}

/** A puzzle kept plain: its date, and each group's title, words and stache flag. */
const plain = ({ date, groups }: DayPuzzle): DayPuzzle => ({
  date,
  groups: groups.map(({ title, words, stache }) => ({
    title,
    words,
    ...(stache && { stache: true }),
  })),
});

/** The same puzzle, give or take how its JSON is spelled. */
const sameGroups = (a: DayPuzzle, b: DayPuzzle) =>
  JSON.stringify(plain(a).groups) === JSON.stringify(plain(b).groups);

interface Change {
  date: string;
  kind: "new" | "edit" | "same";
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
    const kind = !old ? "new" : sameGroups(old, puzzle) ? "same" : "edit";
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
    const { date, groups } = staged[i];
    const titles = groups.map((g) => g.title + (g.stache ? " (stache)" : ""));
    console.log(`#${number.get(date)} · ${day(date)} (${date})`);
    console.log(`  ${titles.join(" · ")}`);
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
    console.log(`  ${timing(date, change.kind)}`);
  }
  console.log(
    "\nStaged, not live. Play it with `stached preview`, then publish it with `stached confirm`.",
  );
}

const tmux = (...args: string[]) =>
  spawnSync("tmux", args, { encoding: "utf8" });
const previewRunning = () =>
  tmux("has-session", "-t", PREVIEW.session).status === 0;

/** Stops the preview the way Ctrl-C does, so it cleans up after itself. */
async function stopPreview() {
  if (!previewRunning()) return false;
  tmux("send-keys", "-t", PREVIEW.session, "C-c");
  for (let i = 0; i < 30 && previewRunning(); i++) await Bun.sleep(500);
  if (previewRunning()) tmux("kill-session", "-t", PREVIEW.session);
  return true;
}

/**
 * Plays a staged puzzle on your phone before anyone else: `make phone` with
 * just that puzzle, as today's, in a tmux session that outlives this
 * terminal. Nothing played there reaches the live game.
 */
async function preview(arg: string | undefined) {
  if (arg === "stop") {
    console.log(
      (await stopPreview()) ? "Preview stopped." : "No preview running.",
    );
    return;
  }
  const staged = await readStaged();
  const puzzle = arg ? staged.find((p) => p.date === arg) : staged[0];
  if (!puzzle)
    throw new Stop(
      staged.length
        ? `Nothing staged for ${arg}.`
        : "Nothing staged. Stage a puzzle first: stached stage <file>",
    );

  writePrivate(PREVIEW.puzzles, [{ ...puzzle, date: today() }]);
  await stopPreview();
  if (!existsSync(join(ROOT, "node_modules/.bin/vite"))) {
    console.log(
      "Installing the site's packages for previews (first time only)…",
    );
    const install = spawnSync("bun", ["install", "--frozen-lockfile"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (install.status !== 0) throw new Stop("bun install failed.");
  }
  rmSync(PREVIEW.url, { force: true });
  // A clean environment, so the preview never sees the live API's settings.
  const started = spawnSync(
    "tmux",
    [
      "new-session",
      "-d",
      "-s",
      PREVIEW.session,
      "-c",
      ROOT,
      `STACHED_API_PORT=${PREVIEW.port} PUZZLES_FILE='${PREVIEW.puzzles}' STACHE_PASSWORD=test ./scripts/phone.sh >'${PREVIEW.log}' 2>&1`,
    ],
    {
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        LANG: "en_US.UTF-8",
      },
      encoding: "utf8",
    },
  );
  if (started.status !== 0) throw new Stop(`tmux failed: ${started.stderr}`);

  for (let i = 0; !existsSync(PREVIEW.url); i++) {
    if (!previewRunning() || i > 120) {
      await stopPreview();
      const log = existsSync(PREVIEW.log)
        ? await Bun.file(PREVIEW.log).text()
        : "";
      throw new Stop(
        `The preview didn't start:\n${log.trim().split("\n").slice(-8).join("\n")}`,
      );
    }
    await Bun.sleep(500);
  }
  const url = (await Bun.file(PREVIEW.url).text()).trim();
  console.log(
    `Previewing ${day(puzzle.date)} (${puzzle.date}) as today's puzzle.\n`,
  );
  spawnSync("bunx", ["qrcode", "--small", url], { stdio: "inherit" });
  console.log(`  ${url}`);
  console.log("  Tailscale on, password test, any name.");
  console.log(
    "\nIt keeps running until `stached preview stop` or `stached confirm`. Nothing played there reaches the live game.",
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
  if (await stopPreview()) console.log("Stopped the preview.");
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
    else console.log(USAGE);
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sql.close();
  }
}
