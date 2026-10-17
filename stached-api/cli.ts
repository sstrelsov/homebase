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
import { addDays, dayName } from "./leaderboard";
import { migrate } from "./migrate";
import {
  ANNOUNCE_AT,
  type Announced,
  announce,
  announceDue,
  COUNTS_MS,
  lastPush,
  newYorkTime,
  pushCopy,
  vapidKeys as pushKeys,
} from "./push";
import {
  byDate,
  caughtUp,
  type DayPuzzle,
  gamesByDate,
  inOrder,
  numbered,
  outOf,
  type Pushes,
  pushes,
  puzzleProblems,
  readPuzzles,
  syncPuzzles,
  todays,
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
  stached out <date> <day>   say a missed day's puzzle came out on another
                             day, keeping every number and push; a dry run
                             until you add --apply
  stached vapid-keys         make the API's push keys, for api.env
  stached push-again         send today's push again (the tester only)

To catch up on a missed day, stage its puzzle (dated that day): it comes out
today and counts like today's, numbered after today's. Before today's push
it shares it; after, it gets its own right away, as an extra puzzle. Just
after midnight, before today's is out and while yesterday's push still
counts, it comes out with yesterday's instead, and pushes right away.
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

/** "9:12am", from "09:12" */
const clock = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
};

const pushTime = clock(ANNOUNCE_AT);

const today = (now = new Date()) => newYorkTime(now).slice(0, 10);

/** "Fri, Oct 16, 9:12am", in New York */
const moment = (at: Date) => {
  const [date, time] = newYorkTime(at).split(" ");
  return `${day(date)}, ${clock(time)}`;
};

/**
 * When a puzzle published now goes live, and when its push goes out: on the
 * day it comes out (out), at 9:12am, or right away after that, or right away
 * while the push its day has had (`last`) still counts. `pushed` says
 * whether its own push has gone out, and `extra` whether that push is an
 * extra puzzle, a missed day's.
 */
