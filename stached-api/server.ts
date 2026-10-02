// The Stached API: sign-in, the day's puzzles, guesses, scoreboards, past
// games, the leaderboard, the link-preview card, and push notifications. The
// server holds the answers and the clock, so scores can't be fudged from the
// browser. Bun.sql connects with DATABASE_URL.
//
// The stache clock only runs while the board is on screen: the game checks in
// every few seconds while it's visible and says when it's hidden. A stretch
// with no word from the game (a phone that went to sleep before it could say
// so) counts for at most CLOCK_GRACE_MS.
import { timingSafeEqual } from "node:crypto";
import { sql } from "bun";
import { type CardPuzzle, nextColor, renderCard } from "./card";
import { migrate } from "./migrate";
import {
  announce,
  parseSubscription,
  saveSubscription,
  vapidKeys,
} from "./push";
import { COLORS, type Group, readPuzzles, syncPuzzles } from "./puzzles";

const PASSWORD = env("STACHE_PASSWORD");
const SECRET = env("SESSION_SECRET");
const ORIGINS = env("ALLOWED_ORIGINS").split(",");
const MAX_MISTAKES = 4;
const CLOCK_GRACE_MS = 15_000;
// The real puzzles live outside this public repo (on the Studio, next to the
// password); puzzles.example.json is a made-up one for local testing.
const puzzles = await readPuzzles(env("PUZZLES_FILE"));
// Push notifications are on once the VAPID keys are set (push.ts).
const VAPID = vapidKeys();

interface Puzzle {
  id: number;
  /** #1 is the first puzzle, by date. */
  number: number;
  date: string;
  /** Whether it's the daily puzzle: the newest one out. */
  today: boolean;
  groups: Group[];
}

interface Play {
  id: number;
  started_at: Date;
  guesses: string[][];
  solved: number[];
  mistakes: number;
  stached_ms: number | null;
  active_ms: number;
  /** When the clock last heard from the game, or null while it's paused. */
  active_since: Date | null;
  finished_at: Date | null;
  completed: boolean | null;
  late: boolean;
}

type Result = "correct" | "one_away" | "wrong" | "repeat";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Tokens are "userId.hmac(userId:name)": nothing to store, nothing to expire,
// and a reset database can't hand an old token to whoever gets its id next.
const sign = ({ id, name }: { id: number; name: string }) =>
  new Bun.CryptoHasher("sha256", SECRET)
    .update(`${id}:${name}`)
    .digest("base64url");

/** The answer to signing in: the player's token, and their name as first typed. */
const session = (user: { id: number; name: string }) =>
  Response.json({ token: `${user.id}.${sign(user)}`, name: user.name });

// Beacons can't set headers, so the token may also come in the body.
async function authenticate(
  req: Request,
  data: Record<string, unknown>,
): Promise<number | null> {
  const token =
    req.headers.get("authorization")?.replace(/^Bearer /, "") ??
    (typeof data.token === "string" ? data.token : undefined);
  const [id, signature] = token?.split(".") ?? [];
  const userId = Number(id);
  if (!Number.isInteger(userId) || !signature) return null;
  const [user] = await sql`select id, name from users where id = ${userId}`;
  if (!user) return null;
  const expected = Buffer.from(sign(user));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given)
    ? userId
    : null;
}

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

const fail = (status: number, error: string) =>
  Response.json({ error }, { status });

/**
 * The puzzles out so far (dated today or earlier, New York time), numbered by
 * date from #1. The newest is today's: a day without a puzzle of its own
 * keeps the last one.
 */
const released = () => sql`(
  select id, to_char(date, 'YYYY-MM-DD') as date, groups,
         row_number() over (order by date)::int as number,
         date = max(date) over () as today
  from puzzles
  where date <= (now() at time zone 'America/New_York')::date
) released`;

/** The released puzzle that matches: by default, today's. */
async function findPuzzle(where = sql`today`): Promise<Puzzle | undefined> {
  const [puzzle] = await sql`select * from ${released()} where ${where}`;
  return puzzle;
}

const puzzleById = async (id: unknown) =>
  Number.isInteger(id) ? findPuzzle(sql`id = ${id}`) : undefined;

