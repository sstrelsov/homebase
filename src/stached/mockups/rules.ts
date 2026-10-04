// The puzzle rules and push timing, as the admin's stage screen would use them.
// Mockup copies of puzzleProblems (stached-api/puzzles.ts) and timing()
// (stached-api/cli.ts), which import Bun and can't load in a browser. These
// point at the row or tile at fault, so the editor can mark it.

export interface DraftGroup {
  id: string;
  title: string;
  words: string[];
  stache: boolean;
}

/** A puzzle being staged: the file's shape, with ids for the editor. */
export interface Draft {
  date: string;
  groups: DraftGroup[];
  /** The push's line; empty takes a random one from the crawl. */
  push: string;
}

let nextId = 0;
/** A group as the editor keeps it: with an id, so its row can move. */
export const group = (
  title = "",
  words = ["", "", "", ""],
  stache = false,
): DraftGroup => ({ id: `g${nextId++}`, title, words, stache });

/** A puzzle on the schedule: a draft, or published. */
export interface Entry extends Draft {
  status: "draft" | "published";
  /** Games played on it, finished or not. */
  games: number;
}

const ANNOUNCE_AT = "09:12";
export const PUSH_TIME = "9:12am";

/** The time in New York as "2026-10-02 09:12", which sorts as text. */
const newYorkTime = (now = new Date()) =>
  now.toLocaleString("sv-SE", { timeZone: "America/New_York" }).slice(0, 16);

export const TODAY = newYorkTime().slice(0, 10);

export const addDays = (date: string, days: number) => {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
};

/** "Fri, Oct 2" */
export const dayName = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** On its date, from 9:12am New York time. */
const announceDue = (date: string, now = new Date()) => {
  const time = newYorkTime(now);
  return time.startsWith(date) && time >= `${date} ${ANNOUNCE_AT}`;
};

/** Whether a puzzle's push has gone out by now. */
export const pushed = (date: string) => date < TODAY || announceDue(date);

/** What publishing does to the published puzzle on its date, if any. */
export type Kind = "new" | "edit" | "push" | "same";

/** timing() from the CLI: when it goes live, and when its push goes out. */
export function timing(date: string, kind: Kind, now = new Date()) {
  if (kind === "push" && date === TODAY && !announceDue(date, now))
    return `The new line goes out with its push at ${PUSH_TIME}.`;
  if (kind !== "new" && date <= TODAY)
    return "It's out already, so the change is live right away. A puzzle never pushes twice.";
  if (date < TODAY) return "It's dated before today, so it gets no push.";
  if (date > TODAY)
    return `It goes live at midnight New York time on ${dayName(date)}, with its push at ${PUSH_TIME}.`;
  return announceDue(date, now)
    ? "It goes live right away, with its push within a minute."
    : `It goes live right away, with its push at ${PUSH_TIME}.`;
}

const words = (groups: DraftGroup[]) =>
  JSON.stringify(
    groups.map(({ title, words, stache }) => [title, words, stache]),
  );

/** What publishing this draft would do, against what's published. */
export function kindOf(draft: Draft, published: Entry | undefined): Kind {
  if (!published) return "new";
  if (words(draft.groups) !== words(published.groups)) return "edit";
  return draft.push === published.push ? "same" : "push";
}

/** Numbered by date among published puzzles, as if this one were too. */
export const numberOf = (date: string, schedule: Entry[]) =>
  schedule.filter((p) => p.status === "published" && p.date < date).length + 1;

/**
 * Where a problem is, for the editor to mark: the date, a row's title (t:id),
 * a word (w:id:index), the stache picker, or the rows as a whole.
 */
export type Spot = "date" | "stache" | "rows" | `t:${string}` | `w:${string}`;

export interface Problem {
  text: string;
  spots: Spot[];
}

const fold = (text: string) => text.trim().toLowerCase();

/** Each text that appears more than once (ignoring case), and where. */
function repeats(items: { text: string; at: Spot }[]) {
  const seen = new Map<string, { text: string; spots: Spot[] }>();
  for (const { text, at } of items) {
    const key = fold(text);
    if (!key) continue;
    const found = seen.get(key) ?? { text: text.trim(), spots: [] };
    seen.set(key, { ...found, spots: [...found.spots, at] });
  }
  return [...seen.values()].filter(({ spots }) => spots.length > 1);
}

/**
 * Everything the server would refuse, in the editor's words. `drafts` are the
 * other drafts: one puzzle per date. A real date comes from the date picker.
 */
export function problems(draft: Draft, drafts: Entry[]): Problem[] {
  const out: Problem[] = [];
  const { groups } = draft;
  if (drafts.some((d) => d.date === draft.date))
    out.push({
      text: `${dayName(draft.date)} has another draft: one puzzle per date`,
      spots: ["date"],
    });
  groups.forEach((g, row) => {
    if (!g.title.trim())
      out.push({ text: `Row ${row + 1} needs a title`, spots: [`t:${g.id}`] });
    const empty = g.words.flatMap((w, i) =>
      w.trim() ? [] : [`w:${g.id}:${i}` as const],
    );
    if (empty.length)
      out.push({ text: `Row ${row + 1} needs four words`, spots: empty });
  });
  const allWords = groups.flatMap((g) =>
    g.words.map((text, i) => ({ text, at: `w:${g.id}:${i}` as Spot })),
  );
  for (const { text, spots } of repeats(allWords))
    out.push({ text: `“${text}” is in the puzzle twice`, spots });
  const titles = groups.map((g) => ({
    text: g.title,
    at: `t:${g.id}` as Spot,
  }));
  for (const { text, spots } of repeats(titles))
    out.push({ text: `Two rows are called “${text}”`, spots });
  if (groups.filter((g) => g.stache).length !== 1)
    out.push({
      text: "Pick the stache group: tap Gerald on its row",
      spots: ["stache"],
    });
  if (groups.length > 5)
    out.push({ text: "Five rows at most: remove one", spots: ["rows"] });
  return out;
}
