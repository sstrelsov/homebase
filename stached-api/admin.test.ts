import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SQL } from "bun";
import { addDays, type DayPuzzle, newYorkDate } from "./puzzles";
import examples from "./puzzles.example.json";

// The admin page's endpoints, against the real server: a throwaway Postgres
// with two databases, one for the game and one for its tester, as on the
// Studio, and made-up puzzles. Staging must put a puzzle on the tester and
// leave the game alone; publishing must touch only the game.
const initdb = Bun.which("initdb", {
  PATH: `${process.env.PATH}:/opt/homebrew/opt/postgresql@17/bin`,
});

describe.skipIf(!initdb)("the admin page's endpoints", () => {
  // Made in beforeAll, which a skipped run never reaches.
  const dir = join(tmpdir(), `stached-admin-${crypto.randomUUID()}`);
  const bin = (tool: string) => join(initdb as string, "..", tool);
  const pgPort = 50_000 + Math.floor(Math.random() * 10_000);
  const apiPort = 40_000 + Math.floor(Math.random() * 10_000);
  const api = `http://127.0.0.1:${apiPort}`;
  const url = (db: string) => `postgres://postgres@localhost:${pgPort}/${db}`;
  const today = newYorkDate();
  const tomorrow = addDays(today, 1);
  const [sample, other] = examples as DayPuzzle[];
  const on = (date: string, puzzle = other): DayPuzzle => ({ ...puzzle, date });
  const LIVE = [on(addDays(today, -1), sample), on(today)];
  const files = {
    live: join(dir, "live/puzzles.json"),
    staged: join(dir, "live/staged.json"),
    tester: join(dir, "tester/puzzles.json"),
    testerEnv: join(dir, "tester/api.env"),
  };
  const live = new SQL(url("live"));
  const tester = new SQL(url("tester"));
  let server: Bun.Subprocess;

  const run = (tool: string, ...args: string[]) => {
    const result = spawnSync(bin(tool), args, { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
  };
  const migrate = (db: string) => {
    const result = spawnSync(process.execPath, ["migrate.ts"], {
      cwd: import.meta.dir,
      env: { PATH: process.env.PATH, DATABASE_URL: url(db) },
      encoding: "utf8",
    });
    if (result.status !== 0) throw new Error(result.stderr);
  };

  beforeAll(async () => {
    mkdirSync(dir);
    run("initdb", "-D", `${dir}/pg`, "-U", "postgres", "--auth=trust");
    run(
      "pg_ctl",
      ...["-D", `${dir}/pg`, "-l", `${dir}/log`, "-w", "start"],
      ...["-o", `-p ${pgPort} -k '' -c listen_addresses=localhost`],
    );
    for (const db of ["live", "tester"]) {
      run(
        "createdb",
        "-h",
        "localhost",
        "-p",
        String(pgPort),
        "-U",
        "postgres",
        db,
      );
      migrate(db);
    }
    mkdirSync(join(dir, "live"));
    mkdirSync(join(dir, "tester"));
    writeFileSync(files.live, JSON.stringify(LIVE));
    writeFileSync(files.tester, JSON.stringify([on(today, sample)]));
    writeFileSync(
      files.testerEnv,
      [
        `DATABASE_URL=${url("tester")}`,
        `PUZZLES_FILE=${files.tester}`,
        "ALLOWED_ORIGINS=https://tester.example",
        "STACHED_TESTER=1",
      ].join("\n"),
    );
    server = Bun.spawn([process.execPath, "server.ts"], {
      cwd: import.meta.dir,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        DATABASE_URL: url("live"),
        STACHE_PASSWORD: "test",
        SESSION_SECRET: "test",
        PUZZLES_FILE: files.live,
        ALLOWED_ORIGINS: "https://game.example",
        HOST: "127.0.0.1",
        PORT: String(apiPort),
        ADMIN_NAME: "admin",
        ADMIN_PASSWORD: "admin",
        TESTER_ENV: files.testerEnv,
      },
      stdout: "ignore",
      stderr: "ignore",
    });
    for (let i = 0; i < 100; i++) {
      if (
        await fetch(`${api}/health`).then(
          (r) => r.ok,
          () => false,
        )
      )
        return;
      await Bun.sleep(100);
    }
    throw new Error("The API didn't start");
  }, 30_000);

  afterAll(async () => {
    server?.kill();
    await Promise.all([live.close(), tester.close()]);
    spawnSync(bin("pg_ctl"), ["-D", `${dir}/pg`, "stop", "-m", "fast"]);
    rmSync(dir, { recursive: true, force: true });
  });

  /** A request as a player, signed in by name. */
  const as = async (name: string) => {
    const { token } = await post("/login", {
      name,
      password: name === "admin" ? "admin" : "test",
    }).then((r) => r.json());
    return (path: string, body?: unknown) =>
      body === undefined
        ? fetch(`${api}${path}`, {
            headers: { authorization: `Bearer ${token}` },
          })
        : post(path, body, token);
  };
  const post = (path: string, body: unknown, token?: string) =>
    fetch(`${api}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });

  const fileOf = (file: string) => Bun.file(file).json();
  const wordsOn = async (db: SQL, date: string) =>
    (await db`select groups from puzzles where date = ${date}`)[0]?.groups[0]
      .words[0];
  const edited = (date: string, word: string) => {
    const puzzle = structuredClone(on(date));
    puzzle.groups[0].words[0] = word;
    return puzzle;
  };

  test("are for the admin only", async () => {
    const cat = await as("Cat");
    for (const path of [
      "/admin",
      "/admin/schedule",
      "/admin/stage",
      "/admin/publish",
      "/admin/unstage",
      "/admin/organize",
      "/admin/suggest",
    ]) {
      expect((await cat(path)).status).toBe(404);
      expect((await cat(path, {})).status).toBe(404);
      expect((await post(path, {})).status).toBe(401);
    }
    expect(await fileOf(files.live)).toEqual(LIVE);
  });

  test("show every puzzle, published and staged", async () => {
    const admin = await as("admin");
    const schedule = await (await admin("/admin/schedule")).json();
    expect(schedule).toMatchObject({
      today,
      announceAt: "09:12",
      staged: [],
      haiku: false,
      reach: 0,
    });
    expect(schedule.published).toEqual(
      LIVE.map((p) => ({ ...p, games: 0, pushed: false })),
    );
  });

  test("stage a puzzle on the tester, as today's, and leave the game alone", async () => {
    const admin = await as("admin");
    const puzzle = edited(tomorrow, "Mortar");
    const res = await admin("/admin/stage", { puzzle });
    expect(res.status).toBe(200);
    const { tester: played, schedule } = await res.json();
    expect(played.ok).toBe(true);
    expect(schedule.staged).toEqual([puzzle]);
    expect(await fileOf(files.staged)).toEqual([puzzle]);
    // The game: unchanged.
    expect(await fileOf(files.live)).toEqual(LIVE);
    expect(await wordsOn(live, tomorrow)).toBeUndefined();
    // The tester: it's today's there, in place of its own.
    expect(await wordsOn(tester, today)).toBe("Mortar");
    expect((await fileOf(files.tester))[0].date).toBe(today);
  });

  test("stage each puzzle in its own place", async () => {
    const admin = await as("admin");
    const later = edited(addDays(today, 2), "Pestle");
    await admin("/admin/stage", { puzzle: later });
    // Staging tomorrow's again replaces it, and keeps the other.
    const again = edited(tomorrow, "Rolling pin");
    const { schedule } = await (
      await admin("/admin/stage", { puzzle: again })
    ).json();
    expect(schedule.staged).toEqual([again, later]);
  });

  test("refuse a puzzle with problems, saying what's wrong", async () => {
    const admin = await as("admin");
    const puzzle = edited(addDays(today, 3), other.groups[1].words[0]);
    const res = await admin("/admin/stage", { puzzle });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("is in it twice");
    expect(await fileOf(files.staged)).toHaveLength(2);
  });

  test("publish one staged puzzle, and only on the game", async () => {
    const admin = await as("admin");
    const res = await admin("/admin/publish", { date: tomorrow });
    expect(res.status).toBe(200);
    const schedule = await res.json();
    expect(schedule.staged.map((p: DayPuzzle) => p.date)).toEqual([
      addDays(today, 2),
    ]);
    const dates = [...LIVE.map((p) => p.date), tomorrow];
    expect(schedule.published.map((p: DayPuzzle) => p.date)).toEqual(dates);
    expect((await fileOf(files.live)).map((p: DayPuzzle) => p.date)).toEqual(
      dates,
    );
    expect(await wordsOn(live, tomorrow)).toBe("Rolling pin");
    expect(await wordsOn(tester, tomorrow)).toBeUndefined();
    expect((await admin("/admin/publish", { date: tomorrow })).status).toBe(
      400,
    );
  });

  test("won't delete anyone's games without the tick", async () => {
    const cat = await as("Cat");
    expect((await cat("/start", { date: today })).status).toBe(200);
    const admin = await as("admin");
    await admin("/admin/stage", { puzzle: edited(today, "Sieve") });
    const games = async () =>
      (await (await admin("/admin/schedule")).json()).published.find(
        (p: DayPuzzle) => p.date === today,
      ).games;
    expect(await games()).toBe(1);

    const refused = await admin("/admin/publish", { date: today });
    expect(refused.status).toBe(409);
    expect((await refused.json()).error).toContain("1 game");
    expect(await wordsOn(live, today)).toBe(other.groups[0].words[0]);

    const res = await admin("/admin/publish", {
      date: today,
      deleteGames: true,
    });
    expect(res.status).toBe(200);
    expect(await wordsOn(live, today)).toBe("Sieve");
    expect(await games()).toBe(0);
  });

  test("unstage a puzzle", async () => {
    const admin = await as("admin");
    const res = await admin("/admin/unstage", { date: addDays(today, 2) });
    expect((await res.json()).staged).toEqual([]);
    expect((await admin("/admin/unstage", { date: today })).status).toBe(400);
  });

  test("say plainly that Haiku needs a key", async () => {
    const admin = await as("admin");
    const res = await admin("/admin/organize", { paste: "a b c d e" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("No Anthropic key on the API");
  });
});