// Compared as text, so a date that doesn't exist is just no puzzle.
const puzzleByDate = async (date: unknown) =>
  typeof date === "string" ? findPuzzle(sql`date = ${date}`) : undefined;

/** Every puzzle so far, newest first, with how this player did on each. */
async function pastGames(userId: number) {
  const rows = await sql`
    select released.date, released.number, released.today, p.id as play,
           p.finished_at is not null as finished, p.completed,
           p.stached_ms as "stachedMs", p.late
    from ${released()}
    left join plays p on p.puzzle_id = released.id and p.user_id = ${userId}
    order by released.date desc`;
  return rows.map(
    ({ date, number, today, play, ...game }: Record<string, unknown>) => ({
      date,
      number,
      today,
      play: play === null ? null : game,
    }),
  );
}

const RECENT_PUZZLES = 7;

interface GameRow {
  name: string;
  puzzle_id: number;
  completed: boolean | null;
  stached_ms: number | null;
  finished: boolean;
}

interface Standing {
  name: string;
  games: number;
  solved: number;
  streak: number;
  bestStacheMs: number | null;
  avgStacheMs: number | null;
  /** Stache time on each of the recent puzzles, oldest first; null if none. */
  recent: (number | null)[];
}

/**
 * Everyone who has played, with streaks and times. A streak is the run of
 * puzzles solved, newest first; today's puzzle, if it isn't finished yet,
 * doesn't break it (you still have today to keep it going). Late games don't
 * count at all, so a missed day never fills a gap.
 */
async function leaderboard() {
  const [days, plays]: [
    { id: number; date: string; today: boolean }[],
    GameRow[],
  ] = await Promise.all([
    sql`select id, date, today from ${released()} order by date desc`,
    sql`
      select u.name, p.puzzle_id, p.completed, p.stached_ms,
             p.finished_at is not null as finished
      from plays p join users u on u.id = p.user_id
      where not p.late`,
  ]);
  const byPlayer = new Map<string, Map<number, GameRow>>();
  for (const play of plays) {
    if (!byPlayer.has(play.name)) byPlayer.set(play.name, new Map());
    byPlayer.get(play.name)?.set(play.puzzle_id, play);
  }
  const recent = days.slice(0, RECENT_PUZZLES).reverse();

  const standings: Standing[] = [...byPlayer].map(([name, games]) => {
    const all = [...games.values()];
    const finished = all.filter((g) => g.finished);
    const times = all
      .map((g) => g.stached_ms)
      .filter((ms): ms is number => ms !== null);
    let streak = 0;
    for (const day of days) {
      const game = games.get(day.id);
      if (day.today && !game?.finished) continue;
      if (!game?.completed) break;
      streak++;
    }
    return {
      name,
      games: finished.length,
      solved: finished.filter((g) => g.completed).length,
      streak,
      bestStacheMs: times.length ? Math.min(...times) : null,
      avgStacheMs: times.length
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : null,
      recent: recent.map((day) => games.get(day.id)?.stached_ms ?? null),
    };
  });

  const best = (s: Standing) => s.bestStacheMs ?? Number.POSITIVE_INFINITY;
  standings.sort(
    (a, b) =>
      b.streak - a.streak || best(a) - best(b) || a.name.localeCompare(b.name),
  );
  return { recentDates: recent.map((day) => day.date), players: standings };
}

/** Clock time up to now, if the game has kept checking in. */
function activeMs(play: Play, now: Date) {
  if (!play.active_since) return play.active_ms;
  const gap = now.getTime() - play.active_since.getTime();
  return play.active_ms + Math.min(Math.max(gap, 0), CLOCK_GRACE_MS);
}

function colorOf(puzzle: Puzzle, index: number) {
  if (puzzle.groups[index].stache) return "stache";
  return COLORS[puzzle.groups.slice(0, index).filter((g) => !g.stache).length];
}

function groupView(puzzle: Puzzle, index: number) {
  const { title, words } = puzzle.groups[index];
  return { title, words, color: colorOf(puzzle, index) };
}

