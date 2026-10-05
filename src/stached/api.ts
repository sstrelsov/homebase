// Client for the Stached API (stached-api/ at the repo root, on the Studio). In
// dev it goes through Vite's proxy to a local API, unless VITE_STACHED_API
// points somewhere else.
import type { Leaderboard, Mark } from "../../stached-api/leaderboard";

const API =
  import.meta.env.VITE_STACHED_API ??
  (import.meta.env.DEV ? "/stached-api" : "https://api.spencerstrelsov.com");

/** A group's color slot: 1–4 by difficulty, or the stache. */
export type Color = "1" | "2" | "3" | "4" | "stache";

export interface Group {
  title: string;
  words: string[];
  color: Color;
}

export interface Play {
  elapsedMs: number;
  guesses: string[][];
  mistakes: number;
  /** Earned by solving the stache group: one more mistake before it's over. */
  bonusLife: boolean;
  solved: Group[];
  stachedMs: number | null;
  finished: boolean;
  completed: boolean | null;
  /** Every group, once the game is over. */
  answers?: Group[];
  /** Each guess as the colors of its words, once the game is over. */
  grid?: Color[][];
}

export interface Score {
  name: string;
  completed: boolean;
  stachedMs: number | null;
  /** Played once the puzzle stopped counting, so it doesn't count. */
  late: boolean;
}

/** A puzzle so far, with how you did on it. */
export interface PastGame extends Pick<Day["puzzle"], "date" | "today"> {
  play: Pick<Play, "finished" | "completed" | "stachedMs"> | null;
}

/** A day's game: its puzzle, your play, and its scoreboard. */
export interface Day {
  puzzle: {
    id: number;
    /** #1 is the first puzzle, by date. */
    number: number;
    date: string;
    /** Today's puzzle: the newest one out. */
    today: boolean;
    words: string[];
    groupCount: number;
    /** Before any bonus life (Play.bonusLife). */
    maxMistakes: number;
  };
  play: Play | null;
  board: Score[];
}

/** Today's game, and your squares for the week, as on the leaderboard. */
export interface Today extends Day {
  week: { date: string; mark: Mark }[];
}

// The leaderboard's shape comes with its rules, so the two can't drift apart.
export type { Leaderboard, Mark };

export type GuessResult = "correct" | "one_away" | "wrong" | "repeat";

export interface Session {
  token: string;
  name: string;
  /** The admin (ADMIN_NAME on the API), who gets the admin page. */
  admin?: boolean;
}

/** A finished game on the admin page, with its share grid. */
export interface AdminGame {
  name: string;
  completed: boolean;
  mistakes: number;
  stachedMs: number | null;
  late: boolean;
  /** Started in the home-screen app, or on the website; null before we knew. */
  homeScreen: boolean | null;
  /** Started on a device set to dark mode; null before we knew. */
  dark: boolean | null;
  /** Started within 15 minutes of the puzzle's push, which the player got. */
  afterPush: boolean;
  grid: Color[][];
}

/** A puzzle's turnout: played and solved count games on its day. */
export interface AdminPuzzle {
  number: number;
  date: string;
  played: number;
  solved: number;
  late: number;
  /** Games started within 15 minutes of its push, by players who got it. */
  afterPush: number;
  /** Every finished game, late ones too, first finished first. */
  games: AdminGame[];
}

/** The admin page: how many play, and how each puzzle went. */
export interface AdminStats {
  /** Everyone signed up, but the admin. */
  players: number;
  /** Played one of the last 7 puzzles on its day. */
  playedThisWeek: number;
  notifications: number;
  /** Who has started a game in the home-screen app, the admin aside. */
  homeScreen: string[];
  /** Newest first. */
  puzzles: AdminPuzzle[];
}

/**
 * How a game starts, for the admin page: in the home-screen app or the
 * website, and whether the device is set to dark mode (its own setting, not
 * Stached's look).
 */
export interface HowStarted {
  homeScreen: boolean;
  dark: boolean;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  { token, body }: { token?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(token && { authorization: `Bearer ${token}` }),
        ...(body !== undefined && { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Lost the signal");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something broke");
  return data;
}

export const api = {
  login: (name: string, password: string) =>
    request<Session>("/login", { body: { name, password } }),
  today: (token: string) => request<Today>("/today", { token }),
  leaderboard: (token: string) =>
    request<Leaderboard>("/leaderboard", { token }),
  /** Starts that day's game, or picks it back up. */
  start: (token: string, date: string, how: HowStarted) =>
    request<Day>("/start", { token, body: { date, ...how } }),
  pastGames: (token: string) => request<PastGame[]>("/puzzles", { token }),
  /** Tells the server the board is on screen, so the clock keeps running. */
  clock: (token: string, puzzleId: number) =>
    request<{ elapsedMs: number }>("/clock", {
      token,
      body: { puzzleId, state: "active", at: Date.now() },
    }),
  /** Pauses the clock as the page hides: a beacon, which outlives the page. */
  pauseClock: (token: string, puzzleId: number) =>
    navigator.sendBeacon(
      `${API}/clock`,
      JSON.stringify({ token, puzzleId, state: "paused", at: Date.now() }),
    ),
  /** A one-time code that signs the home-screen app in (HomeScreen.tsx). */
  handoff: (token: string) =>
    request<{ code: string }>("/handoff", { token, body: {} }),
  /** Trades that code for a session, on the app's first launch. */
  redeem: (code: string) =>
    request<Session>("/handoff/redeem", { body: { code } }),
  /** The API's push key; a 404 means notifications are off (push.ts). */
  pushKey: (token: string) => request<{ key: string }>("/push/key", { token }),
  /** Keeps this browser's push subscription, for this player. */
  subscribe: (token: string, subscription: PushSubscriptionJSON) =>
    request<void>("/push/subscribe", { token, body: subscription }),
  /** The admin page's numbers and games; anyone else gets a 404. */
  admin: (token: string) => request<AdminStats>("/admin", { token }),
  guess: (token: string, puzzleId: number, words: string[]) =>
    request<Day & { result: GuessResult }>("/guess", {
      token,
      body: { puzzleId, words },
    }),
};

const SESSION_KEY = "stached.session";

export function loadSession(): Session | null {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private mode: the session lasts as long as the tab.
  }
}

export type Look = "light" | "dark";

const LOOK_KEY = "stached.look";

/** The look this device picked in settings, if it picked one. */
export function loadLook(): Look | null {
  try {
    const saved = localStorage.getItem(LOOK_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

export function saveLook(look: Look) {
  try {
    localStorage.setItem(LOOK_KEY, look);
  } catch {
    // Private mode: the look lasts as long as the tab.
  }
}

/** 42_300 → "0:42.3", or "0:42" without tenths. No time is a dash. */
export function formatTime(ms: number | null, tenths = true) {
  if (ms === null) return "—";
  const seconds = Math.floor(ms / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return tenths ? `${clock}.${Math.floor((ms % 1000) / 100)}` : clock;
}

/**
 * "2026-09-29" → "Tue, Sep 29, 2026", or however `options` say, as a calendar
 * day rather than UTC.
 */
export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", options);
}
