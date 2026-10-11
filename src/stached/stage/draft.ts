// The admin's Stage tab: the puzzle being written, what the tab is showing,
// and what it reads off the schedule. The puzzle's rules are the API's own
// (stached-api/puzzles.ts), so the page shows a problem before the API would
// refuse it.
import {
  type DayPuzzle,
  type Kind,
  kindOf,
  plain,
  problemsOf,
} from "../../../stached-api/puzzles";
import type { Schedule } from "../api";

export interface DraftGroup {
  /** Its row's own, so a row keeps its keyboard while it moves. */
  id: string;
  title: string;
  words: string[];
  stache: boolean;
}

/** A puzzle being written: the file's shape, with ids for the editor. */
export interface Draft {
  date: string;
  /**
   * In the file's order, until a row moves: the board shows them easiest
   * first, the stache last (inOrder), and reordering them is an edit.
   */
  groups: DraftGroup[];
  /** The push's line; empty takes a random quote from home. */
  push: string;
}

export const group = (
  title = "",
  words = ["", "", "", ""],
  stache = false,
): DraftGroup => ({
  id: Math.random().toString(36).slice(2),
  title,
  words,
  stache,
});

/** The stache group last, after the rest in their order: easiest first. */
export const inOrder = (groups: DraftGroup[]) => [
  ...groups.filter((g) => !g.stache),
  ...groups.filter((g) => g.stache),
];

export const blank = (date: string): Draft => ({
  date,
  groups: [group(), group(), group(), group("", undefined, true)],
  push: "",
});

export const toDraft = ({ date, groups, push }: DayPuzzle): Draft => ({
  date,
  groups: groups.map((g) => group(g.title, [...g.words], Boolean(g.stache))),
  push: push ?? "",
});

/**
 * What the API would refuse, and where on the board: a row's title (t:id) or
 * one of its words (w:id:3), by its row's id so the mark moves with it, or
 * the date, the push line, the stache picker or the rows as a whole.
 */
export const problems = (draft: Draft) =>
  problemsOf(plain(draft)).map(({ text, spots }) => ({
    text,
    fields: spots.map((spot) => {
      const [kind, row, word] = spot.split(":");
      const id = draft.groups[Number(row)]?.id;
      return kind === "t" ? `t:${id}` : kind === "w" ? `w:${id}:${word}` : spot;
    }),
  }));

export interface Board {
  step: "board";
  draft: Draft;
  /** The paste Haiku sorted, to go back to; null if typed or opened. */
  pasted: string | null;
  /** Where it's staged, if it is: what Unstage drops, and moving it moves. */
  staged: string | null;
  view: "rows" | "shuffled";
}

export type Stage =
  /** `note` says why it's back here: Haiku found no puzzle, or failed. */
  | { step: "paste"; date: string; text: string; note?: string }
  | { step: "organizing"; date: string; text: string }
  | Board
  | { step: "published"; draft: Draft; kind: Kind; number: number };

const KEY = "stached.stage";

/**
 * Where the tab was, from this device: iOS can drop a page that's been in the
 * background, and a puzzle half written shouldn't go with it.
 */
export function loadStage(): Stage | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    // Back to the paste mid-sort; and once published, on to the next.
    if (saved?.step === "organizing") return { ...saved, step: "paste" };
    return saved?.step === "published" ? null : saved;
  } catch {
    return null;
  }
}

export function saveStage(stage: Stage) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stage));
  } catch {
    // Private mode: it lasts as long as the tab.
  }
}

export const publishedOn = (schedule: Schedule, date: string) =>
  schedule.published.find((p) => p.date === date);

export const stagedOn = (schedule: Schedule, date: string) =>
  schedule.staged.find((p) => p.date === date);

/** Its number once published: #1 is the first by date. */
export const numberOf = (schedule: Schedule, date: string) =>
  schedule.before + schedule.published.filter((p) => p.date < date).length + 1;

export const addDays = (date: string, days: number) => {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
};

/** The first day from today with no puzzle, published or staged. */
export function nextOpen(schedule: Schedule) {
  let date = schedule.today;
  while (publishedOn(schedule, date) || stagedOn(schedule, date))
    date = addDays(date, 1);
  return date;
}

/** What publishing the draft does to the published puzzle on its date. */
export const kindFor = (schedule: Schedule, draft: Draft) =>
  kindOf(plain(draft), publishedOn(schedule, draft.date));

/** Games that publishing the draft deletes. */
export const gamesLost = (schedule: Schedule, draft: Draft) =>
  kindFor(schedule, draft) === "edit"
    ? (publishedOn(schedule, draft.date)?.games ?? 0)
    : 0;

/** The draft as it was staged, word for word. */
export const isStaged = (schedule: Schedule, draft: Draft) => {
  const staged = stagedOn(schedule, draft.date);
  return Boolean(staged) && kindOf(plain(draft), staged) === "same";
};