export function timing(
  out: string,
  kind: Change["kind"],
  {
    pushed = false,
    extra = false,
    last,
  }: { pushed?: boolean; extra?: boolean; last?: Date } = {},
  now = new Date(),
) {
  const current = today(now);
  const due = announceDue(out, now, last);
  if (kind === "push" && out === current && !pushed)
    return due
      ? "Its push goes out right away."
      : `Its push goes out at ${pushTime}.`;
  if (kind !== "new" && out <= current)
    return "It's out already, so the change is live right away. A puzzle never pushes twice.";
  if (pushed)
    return "It's back as it was, with no new push: its push went out already.";
  if (out > current)
    return `It goes live at midnight New York time on ${day(out)}, with its push at ${pushTime}.`;
  if (!due) return `It goes live right away, with its push at ${pushTime}.`;
  return extra
    ? "It goes live and pushes right away, as an extra puzzle. It counts for a day from its own push."
    : "It goes live and pushes right away.";
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
 * The day a missed day's puzzle published now comes out: today, or, while
 * nothing is out today and yesterday's push still counts (Thursday's pushed
 * at 11:31pm, and Wednesday's published at 12:21am), yesterday, so it pairs
 * with yesterday's, a double header, and pushes right away, as an extra.
 * `puzzles` are every puzzle published and staged.
 */
export function catchUpDay(
  puzzles: DayPuzzle[],
  pushed: Pushes,
  now = new Date(),
) {
  const current = today(now);
  const yesterday = addDays(current, -1);
  if (puzzles.some((p) => outOf(p) === current)) return current;
  const last = lastPush(
    puzzles
      .filter((p) => outOf(p) === yesterday)
      .map((p) => ({ pushed: pushed.get(p.date) })),
  );
  return last && now.getTime() < last.getTime() + COUNTS_MS
    ? yesterday
    : current;
}

/**
 * The puzzles file after publishing staged puzzles: new dates added, edited
 * ones replaced, identical ones left as they were. A new one dated before
 * today catches up on a missed day: it comes out today, or with yesterday's
 * (`catchUpDay`), numbered after that day's own (`inOrder`), so no number
 * people were sent, or saw on today's since midnight, moves. One whose push
 * went out (and was taken down since) comes back on the day it came out, the
 * day of its push, so it takes its old number back and moves no other.
 */
export function publish(
  published: DayPuzzle[],
  staged: DayPuzzle[],
  games: Map<string, number>,
  { deleteGames = false, pushed = new Map() as Pushes, now = new Date() } = {},
) {
  const planned = changes(published, staged, games);
  guard(planned, "change a published puzzle", deleteGames);
  const current = today(now);
  const caughtUpOn = catchUpDay([...published, ...staged], pushed, now);
  const puzzles = new Map(published.map((p) => [p.date, p]));
  staged.forEach((puzzle, i) => {
    if (planned[i].kind === "same") return;
    const old = puzzles.get(puzzle.date);
    const sent = pushed.get(puzzle.date);
    // A published puzzle keeps the day it came out.
    const out = old
      ? old.out
      : sent
        ? today(sent)
        : puzzle.date < current
          ? caughtUpOn
          : undefined;
    puzzles.set(puzzle.date, filed(puzzle, out));
  });
  return [...puzzles.values()].sort(byDate);
}

/**
 * The puzzles file with a missed day's puzzle out on another day (`out`), to
 * file one published before `catchUpDay` with the day it pairs with. It
 * refuses to move any number already out, so no number sent in a push
 * changes, and it sends no push: one already sent stays sent, and a day that
 * passed without one never gets one. Games stay, since the words don't change.
 */
export function refile(
  published: DayPuzzle[],
  date: string,
  out: string,
  pushed: Pushes,
  now = new Date(),
) {
  if (!published.some((p) => p.date === date))
    throw new Stop(`No published puzzle on ${date}.`);
  const sent = pushed.get(date);
  const latest = sent ? today(sent) : today(now);
  if (!(out > date && out <= latest))
    throw new Stop(
      `${day(date)}'s puzzle can only come out after its own date, and no later than ${sent ? `its push, on ${day(latest)}` : "today"}.`,
    );
  const after = published.map((p) => (p.date === date ? filed(p, out) : p));
  const numbers = (puzzles: DayPuzzle[]) =>
    new Map(
      withNumbers(puzzles, pushed)
        .filter((p) => p.out <= today(now))
        .map((p) => [p.date, p.number]),
    );
  const was = numbers(published);
  const will = numbers(after);
  const moved = [...was].filter(([d, n]) => will.get(d) !== n);
  if (moved.length)
    throw new Stop(
      `Refusing: it would change the number of a puzzle that's out, ${moved.map(([d, n]) => `#${n} (${d}) to #${will.get(d)}`).join(", ")}.`,
    );
  return after;
}

/** The puzzles out on a day, in the order given. */
const outOn = <T extends Pick<DayPuzzle, "date" | "out">>(
  all: T[],
  out: string,
) => all.filter((p) => outOf(p) === out);

/** The puzzles out on the same day as the one with this date, by number. */
const outWith = (all: Numbered[], date: string) => {
  const puzzle = all.find((p) => p.date === date);
  return puzzle ? outOn(all, puzzle.out) : [];
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

/** A puzzle as its push knows it, and when that push went out, if it has. */
type Numbered = DayPuzzle & Announced & { pushed?: Date };

/**
 * The puzzles with their numbers, in number order, as they'll be once these
 * are published: #1 is the first out (`inOrder`).
 */
const withNumbers = (puzzles: DayPuzzle[], pushed: Pushes): Numbered[] =>
  inOrder(puzzles, pushed).map((p, i) => ({
    ...p,
    number: i + 1,
    out: outOf(p),
    pushed: pushed.get(p.date),
  }));

/**
 * The push a puzzle goes out in: with every puzzle out on its day that
 * hasn't been pushed, on top of those that have (the latest at `last`), and
 * whether it's an extra puzzle, a missed day's. Null once it's been sent, or
 * if its day has passed without one, unless it's out after its day's push
 * while that still counts (`announceDue`).
 */
function pushOf(all: Numbered[], date: string, now = new Date()) {
  const together = outWith(all, date);
  const fresh = together.filter((p) => !p.pushed);
  const earlier = together.filter((p) => p.pushed);
  const last = lastPush(earlier);
  if (
    !fresh.some((p) => p.date === date) ||
    (fresh[0].out < today(now) && !announceDue(fresh[0].out, now, last))
  )
    return null;
  return {
    ...pushCopy(fresh, earlier),
    first: fresh[0],
    last,
    extra: fresh.every(caughtUp),
  };
}

/**
 * Whether a puzzle out so far is one of today's: out on the newest day, or
 * pushed less than a day ago, as `released()` has it.
 */
const onHome = (all: Numbered[], now = new Date()) => {
  const current = today(now);
  const newest = all
    .map((p) => p.out)
    .filter((out) => out <= current)
    .sort()
    .at(-1);
  return (p: Numbered) =>
    p.out <= current &&
    (p.out === newest ||
      (p.pushed !== undefined &&
        now.getTime() < p.pushed.getTime() + COUNTS_MS));
};

/** Lines up rows of cells in columns, the one at `right` to the right. */
function table(rows: string[][], right = -1) {
  const widths = rows[0].map((_, col) =>
    Math.max(...rows.map((row) => row[col].length)),
  );
  for (const row of rows)
    console.log(
      row
        .map((cell, col) =>
          col === right ? cell.padStart(widths[col]) : cell.padEnd(widths[col]),
        )
        .join("  ")
        .trimEnd(),
    );
}

/** How a puzzle's push stands: when it went out, or when it will. */
const pushState = (all: Numbered[], p: Numbered, now = new Date()) => {
  if (p.pushed) return `sent ${moment(p.pushed)}`;
  const last = lastPush(outWith(all, p.date));
  if (announceDue(p.out, now, last)) return "any minute";
  return p.out < today(now) ? "none" : pushTime;
};

/**
 * A puzzle's status: today (one of today's, on home), out, or upcoming, and
 * for a missed day's, the day it came out.
 */
const statusOf = (all: Numbered[], now = new Date()) => {
  const home = onHome(all, now);
  return (p: Numbered) => {
    const when = home(p) ? "today" : p.out < today(now) ? "out" : "upcoming";
    return caughtUp(p) ? `${when}, caught up ${day(p.out)}` : when;
  };
};

async function list() {
  const [published, staged, games, pushed] = await Promise.all([
    readPuzzles(puzzlesFile()),
    readStaged(),
    gamesByDate(),
    pushes(),
  ]);
  const all = withNumbers(published, pushed);
  const status = statusOf(all);
  table(
    [
      ["", "DATE", "", "STATUS", "GAMES", "PUSH"],
      ...all.map((p) => [
        `#${p.number}`,
        p.date,
        day(p.date),
        status(p),
        String(games.get(p.date) ?? 0),
        pushState(all, p),
      ]),
      ...staged.map((p) => [
        "",
        p.date,
        day(p.date),
        published.some((q) => q.date === p.date) ? "staged edit" : "staged",
        "",
        "",
      ]),
    ],
    4,
  );
  if (!staged.length) return;
  console.log("\nStaged, not live:");
  await describe(staged);
}

/**
 * Says what publishing staged puzzles would do: each one's number, groups,
 * push, and when it goes live. Returns every puzzle, numbered, as they'll be.
 */
async function describe(staged: DayPuzzle[]) {
  const [published, games, pushed] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByDate(),
    pushes(),
  ]);
  const merged = withNumbers(
    publish(published, staged, games, { deleteGames: true, pushed }),
    pushed,
  );
  for (const [i, change] of changes(published, staged, games).entries()) {
    const { date, groups, push } = staged[i];
    const titles = groups.map((g) => g.title + (g.stache ? " (stache)" : ""));
    const puzzle = merged.find((p) => p.date === date) as Numbered;
    const copy = pushOf(merged, date);
    console.log(`#${puzzle.number} · ${day(date)} (${date})`);
    console.log(`  ${titles.join(" · ")}`);
    if (change.kind === "new" && caughtUp(puzzle) && !puzzle.pushed) {
      const before = numbered(
        outOn(merged, puzzle.out)
          .filter((p) => p.number < puzzle.number)
          .map((p) => p.number),
      );
      console.log(
        puzzle.out === today()
          ? `  A missed day: it comes out today${before && `, after ${before}`}.`
          : `  A missed day: it comes out with ${dayName(puzzle.out, puzzle.out)}'s ${before}, which still count${before.includes(" ") ? "" : "s"}.`,
      );
    }
    // The push it goes out in: the first puzzle's line, or a default.
    if (copy) {
      console.log(
        `  Push: ${copy.title} · ${copy.line ?? "a random quote from home"}`,
      );
      if (push && copy.first.date !== date)
        console.log(
          `  Its own push line goes unused: #${copy.first.number}'s comes first.`,
        );
    }
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
    console.log(
      `  ${timing(puzzle.out, change.kind, { pushed: Boolean(puzzle.pushed), extra: copy?.extra, last: copy?.last })}`,
    );
  }
  return merged;
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
  writePrivate(stagedFile(), staged);
  const merged = await describe(staged);
  if (!TESTER) toTester(outWith(merged, staged[0].date));
  console.log("\nStaged, not live. Publish it with `stached confirm`.");
}