function playView(puzzle: Puzzle, play: Play) {
  const finished = play.finished_at !== null;
  const groupOf = (word: string) =>
    puzzle.groups.findIndex((g) => g.words.includes(word));
  return {
    elapsedMs: activeMs(play, new Date()),
    guesses: play.guesses,
    mistakes: play.mistakes,
    solved: play.solved.map((i) => groupView(puzzle, i)),
    stachedMs: play.stached_ms,
    finished,
    completed: play.completed,
    // The answers and the colored guess grid only once the game is over.
    ...(finished && {
      answers: puzzle.groups.map((_, i) => groupView(puzzle, i)),
      grid: play.guesses.map((guess) =>
        guess.map((word) => colorOf(puzzle, groupOf(word))),
      ),
    }),
  };
}

/** Everything the game needs: the words, this player's game, the scoreboard. */
async function snapshot(userId: number, puzzle: Puzzle) {
  const [[play], board] = await Promise.all([
    sql`select * from plays where user_id = ${userId} and puzzle_id = ${puzzle.id}`,
    sql`
      select u.name, p.completed, p.stached_ms as "stachedMs", p.late
      from plays p join users u on u.id = p.user_id
      where p.puzzle_id = ${puzzle.id} and p.finished_at is not null
      order by p.stached_ms nulls last, p.completed desc, p.mistakes, p.finished_at`,
  ]);
  return {
    puzzle: {
      id: puzzle.id,
      number: puzzle.number,
      date: puzzle.date,
      today: puzzle.today,
      // Sorted so the order gives nothing away; the game shuffles them.
      words: puzzle.groups.flatMap((g) => g.words).sort(),
      groupCount: puzzle.groups.length,
      maxMistakes: MAX_MISTAKES,
    },
    play: play ? playView(puzzle, play) : null,
    board,
  };
}

async function login({ name, password }: Record<string, unknown>) {
  const clean =
    typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!clean || clean.length > 24) return fail(400, "Enter your name");
  if (password !== PASSWORD) return fail(401, "Wrong password");
  const [user] = await sql`
    insert into users (name) values (${clean})
    on conflict (lower(name)) do update set name = users.name
    returning id, name`;
  return session(user);
}

// Signing in the home-screen app, which iOS keeps apart from Safari: Safari
// asks for a one-time code and puts it in the address the app is saved with,
// and the app trades it for a session on its first launch. Codes last 15
// minutes and live in memory; after a restart, players sign in by name.
const HANDOFF_MS = 15 * 60_000;
const handoffs = new Map<
  string,
  { id: number; name: string; expires: number }
>();

async function handoff(userId: number) {
  const now = Date.now();
  for (const [code, { expires }] of handoffs)
    if (expires < now) handoffs.delete(code);
  const [user] = await sql`select id, name from users where id = ${userId}`;
  const code = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
    "base64url",
  );
  handoffs.set(code, { ...user, expires: now + HANDOFF_MS });
  return Response.json({ code });
}

function redeem({ code }: Record<string, unknown>) {
  const user = typeof code === "string" ? handoffs.get(code) : undefined;
  if (!user || user.expires < Date.now()) return fail(401, "Sign in first");
  handoffs.delete(code as string);
  return session(user);
}

/** Starts a game (by date, or by id for older pages), or picks it back up. */
async function start(
  userId: number,
  { puzzleId, date }: Record<string, unknown>,
) {
  const puzzle = await (date !== undefined
    ? puzzleByDate(date)
    : puzzleById(puzzleId));
  if (!puzzle) return fail(404, "No puzzle for that day");
  // A game started after its day is late: it's yours, but it doesn't count.
  await sql`
    insert into plays (user_id, puzzle_id, active_since, late)
    values (${userId}, ${puzzle.id}, ${new Date()}, ${!puzzle.today})
    on conflict (user_id, puzzle_id) do nothing`;
  return Response.json(await snapshot(userId, puzzle));
}

/**
 * Checks the game in ("active") or pauses the clock ("paused"). `at` is when
 * the device sent it: check-ins can arrive out of order, and the older one
 * loses.
 */
