// Client for the Stached API (stached-api/ at the repo root, on Railway). In
// dev it goes through Vite's proxy to a local API, unless VITE_STACHED_API
// points somewhere else.
const API =
  import.meta.env.VITE_STACHED_API ??
  (import.meta.env.DEV ? "/stached-api" : "https://stached-api.up.railway.app");

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
  mistakes: number;
  stachedMs: number | null;
}

export interface Today {
  puzzle: {
    id: number;
    date: string;
    words: string[];
    groupCount: number;
    maxMistakes: number;
  };
  play: Play | null;
  board: Score[];
}

export type GuessResult = "correct" | "one_away" | "wrong" | "repeat";

export interface Session {
  token: string;
  name: string;
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
  start: (token: string, puzzleId: number) =>
    request<Today>("/start", { token, body: { puzzleId } }),
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
  guess: (token: string, puzzleId: number, words: string[]) =>
    request<Today & { result: GuessResult }>("/guess", {
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

/** 42_300 → "0:42", or "0:42.3" with tenths. */
export function formatTime(ms: number, tenths = false) {
  const seconds = Math.floor(ms / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return tenths ? `${clock}.${Math.floor((ms % 1000) / 100)}` : clock;
}

/** "2026-09-29" → "Tue, Sep 29, 2026", as a calendar day rather than UTC. */
export function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
