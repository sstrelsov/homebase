// What the designs show, worked out from the made-up games with the
// leaderboard's own rules (stached-api/leaderboard.ts) wherever they reach:
// marks, points, places and streaks. The rest (head-to-head, titles, the
// day's events) is new, and only the mockups have it.
import {
  type Day,
  type Leaderboard,
  leaderboardOf,
  type Mark,
  WEEK,
} from "../../../../stached-api/leaderboard";
import { formatTime } from "../../api";
import {
  DAYS,
  NOW,
  type Play,
  PUSH_AT,
  playsAt,
  type TodayState,
} from "./sample";

/** Everything the designs draw from, as of a time today. */
export interface Sample {
  days: Day[];
  plays: Play[];
  /** Minutes after midnight in New York. */
  now: number;
  me: string;
  /** The live leaderboard, as the API would send it. */
  board: Leaderboard;
}

export function sampleOf(today: TodayState, me: string): Sample {
  const plays = playsAt(NOW[today]);
  return {
    days: DAYS,
    plays,
    now: NOW[today],
    me,
    board: leaderboardOf(DAYS, plays),
  };
}

const isWin = (mark: Mark) => mark === "won" || mark === "won-missed";
const isSolve = (mark: Mark) => mark === "won" || mark === "solved";

type Finished = Play & { completed: boolean; finishedAt: number };

/** Games that count and are over: not late, and solved or missed. */
export const finished = (plays: Play[]) =>
  plays.filter(
    (play): play is Finished => !play.late && play.completed !== null,
  );

const today = (sample: Sample) => sample.days.at(-1) as Day;

/** Today's finished games, first finished first. */
export const todays = (sample: Sample) =>
  finished(sample.plays)
    .filter((play) => play.puzzleId === today(sample).id)
    .sort((a, b) => a.finishedAt - b.finishedAt);

/** Who started today's and hasn't finished it, and who hasn't started. */
export function stillToPlay(sample: Sample) {
  const done = new Set(todays(sample).map((play) => play.name));
  return sample.board.players
    .filter((player) => !done.has(player.name))
    .map(({ name }) => ({
      name,
      playing: sample.plays.some(
        (play) => play.name === name && play.puzzleId === today(sample).id,
      ),
    }));
}

/** Each player's mark on every day, oldest first, by the leaderboard's rules. */
function allMarks(sample: Sample): Map<string, Mark[]> {
  const names = sample.board.players.map((player) => player.name);
  const marks = new Map(names.map((name): [string, Mark[]] => [name, []]));
  // The leaderboard marks the last WEEK days, so ask it a week at a time.
  for (let end = sample.days.length; end > 0; end -= WEEK) {
    const { players } = leaderboardOf(sample.days.slice(0, end), sample.plays);
    const none = (): Mark[] => Array(Math.min(WEEK, end)).fill("none");
    for (const name of names) {
      const week = players.find((p) => p.name === name)?.marks ?? none();
      marks.set(name, [...week, ...(marks.get(name) ?? [])]);
    }
  }
  return marks;
}

/**
 * Places on a board of only these days, and each player's change since the
 * day before: up is positive, and new to the board is null.
 */
export function standingsOver(sample: Sample, days: Day[]) {
  const now = leaderboardOf(days, sample.plays).players;
  const before = leaderboardOf(days.slice(0, -1), sample.plays).players;
  return now.map((player) => {
    const was = before.find((p) => p.name === player.name)?.rank;
    return { ...player, moved: was === undefined ? null : was - player.rank };
  });
}

