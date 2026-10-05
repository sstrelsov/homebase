// What the admin mockups are showing, and a preset for every screen. The
// screen in the address is worked out from the state, so clicking through the
// flow keeps the switcher up to date.
import {
  addDays,
  type Draft,
  type Entry,
  type Kind,
  kindOf,
  problems,
  TODAY,
} from "./rules";
import { organized, PASTE, SCHEDULE, tooMany, withProblems } from "./sample";
import type { ScreenId } from "./search";

export interface Board {
  step: "board";
  draft: Draft;
  /** The pasted text Haiku sorted, to go back to; none if typed or opened. */
  pasted: string | null;
  /** The date of its saved draft on the schedule, once saved. */
  draftOf: string | null;
  savedAt: string | null;
  view: "rows" | "shuffled";
  publishing: boolean;
  toast: string | null;
}

export type Stage =
  | { step: "paste"; date: string; text: string }
  /** `hold` stays put, for looking at; otherwise Haiku answers. */
  | { step: "organizing"; date: string; text: string; hold: boolean }
  | Board
  | { step: "published"; draft: Draft; kind: Kind };

/** Moves the mockups along, from what they show now. */
export type Update = (next: (mock: Mock) => Mock) => void;

export interface Mock {
  tab: "runs" | "stage";
  stage: Stage;
  schedule: Entry[];
  /** The field with the keyboard up (its data-field), if any. */
  focus: string | null;
}

/** The first day from today with no puzzle, published or drafted. */
export const nextOpen = (schedule: Entry[]) => {
  let date = TODAY;
  while (schedule.some((p) => p.date === date)) date = addDays(date, 1);
  return date;
};

export const publishedOn = (schedule: Entry[], date: string) =>
  schedule.find((p) => p.status === "published" && p.date === date);

/** The drafts it can't share a date with: all but its own. */
export const otherDrafts = (schedule: Entry[], board: Board) =>
  schedule.filter((p) => p.status === "draft" && p.date !== board.draftOf);

/** Games publishing it would delete. */
export const gamesLost = (schedule: Entry[], draft: Draft) => {
  const published = publishedOn(schedule, draft.date);
  return kindOf(draft, published) === "edit" ? (published?.games ?? 0) : 0;
};

export const board = (draft: Draft, more: Partial<Board> = {}): Board => ({
  step: "board",
  draft,
  pasted: PASTE,
  draftOf: null,
  savedAt: null,
  view: "rows",
  publishing: false,
  toast: null,
  ...more,
});

/** A published puzzle opened to edit, as a copy. */
export const opened = (entry: Entry): Board =>
  board(
    {
      ...entry,
      groups: entry.groups.map((g) => ({ ...g, words: [...g.words] })),
    },
    { pasted: null },
  );

const DAY = nextOpen(SCHEDULE);
const live = () => opened(publishedOn(SCHEDULE, TODAY) as Entry);

const at = (stage: Stage, more: Partial<Mock> = {}): Mock => ({
  tab: "stage",
  stage,
  schedule: SCHEDULE,
  focus: null,
  ...more,
});

/** Haiku's rows, with a field picked out. */
const focused = (field: (draft: Draft) => string) => {
  const draft = organized(DAY);
  return at(board(draft), { focus: field(draft) });
};

export const PRESETS: Record<ScreenId, () => Mock> = {
  runs: () => at({ step: "paste", date: DAY, text: "" }, { tab: "runs" }),
  paste: () => at({ step: "paste", date: DAY, text: "" }),
  organizing: () =>
    at({ step: "organizing", date: DAY, text: PASTE, hold: true }),
  board: () => at(board(organized(DAY))),
  word: () => focused((d) => `w:${d.groups[0].id}:3`),
  title: () => focused((d) => `t:${d.groups[2].id}`),
  shuffled: () => at(board(organized(DAY), { view: "shuffled" })),
  problems: () => at(board(withProblems(addDays(DAY, 1)))),
  "too-many": () => at(board(tooMany(DAY))),
  push: () => focused(() => "push"),
  saved: () => {
    const draft = organized(DAY);
    return at(
      board(draft, { draftOf: DAY, savedAt: "9:41pm", toast: "Draft saved" }),
      { schedule: [...SCHEDULE, { ...draft, status: "draft", games: 0 }] },
    );
  },
  confirm: () => at(board(organized(DAY), { publishing: true })),
  published: () => {
    const draft = organized(DAY);
    return at(
      { step: "published", draft, kind: "new" },
      { schedule: [...SCHEDULE, { ...draft, status: "published", games: 0 }] },
    );
  },
  live: () => at(live()),
  "confirm-live": () => {
    // Polka out, Rumba in: a word changed on a puzzle people have played.
    const today = live();
    today.draft.groups[1].words[2] = "Rumba";
    return at({ ...today, publishing: true });
  },
};

/** Which screen the state is showing. */
export function screenOf({ tab, stage, schedule, focus }: Mock): ScreenId {
  if (tab === "runs") return "runs";
  if (stage.step !== "board") return stage.step;
  const played = (publishedOn(schedule, stage.draft.date)?.games ?? 0) > 0;
  if (stage.publishing)
    return gamesLost(schedule, stage.draft) ? "confirm-live" : "confirm";
  if (focus === "push") return "push";
  if (focus?.startsWith("t:")) return "title";
  if (focus?.startsWith("w:")) return "word";
  if (stage.view === "shuffled") return "shuffled";
  if (played) return "live";
  if (stage.savedAt) return "saved";
  if (problems(stage.draft, otherDrafts(schedule, stage)).length)
    return stage.draft.groups.length > 5 ? "too-many" : "problems";
  return "board";
}