async function clock(
  userId: number,
  { puzzleId, state, at }: Record<string, unknown>,
) {
  if (state !== "active" && state !== "paused")
    return fail(400, "State is active or paused");
  if (typeof at !== "number") return fail(400, "Missing at");
  const sentAt = Math.round(at);

  const elapsedMs = await sql.begin(async (tx): Promise<number | null> => {
    const [play]: Play[] = await tx`
      select * from plays
      where user_id = ${userId} and puzzle_id = ${Number(puzzleId)}
        and finished_at is null
        and (clock_at is null or clock_at <= ${sentAt})
      for update`;
    if (!play) return null;
    const now = new Date();
    const elapsed = activeMs(play, now);
    await tx`
      update plays set
        active_ms = ${elapsed},
        active_since = ${state === "active" ? now : null},
        clock_at = ${sentAt}
      where id = ${play.id}`;
    return elapsed;
  });

  if (elapsedMs === null)
    return fail(409, "No game running, or a newer check-in won");
  return Response.json({ elapsedMs });
}

async function guess(
  userId: number,
  { puzzleId, words }: Record<string, unknown>,
) {
  const puzzle = await puzzleById(puzzleId);
  if (!puzzle) return fail(404, "No such puzzle");
  const picked = Array.isArray(words) ? [...new Set(words.map(String))] : [];
  if (picked.length !== 4) return fail(400, "Pick four words");

  const result = await sql.begin(async (tx): Promise<Result | null> => {
    const [play]: Play[] = await tx`
      select * from plays
      where user_id = ${userId} and puzzle_id = ${puzzle.id}
      for update`;
    if (!play || play.finished_at) return null;

    const open = puzzle.groups
      .map((group, index) => ({ group, index }))
      .filter(({ index }) => !play.solved.includes(index));
    const inPlay = open.flatMap(({ group }) => group.words);
    if (!picked.every((w) => inPlay.includes(w))) return null;

    const key = (g: string[]) => [...g].sort().join("|");
    if (play.guesses.some((g) => key(g) === key(picked))) return "repeat";

    const best = open
      .map(({ group, index }) => ({
        index,
        hits: group.words.filter((w) => picked.includes(w)).length,
      }))
      .reduce((a, b) => (b.hits > a.hits ? b : a));
    const correct = best.hits === 4;
    const now = new Date();
    const solved = correct ? [...play.solved, best.index] : play.solved;
    const mistakes = play.mistakes + (correct ? 0 : 1);
    const elapsed = activeMs(play, now);
    const stachedMs =
      play.stached_ms ??
      (correct && puzzle.groups[best.index].stache ? elapsed : null);
    const completed =
      solved.length === puzzle.groups.length
        ? true
        : mistakes >= MAX_MISTAKES
          ? false
          : null;

    await tx`
      update plays set
        guesses = ${[...play.guesses, picked]}::jsonb,
        solved = ${solved}::jsonb,
        mistakes = ${mistakes},
        stached_ms = ${stachedMs},
        active_ms = ${elapsed},
        -- A guess checks the game in, but doesn't restart a paused clock.
        active_since = ${completed === null && play.active_since ? now : null},
        completed = ${completed},
        finished_at = ${completed === null ? null : now},
        -- Finishing a game after its day doesn't count either.
        late = ${play.late || !puzzle.today}
      where id = ${play.id}`;
    return correct ? "correct" : best.hits === 3 ? "one_away" : "wrong";
  });

  if (!result) return fail(409, "That guess doesn't fit this game");
  return Response.json({ result, ...(await snapshot(userId, puzzle)) });
}

/**
 * Today's link-preview card (card.ts), which the site's preview tags point at.
 * It's public, since chat apps fetch it signed out, and never cached, so each
 * fetch shows today's puzzle and takes the next border color. It reads only
 * the puzzle's number and date, and never a puzzle still to come.
 */
async function card(req: Request) {
  const [puzzle]: CardPuzzle[] =
    await sql`select number, date from ${released()} where today`;
  if (!puzzle) return fail(404, "No puzzle yet");
  // A HEAD gets no picture, so it doesn't take a turn: an unfurler that checks
  // the card before fetching it still sees every color.
  const color = req.method === "HEAD" ? "gold" : nextColor();
  return new Response(renderCard(puzzle, color), {
    headers: { "content-type": "image/png" },
  });
}