/**
 * What the tester's `play` gets: the puzzles out on a day, by number, and the
 * dates to count as pushed there first, without a push, push by push: those
 * pushed on the live game before the rest. So the tester numbers them as
 * live does, and pushes the rest on top, as live will (the last push again,
 * when every one went out).
 */
interface TesterDay {
  out: string;
  puzzles: DayPuzzle[];
  pushed: string[][];
}

/**
 * Makes the puzzles out on a day, as they'll be once what's staged is
 * published, today's on the tester, to play in its home-screen app before
 * anyone else. This CLI runs again with the tester's settings, since one
 * process talks to one database.
 */
function toTester(together: Numbered[]) {
  if (!existsSync(TESTER_ENV)) {
    console.log("\nNo tester here to play it on: `make tester` sets one up.");
    return;
  }
  const last = Math.max(...together.map((p) => p.pushed?.getTime() ?? 0));
  const before = (p: Numbered) =>
    p.pushed && (together.some((q) => !q.pushed) || p.pushed.getTime() < last);
  const batch: TesterDay = {
    out: together[0].out,
    puzzles: together.map(plain),
    pushed: [
      ...Map.groupBy(together.filter(before), (p) => p.pushed?.getTime()),
    ].map(([, push]) => push.map((p) => p.date)),
  };
  const played = spawnSync(
    "bun",
    [`--env-file=${TESTER_ENV}`, import.meta.path, "play"],
    {
      input: JSON.stringify(batch),
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
  const [staged, published, pushed] = await Promise.all([
    readStaged(),
    readPuzzles(puzzlesFile()),
    pushes(),
  ]);
  const puzzle = date ? staged.find((p) => p.date === date) : staged[0];
  if (!puzzle)
    throw new Stop(
      staged.length
        ? `Nothing staged for ${date}.`
        : "Nothing staged. Stage a puzzle first: stached stage <file>",
    );
  // A preview publishes nothing, so no games are at stake.
  const merged = publish(published, staged, new Map(), {
    deleteGames: true,
    pushed,
  });
  toTester(outWith(withNumbers(merged, pushed), puzzle.date));
}

/**
 * The tester only: makes the puzzles from stdin (out on one day) today's, in
 * place of the tester's own: moved so they come out today, the newest dated
 * today and any missed day's the days before, caught up. Their games go with
 * them if the words changed, as on any edit: they're all made up. It pushes
 * right away, even if today's push went out already, so each staging shows
 * its notification too: the ones pushed on the live game count as pushed
 * here, so the rest come as an extra puzzle, as they will there. The
 * tester's own code may be older than this, so its database is brought up to
 * this code's migrations first.
 */
async function play() {
  if (!TESTER) throw new Stop("play is for the tester: stage sends it there.");
  await migrate();
  const date = today();
  const {
    out,
    puzzles: incoming,
    pushed,
  }: TesterDay = JSON.parse(await Bun.stdin.text());
  const move = (from: string) =>
    addDays(from, (Date.parse(date) - Date.parse(out)) / 86_400_000);
  const moved = incoming.map((puzzle) =>
    filed({ ...puzzle, date: move(puzzle.date) }, date),
  );
  const dates = new Set(moved.map((p) => p.date));
  // The tester's own come out on their dates, so today's are just these.
  const puzzles = [
    ...(await readPuzzles(puzzlesFile()))
      .filter((p) => !dates.has(p.date))
      .map(plain),
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
  await pushAgain(pushed.map((push) => push.map(move)));
}

async function confirm(deleteGames: boolean) {
  const now = new Date();
  const staged = await readStaged();
  if (!staged.length) throw new Stop("Nothing staged.");
  const [published, games, pushed] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByDate(),
    pushes(),
  ]);
  const planned = changes(published, staged, games);
  const puzzles = publish(published, staged, games, {
    deleteGames,
    pushed,
    now,
  });
  await savePuzzles(puzzles);
  rmSync(stagedFile());
  // Numbered by the pushes as they are now: the API's 9:12 check may have
  // pushed today's while this published.
  const all = withNumbers(puzzles, await pushes());
  for (const { date, kind } of planned) {
    const puzzle = all.find((p) => p.date === date) as Numbered;
    const copy = pushOf(all, date, now);
    const missed =
      kind === "new" && caughtUp(puzzle)
        ? `, a missed day's, out ${puzzle.out === today(now) ? "today" : `with ${dayName(puzzle.out, puzzle.out)}'s`}`
        : "";
    console.log(
      kind === "same"
        ? `#${puzzle.number} · ${day(date)} was already published.`
        : `Published #${puzzle.number} · ${day(date)}${missed}. ${timing(puzzle.out, kind, { pushed: pushed.has(date), extra: copy?.extra, last: copy?.last }, now)}`,
    );
  }
  await pushNow(now);
}

/**
 * Files a published missed day's puzzle as out on another day (`refile`):
 * says what changes, and writes it only with --apply. Running it again once
 * it's done changes nothing.
 */
async function moveOut(
  date: string | undefined,
  out: string | undefined,
  apply: boolean,
) {
  if (!date || !out)
    throw new Stop(
      "Which puzzle, and which day did it come out? stached out 2026-10-14 2026-10-15",
    );
  const [published, games, pushed] = await Promise.all([
    readPuzzles(puzzlesFile()),
    gamesByDate(),
    pushes(),
  ]);
  const now = new Date();
  const old = published.find((p) => p.date === date);
  if (old && outOf(old) === out) {
    console.log(
      `${day(date)}'s puzzle came out on ${day(out)} already: nothing to change.`,
    );
    return;
  }
  const puzzles = refile(published, date, out, pushed, now);
  const was = withNumbers(published, pushed);
  const will = withNumbers(puzzles, pushed);
  const [statusWas, statusWill] = [statusOf(was, now), statusOf(will, now)];
  // The puzzles out on the day it leaves, and on the day it joins.
  const days = new Set([outOf(old as DayPuzzle), out]);
  const rows = will
    .filter((p) => days.has(p.out) || p.date === date)
    .map((p) => {
      const before = was.find((q) => q.date === p.date) as Numbered;
      const change = (a: string, b: string) => (a === b ? a : `${a} → ${b}`);
      return [
        `#${p.number}`,
        p.date,
        day(p.date),
        change(statusWas(before), statusWill(p)),
        String(games.get(p.date) ?? 0),
        pushState(will, p, now),
      ];
    });
  console.log(
    `${day(date)}'s puzzle came out on ${day(outOf(old as DayPuzzle))}; it would come out on ${day(out)}:`,
  );
  table([["", "DATE", "", "STATUS", "GAMES", "PUSH"], ...rows], 4);
  console.log(
    "No number moves, no push goes out again, and games stay: only the day it came out changes.",
  );
  if (!apply) {
    console.log("A dry run: nothing written. Add --apply to write it.");
    return;
  }
  await savePuzzles(puzzles);
  console.log(`Written: ${day(date)}'s came out on ${day(out)}.`);
}

/**
 * Sends the push for today's puzzles that haven't had one, if it was due
 * when they were published (`now`, so one published just before midnight
 * still goes out), instead of at the API's check a minute later, and prints
 * how it went. It announces what the API would (`todays`), so each still
 * goes out once. Without push keys, push is off.
 */
async function pushNow(now = new Date()) {
  const keys = pushKeys();
  if (keys) await announce(() => todays(now), keys, now);
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
 * often as you like. Never on the live game. `silent` puzzles count as
 * pushed first, push by push, with no push of their own (play, above).
 */
async function pushAgain(silent: string[][] = []) {
  if (!TESTER)
    throw new Stop(
      "push-again is for the tester only: scripts/stached --tester push-again",
    );
  const date = today();
  const puzzles = await readPuzzles(puzzlesFile());
  const outToday = outOn(puzzles, date);
  if (!outToday.length)
    throw new Stop(
      `No puzzle out today (${date}) on the tester: stage one first.`,
    );
  await sql`
    delete from announcements where date in ${sql(outToday.map((p) => p.date))}`;
  // Push by push, a second apart, so they keep their numbers and pushes from
  // the live game.
  const now = Date.now();
  const rows = silent.flatMap((push, i) =>
    push.map((date) => ({
      date,
      sent_at: new Date(now - (silent.length - i) * 1000),
    })),
  );
  if (rows.length) await sql`insert into announcements ${sql(rows)}`;
  await pushNow();
}

async function vapidKeys() {
  const { publicKey, privateKey } = await generateVapidKeys();
  console.log(`VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}`);
}

if (import.meta.main) {
  const [command, ...rest] = Bun.argv.slice(2);
  const deleteGames = rest.includes("--delete-games");
  const [arg, arg2] = rest.filter((a) => !a.startsWith("--"));
  try {
    if (command === "list") await list();
    else if (command === "stage") await stage(arg);
    else if (command === "preview") await preview(arg);
    else if (command === "confirm") await confirm(deleteGames);
    else if (command === "remove") await remove(arg, deleteGames);
    else if (command === "out")
      await moveOut(arg, arg2, rest.includes("--apply"));
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
