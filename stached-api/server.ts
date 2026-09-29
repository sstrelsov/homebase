// The Stached API: sign-in, today's puzzle, guesses, and the scoreboard.
// The server holds the answers and the clock, so scores can't be fudged from
// the browser. Bun.sql connects with DATABASE_URL.
//
// The stache clock only runs while the board is on screen: the game checks in
// every few seconds while it's visible and says when it's hidden. A stretch
// with no word from the game (a phone that went to sleep before it could say
// so) counts for at most CLOCK_GRACE_MS.
import { timingSafeEqual } from "node:crypto";
import { sql } from "bun";
import puzzles from "./puzzles.json";

const PASSWORD = env("STACHE_PASSWORD");
const SECRET = env("SESSION_SECRET");
const ORIGINS = env("ALLOWED_ORIGINS").split(",");
const MAX_MISTAKES = 4;
const CLOCK_GRACE_MS = 15_000;
// Non-stache groups get these in order, easiest first, like Connections.
const COLORS = ["yellow", "green", "blue", "purple"];

interface Group {
  title: string;
  words: string[];
  stache?: boolean;
}

interface Puzzle {
  id: number;
  date: string;
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
}

type Result = "correct" | "one_away" | "wrong" | "repeat";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function checkPuzzles() {
  for (const { date, groups } of puzzles as Omit<Puzzle, "id">[]) {
    const words = groups.flatMap((g) => g.words);
    if (groups.some((g) => g.words.length !== 4))
      throw new Error(`${date}: every group needs four words`);
    if (new Set(words).size !== words.length)
      throw new Error(`${date}: a word appears twice`);
    if (groups.filter((g) => g.stache).length !== 1)
      throw new Error(`${date}: needs exactly one stache group`);
    if (groups.length > COLORS.length + 1)
      throw new Error(`${date}: too many groups`);
  }
}

// Tokens are "userId.hmac(userId)": nothing to store, nothing to expire.
const sign = (userId: number) =>
  new Bun.CryptoHasher("sha256", SECRET)
    .update(String(userId))
    .digest("base64url");

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
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return null;
  const [user] = await sql`select id from users where id = ${userId}`;
  return user ? userId : null;
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

async function todaysPuzzle(): Promise<Puzzle | undefined> {
  const [puzzle] = await sql`
    select id, to_char(date, 'YYYY-MM-DD') as date, groups from puzzles
    where date <= (now() at time zone 'America/New_York')::date
    order by date desc limit 1`;
  return puzzle;
}

async function puzzleById(id: unknown): Promise<Puzzle | undefined> {
  if (!Number.isInteger(id)) return undefined;
  const [puzzle] = await sql`
    select id, to_char(date, 'YYYY-MM-DD') as date, groups from puzzles
    where id = ${id}`;
  return puzzle;
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
    elapsedMs: finished ? play.active_ms : activeMs(play, new Date()),
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
  const [play] = await sql`
    select * from plays where user_id = ${userId} and puzzle_id = ${puzzle.id}`;
  const board = await sql`
    select u.name, p.completed, p.mistakes, p.stached_ms as "stachedMs"
    from plays p join users u on u.id = p.user_id
    where p.puzzle_id = ${puzzle.id} and p.finished_at is not null
    order by p.stached_ms nulls last, p.completed desc, p.mistakes, p.finished_at`;
  return {
    puzzle: {
      id: puzzle.id,
      date: puzzle.date,
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
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!clean || clean.length > 24) return fail(400, "Enter your name");
  if (password !== PASSWORD) return fail(401, "Wrong password");
  const [user] = await sql`
    insert into users (name) values (${clean})
    on conflict (lower(name)) do update set name = users.name
    returning id, name`;
  return Response.json({ token: `${user.id}.${sign(user.id)}`, name: user.name });
}

async function start(userId: number, { puzzleId }: Record<string, unknown>) {
  const puzzle = await puzzleById(puzzleId);
  if (!puzzle) return fail(404, "No such puzzle");
  const now = new Date();
  await sql`
    insert into plays (user_id, puzzle_id, started_at, active_since)
    values (${userId}, ${puzzle.id}, ${now}, ${now})
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
  const now = new Date();
  const [play] = await sql`
    update plays set
      active_ms = active_ms + least(
        coalesce(extract(epoch from ${now}::timestamptz - active_since), 0) * 1000,
        ${CLOCK_GRACE_MS}
      )::int,
      active_since = ${state === "active" ? now : null},
      clock_at = ${Math.round(at)}
    where user_id = ${userId} and puzzle_id = ${Number(puzzleId)}
      and finished_at is null
      and (clock_at is null or clock_at <= ${Math.round(at)})
    returning active_ms`;
  if (!play) return fail(409, "No game running, or a newer check-in won");
  return Response.json({ elapsedMs: play.active_ms });
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
        active_since = ${completed === null ? now : null},
        completed = ${completed},
        finished_at = ${completed === null ? null : now}
      where id = ${play.id}`;
    return correct ? "correct" : best.hits === 3 ? "one_away" : "wrong";
  });

  if (!result) return fail(409, "That guess doesn't fit this game");
  return Response.json({ result, ...(await snapshot(userId, puzzle)) });
}

async function route(req: Request): Promise<Response> {
  const path = `${req.method} ${new URL(req.url).pathname}`;
  if (path === "GET /health") return new Response("ok");
  const data = req.method === "POST" ? await body(req) : {};
  if (path === "POST /login") return login(data);

  const userId = await authenticate(req, data);
  if (!userId) return fail(401, "Sign in first");
  switch (path) {
    case "GET /today": {
      const puzzle = await todaysPuzzle();
      if (!puzzle) return fail(404, "No puzzle yet");
      return Response.json(await snapshot(userId, puzzle));
    }
    case "POST /start":
      return start(userId, data);
    case "POST /clock":
      return clock(userId, data);
    case "POST /guess":
      return guess(userId, data);
    default:
      return fail(404, "Not found");
  }
}

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

checkPuzzles();
await sql.unsafe(await Bun.file(new URL("schema.sql", import.meta.url)).text());
// Editing a puzzle that people have played wipes their games: scores from the
// old words wouldn't mean anything against the new ones.
for (const { date, groups } of puzzles) {
  const [changed] = await sql`
    insert into puzzles (date, groups)
    values (${date}, ${groups}::jsonb)
    on conflict (date) do update set groups = excluded.groups
    where puzzles.groups is distinct from excluded.groups
    returning id`;
  if (changed) {
    const cleared = await sql`delete from plays where puzzle_id = ${changed.id}`;
    if (cleared.count) console.log(`${date} changed: cleared ${cleared.count} plays`);
  }
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(req) {
    const headers = cors(req);
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    let res: Response;
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

console.log(`Stached API on :${server.port}`);