/** Faster first; no time last. */
export const byTime = (a: number | null, b: number | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a - b;

/** Who had the better game: a solve beats a miss, then the faster stache. */
const better = (a: Play, b: Play) =>
  Number(b.completed) - Number(a.completed) || byTime(a.stachedMs, b.stachedMs);

/** One player against another, over every puzzle both finished. */
export function headToHead(sample: Sample, me: string, them: string) {
  const games = finished(sample.plays);
  const mine = new Map(
    games.filter((g) => g.name === me).map((g) => [g.puzzleId, g]),
  );
  let won = 0;
  let lost = 0;
  let tied = 0;
  for (const theirs of games.filter((g) => g.name === them)) {
    const game = mine.get(theirs.puzzleId);
    if (!game) continue;
    const result = better(game, theirs);
    if (result < 0) won++;
    else if (result > 0) lost++;
    else tied++;
  }
  return { won, lost, tied, shared: won + lost + tied };
}

const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Mistakes on a solve down to its last life: four, with the bonus life. */
const LAST_LIFE = 4;
/** From 10pm, a night owl's game. */
const NIGHT = 22 * 60;

/** Everything a player's card shows, over every puzzle so far. */
export function cardOf(sample: Sample, name: string) {
  const marks = allMarks(sample).get(name) ?? [];
  const games = finished(sample.plays).filter((g) => g.name === name);
  const solves = games.filter((g) => g.completed);
  const times = games.flatMap((g) => (g.stachedMs === null ? [] : g.stachedMs));
  // Solved in a row at any point: the longest run of solves.
  let best = 0;
  let run = 0;
  for (const mark of marks) {
    run = isSolve(mark) ? run + 1 : mark === "open" ? run : 0;
    best = Math.max(best, run);
  }
  const standing = sample.board.players.find((p) => p.name === name);
  return {
    name,
    rank: standing?.rank,
    points: standing?.points ?? 0,
    streak: standing?.streak ?? 0,
    best,
    marks,
    played: games.length,
    solved: solves.length,
    fastest: marks.filter(isWin).length,
    mistakes: average(games.map((g) => g.mistakes)),
    bestMs: times.length ? Math.min(...times) : null,
    stacheMs: average(times),
    solveMs: average(solves.flatMap((g) => g.solveMs ?? [])),
    late: sample.plays.filter((g) => g.name === name && g.late).length,
  };
}

/** A title for the week, and who holds it: everyone tied for the most. */
interface Title {
  title: string;
  /** On a chip under a name. */
  short: string;
  /** A bar color from the game: a group's, or the stache group's bands. */
  color: "1" | "2" | "3" | "4" | "stache";
  holders: string[];
  /** What they did, after their names: "3 fastest". */
  stat: string;
}

/** Everyone tied for the most of something, if anyone has any. */
function most(counts: Map<string, number>) {
  const top = Math.max(0, ...counts.values());
  const holders = [...counts]
    .filter(([, n]) => n === top)
    .map(([name]) => name);
  return { top, holders: top > 0 ? holders.sort() : [] };
}

const countBy = <T>(items: T[], key: (item: T) => string | null) => {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k !== null) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
};

/** This week's titles, over the last WEEK puzzles. */
export function titlesOf(sample: Sample): Title[] {
  const week = new Set(sample.days.slice(-WEEK).map((day) => day.id));
  const games = finished(sample.plays).filter((g) => week.has(g.puzzleId));
  const { players } = sample.board;
  const firstIn = [...Map.groupBy(games, (g) => g.puzzleId).values()].map(
    (day) => day.reduce((a, b) => (b.finishedAt < a.finishedAt ? b : a)),
  );

  const title = (
    [title, short]: [string, string],
    color: Title["color"],
    counts: Map<string, number>,
    stat: (n: number) => string,
  ): Title => {
    const { top, holders } = most(counts);
    return { title, short, color, holders, stat: stat(top) };
  };

  return [
    title(
      ["Speed demon", "Speed"],
      "3",
      new Map(players.map((p) => [p.name, p.marks.filter(isWin).length])),
      (n) => `${n} fastest`,
    ),
    title(
      ["Iron stache", "Iron"],
      "stache",
      new Map(players.map((p) => [p.name, p.streak])),
      (n) => `${n} in a row`,
    ),
    title(
      ["Clean shave", "Clean"],
      "1",
      countBy(games, (g) => (g.completed && g.mistakes === 0 ? g.name : null)),
      (n) => `${n} with no mistakes`,
    ),
    title(
      ["Close shave", "Close"],
      "2",
      countBy(games, (g) =>
        g.completed && g.mistakes === LAST_LIFE ? g.name : null,
      ),
      (n) => `${n} on the last life`,
    ),
    title(
      ["Early bird", "Early"],
      "1",
      countBy(firstIn, (g) => g.name),
      (n) => `First in ${n} ${n === 1 ? "day" : "days"}`,
    ),
    title(
      ["Night owl", "Owl"],
      "4",
      countBy(games, (g) => (g.finishedAt >= NIGHT ? g.name : null)),
      (n) => `${n} after 10pm`,
    ),
  ];
}