async function route(req: Request): Promise<Response> {
  // HEAD is GET without the body, as HTTP asks (Bun drops it), so unfurlers
  // can check the card without downloading it.
  const method = req.method === "HEAD" ? "GET" : req.method;
  const path = `${method} ${new URL(req.url).pathname}`;
  if (path === "GET /health") return new Response("ok");
  if (path === "GET /card.png") return card(req);
  const data = req.method === "POST" ? await body(req) : {};
  if (path === "POST /login") return login(data);
  if (path === "POST /handoff/redeem") return redeem(data);

  const userId = await authenticate(req, data);
  if (!userId) return fail(401, "Sign in first");
  switch (path) {
    case "GET /today": {
      const puzzle = await findPuzzle();
      if (!puzzle) return fail(404, "No puzzle yet");
      return Response.json(await snapshot(userId, puzzle));
    }
    case "POST /start":
      return start(userId, data);
    case "POST /clock":
      return clock(userId, data);
    case "POST /guess":
      return guess(userId, data);
    case "GET /leaderboard":
      return Response.json(await leaderboard());
    case "GET /puzzles":
      return Response.json(await pastGames(userId));
    case "POST /handoff":
      return handoff(userId);
    case "GET /push/key":
      if (!VAPID) return fail(404, "Notifications are off");
      return Response.json({ key: VAPID.publicKey });
    case "POST /push/subscribe": {
      const subscription = VAPID && parseSubscription(data);
      if (!subscription) return fail(400, "That's not a push subscription");
      await saveSubscription(userId, subscription);
      return new Response(null, { status: 204 });
    }
    default:
      return fail(404, "Not found");
  }
}

// On the Studio the API listens only on 127.0.0.1 and Cloudflare's tunnel is
// its one way in, so Cloudflare's client address can be trusted there.
// Anywhere else that header could be forged, so use the socket's address.
const HOST = process.env.HOST ?? "0.0.0.0";
const BEHIND_TUNNEL = HOST === "127.0.0.1";

// Requests per client per minute. Sign-in is tight so the shared password
// can't be guessed at speed; a game makes about 15 a minute.
const LIMITS = { login: 10, api: 180 };
const windows = new Map<string, { start: number; count: number }>();

function overLimit(key: string, limit: number) {
  const now = Date.now();
  const window = windows.get(key);
  if (!window || now - window.start >= 60_000) {
    windows.set(key, { start: now, count: 1 });
    return false;
  }
  return ++window.count > limit;
}

setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, window] of windows)
    if (window.start < cutoff) windows.delete(key);
}, 5 * 60_000);

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (!ORIGINS.includes(origin)) return { vary: "origin" };
  return {
    vary: "origin",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
  };
}

await migrate();
await syncPuzzles(puzzles);

// Today's puzzle announces itself once its push is due (push.ts). Checking
// every minute catches a puzzle published after 9:12am, or a restart then.
if (VAPID) {
  const announceToday = () =>
    findPuzzle()
      .then((puzzle) => puzzle && announce(puzzle, VAPID))
      .catch(console.error);
  announceToday();
  setInterval(announceToday, 60_000);
} else console.log("Push notifications are off: no VAPID keys");

const server = Bun.serve({
  hostname: HOST,
  port: Number(process.env.PORT ?? 3000),
  maxRequestBodySize: 16 * 1024,
  async fetch(req, server) {
    const headers = {
      ...cors(req),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    };
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const client =
      (BEHIND_TUNNEL && req.headers.get("cf-connecting-ip")) ||
      server.requestIP(req)?.address ||
      "unknown";
    // Trading a code for a session counts as signing in.
    const login = ["/login", "/handoff/redeem"].includes(
      new URL(req.url).pathname,
    );
    let res: Response;
    if (
      overLimit(
        `${login ? "login" : "api"}:${client}`,
        login ? LIMITS.login : LIMITS.api,
      )
    )
      res = fail(429, "Too many tries. Wait a minute");
    else
      try {
        res = await route(req);
      } catch (error) {
        console.error(error);
        res = fail(500, "Something broke");
      }
    for (const [name, value] of Object.entries(headers))
      res.headers.set(name, value);
    return res;
  },
});

console.log(`Stached API on ${HOST}:${server.port}`);