/** Something that happened today, for the bulletins and the timeline. */
export interface Bulletin {
  /** Minutes after midnight in New York. */
  at: number;
  name: string | null;
  text: string;
  /** Took (or tied) the fastest stache so far. */
  lead?: boolean;
}

/**
 * Today, replayed: each finished game in turn, with what it changed. Firsts,
 * the fastest stache so far, places gained, streaks, and close calls. Oldest
 * first, starting at the push.
 */
export function bulletinsOf(sample: Sample): Bulletin[] {
  const day = today(sample);
  const out: Bulletin[] = [
    { at: PUSH_AT, name: null, text: `Puzzle #${day.number} is up` },
  ];
  const games = todays(sample);
  const others = sample.plays.filter((g) => g.puzzleId !== day.id);
  let fastest: { ms: number | null; holders: string[] } = {
    ms: null,
    holders: [],
  };
  let places = leaderboardOf(sample.days, others).players;

  games.forEach((game, i) => {
    const board = leaderboardOf(sample.days, [
      ...others,
      ...games.slice(0, i + 1),
    ]).players;
    const say = (text: string, lead = false) =>
      out.push({ at: game.finishedAt, name: game.name, text, lead });

    if (i === 0) say("First in");
    if (game.stachedMs !== null && byTime(game.stachedMs, fastest.ms) <= 0) {
      const time = formatTime(game.stachedMs);
      const { holders } = fastest;
      if (game.stachedMs === fastest.ms)
        say(`Ties ${names(holders)} for the fastest stache: ${time}`, true);
      else if (holders.length > 0)
        say(`Takes the fastest stache from ${names(holders)}: ${time}`, true);
      else say(`Fastest stache so far: ${time}`, true);
      fastest = {
        ms: game.stachedMs,
        holders:
          game.stachedMs === fastest.ms ? [...holders, game.name] : [game.name],
      };
    }
    const now = board.find((p) => p.name === game.name);
    const was = places.find((p) => p.name === game.name);
    // Everyone level with or above them before, and below them after.
    const passed =
      now && was
        ? places.filter(
            (p) =>
              p.name !== game.name &&
              p.rank <= was.rank &&
              (board.find((b) => b.name === p.name)?.rank ?? 0) > now.rank,
          )
        : [];
    if (now && passed.length > 0)
      say(`Passes ${names(passed.map((p) => p.name))} for #${now.rank}`);
    if (game.completed && game.mistakes === 0) say("Solves with no mistakes");
    if (game.completed && game.mistakes === LAST_LIFE)
      say("Solves on the last life");
    if (game.completed && now && now.streak >= 3) say(`${now.streak} in a row`);
    if (!game.completed && was && was.streak >= 3)
      say(`Streak ends at ${was.streak}`);
    places = board;
  });
  return out;
}

/** Everyone in first place on a board of only these days. */
export const championsOver = (sample: Sample, days: Day[]) =>
  leaderboardOf(days, sample.plays).players.filter((p) => p.rank === 1);

/** A past day in brief: how many played and solved, and its fastest stache. */
export function recapOf(sample: Sample, day: Day) {
  const games = finished(sample.plays).filter((g) => g.puzzleId === day.id);
  const ms = Math.min(...games.flatMap((g) => g.stachedMs ?? []));
  return {
    played: games.length,
    solved: games.filter((g) => g.completed).length,
    fastest: games.filter((g) => g.stachedMs === ms).map((g) => g.name),
    ms: Number.isFinite(ms) ? ms : null,
  };
}

/** "Bea", "Bea and Theo", "Bea, Theo and Ozzie". */
export const names = (list: string[]) =>
  list.length < 2
    ? list.join("")
    : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;

/** Minutes after midnight → "9:21am". */
export function clock(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour % 12 || 12}:${minute}${hour < 12 ? "am" : "pm"}`;
}

/** Minutes → "4h 52m" or "38m". */
export const duration = (minutes: number) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
